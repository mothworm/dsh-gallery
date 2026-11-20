r"""打素材包(11-20 起产 **v7**)—— 从私有包当前磁盘状态重建 zip,并**自动核对**条目差。

为什么要有这个脚本而不是手搓 zip:SHARE.md 里定了验收规矩「v6 与 v5 的条目差异应当恰好等于
新增文件数,对不上就是打包时漏了东西或把 .bak 混进去了」。手搓没人会真去逐条比,所以把这条
写死在脚本里,让它自己喊。

映射关系(磁盘 -> 包内路径)**从 v5 的 namelist 实测反推**,不是猜的 —— 这是 dry-run 抓出来的坑:
包根**就是**装机侧 `arts\` 的内容,预设目录**不带** `arts/` 前缀:
  dsh-naruto-pack\arts2\<预设>\*   ->  <预设>/*         (v5 实测:brothers/01.jpg、danzo/preset.json…)
  dsh-naruto-pack\frames\*         ->  frames/*        (v5 里唯一带目录前缀的那组)
  dsh-naruto-pack\ui\*             ->  ui/*            (v6 新增;解压后即 arts\ui\)
  dsh-naruto-pack\clips\*          ->  clips/*         (v6 新增;解压后即 boot-naruto\clips\)
  包根目录下 v5 里同名的散装文档      ->  同名

用法:
  python dsh-naruto-pack\tools\pack-arts.py            # 打 + 自检
  python dsh-naruto-pack\tools\pack-arts.py --dry      # 只算清单不写文件
"""
import os, sys, zipfile, hashlib, argparse

PACK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V5 = os.path.join(PACK, "naruto-arts-20261118-v5.zip")     # 差异基线(111 条目)
# 11-20:OUT 从 v6 改成 **v7**。留在 v6 上谁重跑一次就把历史 v6 覆盖了,而 SHARE 记的 v6 哈希会变成假的。
# 现在这条命令产出的就是**实际发出去的那份包** ⇒ 可复现(以前 v7 是我手工 append 出来的孤儿)。
OUT = os.path.join(PACK, "naruto-arts-20261120-v7.zip")
SKIP_SUFFIX = (".bak",)          # 装机 arts 里躺着 14 个 .bak,混进包里就是污染
# 11-20:说明文件必须由 pack-arts 一起打进包 —— 朋友拿到的是 zip,看不见《给朋友的提示词.md》里
# "arts2→arts / ui→arts\ui"那两处映射就会静默失效。定义在模块级:build_set 与差异判据都得用它。
DOCS = ["给朋友的提示词.md", "资源包投放说明.md", "视频规格须知.md"]


