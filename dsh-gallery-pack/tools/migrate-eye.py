#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""把火影那 17 套的 `eye`(球心图设定)从已删除的调色文件迁移进各自的 `preset.json`。

## 为什么要这一步

历史事实(2026-11-21 真机):
  · 球心图设定原本住在 `palettes/tuned/<id>.json` 的 `eye` 字段里;
  · 我把 17 套调色整体移出仓库后,那批数据**跟着一起没了**;
  · preset.json 里从来没有过 eye ⇒ 宿主清单条目没有 eye ⇒ 客户端退回手绘占位眼。
  ⇒ 用户看到「原先火影那些的悬浮球图案都没显示」。

调色文件已经不在盘上(临时备份也被清了),但**数据在 git 历史里**(提交 `b3ece37^`)。
本脚本就从那里读回来,写进 `<arts>/<id>/preset.json` 的 `eye` 字段。

## 为什么写进 preset.json 而不是恢复 palettes/

用户 2026-11-21 的分工:火影素材随**素材包**走。
"这套主题要什么球心"属于主题自己的元数据,应该跟主题目录在一起 ——
导入一套主题时球心就跟着来,不依赖另一个 palettes/ 目录也要跟着同步。

## 用法

  python dsh-gallery-pack/tools/migrate-eye.py            # dry run
  python dsh-gallery-pack/tools/migrate-eye.py --apply
  python dsh-gallery-pack/tools/migrate-eye.py --arts <素材根目录>
"""
import argparse
import io
import json
import os
import subprocess
import sys

WS = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_ARTS = os.path.join(os.path.expanduser("~"), ".dsh", "boot-naruto", "arts")
# 调色被删掉之前的最后一个提交
REV = "b3ece37^"
PAL_DIR = "dsh-boot-suites/naruto/palettes/tuned"


def git_show(rel):
    out = subprocess.run(["git", "show", "%s:%s" % (REV, rel)], cwd=WS,
                         capture_output=True)
    if out.returncode != 0:
        return None
    return out.stdout.decode("utf-8", "replace")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--arts", default=DEFAULT_ARTS)
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    listing = subprocess.run(["git", "ls-tree", "-r", "--name-only", REV, "--", PAL_DIR],
                             cwd=WS, capture_output=True)
    if listing.returncode != 0:
        print("读不到 git 历史(%s);本脚本需要 %s 这个提交还在" % (REV, REV))
        return 1
    files = [f for f in listing.stdout.decode().splitlines() if f.endswith(".json")]
    if not files:
        print("历史里没找到调色文件")
        return 1
    print("从 %s 读回 %d 套调色的 eye 设定" % (REV, len(files)))
    print("目标素材根: %s" % args.arts)
    print("%s\n" % ("**真写入**" if args.apply else "试跑(不写盘),加 --apply"))

    done, skip, miss = 0, 0, []
    for rel in sorted(files):
        pid = os.path.basename(rel)[:-5]
        raw = git_show(rel)
        if not raw:
            continue
        try:
            pal = json.loads(raw)
        except ValueError:
            continue
        eye = pal.get("eye") or {}
        kind = str(eye.get("kind") or "").strip()
        photo = str(eye.get("photo") or "").strip().lower()
        if not kind and not photo:
            continue

        d = os.path.join(args.arts, pid)
        pj = os.path.join(d, "preset.json")
        if not os.path.isfile(pj):
            miss.append(pid)
            continue
        # 球心图文件必须真的在目录里,否则写进去也是个 404(比不写更糟:onerror 才回退,中间有一帧空白)
        if photo and not os.path.isfile(os.path.join(d, photo)):
            photo = ""
        # 没写 photo 的(byakugan / paper / kunai 那几套):按约定补默认文件名。
        # 这份约定原来藏在 40-eye/70-dom 里:苦无 -> kunai.png,其余手绘。
        # 只有目录里真有 kunai.png 时才补,免得指向不存在的文件。
        if not photo and kind == "kunai" and os.path.isfile(os.path.join(d, "kunai.png")):
            photo = "kunai.png"

        with io.open(pj, "r", encoding="utf-8") as f:
            doc = json.load(f)
        cur = doc.get("eye") or {}
        if cur.get("kind") == kind and (cur.get("photo") or "") == photo:
            skip += 1
            continue
        new_eye = {"kind": kind}
        if photo:
            new_eye["photo"] = photo
        doc["eye"] = new_eye
        print("  %-16s kind=%-14s photo=%s" % (pid, kind, photo or "(无,手绘)"))
        if args.apply:
            with io.open(pj, "w", encoding="utf-8", newline="\n") as f:
                json.dump(doc, f, ensure_ascii=False, indent=2)
        done += 1

    if miss:
        print("\n这些套在素材目录里没有(未导入,跳过): %s" % ", ".join(miss))
    print("\n%s %d 套,已是最新 %d 套" % ("写入" if args.apply else "将写入", done, skip))
    if not args.apply and done:
        print("确认无误后加 --apply。")
    return 0


if __name__ == "__main__":
    sys.exit(main())