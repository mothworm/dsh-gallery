#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""给素材包生成一份**机器可读的索引**,并校验每一套的三件套是否齐全。

## 为什么需要它(用户 2026-11-21 提的)

> 「火影的每一套开机画面+主题+悬浮球,是不是要有个文件索引,
>   以便别人用素材包的时候对方的 dsh 找不齐」

会出问题的场景很具体:**别人拿到素材包,解压/拷贝的过程里少了一个文件**。
Dsh 不会说"你少了 eye.png",它只会:
  · 整套 prese t变成"不可用"(缺 preset.json 或 act 里的图);
  · 或者更隐蔽 —— 球心图没了,悬浮球退回手绘占位眼,**看起来"就是那个样子"**。

所以这里做两件事:
  1. 逐套检查"三件套"并在控制台点名缺什么;
  2. 生成 `INDEX.json` + `INDEX.md`:每套的画面文件、球心图、字节数、SHA256 前 12 位。

`INDEX.json` 还有个用途:对方拿到包先跑 `--verify`,就能一次列出所有缺失/损坏,
而不是一套一套点开面板去猜。

## 三件套是什么

| 件 | 落点 | 缺了会怎样 |
|---|---|---|
| 开机画面 acts | `preset.json` 的 `acts[].file` + 那些 NN.jpg | 整套不可用 |
| 主题壁纸 | 同一批 NN.jpg(桌面画的也是它们) | 同上 |
| 悬浮球球心 | `eye.photo`(eye.png / kunai.png);没写则用手绘 kind | **静默退回占位眼** |

> 注:"开机画面"与"主题壁纸"在数据上是**同一批图**(这正是"选开机画面=换桌面主题"的实现),
> 所以三件套其实是 **preset.json + 幕图 + 球心**。

## 用法

  python dsh-gallery-pack/tools/build-index.py                    # 打印体检结果 + 写 INDEX
  python dsh-gallery-pack/tools/build-index.py --verify           # 只校验,不写
  python dsh-gallery-pack/tools/build-index.py --arts <目录>       # 查别的目录(装好的那份)