def sha12(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for blk in iter(lambda: f.read(1 << 20), b""):
            h.update(blk)
    return h.hexdigest()[:12]


def build_set():
    """返回 {包内路径: 磁盘绝对路径}"""
    want = {}
    arts = os.path.join(PACK, "arts2")
    for dirpath, dirnames, filenames in os.walk(arts):
        for fn in filenames:
            if fn.lower().endswith(SKIP_SUFFIX):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, arts).replace("\\", "/")
            want[rel] = full      # 包根 = arts 内容,**不加** "arts/" 前缀(v5 实测)
    for sub in ("frames", "ui", "clips"):
        d = os.path.join(PACK, sub)
        if not os.path.isdir(d):
            print("  !! 目录不存在,会少东西: %s" % d)
            continue
        for dirpath, dirnames, filenames in os.walk(d):
            for fn in filenames:
                if fn.lower().endswith(SKIP_SUFFIX):
                    continue
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, d).replace("\\", "/")
                want[sub + "/" + rel] = full
    # 说明也进 want(只加在写盘那一步会让 added/expect 两头不一致,差异闸自己把包拒掉 —— 11-20 实测 real exit=1 不写文件)
    for d in DOCS:
        p = os.path.join(PACK, d)
        if not os.path.isfile(p):
            print("  !! 说明文件不在 -> 不许出包: %s" % p)
            sys.exit(1)
        want[d] = p
    with zipfile.ZipFile(V5) as z:
        for n in z.namelist():
            if "/" in n:
                continue  # 目录内条目由上面三段生成
            src = os.path.join(PACK, n)
            if os.path.isfile(src):
                want[n] = src
            else:
                print("  !! v5 里有这个根级文件,但磁盘上没了,将不打包: %s" % n)
    return want


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()

    with zipfile.ZipFile(V5) as z:
        old = set(z.namelist())
    want = build_set()
    new = set(want)

    added = sorted(new - old)
    removed = sorted(old - new)
    # 标签别写死 "v6" —— 11-20 OUT 已经改成 v7,写死的标签会指着上一代说现在的事(这类假文档本档案抓过好几回)。
    print("v5 条目 %d -> %s 条目 %d" % (len(old), os.path.basename(OUT), len(new)))
    print("新增 %d 个:" % len(added))
    for n in added:
        print("  + %-46s %10.2f MB" % (n, os.path.getsize(want[n]) / 1048576.0))
    if removed:
        print("!! 少了 %d 个(必须解释,否则就是打包漏了):" % len(removed))
        for n in removed:
            print("  - " + n)
    # 验收:新增应当恰好 = 5 张底框 + 1 片 mp4;少一个都不行
    expect = {"ui/frame-%s.png" % m for m in ("doton", "katon", "raton", "suiton", "futon")}
    expect.add("clips/tobirama-night.mp4")
    expect.update(DOCS)   # 11-20:说明文件也算"该新增的条目"(DOCS 在模块级定义)
    missing = sorted(expect - set(added))
    print("应新增但没新增的: %s" % (missing if missing else "无 ✓"))
    print("多余新增的: %s" % (sorted(set(added) - expect) or "无 ✓"))
    stray = [n for n in new if n.endswith(".bak")]
    print("包里 .bak 条目: %d %s" % (len(stray), "✓" if not stray else "!! 必须清掉"))
    if args.dry or missing or stray or (set(added) != expect):
        print("dry-run / 有异常 -> 不写文件" if (missing or stray or set(added) != expect) else "dry-run -> 不写文件")
        return 1

    # ⚠ 本脚本现在产出的就是**实际发出去的那份包**(OUT=v7),重跑一次得到同一批条目;
    #    历史 v6 不再被覆盖。说明文件已经在 want 里(见 build_set),这里一次写完,不要再追加第二遍 ——
    #    zipfile 允许同名条目重复写入,追加会造出 120+3 的重复条目。
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for n in sorted(want):
            z.write(want[n], n)
    sz = os.path.getsize(OUT)
    with zipfile.ZipFile(OUT) as z:
        names = z.namelist()
        media = [n for n in names if n.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov", ".mkv"))]
        bad = z.testzip()
        mp4 = z.getinfo("clips/tobirama-night.mp4")
        with z.open("clips/tobirama-night.mp4") as f:
            h = hashlib.sha256(f.read()).hexdigest()[:12]
    print("\n写出 %s  %.2f MB  条目 %d  媒体 %d  testzip=%s" % (os.path.basename(OUT), sz / 1048576.0, len(names), len(media), bad))
    print("  片源条目哈希 %s (磁盘 019CE346D4EA) 相同=%s" % (h.upper(), h.upper() == "019CE346D4EA"))
    # 注意:hexdigest() 是**小写**,拿大写常量直接 == 会假否定(第一版就是这么骗了自己的)。
    # 11-20:条目增量 = 6 个素材 + len(DOCS) 份说明(旧版这里只写死 +6,加了说明就会假失败)。
    return 0 if len(names) == len(old) + 6 + len(DOCS) and h.upper() == "019CE346D4EA" and bad is None else 1


if __name__ == "__main__":
    sys.exit(main())
