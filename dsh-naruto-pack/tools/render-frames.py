# -*- coding: utf-8 -*-
"""把 arts/<preset>/preset.json 的每幕**按插件的真实几何**渲染成 16:9 画面,拼成总联系表。

  img.nbn-img = object-fit:cover + object-position:pos + scale(z) translate(kb)
  可见带(占整图的比例):fv = min(1, ai/(16/9))/z,fh = min(1,(16/9)/ai)/z
  object-position p ⇒ 带起点 = p*(1-frac)(CSS 对齐规则)
  translate t%(相对视口)⇒ 带中心再沿轴反向偏移 (z*t - (z-1)/2)*(1-frac)
  (推导:元素放大 z 后,视口只覆盖放大图的 1/z;translate 把内容整体推 t,
   等价于窗口反向移动 t/z;再扣掉以中心为原点的缩放锚点偏移。)

顺带给每幕算一个**客观取景分**:主体判据(四角色差>阈)与肤色×细节锚点各有多少质量落在可见带里。
分数低=头/脸会被裁到框外,是精调的首要目标。

用法: py -3.10 render-frames.py <素材根> <arts目录> <输出jpg> [--cell=420]
"""
import sys, os, json, glob
# 本机 Python 工具库:优先环境变量 DSH_PYLIBS,否则取「工作区根/_pylibs」(本脚本在 tools/ 下,上跳三级)。
# 写死绝对路径会把开发机的目录结构发布出去,而且换一台机器就 ImportError。
import os as _os, sys as _sys
_WSROOT = _os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
for _c in (_os.environ.get("DSH_PYLIBS"), _os.path.join(_WSROOT, "_pylibs")):
    if _c and _os.path.isdir(_c):
        _sys.path.insert(0, _c)
        break
import numpy as np
from PIL import Image, ImageDraw, ImageOps

