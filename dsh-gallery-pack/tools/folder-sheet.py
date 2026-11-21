#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""按全局编号给某个素材文件夹出一张带主色的联系表。

用途:决定一支主题的「语气」时,先看图 + 看主色,别凭文件夹名字脑补配色。
每张缩略图下带 5 个主色块,主色是从全图算的(不是从边角),所以暗背景上的
亮烟花不会被黑场吞掉 —— 量化到 4 位深度再取频次前 5,顺带把几乎同色的合并。

  py -3.10 tools/folder-sheet.py "<prep-images --list 的输出文件>" <输出jpg> 57 58 59 ...

--list 的行形状(权威枚举,别自己排序):
  57 3840x2160 武当花火\\mmexport1794109262542.jpg
"""
import os
import sys
from collections import Counter

from PIL import Image, ImageDraw, ImageOps

SRC_ROOT = r"D:\图片\板绘素材\火影手游壁纸"
CELL_W, CELL_H = 620, 330          # 缩略图框;竖图按高等比缩进去
LABEL_H = 22
SWATCH_H = 16
GAP = 10
COLS = 2


def parse_list(path):
    """--list 每行 -> {编号: (宽, 高, 相对路径)}

    ⚠️ 编码要三种都试:本机 pwsh 是 Windows PowerShell 5.1,它自己的 `>` 重定向写出来的是
    **UTF-16LE(开头 0xFF 0xFE)**,拿 utf-8 读会 UnicodeDecodeError。py 直接输出的是 utf-8。
    """
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "utf-16", "utf-8", "gbk"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = raw.decode("utf-8", "replace")
    inv = {}
    for line in text.splitlines():
        parts = line.split()
        if len(parts) < 3 or not parts[0].isdigit():
            continue
        wh, rel = parts[1], "\\".join(parts[2:])
        if "x" not in wh:
            continue
        w, h = wh.split("x")
        inv[int(parts[0])] = (int(w), int(h), rel)
    return inv


def dominant(im, n=5):
    """全图主色:量化到 4 位深度(4096 色)取频次前 n,再合并色差极小的相邻项。"""
    q = im.convert("RGB").quantize(colors=16, method=Image.MEDIANCUT)
    pal = q.getpalette()
    counts = Counter(q.getdata())
    ranked = sorted(counts.items(), key=lambda kv: -kv[1])[:12]
    out = []
    for idx, _cnt in ranked:
        c = tuple(pal[idx * 3:idx * 3 + 3])
        if any(sum(abs(a - b) for a, b in zip(c, d)) < 40 for d in out):
            continue
        out.append(c)
        if len(out) >= n:
            break
    return out


def cell(num, wh, rel):
    src = os.path.join(SRC_ROOT, rel)
    if not os.path.exists(src):
        return None
    im = ImageOps.exif_transpose(Image.open(src))
    im = im.convert("RGB")
    cols = dominant(im)
    # 顺手把主色当文字打出来:定主题语气/89 支 token 要的是十六进制数,不是"感觉是深蓝"
    print("  %d 主色 %s" % (num, " ".join("#%02x%02x%02x" % c for c in cols)))
    im.thumbnail((CELL_W, CELL_H), Image.LANCZOS)
    box = Image.new("RGB", (CELL_W, CELL_H + LABEL_H + SWATCH_H), (12, 10, 18))
    ox = (CELL_W - im.size[0]) // 2
    oy = (CELL_H - im.size[1]) // 2
    box.paste(im, (ox, oy))
    d = ImageDraw.Draw(box)
    d.text((6, CELL_H + 3), "%d  %dx%d  %s" % (num, wh[0], wh[1], os.path.basename(rel)),
           fill=(232, 226, 216))
    x = 6
    for c in cols:
        d.rectangle([x, CELL_H + LABEL_H, x + 40, CELL_H + LABEL_H + SWATCH_H], fill=c,
                    outline=(90, 84, 96))
        x += 46
    return box


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        return 2
    lst, out = sys.argv[1], sys.argv[2]
    nums = [int(a) for a in sys.argv[3:]]
    inv = parse_list(lst)
    missing = [n for n in nums if n not in inv]
    if missing:
        print("!! --list 里没有这些编号: %s" % missing)
        return 1

    cells = []
    for n in nums:
        c = cell(n, inv[n][:2], inv[n][2])
        if c is None:
            print("!! 源文件不存在: %d -> %s" % (n, inv[n][2]))
            continue
        cells.append(c)
    if not cells:
        return 1

    rows = (len(cells) + COLS - 1) // COLS
    W = COLS * CELL_W + (COLS + 1) * GAP
    H = rows * (CELL_H + LABEL_H + SWATCH_H) + (rows + 1) * GAP + 40
    sheet = Image.new("RGB", (W, H), (22, 18, 30))
    d = ImageDraw.Draw(sheet)
    d.text((GAP, 10), "%d 张   每张下方 5 个色块 = 全图主色(量化 4096 色取频次前 5)" % len(cells),
           fill=(250, 240, 220))
    for i, c in enumerate(cells):
        r, col = divmod(i, COLS)
        x = GAP + col * (CELL_W + GAP)
        y = 40 + GAP + r * (c.size[1] + GAP)
        sheet.paste(c, (x, y))
    sheet.save(out, quality=86, optimize=True)
    print("OK -> %s  %dx%d  %d 张" % (out, sheet.size[0], sheet.size[1], len(cells)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
