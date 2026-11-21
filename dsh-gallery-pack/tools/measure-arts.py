# -*- coding: utf-8 -*-
"""给「一个素材文件夹 = 一个开屏预设」的运镜参数提供**客观像素判据**(只测事实,不做决定)。

编号枚举与 sheets.py / prep-images.py 完全同构(walk 排序 + 字节级去重 + 短边>=800),
所以这里算出来的 66 号 == prep-images.py --list 的 66 号。

测的东西(每张都算,全部落进 JSON 留证):
  A. 主体重心  : 缩到 300px 宽,四角均色为背景,色差>阈值的像素加权重心。
                 cx 左→右、cy_top 上→下。规范写 pos=round((1-cy)*100),那里的 cy 是从底往上量,
                 等于这里的 cy_top(用已标定的 48 号"面部中上→pos_y=30%"对齐验证过约定)。
  B. 面积/边带 : area = 非背景占比;edge_share = 主体像素落在四边 6% 边带的比例(规范 3 的判据);
                 band_cov = 边带里有多少是主体(辅助量,给精调看)。
  C. 九宫格    : 每格的 平均亮度 / 肤色占比 / 细节能量(梯度均值) + 外接框。
                 最暗格=入场侧,最亮格=出场侧(规范 2);肤色+细节重心 = "脸在哪"的客观候选。
  D. 白边/watermark: 逐字照搬 itachi-theme/build/process-images.py 的 detect_letterbox 新判据
                 (中部 20~80% 列、min 通道 85 百分位>=215 且中位彩度<=10 的连续顶/底行段,上限 20%),
                 在"输出分辨率"(长边<=1600,不放大)上量,和最终上机的像素一致。
  E. cover 几何: fv0/fh0 = 16:9 上 cover 后可见带占整图的高/宽比例(z=1 时),供上层算 pos。

用法: py -3.10 measure-arts.py <素材根> <输出json> [--only=66,48] [--long=1600] [--width=300]
"""
import sys, os, json, hashlib, time

# 本机 Python 工具库:优先环境变量 DSH_PYLIBS,否则取「工作区根/_pylibs」(本脚本在 tools/ 下,上跳三级)。
# 写死绝对路径会把开发机的目录结构发布出去,而且换一台机器就 ImportError。
import os as _os, sys as _sys
_WSROOT = _os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
for _c in (_os.environ.get("DSH_PYLIBS"), _os.path.join(_WSROOT, "_pylibs")):
    if _c and _os.path.isdir(_c):
        _sys.path.insert(0, _c)
        break
import numpy as np
from PIL import Image, ImageOps

