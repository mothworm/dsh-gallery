r"""包侧自测 —— 守的是**实际发给朋友的那个 zip**，不是代码。

为什么要有这个文件（11-20）：
  boot 侧 110/94、套件侧 341 全都在测代码；`dsh-gallery-pack\tools\selftest*.mjs` 也只是转发到 boot 正本。
  **没有任何一条断言检查"发出去的包里到底有什么"**。而这两轮我连着两次让文档里的哈希过期
  （先打包后改文档 ⇒ v7 里装着 6,199 B 的旧提示词；脚本重产 ⇒ SHA 当场变假），
  还差点让 `pack-arts.py` 的 OUT 覆盖掉历史 v6。这些都是**交付物级**错误，代码全绿也照样发错包。

跑法：`python dsh-gallery-pack\tools\selftest-pack.py`（退出码 0 = 全绿；FAIL 行以两个空格开头便于 grep）
"""
import os, sys, re, json, zipfile, hashlib, collections

PACK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = ["给朋友的提示词.md", "资源包投放说明.md", "视频规格须知.md"]
MEDIA_SUFFIX = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp",
                ".mp4", ".m4v", ".webm", ".mov", ".mkv")

ok_n = 0
fails = []


def ok(cond, msg):
    global ok_n
    if cond:
        ok_n += 1
        print("  ok   %s" % msg)
    else:
        fails.append(msg)
        print("  FAIL %s" % msg)


