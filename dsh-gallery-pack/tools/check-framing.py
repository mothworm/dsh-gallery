#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""取景客观校验器:按 dsh-boot-gallery **真实的 CSS 数学**算出每一幕实际可见的源矩形,
再在那个矩形上量"会不会露白带 / 会不会露出 #05040a 底 / 平移会不会漏边"。

为什么要有这个:子代理做完 16 套后 subagent_vision 连挂两次,32 格复核表**没人读过**。
"取景对不对"这种活本来该看图,但它可以完全客观化 —— 因为插件的取景就是三条 CSS:

    .nbn-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#05040a}
    @keyframes nbn-kb{from{transform:scale(var(--z0)) translate(var(--k0),var(--k1))}
                    to  {transform:scale(var(--z))  translate(var(--k2),var(--k3))}}
    object-position: var(--pos)

`transform: scale(z) translate(k)` 是**先平移(局部单位)再缩放**,所以
    屏幕位移 = z * k/100 * 视口尺寸
    漏边条件 = |z*k/100*W| > W*(z-1)/2   等价于   |k|% > (z-1)/(2z)*100
(注意:这条式子对 z=1.05 给 2.38%,和生成器 cap_ax() 的结论一致 —— 两边独立推导撞到同一个数)

用法:
    py -3.10 tools/check-framing.py arts2
    py -3.10 tools/check-framing.py arts2 --vw 1920 --vh 1080 --verbose
