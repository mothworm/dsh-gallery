#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""把「DeepSeek 鲸鱼娘」做成一套可导入的 DSH 主题包。

## 素材来源与许可(必须原样保留,别删)

上游:`ZHOUcourier/dsh-theme-whalegirl`(GitHub,代码 MIT)。
**但插画不是 MIT**,它走 CC BY-NC-SA 4.0:
  · 原创角色「溟月」—— B 站 UP 主「上善无形」
  · DeepSeek 女仆装视觉定型 —— B 站 UP 主「ZipZipPipe」
  · DreamSkin 皮肤包 —— powerdog996
⇒ 这套图**只进本机资源包,绝不进代码仓库**(用户 2026-11-21 拍板)。
   本脚本把完整署名链写进 `whalegirl/CREDITS.md`,随包一起走。

## 为什么要裁

上游 `assets/background.jpg` 是**漫画分格**:左边一只手指着角色、两个对白气泡。
当桌面壁纸用不行 —— 气泡里有字,而且分散注意力。
所以这里裁出"角色 + 天空"那一块,做成三档:
  · 01.jpg  角色半身(竖构图,桌面壁纸主用)
  · 02.jpg  角色全景(留更多天空给文字)
  · 03.jpg  只有天空与水面(极简,纯背景)
三张供"壁纸轮播"在同一套主题内切换。

## 图标

`icon.png`(256x256)现成可用,直接作为悬浮球图案 —— 用户说"悬浮球用网上流行的
q 版鲸鱼娘,但要精致",这张 256 的品质与精度都够。
"""
import io
import json
import os
import shutil
import sys
import zipfile

WS = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PK = os.path.join(WS, "dsh-gallery-pack", "arts-whalegirl")
PID = "whalegirl"
SRC = os.path.join(PK, "_src")      # 上游原件放这里,与产物目录分开
OUT = os.path.join(PK, PID)

# 三张图各自从原图裁哪一块(左, 上, 右, 下),原图 2278x1280
# ⚠ 三张的裁切窗都必须是**不含对白气泡**的区域:
#   原图左边有手指、头上有大对白框、脚下有小气泡尾巴。
#   第一版 02 用了 (1000,0) 把「的/鱼。」那个框带了进来;03 取 (1500,0,2278,900) 又切到了半张脸。
#   现在三张都从 x>=1215 起,只在**角色本体**范围内换构图。
CROPS = [
    ("01", (1215, 0, 2278, 1280), "角色 · 半身"),
    ("02", (1215, 0, 2278, 1120), "角色 · 特写"),
    ("03", (1215, 0, 2278, 900), "角色 · 抬头(留天空)"),
]

PRESET = {
    "schema": 1,
    "id": PID,
    "title": "鲸鱼娘 · 溟月",
    "sub": "DEEPSEEK WHALE · CC BY-NC-SA 4.0",
    "open": "none",
    # 悬浮球图案:走 eye.photo(与当年苦无同一套机制 —— 文件名相对本套自己的 arts 目录)。
    # 没有这一行,球心就是手绘占位眼,不是用户要的"精致 q 版鲸鱼娘"。
    # kind 写 "photo":让 50-css 的 no-spin 守卫认出来是照片,不转(照片转起来就是歪的)。
    "eye": {"kind": "photo", "photo": "icon.png"},
    "credit": "角色「溟月」by 上善无形 / 女仆装 by ZipZipPipe · CC BY-NC-SA 4.0 · 非商用",
    "acts": [
        {"dur": 1100, "pos": "52% 30%", "z0": 1.04, "z": 1.10, "flash": False, "file": "01.jpg", "kb": ["1% 1.2%", "-3% 0%"]},
        {"dur": 1000, "pos": "48% 42%", "z0": 1.10, "z": 1.02, "flash": False, "file": "02.jpg", "kb": ["-3% 0%", "1% 1%"]},
        {"dur": 900, "pos": "50% 50%", "z0": 1.02, "z": 1.08, "flash": False, "file": "03.jpg", "kb": ["0% 1%", "-2% 0%"]},
    ],
}


def main():
    src_bg = os.path.join(SRC, "bg.jpg")
    src_icon = os.path.join(SRC, "icon.png")
    if not os.path.isfile(src_bg):
        print("缺 %s(先跑下载)" % src_bg)
        return 1
    sys.path.insert(0, os.path.join(WS, "_pylibs"))
    from PIL import Image

    if os.path.isdir(OUT) and os.path.abspath(OUT) != os.path.abspath(PK):
        pass  # OUT 就是 PK/PID,它下面还有源文件,不能整个删
    os.makedirs(OUT, exist_ok=True)

    im = Image.open(src_bg).convert("RGB")
    print("源图 %dx%d" % im.size)
    for name, box, desc in CROPS:
        c = im.crop(box)
        # 统一成竖构图 832x1216(与风景那套一致,桌面聊天区是竖的)
        c = c.resize((832, 1216), Image.LANCZOS)
        p = os.path.join(OUT, name + ".jpg")
        c.save(p, quality=92, optimize=True)
        print("  %s.jpg  %-12s %s  -> %d B" % (name, desc, box, os.path.getsize(p)))

    if os.path.isfile(src_icon):
        shutil.copyfile(src_icon, os.path.join(OUT, "icon.png"))
        print("  icon.png (悬浮球图案) -> %d B" % os.path.getsize(os.path.join(OUT, "icon.png")))

    with io.open(os.path.join(OUT, "preset.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(PRESET, f, ensure_ascii=False, indent=2)
    print("  preset.json")

    # 署名与许可随包走
    for fn in ("CREDITS.md", "LICENSE"):
        s = os.path.join(SRC, fn)
        if os.path.isfile(s):
            shutil.copyfile(s, os.path.join(OUT, fn))
            print("  %s (随包附上)" % fn)

    zp = os.path.join(WS, "dsh-gallery-pack", "arts-whalegirl.zip")
    if os.path.exists(zp):
        os.remove(zp)
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(os.listdir(OUT)):
            full = os.path.join(OUT, f)
            if os.path.isfile(full) and not f.startswith("_"):
                z.write(full, PID + "/" + f)
    print("\n完成 -> %s + %s (%.1f MB)" % (OUT, os.path.basename(zp), os.path.getsize(zp) / 1048576.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())