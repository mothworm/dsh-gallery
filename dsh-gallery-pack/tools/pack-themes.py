#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""打包**火影主题素材包**,给收到的人导入用。

## 为什么新写一个,而不是改 pack-arts.py

`pack-arts.py` 是 11-20 的产物,它服务的是**当年那个包含了开屏分镜/八幕动画/clips 的整包**:
  · 拿 v5 zip 当差异基线、逐条比 namelist;
  · 会打 `clips/tobirama-night.mp4`(11.8 MB 的开屏视频);
  · 会打 `ui/frame-*.png`(五遁位图底框 —— **该功能 11-21 已整体废弃**,现在用磨砂玻璃);
  · 把新生成的 INDEX 当成"多余新增"而报错。

而现在的素材包**只需要主题**:17 套,每套 preset.json + 幕图 + 球心图。
多打的东西既增大体积又误导人(收到的人会以为还得配底框图)。

## 包里放什么

```
dsh-gallery-handson-<日期>.zip
├── 导入指南.md          ← 给他看的第一份文件
├── INDEX.md / INDEX.json ← 每套的文件清单与摘要
├── 给朋友的提示词.md     ← 可选,说明边界
└── madara/ itachi/ …      ← 17 套主题目录(包里不带 arts/ 前缀)
```

**解压后把子目录拖进 `%USERPROFILE%\.dsh\boot-naruto\arts\` 即可** —— 包里就是这么设计的
(与宿主 `listPresets()` 的读法一致:arts/ 下一层就是主题目录)。

## 用法

  python dsh-gallery-pack/tools/pack-themes.py           # 试跑
  python dsh-gallery-pack/tools/pack-themes.py --apply
"""
import argparse
import datetime
import hashlib
import io
import json
import os
import sys
import zipfile

WS = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PACK = os.path.join(WS, "dsh-gallery-pack")
SRC = os.path.join(PACK, "arts2")
MEDIA = (".jpg", ".jpeg", ".png", ".webp")


def sha12(b):
    return hashlib.sha256(b).hexdigest()[:12]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    if not os.path.isdir(SRC):
        print("找不到素材源: %s" % SRC)
        return 1

    # 只收**真的能用的**主题:有 preset.json 且有幕图
    themes = []
    for name in sorted(os.listdir(SRC)):
        d = os.path.join(SRC, name)
        if not os.path.isdir(d):
            continue
        pj = os.path.join(d, "preset.json")
        if not os.path.isfile(pj):
            continue  # ui/ 这类共享素材目录不算主题
        try:
            with io.open(pj, encoding="utf-8") as f:
                doc = json.load(f)
        except ValueError:
            print("  !! %s preset.json 不是合法 JSON,跳过" % name)
            continue
        acts = doc.get("acts") or []
        shots = [a.get("file") for a in acts if a.get("file")]
        if not shots:
            print("  !! %s 没有幕图,跳过" % name)
            continue
        missing = [s for s in shots if not os.path.isfile(os.path.join(d, s))]
        if missing:
            print("  !! %s 缺幕图 %s,跳过" % (name, missing))
            continue
        themes.append((name, d, doc, shots))

    if not themes:
        print("没有可用主题,不打包")
        return 1

    print("素材源: %s" % SRC)
    print("%-16s %-14s %4s  %s" % ("id", "title", "幕数", "球心"))
    print("-" * 62)
    total = 0
    for name, d, doc, shots in themes:
        eye = doc.get("eye") or {}
        photo = eye.get("photo") or ""
        has_eye = bool(photo) and os.path.isfile(os.path.join(d, photo))
        label = photo if has_eye else ("手绘:%s" % (eye.get("kind") or "?"))
        if photo and not has_eye:
            label = photo + " (缺!)"
        size = sum(os.path.getsize(os.path.join(d, f)) for f in os.listdir(d) if os.path.isfile(os.path.join(d, f)))
        total += size
        print("%-16s %-14s %4d  %s" % (name, doc.get("title") or name, len(shots), label))

    print("-" * 62)
    print("%d 套 / %.1f MB" % (len(themes), total / 1048576.0))

    stamp = datetime.date.today().strftime("%Y%m%d")
    out = args.out or os.path.join(WS, "dsh-gallery-handson-%s.zip" % stamp)
    if not args.apply:
        print("\n试跑。将写出: %s" % out)
        print("确认无误加 --apply。")
        return 0

    # 打包:主题目录不带前缀,文档平铺在包根
    entries = []
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for name, d, doc, shots in themes:
            for f in sorted(os.listdir(d)):
                p = os.path.join(d, f)
                if not os.path.isfile(p):
                    continue
                if f.endswith(".bak"):
                    continue
                z.write(p, "%s/%s" % (name, f))
                entries.append("%s/%s" % (name, f))
        # 文档:导入指南 + 给朋友的提示词 + 索引
        # ⚠ 2026-11-22:改发 **.txt**。用户:「不是谁都装 typora」——
        # .md 在没装 Markdown 工具的 Windows 上会被记事本当纯文本打开、满屏 # 和 |。
        # 给朋友的包要"双击就能读",所以用 .txt。
        for doc_name in ("导入指南.txt", "给朋友的提示词.txt"):
            p = os.path.join(PACK, doc_name)
            if os.path.isfile(p):
                z.write(p, doc_name)
                entries.append(doc_name)
        # 索引:包里带 txt(人看) + json(程序看);md 那份是给我们自己看的,不进包
        for idx in ("INDEX.txt", "INDEX.json"):
            p = os.path.join(SRC, idx)
            if os.path.isfile(p):
                z.write(p, idx)
                entries.append(idx)

    # 自检:条目数对得上、没有混进 .bak、没有空文件
    with zipfile.ZipFile(out) as z:
        names = z.namelist()
        bad = [n for n in names if n.endswith(".bak")]
        zero = [n for n in names if z.getinfo(n).file_size == 0]
    print("\n打包完成: %s" % out)
    print("  %d 条目 / %.1f MB" % (len(names), os.path.getsize(out) / 1048576.0))
    print("  混进 .bak: %d %s" % (len(bad), bad[:3]))
    print("  空文件: %d %s" % (len(zero), zero[:3]))
    ok = not bad and not zero
    print("  自检: %s" % ("通过" if ok else "**有问题**"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())