"""
import io
import json
import os
import sys

from PIL import Image, ImageDraw

WHITE_P85 = 215.0     # 白带判据(与 itachi/brothers 的 trim_letterbox 同一套数)
CHROMA_MED = 10.0
SLIVER_PX = 1.0       # 露出一侧多少像素算"漏边"
NEAR_BLACK = 14       # 窗内近黑行占比高 => 图本身就烘死了黑边(不是露底)


def parse_pct(v):
    """'62% 22%' -> (62.0, 22.0);缺省按 50/50。"""
    if not isinstance(v, str):
        return 50.0, 50.0
    parts = v.replace(",", " ").split()
    out = []
    for p in parts[:2]:
        p = p.strip().rstrip("%")
        try:
            out.append(float(p))
        except ValueError:
            out.append(50.0)
    while len(out) < 2:
        out.append(50.0)
    return out[0], out[1]


def visible_rect(iw, ih, vw, vh, posx, posy, z, kx, ky):
    """返回 (u0, u1, v0, v1):该幕在该关键帧时刻,屏幕上真正看到的**源像素**范围。"""
    s = max(vw / float(iw), vh / float(ih))      # object-fit:cover 的等比缩放
    bw, bh = iw * s, ih * s
    offx, offy = (bw - vw) * (posx / 100.0), (bh - vh) * (posy / 100.0)
    tx, ty = (kx / 100.0) * vw, (ky / 100.0) * vh
    # 屏幕 X -> 元素局部坐标 p = vw/2 + (X - vw/2)/z - tx
    p_lo_x, p_hi_x = vw / 2.0 - vw / (2.0 * z) - tx, vw / 2.0 + vw / (2.0 * z) - tx
    p_lo_y, p_hi_y = vh / 2.0 - vh / (2.0 * z) - ty, vh / 2.0 + vh / (2.0 * z) - ty
    u0, u1 = (p_lo_x + offx) / s, (p_hi_x + offx) / s
    v0, v1 = (p_lo_y + offy) / s, (p_hi_y + offy) / s
    return u0, u1, v0, v1


def slivers(vw, vh, z, kx, ky):
    """露出 img 元素盒子之外(= 背景 #05040a 或更外层)的边宽,单位 px。"""
    tx, ty = (kx / 100.0) * vw * z, (ky / 100.0) * vh * z
    half_x, half_y = vw * z / 2.0, vh * z / 2.0
    left = max(0.0, vw / 2.0 - half_x + tx)
    right = max(0.0, vw / 2.0 + tx - (vw / 2.0 + half_x))
    top = max(0.0, vh / 2.0 - half_y + ty)
    bot = max(0.0, vh / 2.0 + ty - (vh / 2.0 + half_y))
    return left, right, top, bot


def row_stats(im, box):
    """在源矩形 box 内逐行算 (最暗通道 p85, 彩度中位),返回行数与白带行位置。"""
    x0 = max(0, int(box[0])); x1 = min(im.size[0], int(max(box[0], box[1])))
    y0 = max(0, int(box[2])); y1 = min(im.size[1], int(max(box[2], box[3])))
    if x1 - x0 < 4 or y1 - y0 < 4:
        return None
    crop = im.crop((x0, y0, x1, y1))
    sw = 220
    sh = max(2, int(crop.size[1] * sw / float(crop.size[0])))
    crop = crop.resize((sw, sh), Image.BILINEAR).convert("RGB")
    px = crop.load()
    white_rows, dark_rows = [], []
    for r in range(sh):
        mn85, chroma = [], []
        for c in range(0, sw, 2):
            R, G, B = px[c, r]
            mn85.append(min(R, G, B))
            chroma.append(max(R, G, B) - min(R, G, B))
        mn85.sort()
        p85 = mn85[int(0.85 * (len(mn85) - 1))]
        chroma.sort()
        cmed = chroma[len(chroma) // 2]
        if p85 >= WHITE_P85 and cmed <= CHROMA_MED:
            white_rows.append(r)
        md = mn85[len(mn85) // 2]
        if md <= NEAR_BLACK:
            dark_rows.append(r)
    return sh, white_rows, dark_rows


def band_run(rows, n, edge=3):
    """返回 (顶部连续白带高 %, 底部连续白带高 %, 中间孤立白带行数)。"""
    ws = set(rows)
    top = 0
    while top in ws and top < n:
        top += 1
    bot = 0
    while (n - 1 - bot) in ws and bot < n:
        bot += 1
    interior = sum(1 for r in ws if top <= r < n - bot)
    return 100.0 * top / max(1, n), 100.0 * bot / max(1, n), interior


def render_sheet(presets, root, vw, vh, out_path, cols=3, cell_w=420):
    """按同一套数学把**每一幕真正会上屏的那一条**裁出来,拼成一张表。

    为什么需要它:16 套交付后 subagent_vision 连挂两次,32 格复核表没人读过,
    "取景对不对"只剩一堆数字。这张表把数字变回画面:格子里就是浏览器里那一帧
    (start 关键帧,含 object-position 与 scale/translate),左侧**红线**标出被
    白带判据命中的行 —— 有红线但肉眼看着像水墨留白的,就是判据的假阳性;
    有红线且确实是一条死白边,那才是该抬 z 或物理裁掉的。
    """
    cells = []
    for pid in presets:
        pj = os.path.join(root, pid, "preset.json")
        doc = json.load(io.open(pj, encoding="utf-8"))
        for idx, a in enumerate(doc.get("acts") or [], 1):
            path = os.path.join(root, pid, a.get("file") or "")
            if not os.path.exists(path):
                continue
            im = Image.open(path).convert("RGB")
            posx, posy = parse_pct(a.get("pos"))
            z0 = float(a.get("z0", 1.075))
            kx, ky = parse_pct((a.get("kb") or ["0%"])[0])
            u0, u1, v0, v1 = visible_rect(im.size[0], im.size[1], vw, vh, posx, posy, z0, kx, ky)
            box = (u0, u1, v0, v1)
            st = row_stats(im, box)
            crop = im.crop((max(0, int(u0)), max(0, int(v0)), min(im.size[0], int(max(u0, u1))),
                            min(im.size[1], int(max(v0, v1)))))
            im.close()
            if crop.size[0] < 2 or crop.size[1] < 2:
                continue
            ch = int(crop.size[1] * cell_w / float(crop.size[0]))
            crop = crop.resize((cell_w, max(2, ch)), Image.LANCZOS).convert("RGB")
            lab = "%s/%02d #%s  z%.3f  pos%0.f/%0.f" % (pid, idx, (a.get("file") or "?")[:2], z0, posx, posy)
            d = ImageDraw.Draw(crop)
            d.rectangle([0, 0, cell_w - 1, crop.size[1] - 1], outline=(120, 110, 130))
            if st:
                n, wrows, _d = st
                for r in wrows:
                    y = int(r * crop.size[1] / max(1, n))
                    d.rectangle([0, y, 10, y + 1], fill=(255, 40, 40))
                t, b, mid = band_run(wrows, n)
                if max(t, b) >= 2.0 or mid >= 2:
                    lab += "  白%d/%d/%d" % (t, b, mid)
            out = Image.new("RGB", (cell_w, crop.size[1] + 14), (18, 15, 24))
            out.paste(crop, (0, 14))
            ImageDraw.Draw(out).text((3, 2), lab, fill=(236, 228, 214))
            cells.append(out)
    if not cells:
        return
    rows = (len(cells) + cols - 1) // cols
    W = cols * cell_w + (cols + 1) * 8
    H = rows * (cells[0].size[1] + 6) + 30
    sheet = Image.new("RGB", (W, H), (26, 22, 34))
    ImageDraw.Draw(sheet).text((10, 6), "%d 幕的真实上屏取景(起帧)  视口 %dx%d  红=白带判据命中行" % (len(cells), vw, vh), fill=(250, 240, 220))
    hh = {}
    for i, c in enumerate(cells):
        r, cc = divmod(i, cols)
        y = 30
        for k in range(r):
            y += hh.setdefault(k, max(x.size[1] for x in cells[k * cols:(k + 1) * cols])) + 6
        sheet.paste(c, (8 + cc * (cell_w + 8), y))
    sheet.save(out_path, quality=84, optimize=True)
    print("真取景表 -> %s  (%dx%d, %d 格)" % (out_path, sheet.size[0], sheet.size[1], len(cells)))


def main():
    argv = sys.argv[1:]
    root = argv[0] if argv and not argv[0].startswith("--") else "arts2"
    vw, vh = 1920, 1080
    verbose = "--verbose" in argv
    sheet = None
    for i, a in enumerate(argv):
        if a == "--vw":
            vw = int(argv[i + 1])
        if a == "--vh":
            vh = int(argv[i + 1])
        if a == "--sheet":
            sheet = argv[i + 1]

    flags = []
    total_acts = 0
    presets = sorted(d for d in os.listdir(root) if os.path.isdir(os.path.join(root, d)))
    print("# 取景客观校验  视口 %dx%d(16:9 基准)  白带判据 p85>=%s & 彩度中位<=%s" % (vw, vh, WHITE_P85, CHROMA_MED))
    for pid in presets:
        pj = os.path.join(root, pid, "preset.json")
        doc = json.load(io.open(pj, encoding="utf-8"))
        acts = doc.get("acts") or []
        print("\n== %s (%d 幕) %s" % (pid, len(acts), doc.get("title")))
        for idx, a in enumerate(acts, 1):
            fn = a.get("file")
            path = os.path.join(root, pid, fn)
            if not os.path.exists(path):
                flags.append("%s/%02d 文件不存在 %s" % (pid, idx, fn))
                continue
            total_acts += 1
            im = Image.open(path).convert("RGB")
            iw, ih = im.size
            posx, posy = parse_pct(a.get("pos"))
            z0 = float(a.get("z0", 1.075)); z1 = float(a.get("z", 1.0))
            kb = a.get("kb") or ["0%", "0%", "0%", "0%"]
            if len(kb) == 2:
                (k0x, k0y), (k1x, k1y) = parse_pct(kb[0]), parse_pct(kb[1])
            else:
                (k0x, k0y), (k1x, k1y) = parse_pct(kb[0]), parse_pct(kb[1])
            notes = []
            worst = []
            for tag, z, kx, ky in (("起", z0, k0x, k0y), ("止", z1, k1x, k1y)):
                box = visible_rect(iw, ih, vw, vh, posx, posy, z, kx, ky)
                st = row_stats(im, box)
                sl = slivers(vw, vh, z, kx, ky)
                if st:
                    n, wrows, drows = st
                    t, b, mid = band_run(wrows, n)
                    if max(t, b) >= 2.0:
                        notes.append("%s%s带%.0f%%" % (tag, "上" if t >= b else "下", max(t, b)))
                    if mid >= max(2, int(0.02 * n)):
                        notes.append("%s中孤白带%d行" % (tag, mid))
                    if len(drows) >= max(2, int(0.03 * n)):
                        notes.append("%s近黑行%d/%d" % (tag, len(drows), n))
                worst.append(max(sl))
                if max(sl) >= SLIVER_PX:
                    sides = ["左", "右", "上", "下"]
                    s2 = [i for i, v in enumerate(sl) if v >= SLIVER_PX]
                    notes.append("%s漏边%.0fpx(%s)" % (tag, max(sl), "".join(sides[i] for i in s2)))
            span = "%.0f~%.0f行" % (0, 0)
            b0 = visible_rect(iw, ih, vw, vh, posx, posy, max(z0, z1), 0, 0)
            b1 = visible_rect(iw, ih, vw, vh, posx, posy, min(z0, z1), 0, 0)
            span = "见源%d%%" % (100 * (b1[3] - b1[2]) / ih)
            line = "  %02d %-8s %dx%d pos%.0f/%.0f z%.3f->%.3f %s" % (
                idx, fn, iw, ih, posx, posy, z0, z1, span)
            if notes:
                line += "  << " + "; ".join(notes)
                flags.extend(["%s/%02d %s" % (pid, idx, n) for n in notes])
            print(line)
            if verbose:
                print("      可见源矩形 x[%.0f,%.0f] y[%.0f,%.0f]" % b1)
        im.close()
    print("\n合计 %d 套 / %d 幕。有异常的幕 %d 条:" % (len(presets), total_acts, len(flags)))
    for f in flags:
        print("  ! " + f)
    if not flags:
        print("  无 —— 所有幕的可见窗内都没有 ≥2% 的上下白带、没有漏边、没有大面积近黑行")
    if sheet:
        render_sheet(presets, root, vw, vh, sheet)
    return 0


if __name__ == "__main__":
    sys.exit(main())