"""
import argparse
import hashlib
import io
import json
import os
import sys

WS = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_ARTS = os.path.join(WS, "dsh-gallery-pack", "arts2")
SHOT_RE = ("01.jpg", "02.jpg", "03.jpg", "04.jpg", "05.jpg", "06.jpg", "07.jpg", "08.jpg", "09.jpg")


def sha12(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:12]


def inspect(pdir):
    """检查一套主题,返回 (条目 dict, 问题列表)。"""
    pid = os.path.basename(pdir)
    probs = []
    pj = os.path.join(pdir, "preset.json")
    if not os.path.isfile(pj):
        return None, ["缺 preset.json"]
    try:
        with io.open(pj, "r", encoding="utf-8") as f:
            doc = json.load(f)
    except ValueError as e:
        return None, ["preset.json 不是合法 JSON: %s" % e]

    acts = doc.get("acts") or []
    if not acts:
        probs.append("acts 为空(整套不可用)")
    shots, seen = [], set()
    for a in acts:
        fn = str(a.get("file") or "")
        if not fn:
            probs.append("有 act 没写 file")
            continue
        p = os.path.join(pdir, fn)
        if not os.path.isfile(p):
            probs.append("缺幕图 %s" % fn)
            continue
        if fn in seen:
            probs.append("幕图重复 %s" % fn)
        seen.add(fn)
        shots.append({"file": fn, "bytes": os.path.getsize(p), "sha12": sha12(p)})

    eye = doc.get("eye") or {}
    kind = str(eye.get("kind") or "").strip()
    photo = str(eye.get("photo") or "").strip()
    eye_info = {"kind": kind or "(未写)"}
    if photo:
        ep = os.path.join(pdir, photo)
        if os.path.isfile(ep):
            eye_info.update({"photo": photo, "bytes": os.path.getsize(ep), "sha12": sha12(ep)})
        else:
            probs.append("eye.photo 指向的 %s 不存在(悬浮球会退回占位眼)" % photo)
            eye_info["photo"] = photo + " (缺)"
    elif kind in ("", "unknown"):
        probs.append("既没有 eye.photo 也没有 eye.kind(悬浮球只会画灰色占位)")

    title = str(doc.get("title") or pid)
    total = sum(s["bytes"] for s in shots)
    if eye_info.get("bytes"):
        total += eye_info["bytes"]
    return {
        "id": pid,
        "title": title,
        "sub": str(doc.get("sub") or ""),
        "open": str(doc.get("open") or "akatsuki-cloud"),
        "acts": len(shots),
        "shots": shots,
        "eye": eye_info,
        "bytes": total,
    }, probs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--arts", default=DEFAULT_ARTS)
    ap.add_argument("--verify", action="store_true", help="只校验,不写 INDEX")
    args = ap.parse_args()

    if not os.path.isdir(args.arts):
        print("目录不存在: %s" % args.arts)
        return 1
    dirs = sorted(os.path.join(args.arts, d) for d in os.listdir(args.arts)
                  if os.path.isdir(os.path.join(args.arts, d)))
    entries, bad = [], []
    print("检查 %s" % args.arts)
    print("%-18s %-14s %5s  %-16s %s" % ("id", "title", "幕数", "球心", "问题"))
    print("-" * 96)
    for d in dirs:
        e, probs = inspect(d)
        if e is None:
            # ui/ 这种共享素材目录没有 preset.json,是正常的,不当成坏条目
            if os.path.basename(d) == "ui":
                print("%-18s %-14s %5s  %-16s %s" % ("ui", "(共享素材)", "-", "-", "无 preset.json,按设计跳过"))
                continue
            bad.append((os.path.basename(d), probs))
            print("%-18s %-14s %5s  %-16s %s" % (os.path.basename(d), "-", "-", "-", "；".join(probs)))
            continue
        entries.append(e)
        eye_s = e["eye"].get("photo") or ("手绘:%s" % e["eye"]["kind"])
        print("%-18s %-14s %5d  %-16s %s" % (e["id"], e["title"], e["acts"], eye_s,
                                             "；".join(probs) if probs else "ok"))
        if probs:
            bad.append((e["id"], probs))

    total_bytes = sum(e["bytes"] for e in entries)
    print("-" * 96)
    print("%d 套可用,共 %.1f MB；%d 套有问题" % (len(entries), total_bytes / 1048576.0, len(bad)))

    if args.verify:
        return 1 if bad else 0
    if not entries:
        print("没有可用主题,不写 INDEX")
        return 1

    out = {
        "schema": 1,
        "generated_by": "dsh-gallery-pack/tools/build-index.py",
        "note": "开机画面与桌面主题是同一批图(acts[].file);eye 是悬浮球球心。"
                "缺 eye.photo 的主题用手绘 kind,**不会报错但球心是占位眼**。",
        "themes": entries,
    }
    with io.open(os.path.join(args.arts, "INDEX.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    lines = ["# 素材包索引", "",
             "共 **%d** 套，%0.1f MB。本文件由 `dsh-gallery-pack/tools/build-index.py` 生成。" % (len(entries), total_bytes / 1048576.0), "",
             "> **开机画面 = 桌面主题**：同一批 `acts[].file`，选一套两处一起换。",
             "> **悬浮球**：`eye.photo` 指向的图；没写的用手绘 `kind`。", "",
             "| id | 名称 | 幕数 | 球心 | 字节 |", "|---|---|---|---|---|"]
    for e in entries:
        lines.append("| `%s` | %s | %d | %s | %s |" % (
            e["id"], e["title"], e["acts"],
            e["eye"].get("photo") or "手绘:" + e["eye"]["kind"], format(e["bytes"], ",")))
    lines += ["", "## 每套的文件清单", ""]
    for e in entries:
        lines.append("### %s（`%s`）" % (e["title"], e["id"]))
        lines.append("")
        lines.append("preset.json · %d 幕" % e["acts"])
        for s in e["shots"]:
            lines.append("- `%s` %s B `%s`" % (s["file"], format(s["bytes"], ","), s["sha12"]))
        if e["eye"].get("photo"):
            lines.append("- `%s` %s B `%s` ← 悬浮球球心 (%s)"
                         % (e["eye"]["photo"], format(e["eye"].get("bytes") or 0, ","),
                            e["eye"].get("sha12") or "-", e["eye"]["kind"]))
        else:
            lines.append("- 悬浮球：手绘 `%s`（无照片）" % e["eye"]["kind"])
        lines.append("")
    with io.open(os.path.join(args.arts, "INDEX.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))

    print("已写 INDEX.json / INDEX.md")
    if bad:
        print("\n⚠ 有 %d 套存在问题,上面的表格已点名。补齐后再生成一次。" % len(bad))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())