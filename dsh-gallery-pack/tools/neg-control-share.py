"""阴性对照：给 SHARE.md 注一条**假 SHA 声明**，看包侧自测会不会变红。
用法:  python neg-control.py inject | restore | check
故意不在脚本里 subprocess 调自测（避免嵌套管道触发沙箱 EPERM），由外层 pwsh 编排。
"""
import io, os, sys

P = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = dsh-gallery-pack(本脚本在 tools/ 下)
SHARE = os.path.join(P, "SHARE.md")
BAK = os.path.join(P, "_scratch-neg-orig.txt")   # 就放在包外,由外层保证删除
MARK = "假声明对照用"


def main(act):
    if act == "inject":
        orig = io.open(SHARE, encoding="utf-8", newline="").read()
        io.open(BAK, "w", encoding="utf-8", newline="").write(orig)
        fake = orig + "\n\n> %s：现行 `naruto-arts-20261120-v7.zip` / SHA 前缀 `AAAAAAAAAAAA`。\n" % MARK
        io.open(SHARE, "w", encoding="utf-8", newline="").write(fake)
        print("  inject: SHARE %d -> %d B（备份 %d B）" % (len(orig), len(fake), len(os.path.getsize(BAK) and orig or orig)))
    elif act == "restore":
        orig = io.open(BAK, encoding="utf-8", newline="").read()
        io.open(SHARE, "w", encoding="utf-8", newline="").write(orig)
        now = io.open(SHARE, encoding="utf-8", newline="").read()
        os.remove(BAK)
        print("  restore: 与注入前逐字符相同 = %s  已删备份" % (now == orig))
    else:  # check
        t = io.open(SHARE, encoding="utf-8", newline="").read()
        print("  check: SHARE 里还有对照残留吗 = %s" % (MARK in t))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "check")
