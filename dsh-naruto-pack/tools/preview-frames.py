#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""把成品 frame-<遁>.png 贴到**真实卡片尺寸**上拼核对表,用来肉眼确认丙方案没跑偏。

为什么单独要这个脚本:成品 PNG 是 720x260 的图,而界面上的卡片是 420x120 / 420x230 这种**内容变宽高**
的尺寸。素材在 PS 里看着好,不等于贴上去好 —— 11-19 就是靠这种核对表抓出"环内只有 0.5% 不透明"和
"内缘笔直硬切边"两个真缺陷的。中央必须保持透明(那块归吃滑 CSS 填充层),所以核对表里**故意**在底下
铺一层半透明黑,模拟文字底。

⚠ 用系统 python 3.10(_pylibs 是 cp310)。
用法: python preview-frames.py --ui "D:\\...\\dsh-naruto-pack\\ui" --out "D:\\...\\_scratch\\framebuild\\check.png"
"""
import argparse
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
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

MODES = ["doton", "katon", "raton", "suiton", "futon"]
GROUND = (28, 28, 27, 255)
SIZES = [(420, 120), (420, 230)]


def font(sz):
    for fp in (r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simhei.ttf"):
        if os.path.isfile(fp):
            try:
                return ImageFont.truetype(fp, sz)
            except Exception:
                pass
    return ImageFont.load_default()


def tile(m, w, h, frame, f15, f13):
    pad, cap = 12, 22
    t = Image.new("RGBA", (w + pad * 2, h + pad * 2 + cap), GROUND)
    t.alpha_composite(Image.new("RGBA", (w, h), (0, 0, 0, 118)), (pad, pad))   # 模拟吃滑块的填充层
    t.alpha_composite(frame.resize((w, h), Image.LANCZOS), (pad, pad))
    d = ImageDraw.Draw(t)
    d.text((pad + 14, pad + 10), "line one 交付物已生成", font=f15, fill=(208, 208, 200, 255))
    d.text((pad + 14, pad + 34), "second line text", font=f13, fill=(170, 170, 165, 255))
    if h > 140:
        d.text((pad + 14, pad + 58), "third line 第三行", font=f13, fill=(170, 170, 165, 255))
    d.text((pad, pad + h + 4), "%s  %dx%d  (源 %dx%d 非等比贴上去)" % (m, w, h, frame.size[0], frame.size[1]),
           font=f13, fill=(255, 200, 90, 255))
    return t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ui", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    f15, f13 = font(15), font(13)
    tiles, missing = [], []
    for m in MODES:
        p = os.path.join(args.ui, "frame-%s.png" % m)
        if not os.path.isfile(p):
            missing.append(m)
            continue
        fr = Image.open(p).convert("RGBA")
        for (w, h) in SIZES:
            tiles.append(tile(m, w, h, fr, f15, f13))
    if not tiles:
        print("  !! 一张成品都没找到:%s(缺 %s)" % (args.ui, ",".join(missing) or "?"))
        return 2
    cols = 2
    cw = max(t.size[0] for t in tiles)
    rh = {}
    for i, t in enumerate(tiles):
        rh.setdefault(i // cols, []).append(t.size[1])
    rowh = [max(v) + 10 for v in rh.values()]
    W = cw * cols + 20
    H = 30 + sum(rowh)
    sheet = Image.new("RGBA", (W, H), (18, 18, 20, 255))
    d = ImageDraw.Draw(sheet)
    d.text((10, 6), "丙方案核对表:成品 frame-*.png 贴到真实卡片尺寸(左列矮卡 右列高卡)", font=f15, fill=(255, 255, 255, 255))
    y = 30
    for i, t in enumerate(tiles):
        x = 10 + (i % cols) * cw
        if i % cols == 0 and i:
            y += rowh[i // cols - 1]
        sheet.alpha_composite(t, (x, y))
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    sheet.convert("RGB").save(args.out)
    print("  写出 %s(%d B,共 %d 格%s)" % (args.out, os.path.getsize(args.out), len(tiles),
                                  "" if not missing else ",缺 " + ",".join(missing)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
