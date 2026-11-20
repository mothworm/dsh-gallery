#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""量 PSD 分层素材,决定"四角精灵 + 边线九宫"该怎么切。**只读,不落任何文件。**

要回答的三个问题(每个都直接对应一个实现参数):
  A. 四角装饰从角向内伸入多远(源图像素)  -> 决定角图裁剪框大小,以及缩到运行时尺寸是几倍
  B. 四条边中段(去掉角区)到底是"干净可拉伸的线"还是"有独立图案" -> 决定边图能不能九宫拉
  C. InnerBG 内底面板的矩形在哪 -> 中央由吃滑块的 CSS 填充层负责,所以这块**要从成品里挖掉**

用法: python psd-audit.py [--dir <PSD分层目录>] [--corner 380]
"""
import argparse
import glob
import os
import sys

# 本机 Python 工具库:优先环境变量 DSH_PYLIBS,否则取「工作区根/_pylibs」(本脚本在 tools/ 下,上跳三级)。
# 写死绝对路径会把开发机的目录结构发布出去,而且换一台机器就 ImportError。
import os as _os, sys as _sys
_WSROOT = _os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
for _c in (_os.environ.get("DSH_PYLIBS"), _os.path.join(_WSROOT, "_pylibs")):
    if _c and _os.path.isdir(_c):
        _sys.path.insert(0, _c)
        break
import numpy as np  # noqa: E402
from psd_tools import PSDImage  # noqa: E402


def layer_alpha(psd):
    """返回 {层名: alpha(uint8, 文档尺寸)}。层按文档大小贴齐,超出部分留透明。"""
    out = {}
    W, H = psd.width, psd.height
    for ly in psd:
        name = str(ly.name).strip()
        im = ly.topil()
        if im is None:
            continue
        im = im.convert("RGBA")
        a = np.zeros((H, W), "uint8")
        x0, y0 = max(0, ly.left), max(0, ly.top)
        x1, y1 = min(W, ly.right), min(H, ly.bottom)
        if x1 <= x0 or y1 <= y0:
            out[name] = a
            continue
        arr = np.asarray(im)[y0 - max(0, ly.top) if ly.top < 0 else 0:, :]
        # 简化:直接用 composite 的层再贴回文档坐标
        sub = np.asarray(im)[:, :, 3]
        sh, sw = sub.shape
        hh = min(sh, H - y0)
        ww = min(sw, W - x0)
        a[y0:y0 + hh, x0:x0 + ww] = sub[:hh, :ww]
        out[name] = a
    return out


def corner_extent(mask, csize):
    """四个角各自向内伸多远:在角区 csize×csize 内找最大连通块(4邻域 BFS),报告其 bbox。"""
    h, w = mask.shape
    res = []
    for name, (y0, y1, x0, x1) in (("左上", (0, csize, 0, csize)), ("右上", (0, csize, w - csize, w)),
                                   ("左下", (h - csize, h, 0, csize)), ("右下", (h - csize, h, w - csize, w))):
        sub = mask[y0:y1, x0:x1]
        if not sub.any():
            res.append((name, 0, 0, 0.0))
            continue
        # 从角点做 BFS,拿到"和角连通的那一团"的范围(初值取"整块",靠循环收紧)
        seen = np.zeros_like(sub, bool)
        sy, sx = np.nonzero(sub)
        seed = (0, 0) if sub[0, 0] else (int(sy[0]), int(sx[0]))
        stack = [seed]
        seen[seed] = True
        H2, W2 = sub.shape
        minr, maxr, minc, maxc = H2, -1, W2, -1
        cnt = 0
        while stack:
            r, c = stack.pop()
            cnt += 1
            minr, maxr = min(minr, r), max(maxr, r)
            minc, maxc = min(minc, c), max(maxc, c)
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < sub.shape[0] and 0 <= nc < sub.shape[1] and sub[nr, nc] and not seen[nr, nc]:
                    seen[nr, nc] = True
                    stack.append((nr, nc))
        res.append((name, max(maxr, maxc) + 1, cnt, 100.0 * cnt / (sub.shape[0] * sub.shape[1])))
    return res


def edge_profile(mask, csize, label):
    """边中段:去掉两端角区之后,沿拉伸方向的 alpha 剖面,给变异系数(能不能拉)。"""
    h, w = mask.shape
    out = []
    for nm, band, axis in (("上", mask[0:csize, csize:w - csize], 0), ("下", mask[h - csize:h, csize:w - csize], 0),
                           ("左", mask[csize:h - csize, 0:csize], 1), ("右", mask[csize:h - csize, w - csize:w], 1)):
        if band.size == 0 or band.shape[1 - axis] <= 4:
            out.append((nm, None, None))
            continue
        prof = (band > 8).mean(axis=axis).astype("float64")
        m = prof.mean()
        cv = float(prof.std() / m) if m > 0.001 else 0.0
        out.append((nm, round(m, 3), round(max(0.0, min(1.0, 1.0 - cv)), 3)))
    return "%s 边中段 覆盖率/可拉伸分: " % label + "  ".join("%s=%s/%s" % r for r in out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "火影遁术文本框", "PSD分层"))
    ap.add_argument("--corner", type=int, default=380, help="角区边长(源像素)")
    args = ap.parse_args()
    files = sorted(glob.glob(os.path.join(args.dir, "*.psd")))
    if not files:
        print("  !! 没找到 PSD:", args.dir)
        return 2
    print("  画布与角区参数: corner=%d px(源尺寸)\n" % args.corner)
    for f in files:
        psd = PSDImage.open(f)
        la = layer_alpha(psd)
        names = list(la.keys())
        deco = la.get("Deco")
        frame = la.get("Frame")
        inner = la.get("InnerBG")
        both = np.maximum(deco, frame) if deco is not None and frame is not None else (deco if deco is not None else frame)
        print("  %s   %dx%d   层=%s" % (os.path.basename(f), psd.width, psd.height, "/".join(names)))
        if inner is not None:
            ys, xs = np.nonzero(inner > 8)
            if ys.size:
                print("     InnerBG 面板 bbox: x %d..%d (宽 %d)  y %d..%d (高 %d)  不透明占比 %.1f%%" % (
                    xs.min(), xs.max(), xs.max() - xs.min() + 1, ys.min(), ys.max(), ys.max() - ys.min() + 1,
                    100.0 * (inner > 8).mean()))
        if both is not None:
            for nm, reach, cnt, frac in corner_extent(both, args.corner):
                print("     %s 角:向内伸入 %d px,占角区 %.1f%%%s" % (nm, reach, frac, "" if cnt else "(空!这一角没东西)"))
            print("     " + edge_profile(both, args.corner, "Frame+Deco"))
            print("     若角图运行时要 128 px:缩放 = 128/%d = %.3f(面积上等于丢掉 %.1f%% 的细节)" % (
                args.corner, 128.0 / args.corner, 100 * (1 - (128.0 / args.corner) ** 2)))
        if frame is not None:
            print("     " + edge_profile(frame, args.corner, "只看 Frame"))
        print("")
    return 0


if __name__ == "__main__":
    sys.exit(main())
