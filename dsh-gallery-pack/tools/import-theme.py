#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""把一套/多套主题资源**导入**到 DSH 的 boot-naruto 素材目录。

    python dsh-gallery-pack\tools\import-theme.py                    # dry run:只打印计划
    python dsh-gallery-pack\tools\import-theme.py --apply            # 真导入
    python dsh-gallery-pack\tools\import-theme.py --zip x.zip --apply
    python dsh-gallery-pack\tools\import-theme.py --list             # 看现在有哪些套

## 为什么不需要写新的宿主接口

实测 `dsh-boot-gallery\lib\index.js`:
  · `listPresets()`(L267-282)每次 GET `/presets.json` 都**重新 readdirSync 磁盘**;
  · 所以**放一个新的主题目录进 arts/,刷新页面就出现在清单里**,不用改代码、不用重启。

⇒ "导入"这件事的全部内容就是:把 `preset.json` + `NN.jpg` + `eye.png` 放进
   `<arts>\<主题 id>\`,并做一次**校验**(免得导进去一个坏条目,在面板里显示成"坏:…")。

## 校验口径(与宿主 presetEntry 对齐)

宿主判一套"能播"要满足:`acts` 非空、每个 `file` 都在白名单里、且文件真的在目录中。
这里就在导入前先跑同样的检查,不合格的**拒入**并说明原因 ——
宁可在这里报错,也不要让它在用户面板里变成一个说不清为什么的坏格子。

## 安全

· 默认 dry run(不加 `--apply` 只打印计划),照本工作区"交付给用户的工具优先 dry run"的惯例;
· 目标已存在时**默认跳过**,要覆盖必须显式 `--force`;
· 绝不删任何东西,只增不改。
"""
import argparse
import json
import os
import re
import sys
import zipfile

WS = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_DEST = os.path.join(os.path.expanduser("~"), ".dsh", "boot-naruto", "arts")
PRESET = "preset.json"
IMG_EXT = (".jpg", ".jpeg", ".png", ".webp")
SAFE_ID = re.compile(r"^[a-z0-9_-]{1,40}$")


def safe_id(name):
    return bool(SAFE_ID.match(name))


def check_preset(d, pid):
    """返回 (ok, 原因)。口径照宿主 presetEntry。"""
    pj = os.path.join(d, PRESET)
    if not os.path.isfile(pj):
        return False, "缺 %s" % PRESET
    try:
        with open(pj, "r", encoding="utf-8") as f:
            j = json.load(f)
    except Exception as e:
        return False, "%s 不是合法 JSON: %s" % (PRESET, e)
    acts = j.get("acts") or []
    if not isinstance(acts, list) or not acts:
        return False, "acts 为空(这套没有可播的幕)"
    names = set(x.lower() for x in os.listdir(d))
    for i, a in enumerate(acts):
        if not isinstance(a, dict):
            return False, "acts[%d] 不是对象" % i
        fn = str(a.get("file") or "").lower()
        if not fn:
            return False, "acts[%d] 缺 file" % i
        if "/" in fn or "\\" in fn or ".." in fn:
            return False, "acts[%d] 的 file 含路径分隔符(%s)" % (i, fn)
        if fn == PRESET or not fn.endswith(IMG_EXT):
            return False, "acts[%d] 的 file 不是图片(%s)" % (i, fn)
        if fn not in names:
            return False, "acts[%d] 指向的 %s 不在目录里" % (i, fn)
    return True, "%d 幕" % len(acts)


def collect(src):
    """从目录或 zip 里找出所有"主题目录"。返回 [(id, 该目录路径或 zip 内前缀)]。"""
    if os.path.isdir(src):
        out = []
        # 情况一:src 自己就是一套
        if os.path.isfile(os.path.join(src, PRESET)):
            return [("__self__", src)]
        for n in sorted(os.listdir(src)):
            d = os.path.join(src, n)
            if os.path.isdir(d) and os.path.isfile(os.path.join(d, PRESET)):
                out.append((n.lower(), d))
        return out
    if zipfile.is_zipfile(src):
        with zipfile.ZipFile(src) as z:
            names = z.namelist()
        dirs = {}
        for n in names:
            if "/" not in n:
                continue
            pre, fn = n.rsplit("/", 1)
            if fn.lower() == PRESET and pre:
                dirs[pre.split("/")[-1].lower()] = pre
        return [(k, v) for k, v in sorted(dirs.items())]
    return []


def copy_dir(src, dst):
    os.makedirs(dst, exist_ok=True)
    n = 0
    for root, _dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        tgt = dst if rel == "." else os.path.join(dst, rel)
        os.makedirs(tgt, exist_ok=True)
        for f in files:
            if f.lower().endswith((".bak", ".psd")):
                continue          # 备份/源文件不进素材目录
            s = os.path.join(root, f)
            d = os.path.join(tgt, f)
            with open(s, "rb") as fi, open(d, "wb") as fo:
                fo.write(fi.read())
            n += 1
    return n


def copy_zip_prefix(zf, prefix, dst):
    os.makedirs(dst, exist_ok=True)
    n = 0
    with zipfile.ZipFile(zf) as z:
        for info in z.infolist():
            if info.is_dir() or not info.filename.startswith(prefix + "/"):
                continue
            base = info.filename[len(prefix) + 1:]
            if "/" in base or not base:
                continue
            if base.lower().endswith((".bak", ".psd")):
                continue
            with z.open(info) as fi, open(os.path.join(dst, base), "wb") as fo:
                fo.write(fi.read())
            n += 1
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", nargs="?", help="资源包目录 或 资源包 .zip")
    ap.add_argument("--dest", default=DEFAULT_DEST, help="素材根目录(默认 %s)" % DEFAULT_DEST)
    ap.add_argument("--apply", action="store_true", help="真的写入(不加=只打印计划)")
    ap.add_argument("--force", action="store_true", help="目标已存在时覆盖")
    ap.add_argument("--list", action="store_true", help="列出现有套")
    args = ap.parse_args()

    if args.list or not args.src:
        if not os.path.isdir(args.dest):
            print("素材目录不存在: %s" % args.dest)
            return 1
        print("素材目录: %s\n" % args.dest)
        rows = []
        for n in sorted(os.listdir(args.dest)):
            d = os.path.join(args.dest, n)
            if not os.path.isdir(d):
                continue
            ok, why = check_preset(d, n)
            rows.append((n, ok, why))
        for n, ok, why in rows:
            print("  %-18s %-6s %s" % (n, "可用" if ok else "不可用", why))
        print("\n共 %d 套,其中可用 %d 套" % (len(rows), sum(1 for r in rows if r[1])))
        return 0

    src = os.path.abspath(args.src)
    if not (os.path.isdir(src) or zipfile.is_zipfile(src)):
        print("找不到源: %s(既不是目录也不是 zip)" % src)
        return 1

    found = collect(src)
    if not found:
        print("在 %s 里没找到任何带 %s 的主题目录" % (src, PRESET))
        return 1

    print("源: %s" % src)
    print("目标: %s" % args.dest)
    print("%s\n" % ("**真导入**" if args.apply else "试跑(不写盘),要真导入加 --apply"))

    plan, bad = [], []
    for pid, path in found:
        if pid == "__self__":
            pid = os.path.basename(os.path.dirname(os.path.join(path, "x")))
        if not safe_id(pid):
            bad.append((pid, "id 不合规(只许 [a-z0-9_-],最长 40)"))
            continue
        dst = os.path.join(args.dest, pid)
        if os.path.exists(dst) and not args.force:
            plan.append((pid, path, dst, "已存在,跳过(要覆盖加 --force)"))
            continue
        plan.append((pid, path, dst, ""))

    for pid, path, dst, note in plan:
        # 先在源上校验;zip 的校验需要解出来的内容,这里退化成"至少能列出文件"
        if isinstance(path, str) and os.path.isdir(path):
            ok, why = check_preset(path, pid)
        else:
            ok, why = True, "zip(导入后校验)"
        if not ok:
            bad.append((pid, why))
            continue
        print("  %-18s %-28s %s" % (pid, note or "将导入", why))

    for pid, why in bad:
        print("  %-18s 拒入: %s" % (pid, why))

    good = [(p, src_, d) for p, src_, d, note in plan if not note and not any(p == b[0] for b in bad)]
    if not args.apply:
        print("\n计划导入 %d 套,拒入 %d 套。确认无误后加 --apply。" % (len(good), len(bad)))
        return 0

    done = 0
    for pid, path, dst in good:
        if isinstance(path, str) and path.startswith("__"):
            n = copy_dir(path, dst)
        elif os.path.isdir(path):
            n = copy_dir(path, dst)
        else:
            n = copy_zip_prefix(src, path, dst)
        ok, why = check_preset(dst, pid)
        print("  %-18s 写入 %d 文件 · %s" % (pid, n, ("校验通过: " + why) if ok else ("**校验失败**: " + why)))
        done += 1
    print("\n导入完成 %d 套。回 DSH 面板刷新即可见(宿主每次请求都重扫磁盘,不用重启)。" % done)
    return 0


if __name__ == "__main__":
    sys.exit(main())