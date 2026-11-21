#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""把 ComfyUI 生成的一套风景图打包成 DSH 可导入的主题包。

## 产物形状(与宿主 presetEntry 对齐)

    arts-scenery/
      <主题 id>/
        preset.json     ← acts[] 指向下面的 NN.jpg
        01.jpg … NN.jpg
        eye.png         ← 可选,没有就由客户端手绘圆徽

    arts-scenery.zip    ← 上面这些的 zip,可用 import-theme.py --zip 导入

**默认每张图一套主题**还是**一套主题多张图**?
用户 2026-11-21 的原话是「进入 dsh 桌面版后的主题图片可以在各主题里的图里自动切换」
⇒ 一套主题 = 多张图,轮播在同一套里换。所以这里把 12 张做成 **3 套主题、每套 4 张**,
按基调分组(冷雾 / 暖光 / 暗调),而不是 12 套各一张 ——
后者会让"主题轮播"和"壁纸轮播"变成同一件事,用户明确区分了两者。

用法:
  python dsh-gallery-pack/tools/pack-scenery.py            # dry run
  python dsh-gallery-pack/tools/pack-scenery.py --apply
"""
import argparse
import json
import os
import shutil
import sys
import zipfile

WS = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# 本机 Python 工具库:优先环境变量 DSH_PYLIBS,否则取「工作区根/_pylibs」。
# 与 build-frames.py 同一套写法 —— 写死绝对路径会把开发机结构发布出去,换机就 ImportError。
for _c in (os.environ.get("DSH_PYLIBS"), os.path.join(WS, "_pylibs")):
    if _c and os.path.isdir(_c) and _c not in sys.path:
        sys.path.insert(0, _c)
        break
SRC = r"G:\make-cg\video-gen-workspace\outputs\comfyui\dsh-landscape"
OUT = os.path.join(WS, "dsh-gallery-pack", "arts-scenery")

# 12 张按基调分三组,每组一套主题。顺序 = 轮播顺序。
GROUPS = [
    ("scenery-cool", "清寒", "冷雾 · 山林与冰", [
        ("misty-pines", "雾中松林"),
        ("snow-ridge", "雪岭晨光"),
        ("ice-cave", "冰洞"),
        ("cloud-sea", "云海"),
    ]),
    ("scenery-warm", "暖秋", "暖光 · 沙丘与秋谷", [
        ("autumn-valley", "秋谷"),
        ("desert-dunes", "沙丘暮色"),
        ("lava-dusk", "熔岩黄昏"),
        ("snow-peak", "雪峰晨光"),
    ]),
    ("scenery-dark", "夜潮", "暗调 · 星夜与雨街", [
        ("night-stars", "星夜原野"),
        ("rainy-city", "雨中街景"),
        ("mountain-lake", "山间静湖"),
        ("coastal-fog", "海岸薄雾"),
    ]),
]

# 文件名的历史遗留:生成时 lava-dusk / snow-ridge 等,分组里 snow-peak 实际是 snow-ridge,
# 这里做一次显式映射,免得"分组里写了文件却不存在"这种错在导入时才暴露。
ALIAS = {"snow-peak": "snow-ridge"}


def build_preset(gid, title, sub, items):
    acts = []
    for i, (stem, cn) in enumerate(items):
        real = ALIAS.get(stem, stem)
        acts.append({
            "dur": 900,
            "pos": "50% 45%",
            "z0": 1.04,
            "z": 1.10,
            "flash": False,
            "file": "%02d.jpg" % (i + 1),
            "kb": ["1% 1.5%", "-4% 0%"],
            "_src": real,
        })
    return {
        "schema": 1,
        "id": gid,
        "title": title,
        "sub": sub,
        "open": "none",
        # 悬浮球球心:用本套第一张图自动裁一个圆形图标出来(见 make_eye()).
        # 为什么要它 —— 用户 2026-11-21:「悬浮球图案都没了」。根因是球心图以前只从调色文件读,
        # 而导入的主题没有调色文件;现在 eye 跟着 preset.json 走(宿主 presetEntry 已透传),
        # 所以每套主题**自己定义**球心,不依赖调色、也不依赖第三方素材。
        "eye": {"kind": "photo", "photo": "eye.png"},
        "acts": acts,
    }


def make_eye(src_img, out_path, size=256):
    """从风景图裁一个**圆形球心图**。

    为什么不能"直接把大图指过去":球心是 74px 的圆(50-css 有 border-radius:999px),
    塞一张 832x1216 的整图进去会按 cover 缩放,看着像"糊了一片的哪个角落",不是图徽。
    这里做三步:
      ① 取中心正方形(构图最稳,避开天空的纯色块与地面的杂乱);
      ② **圆外全透明** —— 球有自己的圆形容器,给带直角的方图会露出四个角;
      ③ 压一圈暗边 + 内高光,和小尺寸下不至于糊成一团色块。
    """
    from PIL import Image, ImageDraw, ImageFilter
    w, h = src_img.size
    s = min(w, h)
    box = ((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)
    im = src_img.crop(box).resize((size, size), Image.LANCZOS).convert("RGBA")

    # ② 圆形遮罩(4x 超采样再缩回来,边缘不毛)
    SS = 4
    mask = Image.new("L", (size * SS, size * SS), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * SS - 1, size * SS - 1), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    im.putalpha(mask)

    # ③ 暗边:往内收的一圈半透明黑,让圆徽在亮底上也立得住
    ring = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    ImageDraw.Draw(ring).ellipse((0, 0, size * SS - 1, size * SS - 1),
                                 outline=(0, 0, 0, 130), width=max(2, size * SS // 48))
    ring = ring.resize((size, size), Image.LANCZOS)
    im = Image.alpha_composite(im, ring)
    im.save(out_path, "PNG", optimize=True)
    return os.path.getsize(out_path)


def main():
    if not os.path.isdir(SRC):
        print("找不到生成目录: %s" % SRC)
        return 1
    # ⚠ 不能用 os.path.splitext:文件名是 `misty-pines_00001_.png`,
    # splitext 只去掉 `.png`,留下 `misty-pines_00001_` —— 于是"每个文件都找不到"。
    # ComfyUI 的 SaveImage 命名是 `<prefix>_<序号>_.png`,这里显式剥掉这段后缀。
    import re as _re
    def stem_of(fn):
        m = _re.match(r"^(.+?)_\d+_?\.png$", fn)
        return m.group(1) if m else os.path.splitext(fn)[0]
    have = set(stem_of(f) for f in os.listdir(SRC) if f.endswith(".png"))
    if not have:
        print("生成目录里没有 *_00001_.png")
        return 1
    print("源: %s(%d 张)" % (SRC, len(have)))

    plan = []
    missing = []
    for gid, title, sub, items in GROUPS:
        for stem, _cn in items:
            real = ALIAS.get(stem, stem)
            if real not in have:
                missing.append((gid, stem, real))
        plan.append((gid, title, sub, items))

    for gid, title, sub, items in plan:
        print("  %-16s %s · %s  (%d 张)" % (gid, title, sub, len(items)))
    if missing:
        for g, s, r in missing:
            print("  !! %s 要的 %s(实际找 %s)不存在" % (g, s, r))
        # 不直接失败:生成集可能改名,缺的那几张跳过并在下面报数
    print("\n共 %d 套主题 / %d 张图" % (len(plan), sum(len(p[3]) for p in plan)))

    if "--apply" not in sys.argv:
        print("\n试跑(不写盘)。加 --apply 生成 %s 与 zip。" % OUT)
        return 0

    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for gid, title, sub, items in plan:
        d = os.path.join(OUT, gid)
        os.makedirs(d, exist_ok=True)
        preset = build_preset(gid, title, sub, items)
        n = 0
        for i, act in enumerate(preset["acts"]):
            real = act.pop("_src")
            src = os.path.join(SRC, real + "_00001_.png")
            if not os.path.isfile(src):
                continue
            shutil.copyfile(src, os.path.join(d, act["file"]))
            n += 1
        # 只保留真的有文件的 acts
        preset["acts"] = [a for a in preset["acts"]
                          if os.path.isfile(os.path.join(d, a["file"]))]
        # 球心图:拿本套第一张幕图裁一个圆徽(见 make_eye 的注释)
        eye_size = 0
        first = preset["acts"][0]["file"] if preset["acts"] else None
        if first:
            from PIL import Image as _Img
            eye_size = make_eye(_Img.open(os.path.join(d, first)).convert("RGB"),
                                os.path.join(d, "eye.png"))
        else:
            # 一张图都没有就撤掉 eye 字段:别让清单引用一个不存在的文件
            preset.pop("eye", None)
        with open(os.path.join(d, "preset.json"), "w", encoding="utf-8") as f:
            json.dump(preset, f, ensure_ascii=False, indent=2)
        print("  %-16s %d 张 + eye.png(%d B) -> %s" % (gid, n, eye_size, d))
        total += n

    zp = OUT + ".zip"
    if os.path.exists(zp):
        os.remove(zp)
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        for dp, _dn, fn in os.walk(OUT):
            for f in fn:
                full = os.path.join(dp, f)
                z.write(full, os.path.relpath(full, OUT))
    print("\n完成:%d 张图 -> %s + %s (%.1f MB)"
          % (total, OUT, os.path.basename(zp), os.path.getsize(zp) / 1048576.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())