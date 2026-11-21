#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""剥掉随仓库分发的风景图里的生成元数据(`prompt` / `workflow` 等 ComfyUI 字段)。

## 为什么要做

2026-11-22 公开前审计发现:12 张 `arts-builtin/*/01..04.jpg` 的 JPEG 元数据里
藏着 ComfyUI 写进去的完整 `prompt`(1146 B 的 JSON),内容包括:

  · `ckpt_name`: "SDXL\\SDXLFaetastic_v24.safetensors"  ← 本机模型目录结构
  · 完整的采样参数(步数、CFG、sampler、seed)
  · 完整的分镜提示词

这些**不是隐私**(没有用户名/绝对路径),但也没必要随公开发布:
  · 它把开发者的模型选择和调参偏好曝出去;
  · 对使用者没有任何用处(他们只需要图);
  · 图会进插件市场,元数据越大越容易被扫描工具盯上。

## 怎么做

用 Pillow 重存一遍(quality 保持 92),Pillow 默认不写 `prompt`/`workflow`。
**只重编码、不缩放、不裁切**,所以画面像素与原图视觉一致。

## 用法

  python dsh-gallery-pack/tools/strip-exif.py            # 试跑:只报告哪些图带元数据
  python dsh-gallery-pack/tools/strip-exif.py --apply    # 真删
"""
import glob
import os
import sys

WS = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(WS, "dsh-boot-suites", "gallery", "arts-builtin")
# ComfyUI 会写这些;Pillow 重存时自然不带
RISKY = ("prompt", "workflow", "parameters", "Comment", "Software", "exif")


def main():
    sys.path.insert(0, os.path.join(WS, "_pylibs"))
    from PIL import Image

    files = sorted(glob.glob(os.path.join(TARGET, "*", "*.jpg")) +
                   glob.glob(os.path.join(TARGET, "*", "*.png")))
    if not files:
        print("找不到素材: %s" % TARGET)
        return 1
    apply = "--apply" in sys.argv
    dirty = 0
    for p in files:
        im = Image.open(p)
        info_keys = [k for k in (im.info or {}) if k in RISKY]
        ex = im.getexif()
        n_exif = len(ex) if ex else 0
        if not info_keys and not n_exif:
            continue
        dirty += 1
        rel = os.path.relpath(p, WS)
        print("  %-58s %s" % (rel, ",".join(info_keys) or ("exif×%d" % n_exif)))
        if apply:
            # 转 RGB(去掉 alpha 以外的模式问题),重存时不带 info/exif
            clean = im.convert("RGB") if p.lower().endswith(".jpg") else im.convert("RGBA")
            fmt = "JPEG" if p.lower().endswith(".jpg") else "PNG"
            kw = {"quality": 92, "optimize": True} if fmt == "JPEG" else {"optimize": True}
            clean.save(p, fmt, **kw)

    print("")
    print("%d 张带元数据(共 %d 张)%s" % (dirty, len(files), "" if apply else " —— 试跑,加 --apply 真删"))
    if apply and dirty:
        # 复验:重存后应该一张都不剩
        left = 0
        for p in files:
            im = Image.open(p)
            if any(k in (im.info or {}) for k in RISKY) or len(im.getexif() or {}):
                left += 1
                print("  !! 仍带元数据: %s" % os.path.relpath(p, WS))
        print("复验:剩 %d 张带元数据" % left)
        return 0 if left == 0 else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())