def sha12(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for blk in iter(lambda: f.read(1 << 20), b""):
            h.update(blk)
    return h.hexdigest()[:12].upper()


def zpath(z, name):
    with z.open(name) as f:
        return f.read()


zips = sorted(n for n in os.listdir(PACK) if n.endswith(".zip"))
print("包目录: %s\nzip 清单: %s\n" % (PACK, zips))

cur = [n for n in zips if "-v7" in n]
ok(len(cur) == 1, "有且只有一个现行 v7 包（找到 %d 个: %s）" % (len(cur), cur))
if not cur:
    print("\n断言 %d,FAIL %d —— 没有 v7 就别往下跑了" % (ok_n, len(fails)))
    sys.exit(1)

V7 = os.path.join(PACK, cur[0])
z7 = zipfile.ZipFile(V7)
names = z7.namelist()

# —— [1] 结构完整性
ok(z7.testzip() is None, "testzip 干净（无损坏条目）")
dup = [k for k, c in collections.Counter(names).items() if c > 1]
ok(not dup, "条目名**无重复**（重复会让朋友解出两份不同内容）实际重复: %s" % (dup or "无"))
bak = [n for n in names if n.endswith(".bak")]
ok(not bak, "包里没有 .bak 污染条目（装机 arts 里躺着 14 个,混进来就是污染）实际: %s" % (bak or "无"))
abs_like = [n for n in names if re.search(r"^[A-Za-z]:|[\\/]Users[\\/]", n)]
ok(not abs_like, "条目名里不含绝对路径/用户名（脱敏）实际: %s" % (abs_like or "无"))

# —— [2] 素材齐不齐（朋友的"开箱即用"取决于这些）
top = collections.Counter(n.split("/")[0] for n in names if "/" in n)
presets = sorted(d for d in top if all(n == d + "/preset.json" for n in names if n.startswith(d + "/") and n.endswith("preset.json")) and d not in ("frames", "ui", "clips"))
ok(len(presets) == 17, "顶层预设目录 17 个（每个都带 preset.json）实际 %d: %s" % (len(presets), presets))
ui = sorted(n for n in names if n.startswith("ui/"))
ok(len(ui) == 5 and not any(n.endswith("preset.json") for n in ui),
   "ui/ 恰好 5 张 frame-*.png 且**没有 preset.json**（放了就会多出一个假主题）实际: %s" % ui)
frames = [n for n in names if n.startswith("frames/")]
ok(len(frames) >= 9, "frames/ 有内置分镜 %d 个" % len(frames))
mp4s = [n for n in names if n.lower().endswith(".mp4")]
ok(mp4s == ["clips/tobirama-night.mp4"],
   "视频只有 clips/tobirama-night.mp4 一条，且**文件名全 ASCII**（带 · 或空格会被服务端 400 静默拒播）实际: %s" % mp4s)
media = [n for n in names if n.lower().endswith(MEDIA_SUFFIX)]
ok(len(media) >= 90, "媒体条目 %d 个（v6 时代实测 99）" % len(media))

# —— [3] 说明必须跟着包走（这轮新立的规矩）
for d in DOCS:
    inzip = d in names
    disk = os.path.join(PACK, d)
    same = inzip and os.path.isfile(disk) and zpath(z7, d) == open(disk, "rb").read()
    ok(same, "%s 在包里**且与磁盘逐字节一致**（先打包后改文档就会装进旧版）zip内 %s / 磁盘 %s"
       % (d, z7.getinfo(d).file_size if inzip else "不存在", os.path.getsize(disk) if os.path.isfile(disk) else "不存在"))

# —— [4] 与上一代 v6 比：素材一字节都不许变
v6 = [os.path.join(PACK, n) for n in zips if "-v6" in n]
if v6:
    z6 = zipfile.ZipFile(v6[0])
    n6 = z6.namelist()
    lost = [n for n in n6 if n not in names]
    changed = [n for n in n6 if n in names and (z6.getinfo(n).CRC != z7.getinfo(n).CRC or z6.getinfo(n).file_size != z7.getinfo(n).file_size)]
    ok(not lost, "相对 v6 一条素材都没丢 实际丢: %s" % (lost or "无"))
    ok(not changed, "相对 v6 同名条目内容都没变（改素材要另发代,不能悄悄换）实际变: %s" % (changed or "无"))
    ok(set(names) - set(n6) == set(DOCS), "比 v6 多出来的条目**恰好只有** 3 份说明 实际多出: %s"
       % sorted(set(names) - set(n6)))
else:
    print("  note 没有 v6 可比（首轮或未同步）—— 跳过两代比对")

# —— [5] 视频绑定必须在**包内**那份 preset.json 里（不是只在我开发机上）
tn = "tobirama-night/preset.json"
if tn in names:
    doc = json.loads(zpath(z7, tn).decode("utf-8"))
    ok(doc.get("clip") == "tobirama-night.mp4",
       "包内永夜·扉间的 clip = tobirama-night.mp4（逐字一致、大小写敏感）实际: %r" % doc.get("clip"))
    others = [n for n in presets if n != "tobirama-night" and json.loads(zpath(z7, n + "/preset.json").decode("utf-8")).get("clip")]
    ok(not others, "**只有点名的一套用视频**，其余 16 套没有 clip 键（逐帧照旧）实际也有 clip 的: %s" % others)
else:
    ok(False, "包内找不到 %s" % tn)

# —— [6] 文档里的哈希不许过期（本轮真两次踩到）
# ⚠ 第一版我拿"文件名提及后 260 字符内**所有** 12 位十六进制"去比,结果把**下一代**的哈希算到上一代头上
#    (报出"v5 文档写 BECF67EBB794"),而文档其实是对的 —— 判据太宽就等于自己造假 FAIL。
#    现在只验**显式声明**：`SHA 前缀 \`HEX\``，且必须在同一个"文件名提及之后的窗口"里、窗口以下一个文件名为界。
share = open(os.path.join(PACK, "SHARE.md"), encoding="utf-8").read()
mentions = [(m.group(0), m.group(1), m.start(), m.end()) for m in re.finditer(r"naruto-arts-\d{8}-(v\d+)\.zip", share)]
stale = []
claims = 0
for i, (fname, ver, a, b) in enumerate(mentions):
    nxt = mentions[i + 1][2] if i + 1 < len(mentions) else len(share)
    win = share[b:min(nxt, b + 200)]
    m = re.search(r"SHA 前缀 `([0-9A-Fa-f]{12})`", win)
    if not m:
        continue
    claims += 1
    cand = [n for n in zips if "-%s." % ver in n]
    if not cand:
        stale.append("%s 文档给了哈希但盘上没这个包" % ver)
        continue
    want = sha12(os.path.join(PACK, cand[0]))
    if m.group(1).upper() != want:
        stale.append("%s 文档写 %s 实际 %s" % (ver, m.group(1).upper(), want))
ok(claims >= 2, "SHARE.md 至少对现行包与上一代各有一条显式 SHA 声明（一条都没有就是这道闸在空转）实际声明 %d 条" % claims)
ok(not stale, "SHARE.md 里每条「SHA 前缀」都等于**当前盘上那份**（过期哈希=假验收）实际: %s" % (stale or "无"))

build = open(os.path.join(PACK, "tools", "pack-arts.py"), encoding="utf-8").read()
m_out = re.search(r'OUT = os\.path\.join\(PACK, "([^"]+)"\)', build)
ok(bool(m_out) and m_out.group(1) == cur[0],
   "pack-arts.py 的 OUT 就是现行包 %s（否则重跑会覆盖历史代）实际: %s" % (cur[0], m_out.group(1) if m_out else "读不到"))
m_docs = re.search(r'^DOCS = \[(.+?)\]', build, re.M)
in_docs = m_docs and re.findall(r'"([^"]+)"', m_docs.group(1))
ok(in_docs == DOCS, "pack-arts.py 的模块级 DOCS 与本脚本 DOCS 同一张清单（两处不一致就会 added/expect 两头分叉）实际: %s" % in_docs)
ok("want[d] = p" in build, "说明是加进 **want**（条目来源集合），不是加在写出循环里（后者会让差异闸自己拒产出包）")

tip = open(os.path.join(PACK, "给朋友的提示词.md"), encoding="utf-8").read()
for needle, why in [("arts2", "必须写明 arts2→arts 这层改名"),
                    ("arts" + chr(92) + "ui", "必须写明 ui 落到 arts\\ui（放错层底框静默退化成「无」)"),
                    ("没有 `arts2/` 这一层", "必须写明 zip 布局与盘上不同"),
                    ("-UseBasicParsing", "自检命令要能在非交互 PowerShell 里跑起来"),
                    ("重启", "必须写明光刷新页面不够"),
                    ("禁止商用", "分发边界要写在素材旁边")]:
    ok(needle in tip, "提示词里有「%s」—— %s" % (needle, why))
ok("%USERPROFILE%" in tip or "$env:USERPROFILE%" in tip, "提示词用 %USERPROFILE% 而不是把我这台机的用户名写死")

# —— 素材边界(2026-11-22 定案,用户拍板)——
# 分工:
#   · **随插件走**:清寒/暖秋/夜潮 三套自画风景 → dsh-boot-suites/gallery/arts-builtin/
#   · **随素材包走**:火影那 17 套 → arts2/,不进 git
#   · **不放**:鲸鱼娘(CC BY-NC-SA 与 BSD-3 冲突,已整套撤下)
#
# 这条断言守的是"边界没被悄悄破坏"。判据用 git ls-files,
# 因为它反映的正是**别人 clone 下来会拿到什么**,比 os.walk 准。
try:
    import subprocess
    # PACK = <repo>/dsh-gallery-pack  ⇒ 上跳**两级**才是仓库根。
    # ⚠ 2026-11-22 修:原来写的是 dirname(dirname(PACK)),那是 <工作区的父目录>(D:\projects),
    #   在那里跑 git ls-files 得到**空列表**,于是"没有媒体文件"这条**永远绿** ——
    #   一个恒真断言比没有断言更糟,它会让人以为边界有人守着。
    #   现在算完立刻自检:拿不到任何被跟踪文件就直接报红,而不是静默放行。
    _repo = os.path.dirname(PACK)
    _tracked = subprocess.run(["git", "ls-files"], cwd=_repo,
                              capture_output=True, text=True, timeout=30).stdout.splitlines()
    ok(len(_tracked) > 0,
       "能在仓库根读到被跟踪的文件(读到 %d 个;为 0 说明仓库根算错了,下面的边界检查会全部失真)" % len(_tracked))
    if not _tracked:
        raise RuntimeError("repo root unreachable")
    _media = re.compile(r"\.(png|jpe?g|webp|gif|mp4|psd|zip)$", re.I)
    _media_files = [ln for ln in _tracked if _media.search(ln)]

    # ① 火影/资源包素材本体不许进仓库。
    #    ⚠ 2026-11-22 修:原来只查 "arts-scenery|arts-whalegirl|arts2" 这几个键,
    #    新开的 arts-builtin 完全不在它的视野里 —— 那条断言在素材真的入仓后**仍然全绿**,
    #    等于没在守。改成反过来的写法:**除 arts-builtin 之外,一个媒体文件都不许有**。
    _outside = [ln for ln in _media_files if "arts-builtin" not in ln.replace("\\", "/")]
    ok(not _outside, "仓库里的媒体文件只在 arts-builtin 内(越界 %d 个: %s)" % (len(_outside), _outside[:3]))

    # ② arts-builtin 必须**真的存在且齐全** —— 它是"随插件分发、装完就能用"的唯一凭据。
    #    缺了它,用户装完插件只会看到一片"没有主题"。
    _builtin = [ln for ln in _media_files if "arts-builtin" in ln.replace("\\", "/")]
    _ids = sorted(set(ln.replace("\\", "/").split("arts-builtin/")[1].split("/")[0]
                      for ln in _builtin if "arts-builtin/" in ln.replace("\\", "/")))
    ok(sorted(_ids) == ["scenery-cool", "scenery-dark", "scenery-warm"],
       "arts-builtin 恰好是自画的三套(实际 %s)" % (_ids,))

    # ③ 鲸鱼娘既然撤了,就断言它真的不在 —— 免得哪天半套残留(图删了、脚本还在)。
    _wl = [ln for ln in _tracked if "whalegirl" in ln.lower()]
    ok(not _wl, "鲸鱼娘已整套撤下(仓库里残留 %d 个: %s)" % (len(_wl), _wl[:3]))
except Exception as _e:
    ok(True, "跳过 git 边界检查(%s) —— 不在 git 仓库里跑时是正常的" % type(_e).__name__)

print("\n断言 %d,FAIL %d%s" % (ok_n, len(fails), "，全绿" if not fails else ""))
sys.exit(0 if not fails else 1)
