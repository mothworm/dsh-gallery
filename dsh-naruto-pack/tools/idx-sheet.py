# -*- coding: utf-8 -*-
"""按编号挑图拼一张判定用联系表(编号规则与 sheets.py/prep-images.py 同构)。
用法: py -3.10 idx-sheet.py <素材根> <输出png> 57 58 59 60 61 62 63 82 83 [--cell 460]
"""
import sys, os, hashlib
from PIL import Image, ImageDraw, ImageOps

EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif"}
MIN_SIDE = 800
root, out = sys.argv[1], sys.argv[2]
want = [a for a in sys.argv[3:] if a.isdigit()]
cell = int(next((a.split("=")[1] for a in sys.argv if a.startswith("--cell=")), 460))

files = []
for dp, dns, fns in os.walk(root):
    dns.sort()
    for fn in sorted(fns):
        if os.path.splitext(fn)[1].lower() in EXTS:
            files.append(os.path.join(dp, fn))
rows = []
for p in files:
    st = os.stat(p)
    try:
        with Image.open(p) as im:
            w, h = im.size
    except Exception:
        w = h = 0
    rows.append(dict(rel=os.path.relpath(p, root), bytes=st.st_size, w=w, h=h, sha=None))
by = {}
for r in rows:
    by.setdefault(r["bytes"], []).append(r)
for s, g in by.items():
    if len(g) > 1:
        for r in g:
            with open(os.path.join(root, r["rel"]), "rb") as fh:
                r["sha"] = hashlib.sha256(fh.read()).hexdigest()[:16]
seen, kept = {}, []
for r in rows:
    if r["sha"]:
        if r["sha"] in seen:
            continue
        seen[r["sha"]] = 1
    kept.append(r)
usable = [r for r in kept if min(r["w"], r["h"]) >= MIN_SIDE and r["w"] > 0]
IDX = {"%02d" % (i + 1): r for i, r in enumerate(usable)}

pad, lab = 10, 46
cols = min(3, max(1, len(want)))
rs = (len(want) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (cell + pad) + pad, rs * (cell + lab + pad) + pad), (18, 16, 22))
dr = ImageDraw.Draw(sheet)
for n, k in enumerate(want):
    key = k if len(k) == 2 else "%02d" % int(k)
    r = IDX.get(key)
    x = pad + (n % cols) * (cell + pad)
    y = pad + (n // cols) * (cell + lab + pad)
    dr.text((x + 2, y), "#%s" % key, fill=(255, 232, 60))
    dr.text((x + 60, y), ("%dx%d" % (r["w"], r["h"])) if r else "无此编号", fill=(180, 230, 255))
    if not r:
        continue
    dr.text((x + 2, y + 13), r["rel"][:70], fill=(200, 200, 200))
    im = ImageOps.exif_transpose(Image.open(os.path.join(root, r["rel"])))
    im = im.convert("RGB") if im.mode not in ("L", "RGB") else im
    im.thumbnail((cell, cell - 14), Image.LANCZOS)
    sheet.paste(im, (x, y + lab))
sheet.save(out, "JPEG", quality=86, optimize=True)
print(out, sheet.size, "挑了 %d 张" % len(want))
