#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""把 PSD 底框按**两种贴法**贴到真实卡片尺寸上做样张,给用户肉眼定方案。只读 PSD,只写 --out 一个 png。

为什么要有这个脚本(一句话):素材是"1929x1222 的整幅画面",四角特效向内伸入 ≥520 px(占高度 43%),
而界面里的文字卡片是**内容变宽高**的。于是:
  甲 整图等比拉伸铺满(background-size:100% 100%)  -> 画面全在,但卡片越扁,横向拉得越狠,圆徽会变椭圆
  乙 四角精灵 1:1 等比缩放 + 边线另走可拉伸层      -> 角部永不变形,但角图只有卡片高的几成,画面"看不完"
这两种在 PS 里都想当然,必须**按真实尺寸贴出来**才分得出。脚本把 A/B 各贴两种卡片高度,一眼看完。

用法:
  python mock-frames.py --psd <fire.psd> --out <mock.png> [--cornerpx 110]
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
from psd_tools import PSDImage  # noqa: E402

GROUND = (28, 28, 27, 255)      # 会话区底色实测约 #1C1C1B
TEXT = (208, 208, 200, 255)


def art(psd_path):
    """返回 (Frame+Deco 叠加的 RGBA 整图, InnerBG 面板 bbox)。InnerBG 故意不进成品(中央归滑块填充层)。"""
    psd = PSDImage.open(psd_path)
    canvas = Image.new("RGBA", (psd.width, psd.height), (0, 0, 0, 0))
    panel = None
    for ly in psd:
        nm = str(ly.name).strip().lower()
        im = ly.topil()
        if im is None:
            continue
        im = im.convert("RGBA")
        if nm == "innerbg":
            ys, xs = [], []
            a = im.getchannel("A")
            bb = a.getbbox()
            if bb:
                panel = (ly.left + bb[0], ly.top + bb[1], ly.left + bb[2], ly.top + bb[3])
            continue
        layer = Image.new("RGBA", (psd.width, psd.height), (0, 0, 0, 0))
        layer.paste(im, (ly.left, ly.top))
        canvas = Image.alpha_composite(canvas, layer)
    return canvas, panel


def variant_jia(full, w, h):
    """甲:整图非等比拉伸铺满。"""
    return full.resize((w, h), Image.LANCZOS)


def variant_yi(full, w, h, cornerpx):
    """乙:四角各裁一块**正方形**源区,等比缩放到 cornerpx 贴在四角(永不变形);
       边线**不用裁出来的画面**,而是从 Frame 层采一个平均色重画一条描边 —— 因为边中段有独立图案(三勾玉),
       任何"把画面压在边上"的做法都会被拉伸,重画描边才是可拉伸层该有的样子。"""
    W, H = full.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    src = int(min(W, H) * 0.42)      # 源角区边长:和量测到的"伸入约 43% 高度"对齐
    boxes = {"tl": (0, 0, src, src), "tr": (W - src, 0, W, src),
             "bl": (0, H - src, src, H), "br": (W - src, H - src, W, H)}
    pos = {"tl": (0, 0), "tr": (w - cornerpx, 0), "bl": (0, h - cornerpx), "br": (w - cornerpx, h - cornerpx)}
    # 采一个"边线色":取上边中段(避开角区)里不透明像素的加权平均色
    strip = full.crop((src, 0, W - src, int(H * 0.12)))
    sa = strip.getchannel("A")
    import numpy as np
    sarr = np.asarray(strip).astype("float64")
    am = np.asarray(sa).astype("float64")
    tot = am.sum()
    col = tuple(int(x) for x in (sarr[:, :, :3] * am[:, :, None]).reshape(-1, 3).sum(0) / max(1.0, tot)) if tot > 1000 else (200, 200, 200)
    d = ImageDraw.Draw(out)
    d.rectangle([0, 0, w - 1, h - 1], outline=col + (200,), width=2)
    for k, box in boxes.items():
        piece = full.crop(box).resize((cornerpx, cornerpx), Image.LANCZOS)
        out.alpha_composite(piece, pos[k])
    return out, col


