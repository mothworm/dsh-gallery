#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""比对 dsh-gallery-pack/ 里的文档与 zip 内同名文件是否一致。

## 为什么要有这个脚本

2026-11-24 实撞过一次：在 mac 上改了 `导入指南.txt` / `给朋友的提示词.txt`、
新增了 `开工必读-开机画面.md`，然后**直接在 mac 上重打了 zip**，
没有把改过的文件同步回 Windows。

第二天在 Windows 上准备再改时，磁盘上还是 11-22 凌晨的旧版：

    给朋友的提示词.txt     磁盘 3702 B / zip 2871 B
    导入指南.txt           磁盘 3719 B / zip 5128 B
    开工必读-开机画面.md   磁盘 不存在 / zip 3947 B
    INDEX.txt              磁盘 不存在 / zip 1878 B

如果那时直接改磁盘文件再重打包，mac 上写的内容会**全部丢失**。

这个脚本把那次排查写成一条命令，打包前跑一遍就知道两边是否同步。

## 用法

    python dsh-gallery-pack/tools/check-docs.py
    python dsh-gallery-pack/tools/check-docs.py --zip 某个包.zip

退出码：0 = 全部一致；1 = 有不一致或缺文件（**这时不要打包**）。
"""
import io
import os
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
PACK = os.path.dirname(HERE)          # dsh-gallery-pack/
REPO = os.path.dirname(PACK)          # 仓库根
ARTS = os.path.join(PACK, "arts2")    # 素材源(INDEX.* 由 build-index.py 写这里)

# 这几份文档要在"磁盘源"与"包内"之间保持逐字节一致。
#
# ⚠ INDEX.txt 有两份，位置不同，别搞混（2026-11-24 实测踩到）：
#   dsh-gallery-pack/INDEX.txt       1878 B  早期手写的简版，v2 包用的是它
#   dsh-gallery-pack/arts2/INDEX.txt 7.7 KB  build-index.py 生成的详细版，
#                                            pack-themes.py 打的是这份
#   本脚本必须查**打包实际用的那份**，否则会报假的不一致。
DOCS = (
    ("导入指南.txt", PACK),
    ("给朋友的提示词.txt", PACK),
    ("开工必读-开机画面.md", PACK),
    ("INDEX.txt", ARTS),
)


def newest_zip():
    """最新的 dsh-gallery-handson-*.zip。

    ⚠ 要查**两个目录**：`pack-themes.py --out` 默认写到仓库根（见其 L112，
       out = os.path.join(WS, ...)），而人也可能手动把包放在 dsh-gallery-pack/。
       第一版只查了 PACK，于是明明有包却报「找不到素材包 zip」—— 实测踩到。
    """
    best = None
    for d in (REPO, PACK):
        if not os.path.isdir(d):
            continue
        for f in os.listdir(d):
            if f.startswith("dsh-gallery-handson-") and f.endswith(".zip"):
                p = os.path.join(d, f)
                if best is None or os.path.getmtime(p) > os.path.getmtime(best):
                    best = p
    return best


def main():
    zpath = newest_zip()
    for i, a in enumerate(sys.argv):
        if a == "--zip" and i + 1 < len(sys.argv):
            zpath = os.path.abspath(sys.argv[i + 1])
    if not zpath or not os.path.isfile(zpath):
        print("找不到素材包 zip。用 --zip 指定一个。")
        return 1

    print("包: %s (%d B)\n" % (os.path.basename(zpath), os.path.getsize(zpath)))
    z = zipfile.ZipFile(zpath)
    names = set(z.namelist())

    bad = []
    print("%-26s %10s %10s  %s" % ("文件", "磁盘源", "包内", "结果"))
    print("-" * 62)
    for name, base in DOCS:
        src = os.path.join(base, name)
        db = io.open(src, "rb").read() if os.path.isfile(src) else None
        zb = z.read(name) if name in names else None

        if db is None and zb is None:
            print("%-26s %10s %10s  两边都没有" % (name, "-", "-"))
            continue
        if db is None:
            print("%-26s %10s %10s  **只有包里有(磁盘源缺失)**" % (name, "-", len(zb)))
            bad.append(name)
            continue
        if zb is None:
            print("%-26s %10s %10s  **只有磁盘有(包里缺失)**" % (name, len(db), "-"))
            bad.append(name)
            continue
        same = db == zb
        print("%-26s %10s %10s  %s" % (name, len(db), len(zb),
                                       "一致" if same else "**不一致**"))
        if not same:
            bad.append(name)

    print()
    if bad:
        print("!! %d 份不一致：%s" % (len(bad), ", ".join(bad)))
        print("   先弄清哪边是新的，再把另一台机器同步过来。")
        print("   ⚠ 不要默认磁盘上的就是新的 —— 2026-11-24 那次恰好相反。")
        return 1
    print("四份文档全部一致，可以打包。")
    return 0


if __name__ == "__main__":
    sys.exit(main())