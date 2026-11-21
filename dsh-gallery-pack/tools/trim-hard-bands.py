#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""裁掉**烘死的纸白边**(baked matte),并且**不改动取景**。

为什么不能靠抬 z 藏:可见窗高度比例 = 1/z,要藏掉顶部 12.1% 需要 z >= 2.79,
而校验上限是 1.25 —— 所以只能物理裁。

为什么"裁了等于没裁":刀口落在**悬崖**上。带的定义是"从边界起连续 >=85% 近白"的
行,所以刀口内侧那一行正是画面的第一个非白行 —— 内容一行都没少。

带 vs 雾/墨 的区分(不能只看白不白,数字会同形、画面不同):
    从 80% 跌到 25% 只花 <=6 行  => 硬边(烘死的 matte)  => 该裁
    花几十~几百行缓降            => 云烟 / 水墨晕染      => **不许裁**(那是画本身)
实测对照:itachi/03 顶 109 行(锐度 0)、底 97 行(锐度 1) = 纸;
          brothers/03 底 49 行但锐度 209 行 = 烟;柱间 hashirama/04 = 水墨留白。

    py -3.10 tools/trim-hard-bands.py arts2/itachi 03            # 干跑,只报数
    py -3.10 tools/trim-hard-bands.py arts2/itachi 03 --apply    # 裁 + 重算 pos + 写回
"""
import io
import json
import os
import shutil
import sys
import time

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module

cf = import_module("check-framing")

VW, VH = 1920, 1080
NEAR_WHITE = 236
BAND_P = 0.85
HI_P, LO_P = 0.80, 0.25
SHARP_MAX = 6          # 跌出带外只花这么多行以内 => 硬边
MAX_CROP_PCT = 0.16    # 单边最多裁 16%,再多一定是误判


def band_rows(f, side):
    g = f if side == "top" else f[::-1]
    n = 0
    while n < len(g) and g[n] >= BAND_P:
        n += 1
    hi = next((i for i in range(len(g)) if g[i] < HI_P), None)
    lo = next((i for i in range(hi or 0, len(g)) if g[i] < LO_P), None) if hi is not None else None
    sharp = None if (hi is None or lo is None) else lo - hi
    hard = n > 4 and sharp is not None and sharp <= SHARP_MAX
    return n, sharp, hard


def main():
    d = sys.argv[1]
    stem = sys.argv[2]
    apply = "--apply" in sys.argv
    pj = os.path.join(d, "preset.json")
    jp = os.path.join(d, stem + ".jpg")
    doc = json.load(io.open(pj, encoding="utf-8"))
    act = None
    for a in doc.get("acts") or []:
        if (a.get("file") or "").startswith(stem):
            act = a
            break
    if act is None:
        print("!! 这套里没有 " + stem + ".jpg 这一幕")
        return 1
    a = np.array(Image.open(jp).convert("RGB"))
    h0 = a.shape[0]
    w0 = a.shape[1]
    f = (a.min(axis=2) >= NEAR_WHITE).mean(axis=1)
    top, stop, htop = band_rows(f, "top")
    bot, sbot, hbot = band_rows(f, "bot")
    print("%s  原 %dx%d" % (jp, w0, h0))
    print("  顶:带 %d 行(%.1f%%) 锐度 %s 行 => %s" % (top, 100.0 * top / h0, stop, "硬边(裁)" if htop else "非硬边(不动)"))
    print("  底:带 %d 行(%.1f%%) 锐度 %s 行 => %s" % (bot, 100.0 * bot / h0, sbot, "硬边(裁)" if hbot else "非硬边(不动)"))
    top = top if htop else 0
    bot = bot if hbot else 0
    if top > MAX_CROP_PCT * h0 or bot > MAX_CROP_PCT * h0:
        print("!! 单边超过 16% 上限,拒绝裁 —— 请人工看图"); return 2
    if top + bot == 0:
        print("  没有硬边带,什么都不做。"); return 0
    if not apply:
        print("  干跑(加 --apply 才写盘):将裁 %dx%d -> %dx%d" % (w0, h0, w0, h0 - top - bot))
        return 0

    stamp = time.strftime("%Y%m%d%H%M%S")
    shutil.copyfile(jp, jp + ".bak-hardband-" + stamp)
    shutil.copyfile(pj, pj + ".bak-hardband-" + stamp)

    px, py = cf.parse_pct(act["pos"])
    z0 = float(act.get("z0", 1.075)); z1 = float(act.get("z", 1.0))
    kb = list(act.get("kb") or ["0%"])
    while len(kb) < 2:
        kb.append("0%")
    k0 = cf.parse_pct(kb[0]); k1 = cf.parse_pct(kb[1])
    eps = ((z0, k0[0], k0[1]), (z1, k1[0], k1[1]))
    old = []
    for z, kx, ky in eps:
        _u0, _u1, v0, v1 = cf.visible_rect(w0, h0, VW, VH, px, py, z, kx, ky)
        old.append((v0, v1, (v0 + v1) / 2.0))

    im = Image.open(jp).convert("RGB")
    im2 = im.crop((0, top, im.size[0], im.size[1] - bot))
    im2.save(jp, "JPEG", quality=80, optimize=True, progressive=True)
    W, H = im2.size
    with open(jp, "rb") as fh:
        sig = b"\xff\xc2" in fh.read()
    print("  裁后 %dx%d  AR %.4f  progressive(SOF2)=%s" % (W, H, W / float(H), sig))
    if not sig:
        print("!! 存成了非 progressive,check-arts2 会按 SOF2 认;已中止"); return 3

    # pos_y 重解:让新图每一端可见窗的**中心行**(换算回旧坐标)尽量等于裁前那一行
    best = None
    y = 0.0
    while y <= 100.0:
        err = 0.0
        for (z, kx, ky), o, in [(e, old[i]) for i, e in enumerate(eps)]:
            _u0, _u1, v0, v1 = cf.visible_rect(W, H, VW, VH, px, y, z, kx, ky)
            err += abs((v0 + v1) / 2.0 + top - o[2])
        if best is None or err < best[0]:
            best = (err, y)
        y += 0.25
    err, ny = best
    print("  旧可见窗 起[%.0f,%.0f]中%.0f 止[%.0f,%.0f]中%.0f" % (old[0][0], old[0][1], old[0][2], old[1][0], old[1][1], old[1][2]))
    print("  pos %d%% %d%% -> %d%% %d%%  (保内容残差 %.1f 行)" % (px, py, round(px), round(ny), err))
    act["pos"] = "%d%% %d%%" % (round(px), round(ny))
    io.open(pj, "w", encoding="utf-8", newline="\n").write(json.dumps(doc, ensure_ascii=False, indent=2))
    raw = io.open(pj, encoding="utf-8").read()
    with open(pj, "rb") as fh:
        bom = fh.read(3) == b"\xef\xbb\xbf"
    print("  写回:preset.json %d B  BOM=%s  幕数=%d  act.pos=%s" % (len(raw), bom, len(doc["acts"]), act["pos"]))
    if bom:
        print("!! 写出带 BOM,宿主 JSON.parse 会抛;已中止"); return 4
    for z, _kx, _ky in eps:
        lim = (z - 1) / (2 * z) * 100
        print("  漏边容许 |k|<=%.2f%% (z=%.3f) —— 本次没动 z/kb,所以漏边判定不变" % (lim, z))
    print("  备份:%s / %s" % (os.path.basename(jp + ".bak-hardband-" + stamp), os.path.basename(pj + ".bak-hardband-" + stamp)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