ROOT, ARTS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
CELL = int(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--cell=")), 420))
VA = 16.0 / 9.0
ROWLAB = 150
PAD, LABH = 8, 20
MEASURE_W = 240


def exif_rgb(p):
    im = ImageOps.exif_transpose(Image.open(p))
    if im.mode in ("P", "RGBA", "LA") or (im.mode == "RGB" and "transparency" in im.info):
        im = im.convert("RGBA")
        im = Image.alpha_composite(Image.new("RGBA", im.size, (8, 6, 10, 255)), im).convert("RGB")
    return im.convert("RGB")


def window(ai, pos, kb, z):
    """返回可见带在整图上的 (x0,y0,x1,y1) 比例坐标(0-1)。"""
    p = [float(s.rstrip("%")) / 100.0 for s in pos.split(" ")]
    k = [float(s.rstrip("%")) / 100.0 for s in kb.split(" ")]
    fv, fh = min(1.0, ai / VA) / z, min(1.0, VA / ai) / z
    cx0 = p[0] * (1 - fh) + fh / 2.0
    cy0 = p[1] * (1 - fv) + fv / 2.0
    cx0 += (z * k[0] - (z - 1) / 2.0) * (1 - fh)
    cy0 += (z * k[1] - (z - 1) / 2.0) * (1 - fv)
    return (cx0 - fh / 2, cy0 - fv / 2, cx0 + fh / 2, cy0 + fv / 2)


def frame(src, pos, kb, z, cell):
    im = exif_rgb(src)
    W, H = im.size
    ai = W / float(H)
    x0, y0, x1, y1 = window(ai, pos, kb, z)
    if (x1 - x0) >= 0.999 and (y1 - y0) >= 0.999:
        crop = im
    else:
        a, b, c, d = int(round(x0 * W)), int(round(y0 * H)), int(round(x1 * W)), int(round(y1 * H))
        a, b = max(0, a), max(0, b); c, d = min(W, c), min(H, d)
        if c - a < 8 or d - b < 8:
            crop = im
        else:
            crop = im.crop((a, b, c, d))
    tw, th = cell, int(round(cell * 9 / 16.0))
    return crop.resize((tw, th), Image.LANCZOS)


def scores(src, pos, kb, z):
    """客观取景分:非背景主体质量 / 肤色×细节锚点质量,落在可见带里的比例。"""
    im = exif_rgb(src)
    W, H = im.size
    ai = W / float(H)
    tw = MEASURE_W
    th = max(2, int(round(H * tw / float(W))))
    a = np.asarray(im.resize((tw, th), Image.LANCZOS)).astype(np.float32)
    c = 6
    corners = np.stack([a[:c, :c].reshape(-1, 3).mean(0), a[:c, -c:].reshape(-1, 3).mean(0),
                        a[-c:, :c].reshape(-1, 3).mean(0), a[-c:, -c:].reshape(-1, 3).mean(0)])
    dist = np.clip(np.sqrt(((a - corners.mean(0)) ** 2).sum(2)), 0, 255)
    m = (dist > 45).astype(np.float32)
    ycc = np.asarray(Image.fromarray(np.asarray(im.resize((tw, th), Image.LANCZOS))).convert("YCbCr")).astype(np.float32)
    skin = ((ycc[..., 1] > 133) & (ycc[..., 1] < 173) & (ycc[..., 2] > 77) & (ycc[..., 2] < 127)
            & (ycc[..., 0] > 60)).astype(np.float32)
    g = np.asarray(Image.fromarray(np.asarray(im.convert("L").resize((tw, th)))).convert("L"), np.float32)
    sm = np.zeros_like(g)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            sm += np.roll(np.roll(g, dy, 0), dx, 1)
    sm /= 9.0
    grad = np.clip((np.abs(np.roll(sm, -1, 1) - np.roll(sm, 1, 1)) + np.abs(np.roll(sm, -1, 0) - np.roll(sm, 1, 0))) / 40.0, 0, 1)
    w = skin * (0.25 + grad)
    x0, y0, x1, y1 = window(ai, pos, kb, z)
    r0, r1 = max(0, int(y0 * th)), min(th, int(y1 * th))
    c0, c1 = max(0, int(x0 * tw)), min(tw, int(x1 * tw))
    ms = float(m[r0:r1, c0:c1].sum() / max(1e-6, m.sum()))
    ws = float(w[r0:r1, c0:c1].sum() / max(1e-6, w.sum())) if w.sum() > 1e-3 else -1
    return ms, ws


presets = [os.path.basename(p) for p in sorted(glob.glob(os.path.join(ARTS, "*"))) if os.path.isdir(p)]
data = []
for pid in presets:
    pj = os.path.join(ARTS, pid, "preset.json")
    if not os.path.exists(pj):
        continue
    raw = open(pj, encoding="utf-8").read()
    d = json.loads(raw)
    mj = json.loads(open(os.path.join(ARTS, pid, "measure.json"), encoding="utf-8").read()) if os.path.exists(
        os.path.join(ARTS, pid, "measure.json")) else dict(acts=[])
    data.append((pid, d, mj))

ncols = max(len(d["acts"]) for _, d, _ in data)
w = ROWLAB + ncols * (CELL + PAD) + PAD
h = PAD + len(data) * (int(CELL * 9 / 16.0) + LABH + 26 + PAD) + PAD
sheet = Image.new("RGB", (w, h), (14, 12, 18))
dr = ImageDraw.Draw(sheet)
print("%-12s %s" % ("preset", "每幕: 幕号(素材号) 主体带内%  脸锚点带内%"))
rows = []
for ri, (pid, d, mj) in enumerate(data):
    y = PAD + ri * (int(CELL * 9 / 16.0) + LABH + 26 + PAD)
    dr.text((6, y + 4), "%s  (%d幕 %.2fs)" % (pid, len(d["acts"]), sum(a["dur"] for a in d["acts"]) / 1000.0),
            fill=(255, 232, 60))
    dr.text((6, y + 20), d.get("open", ""), fill=(120, 200, 255))
    cells = []
    for i, a in enumerate(d["acts"]):
        idx = mj["acts"][i]["idx"] if i < len(mj.get("acts", [])) else "?"
        src = os.path.join(ROOT, mj["acts"][i]["rel"]) if mj.get("acts") else ""
        img = frame(src, a["pos"], a["kb"][1], a["z"], CELL)
        ms, ws = scores(src, a["pos"], a["kb"][1], a["z"])
        rows.append((pid, i + 1, idx, ms, ws, a["pos"], a["kb"], a["z0"], a["z"]))
        x = ROWLAB + i * (CELL + PAD)
        dr.text((x, y), "%s-%02d #%s subj=%.0f%% face=%s" % (
            pid, i + 1, idx, ms * 100, ("%.0f%%" % (ws * 100)) if ws >= 0 else "无脸"), fill=(200, 255, 200))
        sheet.paste(img, (x, y + LABH))
        dr.rectangle([x, y + LABH, x + CELL - 1, y + LABH + int(CELL * 9 / 16.0) - 1], outline=(70, 60, 90))
        dr.text((x + 2, y + LABH + int(CELL * 9 / 16.0) + 2),
                "pos%s z%.2f→%.2f kb%s %dms" % (a["pos"], a["z0"], a["z"], "→".join(a["kb"]), a["dur"]),
                fill=(150, 170, 200))
    dr.line([(0, y + int(CELL * 9 / 16.0) + LABH + 22), (w, y + int(CELL * 9 / 16.0) + LABH + 22)], fill=(45, 40, 60))
sheet.save(OUT, "JPEG", quality=86, optimize=True)
print("\n-> %s  %dx%d  %.1fMB" % (OUT, sheet.size[0], sheet.size[1], os.path.getsize(OUT) / 1048576.0))
bad = [r for r in rows if r[4] >= 0 and r[4] < 0.25]
print("脸锚点落在可见带外(<25%%)的幕: %d" % len(bad))
for r in sorted(bad, key=lambda x: x[4]):
    print("  %-12s act%d #%s face带内=%.0f%% pos=%s kb=%s z=%.2f" % (r[0], r[1], r[2], r[4] * 100, r[5], r[6], r[8]))
json.dump([dict(preset=r[0], act=r[1], idx=r[2], subj_in_window=round(r[3], 4),
                face_in_window=(round(r[4], 4) if r[4] >= 0 else None), pos=r[5], kb=r[6], z0=r[7], z=r[8])
           for r in rows], open(os.path.join(ARTS, "_framing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("取景分留证 -> arts/_framing.json")