def tile(label, note, w, h, overlay, font, small):
    pad = 26
    tw, th = w + pad * 2, h + pad * 2 + 40
    t = Image.new("RGBA", (tw, th), GROUND)
    d = ImageDraw.Draw(t)
    d.text((pad, pad - 22), label, font=font, fill=(255, 200, 90, 255))
    d.text((pad, th - pad - 14), note, font=small, fill=(150, 150, 145, 255))
    # 卡片本体:中央填充层(吃滑块的那块)先铺上
    card = Image.new("RGBA", (w, h), (0, 0, 0, 118))
    t.alpha_composite(card, (pad, pad))
    t.alpha_composite(overlay, (pad, pad))
    d = ImageDraw.Draw(t)
    d.text((pad + 16, pad + 12), "交付物已生成 deliverable ready", font=font, fill=TEXT)
    d.text((pad + 16, pad + 40), "第二行:说明文字说明文字说明文字", font=small, fill=(170, 170, 165, 255))
    d.text((pad + 16, pad + 66), "第三行:第三行:第三行", font=small, fill=(170, 170, 165, 255))
    return t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--psd", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--cornerpx", type=int, default=110)
    args = ap.parse_args()
    full, panel = art(args.psd)
    font = None
    for fp in (r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simhei.ttf"):
        if os.path.isfile(fp):
            try:
                font = ImageFont.truetype(fp, 17)
                small = ImageFont.truetype(fp, 14)
                break
            except Exception:
                pass
    if font is None:
        font = small = ImageFont.load_default()
    print("  源图 %dx%d,InnerBG 面板 = %s" % (full.size[0], full.size[1], panel))
    cards = [(420, 120), (420, 230)]

    import numpy as np

    def variant_bing(full, w, h, T=30, feather=14):
        """丙:整图**非等比**缩放到卡片,再只保留外圈 T px 的花边(内侧羽化淡出)。
        思路:变形确实存在,但它被限制在一条窄环里 —— 环上主要是描边与软火光,肉眼难察觉;
        而文字区永远干净(中央被挖空),滑块填充层照旧管中央。"""
        img = np.asarray(full.resize((w, h), Image.LANCZOS)).astype("float64")
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, h - 1 - yy)).astype("float64")
        keep = np.clip((T + feather - d) / max(1.0, feather), 0.0, 1.0)
        img[:, :, 3] *= keep
        return Image.fromarray(img.astype("uint8"), "RGBA")

    tiles = []
    for (w, h) in cards:
        T = 30 if h <= 140 else 40
        jia = variant_jia(full, w, h)
        tiles.append(tile("甲 整图非等比拉伸  %dx%d" % (w, h), "画面全在,但被拉扁/拉长;圆徽、火球会变成椭圆", w, h, jia, font, small))
        yi, _ = variant_yi(full, w, h, args.cornerpx)
        tiles.append(tile("乙 四角精灵 1:1+重画边线  %dx%d" % (w, h), "角部永不变形;代价:角图一大就压字,小就看不见画面", w, h, yi, font, small))
        bing = variant_bing(full, w, h, T=T)
        tiles.append(tile("丙 整图缩放+只留外环 %dpx  %dx%d" % (T, w, h), "变形被关进一条窄环,文字区永远干净(中央挖空)", w, h, bing, font, small))
    W = max(t.size[0] for t in tiles) + 16
    H = sum(t.size[1] for t in tiles) + 16 * len(tiles) + 54
    sheet = Image.new("RGBA", (W, H), (18, 18, 20, 255))
    d = ImageDraw.Draw(sheet)
    d.text((12, 10), os.path.basename(args.psd) + "  底框贴法对照(左列同一种贴法,自上而下卡片变高)", font=font, fill=(255, 255, 255, 255))
    y = 44
    for t in tiles:
        sheet.alpha_composite(t, (8, y))
        y += t.size[1] + 16
    sheet.convert("RGB").save(args.out)
    print("  写出 %s(%d B)" % (args.out, os.path.getsize(args.out)))


if __name__ == "__main__":
    main()
