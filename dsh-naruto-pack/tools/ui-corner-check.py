#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""找素材里的游戏 UI 残留(左下「返回」按钮这类),再逐幕问:**它落没落进可见窗**。

前一版用"角块近白密度"判,精度不够:整片白背景的角密度是 997/1000 这种量,
而真正的按钮是一小簇(基准值 5.18/千) —— 大角块把小簇稀释掉了,反而漏报。
这一版改判**形状**:近白的**紧凑连通块**。

流程:
1. 在图片**左下象限**(x < 45% 宽, y > 55% 高)取近白掩膜 min(R,G,B) >= 240;
2. connectedComponentsWithStats 找连通块,留 面积 300~15000 px、长宽比 0.3~6、
   且不贴住图边超过一条(纯白背景会贴满两条边,会被这个条件筛掉) —— 这就是按钮/角标的形状特征;
3. 把找到的块当"残留物",逐幕用 check-framing 的同一套 CSS 数学算出**可见源矩形**,
   判断块是否与之相交 => 露出 / 藏住。
4. 附带黄橙色列(黄色木叶箭头)当第二信号:块附近若有足够多的黄像素,基本可确认是那个按钮。

    py -3.10 tools/ui-corner-check.py arts2
    py -3.10 tools/ui-corner-check.py arts2 --dump   # 把每张图找到的块打出来
"""
import io
import json
import os
import sys

import numpy as np
from PIL import Image
import cv2

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module

cf = import_module("check-framing")

VW, VH = 1920, 1080


def blobs(path):
    """返回左下象限里疑似 UI 残留的连通块 [{x,y,w,h,area,aspect,yellow}]。"""
    im = Image.open(path).convert("RGB")
    a = np.array(im)
    h, w = a.shape[:2]
    lo, ri, tp, bt = int(0.05 * w), int(0.45 * w), int(0.55 * h), h
    sub = a[tp:bt, lo:ri]
    mn = sub.min(axis=2)
    mask = (mn >= 240).astype(np.uint8)
    n, lab, stats, _c = cv2.connectedComponentsWithStats(mask, connectivity=8)
    mx = sub.max(axis=2).astype(int)
    chroma = (mx - mn.astype(int))
    yellow = ((sub[:, :, 0] > 200) & (sub[:, :, 1] > 140) & (sub[:, :, 1] < 230)
              & (sub[:, :, 2] < 130) & (chroma > 60))
    out = []
    for i in range(1, n):
        x, y, bw, bh, area = stats[i]
        if area < 300 or area > 15000:
            continue
        if bh <= 0 or bw <= 0:
            continue
        asp = bw / float(bh)
        if asp < 0.3 or asp > 6.0:
            continue
        # 排除"整片白背景":它要么贴住子区两条边、要么块宽/高接近整个子区
        if bw > 0.85 * (ri - lo) and bh > 0.85 * (bt - tp):
            continue
        touches = (x <= 1) + (x + bw >= (ri - lo) - 1) + (y <= 1) + (y + bh >= (bt - tp) - 1)
        if touches >= 2:
            continue
        yl = int(yellow[max(0, y - 6):y + bh + 6, max(0, x - 6):x + bw + 6].sum())
        out.append({"x": lo + int(x), "y": tp + int(y), "w": int(bw), "h": int(bh),
                    "area": int(area), "aspect": round(asp, 2), "yellow": yl})
    im.close()
    return sorted(out, key=lambda b: -b["area"])


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "arts2"
    dump = "--dump" in sys.argv
    exposed = []
    found_total = 0
    print("# UI 残留可见性  可见窗按插件 CSS 数学(视口 %dx%d)  块特征:左下象限近白紧凑连通块" % (VW, VH))
    for pid in sorted(d for d in os.listdir(root) if os.path.isdir(os.path.join(root, d))):
        pj = os.path.join(root, pid, "preset.json")
        if not os.path.isfile(pj):
            continue
        doc = json.load(io.open(pj, encoding="utf-8"))
        for idx, a in enumerate(doc.get("acts") or [], 1):
            path = os.path.join(root, pid, a.get("file") or "")
            if not os.path.exists(path):
                continue
            bs = blobs(path)
            if dump:
                for b in bs[:3]:
                    print("   %s/%02d 块 x%d y%d %dx%d area=%d asp=%.2f yellow=%d" % (
                        pid, idx, b["x"], b["y"], b["w"], b["h"], b["area"], b["aspect"], b["yellow"]))
            if not bs:
                continue
            im = Image.open(path).convert("RGB")
            iw, ih = im.size
            im.close()
            posx, posy = cf.parse_pct(a.get("pos"))
            z0 = float(a.get("z0", 1.075)); z1 = float(a.get("z", 1.0))
            kb = list(a.get("kb") or ["0%"])
            while len(kb) < 2:
                kb.append("0%")
            k0x, k0y = cf.parse_pct(kb[0])
            k1x, k1y = cf.parse_pct(kb[1])
            hit = []
            for tag, z, kx, ky in (("起", z0, k0x, k0y), ("止", z1, k1x, k1y)):
                u0, u1, v0, v1 = cf.visible_rect(iw, ih, VW, VH, posx, posy, z, kx, ky)
                for b in bs:
                    # 相交即露出;留 4px 余量免得擦边误报
                    if (b["x"] + b["w"] > u0 + 4 and b["x"] < u1 - 4
                            and b["y"] + b["h"] > v0 + 4 and b["y"] < v1 - 4):
                        hit.append((tag, b))
            if hit:
                found_total += 1
                b = hit[0][1]
                exposed.append("%s/%02d %s  图 %dx%d  块(%d,%d,%dx%d,area%d,yellow%d)  露于 %s  pos %.0f/%.0f z%.3f->%.3f" % (
                    pid, idx, a.get("file"), iw, ih, b["x"], b["y"], b["w"], b["h"], b["area"],
                    b["yellow"], "".join(t for t, _ in hit), posx, posy, z0, z1))
    print("\n结论:有残留块且**确实落进可见窗**的幕 = %d" % found_total)
    for e in exposed:
        print("  !! " + e)
    if not found_total:
        print("  (没有一处露出;左下象限的近白形状要么不存在,要么被 cover+z 推出可见窗外)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