ROOT = sys.argv[1]
OUT = sys.argv[2]
LONG = int(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--long=")), 1600))
ONLY = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--only=")), None)
MEASURE_W = int(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--width=")), 300))
VA = 16.0 / 9.0            # 目标视口比例(开屏是全窗口,近似 16:9)

BG_DELTA = 45.0            # 与四角均色的欧氏距离阈值(标定见 tools/ 下的说明;约每通道 15)
EDGE_BAND = 0.06           # 规范 3:四边各 6% 边框带
AREA_PUSH = 0.08           # 规范 3:主体占比 <8% → 推近
EDGE_PULL = 0.25           # 规范 3:主体像素落在边带比例 >0.25 → 拉远

EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif"}
MIN_SIDE = 800

# ---------------- 编号枚举(与 prep-images.py 逐字同构,不要改) ----------------
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


# ---------------- 判据 D:白边(照搬 itachi-theme 的新判据) ----------------
def detect_letterbox(a, cap=0.20):
    h, w = a.shape[:2]
    x0, x1 = int(w * 0.2), int(w * 0.8)
    seg = a[:, x0:x1, :].astype(np.int64)
    p85 = np.percentile(seg.min(axis=2), 85, axis=1)
    medchroma = np.median(seg.max(axis=2) - seg.min(axis=2), axis=1)
    isband = (p85 >= 215) & (medchroma <= 10)
    top = 0
    while top < h and isband[top]:
        top += 1
    bot = 0
    while bot < h and isband[h - 1 - bot]:
        bot += 1
    lim = int(h * cap)
    return int(min(top, lim)), int(min(bot, lim)), h


def load_rgb(path):
    im = ImageOps.exif_transpose(Image.open(path))
    if im.mode in ("P", "RGBA", "LA") or (im.mode == "RGB" and "transparency" in im.info):
        im = im.convert("RGBA")
        im = Image.alpha_composite(Image.new("RGBA", im.size, (8, 6, 10, 255)), im).convert("RGB")
    else:
        im = im.convert("RGB")
    return im


def grad_energy(g):
    """3x3 均值平滑 + 中心差分绝对值(Sobel 的简化版),纯 numpy,不依赖 Pillow 滤波器版本。"""
    sm = np.zeros_like(g)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            sm += np.roll(np.roll(g, dy, 0), dx, 1)
    sm /= 9.0
    gx = np.abs(np.roll(sm, -1, 1) - np.roll(sm, 1, 1))
    gy = np.abs(np.roll(sm, -1, 0) - np.roll(sm, 1, 0))
    return np.clip((gx + gy) / 40.0, 0, 1)


def measure(idx, r):
    src = os.path.join(ROOT, r["rel"])
    im = load_rgb(src)
    W, H = im.size
    ai = W / float(H)
    # ---- D:输出分辨率上的白边 ----
    sc = LONG / float(max(W, H))
    work = im.resize((int(round(W * sc)), int(round(H * sc))), Image.LANCZOS) if sc < 1 else im
    arr = np.asarray(work)
    t_px, b_px, hh = detect_letterbox(arr)
    del arr, work
    o = dict(
        idx=idx, rel=r["rel"], bytes=r["bytes"], w=W, h=H,
        orient=("v" if ai < VA - 0.02 else ("h" if ai > VA + 0.02 else "sq")),
        aspect=round(ai, 4), out_w=im.size[0] if sc >= 1 else int(round(W * sc)),
        out_h=im.size[1] if sc >= 1 else int(round(H * sc)),
        matte_top_px=t_px, matte_bot_px=b_px, matte_h_ref=hh,
        matte_top=round(t_px / float(hh), 4), matte_bot=round(b_px / float(hh), 4),
        matte=bool(t_px or b_px),
        # ---- E:16:9 cover 可见带占比(z=1) ----
        fv0=round(min(1.0, ai / VA), 4), fh0=round(min(1.0, VA / ai), 4),
    )
    # ---- A/B/C:300px 缩图上的分割与九宫格 ----
    tw = MEASURE_W
    th = max(2, int(round(H * tw / float(W))))
    a = np.asarray(im.resize((tw, th), Image.LANCZOS)).astype(np.float32)
    c = 6
    corners = np.stack([a[:c, :c].reshape(-1, 3).mean(0), a[:c, -c:].reshape(-1, 3).mean(0),
                        a[-c:, :c].reshape(-1, 3).mean(0), a[-c:, -c:].reshape(-1, 3).mean(0)])
    bg = corners.mean(0)
    dist = np.clip(np.sqrt(((a - bg) ** 2).sum(axis=2)), 0, 255)
    m = (dist > BG_DELTA).astype(np.float32)
    if m.sum() < 8:
        m = np.ones_like(m)
    ys, xs = np.nonzero(m > 0)
    cx = float(xs.mean()) / tw
    cy_top = float(ys.mean()) / th
    area = float(m.mean())
    bx, by = int(round(tw * EDGE_BAND)), int(round(th * EDGE_BAND))
    band = np.zeros_like(m, bool)
    band[:by, :] = True; band[-by:, :] = True; band[:, :bx] = True; band[:, -bx:] = True
    inband = m > 0
    edge_share = float((inband & band).sum() / float(max(1, inband.sum())))
    band_cov = float((inband & band).sum() / float(max(1, band.sum())))
    ycc = np.asarray(Image.fromarray(np.asarray(im.resize((tw, th), Image.LANCZOS))).convert("YCbCr")).astype(np.float32)
    skin = ((ycc[..., 1] > 133) & (ycc[..., 1] < 173) & (ycc[..., 2] > 77) & (ycc[..., 2] < 127)
            & (ycc[..., 0] > 60)).astype(np.float32)
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    grad = grad_energy(lum)
    gh, gw = th // 3, tw // 3
    grid = []
    for i in range(3):
        row = []
        for j in range(3):
            sl = (slice(i * gh, (i + 1) * gh), slice(j * gw, (j + 1) * gw))
            n = float((m[sl] > 0).sum())
            row.append(dict(
                r=i, c=j, lum=round(float(lum[sl].mean()), 2),
                skin=round(float(skin[sl].mean()), 4),
                detail=round(float(grad[sl].mean()), 4),
                subj=round(float(m[sl].mean()), 4)))
        grid.append(row)
    flat = [grid[i][j] for i in range(3) for j in range(3)]
    side = lambda i, j: (("T" if i == 0 else "B" if i == 2 else "") + ("L" if j == 0 else "R" if j == 2 else "")) or "C"
    dk = min(flat, key=lambda g: g["lum"]); br = max(flat, key=lambda g: g["lum"])
    # 脸/主体上部的客观候选:肤色×细节 的重心
    wts = skin * (0.25 + grad)
    if wts.sum() > 1e-3:
        fx = float(np.arange(tw).dot(wts.sum(0)) / wts.sum()) / tw
        fy = float(np.arange(th).dot(wts.sum(1)) / wts.sum()) / th
    else:
        fx = fy = -1.0
    o.update(
        bg_rgb=[round(float(v), 1) for v in bg],
        cx=round(cx, 4), cy_top=round(cy_top, 4), cy=round(1 - cy_top, 4),
        area=round(area, 4), edge_share=round(edge_share, 4), band_cov=round(band_cov, 4),
        subj_bbox=[round(float(xs.min()) / tw, 3), round(float(ys.min()) / th, 3),
                   round(float(xs.max()) / tw, 3), round(float(ys.max()) / th, 3)],
        face_cx=round(fx, 4), face_cy_top=round(fy, 4),
        grid=grid,
        dark_cell=dict(side=side(dk["r"], dk["c"]), r=dk["r"], c=dk["c"], lum=dk["lum"]),
        bright_cell=dict(side=side(br["r"], br["c"]), r=br["r"], c=br["c"], lum=br["lum"]),
        zoom_hint=("pull" if edge_share > EDGE_PULL else ("push" if area < AREA_PUSH else "flat")),
        luma_mean=round(float(lum.mean()), 2), chroma_mean=round(float((a.max(2) - a.min(2)).mean()), 2),
    )
    return o


want = sorted(IDX) if not ONLY else [x.strip().zfill(2) for x in ONLY.split(",")]
res, t0 = {}, time.time()
for k in want:
    r = IDX.get(k)
    if not r:
        res[k] = dict(idx=k, error="无此编号")
        continue
    try:
        res[k] = measure(k, r)
        d = res[k]
        print("%s %-44s %4dx%-4d pos_cand=%2d,%2d face=%2d,%2d area=%.3f edge=%.3f zoom=%-4s matte=%.3f/%.3f dark=%s bright=%s %s" % (
            k, d["rel"][:44], d["w"], d["h"],
            min(75, max(25, round(d["cx"] * 100))), min(60, max(15, round(d["cy_top"] * 100))),
            min(75, max(25, round(d["face_cx"] * 100))), min(60, max(15, round(d["face_cy_top"] * 100))),
            d["area"], d["edge_share"], d["zoom_hint"], d["matte_top"], d["matte_bot"],
            d["dark_cell"]["side"], d["bright_cell"]["side"], d["orient"]))
    except Exception as e:
        res[k] = dict(idx=k, rel=r["rel"], error=repr(e))
        print("%s ERROR %r" % (k, e))
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)


def dump_enum(path):
    """编号表(全局排序后的可用清单)。给 build-arts-data.py / check-arts.mjs 复验编号用。"""
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(dict(root=ROOT, min_side=MIN_SIDE, n=len(usable),
                       enum=[dict(idx="%02d" % (i + 1), rel=r["rel"], w=r["w"], h=r["h"], bytes=r["bytes"])
                             for i, r in enumerate(usable)]), fh, ensure_ascii=False, indent=1)


dump_enum(os.path.join(os.path.dirname(os.path.abspath(OUT)), "idx.json"))
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(dict(generated=time.strftime("%F %T"), root=ROOT, measure_w=MEASURE_W,
                   bg_delta=BG_DELTA, edge_band=EDGE_BAND, area_push=AREA_PUSH,
                   edge_pull=EDGE_PULL, long_edge=LONG, viewport_ratio=VA, n=len(want),
                   idx=res), fh, ensure_ascii=False, indent=1)
print("\n%d 张 / %.1fs -> %s" % (len(want), time.time() - t0, OUT))
