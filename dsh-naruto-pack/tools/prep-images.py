# -*- coding: utf-8 -*-
"""从素材根按"编号"取图 → 裁切/压规格 → 落 dsh-boot-naruto/assets/。
编号规则与 sheets.py 完全一致(walk 排序 + 字节级去重 + 短边>=800),所以同一份素材得到同一编号。
用法: py -3.10 prep-images.py <素材根> <输出目录> [--long 1600] [--q 80] [--list]
"""
import sys, os, hashlib
from PIL import Image, ImageOps, ImageEnhance

ROOT = sys.argv[1]
OUTD = sys.argv[2]
LONG = int(next((a.split("=")[1] for a in sys.argv if a.startswith("--long=")), 1600))
Q = int(next((a.split("=")[1] for a in sys.argv if a.startswith("--q=")), 80))
MIN_SIDE = 800
EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif"}

# ---- 与 sheets.py 同构的枚举(不要改排序逻辑,否则编号会漂) ----
files = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames.sort()
    for fn in sorted(filenames):
        if os.path.splitext(fn)[1].lower() in EXTS:
            files.append(os.path.join(dirpath, fn))
rows = []
for p in files:
    st = os.stat(p)
    try:
        with Image.open(p) as im:
            w, h = im.size
    except Exception:
        w = h = 0
    rows.append(dict(rel=os.path.relpath(p, ROOT), bytes=st.st_size, w=w, h=h, sha=None))
by_size = {}
for r in rows:
    by_size.setdefault(r["bytes"], []).append(r)
for size, g in by_size.items():
    if len(g) > 1:
        for r in g:
            with open(os.path.join(ROOT, r["rel"]), "rb") as fh:
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

# ---- 分镜表:编号 -> 输出名 / 上下左右裁切比例 / 主体位置(给 CSS object-position) ----
SCENES = [
    ("66", "s1-konan",  dict(top=0.00, bottom=0.00), "74% 26%"),   # 晓袍小南,主体右上
    ("48", "s2-itachi", dict(top=0.00, bottom=0.00), "62% 34%"),   # 鼬噤声特写(红瞳在右)
    ("68", "s3-paper",  dict(top=0.045, bottom=0.055), "50% 46%"),  # 纸翼展开,上下白条需裁
    ("50", "s4-moon",   dict(top=0.00, bottom=0.00), "50% 62%"),   # 舍人望星空(地平线偏下)
    ("53", "s5-blast",  dict(top=0.00, bottom=0.00), "50% 45%"),   # 青绿能量球爆发
    ("14", "s6-hashirama", dict(top=0.00, bottom=0.00), "38% 66%"),  # 柱间踏巨蛇(左)
    ("81", "s7-madara", dict(top=0.00, bottom=0.00), "62% 50%"),   # 斑火焰斩(右)
    ("23", "s8-brothers", dict(top=0.00, bottom=0.00), "50% 48%"),  # 双写轮眼+宇智波家徽
    ("03", "s9-final",  dict(top=0.00, bottom=0.00), "50% 44%"),   # 千鸟 × 紫炎 对角
]

if "--list" in sys.argv:
    for k in sorted(IDX):
        print(k, "%dx%d" % (IDX[k]["w"], IDX[k]["h"]), IDX[k]["rel"])
    sys.exit(0)

os.makedirs(OUTD, exist_ok=True)
manifest = []
for idx, name, crop, pos in SCENES:
    r = IDX.get(idx)
    if not r:
        print("!! 编号 %s 不在可用清单里(素材目录变过?先跑 --list)" % idx)
        continue
    src = os.path.join(ROOT, r["rel"])
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)
    if im.mode in ("P", "RGBA", "LA") or (im.mode == "RGB" and "transparency" in im.info):
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (8, 6, 10, 255))
        im = Image.alpha_composite(bg, im).convert("RGB")
    else:
        im = im.convert("RGB")
    w, h = im.size
    t = int(h * crop.get("top", 0))
    b = int(h * (1 - crop.get("bottom", 0)))
    l = int(w * crop.get("left", 0))
    rgt = int(w * (1 - crop.get("right", 0)))
    im = im.crop((l, t, rgt, b))
    w, h = im.size
    scale = LONG / float(max(w, h))
    if scale < 1:
        im = im.resize((int(round(w * scale)), int(round(h * scale))), Image.LANCZOS)
    im = ImageEnhance.Contrast(im).enhance(1.04)  # 深底主题:略提对比,压黑更实
    dst = os.path.join(OUTD, name + ".jpg")
    im.save(dst, "JPEG", quality=Q, optimize=True, progressive=True)
    manifest.append(dict(id=name, idx=idx, src=r["rel"], file=os.path.basename(dst),
                         w=im.size[0], h=im.size[1], bytes=os.path.getsize(dst), pos=pos))
    print("%-14s %-5s %5dx%-5d %7.0fKB  pos=%-9s  %s" % (name, idx, im.size[0], im.size[1], os.path.getsize(dst) / 1024, pos, r["rel"]))
mb = sum(m["bytes"] for m in manifest) / 1048576.0
print("\n共 %d 张, 合计 %.2f MB (base64 后约 %.2f MB)" % (len(manifest), mb, mb * 4 / 3))
# 清单给 build-client.mjs 读
with open(os.path.join(OUTD, "manifest.json"), "w", encoding="utf-8") as fh:
    import json
    json.dump(manifest, fh, ensure_ascii=False, indent=1)
print("manifest.json ->", os.path.join(OUTD, "manifest.json"))
