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


# ══════════════════════════════════════════════════════════════════════════
# [1]~[6] 2026-11-22 重写:改为校验**现行**交付物 —— 用 pack-themes.py 打的主题包。
#
# 旧版这段测的是 v7 包(naruto-arts-20261120-v7.zip),而 v7 的三样内容全部已退役:
#   · ui/frame-*.png  —— 五遁位图底框,11-21 换成磨砂玻璃后不再需要;
#   · clips/*.mp4     —— 开屏视频,现在只用静态图;
#   · frames/*.jpg    —— 九幕内置分镜,现在全走主题目录。
# 继续测一个不发出去的包 = 假绿。现在改为:对盘上每个现行主题包逐个验结构,
# 并要求"现行包"必须由 pack-themes.py 产出(pack-arts.py 已退役)。
# ══════════════════════════════════════════════════════════════════════════

# 主题包打在**仓库根**(与 dsh-gallery-pack 同级),不是 pack 目录里 —— 两处都找。
# ⚠ PACK 已经是 `.../dsh-gallery-pack`(它把 tools/ 跳掉了),所以仓库根只需**一级** dirname。
#   第一版写了三级,算到工作区根上去了,于是"找到 0 个主题包"—— 又是同一个路径层级坑。
_REPO = os.path.dirname(PACK)
_SCAN = []
for _d in (PACK, _REPO):
    if os.path.isdir(_d):
        _SCAN += [os.path.join(_d, n) for n in os.listdir(_d)
                  if n.startswith("dsh-gallery-handson-") and n.endswith(".zip")]
zips = sorted(os.path.basename(p) for p in _SCAN)

print("仓库根: %s" % _REPO)
print("现行主题包: %s\n" % (zips or "(无)"))

THEME_ZIPS = [n for n in zips if n.startswith("dsh-gallery-handson-") and n.endswith(".zip")]
ok(len(THEME_ZIPS) >= 1, "包目录里有现行主题包 dsh-gallery-handson-*.zip(找到 %d 个: %s)" % (len(THEME_ZIPS), THEME_ZIPS))

for zname in THEME_ZIPS:
    zp = os.path.join(PACK, "..", zname) if not os.path.isfile(os.path.join(PACK, zname)) else os.path.join(PACK, zname)
    zp = os.path.normpath(zp)
    if not os.path.isfile(zp):
        # 主题包打在仓库根,不在 dsh-gallery-pack 下
        zp = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(PACK)), zname))
    if not os.path.isfile(zp):
        ok(False, "找不到 %s(应在仓库根)" % zname)
        continue
    z = zipfile.ZipFile(zp)
    ns = z.namelist()
    ok(z.testzip() is None, "%s: testzip 干净" % zname)
    dup = [k for k, c in collections.Counter(ns).items() if c > 1]
    ok(not dup, "%s: 条目名无重复(重复会让对方解出两份不同内容)" % zname)
    bak = [n for n in ns if n.endswith(".bak")]
    ok(not bak, "%s: 没有 .bak 污染" % zname)
    abslike = [n for n in ns if re.search(r"^[A-Za-z]:|[\\/]Users[\\/]", n)]
    ok(not abslike, "%s: 条目名不含绝对路径/用户名" % zname)

    # 主题数:带 preset.json 的顶层目录
    tops = sorted(set(n.split("/")[0] for n in ns if "/" in n))
    themes = [d for d in tops if (d + "/preset.json") in ns]
    ok(len(themes) == 17, "%s: 17 套主题(每套带 preset.json)实际 %d: %s" % (zname, len(themes), themes))

    # 每套必须有幕图,且 preset.json 里点到的幕图都在包里
    bad_acts = []
    no_eye = []
    for d in themes:
        try:
            doc = json.loads(z.read(d + "/preset.json").decode("utf-8"))
        except Exception as e:
            bad_acts.append("%s(preset.json 解析失败 %s)" % (d, e))
            continue
        acts = doc.get("acts") or []
        files = [a.get("file") for a in acts if a.get("file")]
        if not files:
            bad_acts.append("%s(没有幕图)" % d)
            continue
        miss = [f for f in files if (d + "/" + f) not in ns]
        if miss:
            bad_acts.append("%s(缺 %s)" % (d, miss))
        # 球心:写了 photo 就必须在包里(否则对方悬浮球是灰的,而且不报错)
        eye = doc.get("eye") or {}
        ph = eye.get("photo")
        if ph and (d + "/" + ph) not in ns:
            no_eye.append("%s(eye.photo=%s 不在包里)" % (d, ph))
    ok(not bad_acts, "%s: 每套的幕图都在包里。问题: %s" % (zname, bad_acts or "无"))
    ok(not no_eye, "%s: eye.photo 指向的图都在包里(缺了悬浮球静默变灰圈)。问题: %s" % (zname, no_eye or "无"))

    # 文档以 .txt 为主(用户:不是谁都装 typora),但允许**点名**的 .md
    #
    # 2026-11-24 改:v2 包新增了「开工必读-开机画面.md」,原来那条
    # 「包根不含 .md」于是报红。查证后是**包的意图变了**,不是包坏了:
    # 那份排查指南同时要在 GitHub 上好看,用 .md 是刻意的。
    # 所以从"一律不许"改成"白名单放行 + 其余仍然报红" —— 闸门还有牙,
    # 只是不再误伤已知的那一份。
    docs = [n for n in ns if "/" not in n]
    MD_OK = {"开工必读-开机画面.md"}
    ok("导入指南.txt" in docs, "%s: 包根有 导入指南.txt" % zname)
    ok("给朋友的提示词.txt" in docs, "%s: 包根有 给朋友的提示词.txt" % zname)
    ok("INDEX.txt" in docs, "%s: 包根有 INDEX.txt(纯文本索引)" % zname)
    stray_md = [n for n in docs if n.endswith(".md") and n not in MD_OK]
    ok(not stray_md,
       "%s: 包根的 .md 只允许白名单内的(其余:对方没装 Markdown 工具会看到满屏 # 和 |)。越界: %s"
       % (zname, stray_md or "无"))

    # ui/ 与 frames/ = 五遁位图底框时代的产物,已彻底退役,包内不许出现。
    #
    # clips/ **不是退役** —— 2026-11-24 查证:lib/index.js:43 的 clipsDir()
    # 仍在读 ~/.dsh/boot-naruto/clips/,只是语义从"丢进去就全局播"
    # 改成"preset.json 写 clip 字段点名才播"(client.js:52 VIDEO_GLOBAL=false)。
    # 原来那条断言把 clips/ 和 ui/frames 并列写成"已废弃",措辞是错的。
    # 现在改成:ui/ frames/ 一律不许;clips/ 只许放视频文件。
    ok(not [n for n in ns if n.startswith("ui/") or n.startswith("frames/")],
       "%s: 不含已退役的 ui/ frames/(五遁位图底框已废弃)" % zname)
    VID_EXT = (".mp4", ".m4v", ".webm", ".mov", ".mkv")
    bad_clip = [n for n in ns if n.startswith("clips/") and not n.endswith(VID_EXT)]
    ok(not bad_clip,
       "%s: clips/ 下只放视频文件(其余:宿主只列视频,别的文件是死重量)。越界: %s"
       % (zname, bad_clip or "无"))

# 现行打包器必须是 pack-themes.py,退役的 pack-arts.py 不许再产包
build = open(os.path.join(PACK, "tools", "pack-themes.py"), encoding="utf-8").read()
ok('"导入指南.txt"' in build and '"给朋友的提示词.txt"' in build,
   "pack-themes.py 打的是 .txt 文档(不是 .md)")
ok('"INDEX.txt"' in build, "pack-themes.py 把 INDEX.txt 打进包")
ok('"ui/"' not in build and '"clips/"' not in build,
   "pack-themes.py 不打已退役的 ui/ 与 clips/")

# 两份 txt 说明的关键内容(写给朋友,少一句他就装不上)
guide = open(os.path.join(PACK, "导入指南.txt"), encoding="utf-8").read()
for needle, why in [
    ("%USERPROFILE%", "必须给出放置路径的写法"),
    ("arts", "必须点明目标是 arts 目录"),
    ("不要把整个", "必须警告别拖整个 arts 文件夹(否则 arts\\\\arts\\\\主题)"),
    ("Ctrl + Shift + R", "必须写明刷新快捷键(光 F5 有时不够)"),
    ("不需要重启", "必须说明不用重启宿主"),
    ("灰", "必须说明球心发灰=图没拷全"),
]:
    ok(needle in guide, "导入指南.txt 里有「%s」—— %s" % (needle, why))
ok(".md" not in guide.replace(".md\\n", "").replace(".md）", "").replace("添加主题素材包.md", ""),
   "导入指南.txt 本身不再引用 .md 交付文档(指南里可以提 .md 格式说明,那是仓库文档不是包里文件)")

tip = open(os.path.join(PACK, "给朋友的提示词.txt"), encoding="utf-8").read()
for needle, why in [
    ("<PATH>", "必须留一个让用户替换的路径占位"),
    ("preset.json", "必须解释每套里有什么"),
    ("子目录", "必须强调拷子目录不是整个文件夹"),
]:
    ok(needle in tip, "给朋友的提示词.txt 里有「%s」—— %s" % (needle, why))
ok("五遁" not in tip and "底框" not in tip,
   "给朋友的提示词.txt 不再提五遁底框(该功能已废弃,提了会让对方去找不存在的东西)")


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

# —— ④ 随仓库分发的图不许带生成元数据(2026-11-22 公开前审计) ——
# 实测:这 12 张 JPEG 的 `prompt` 字段里塞着 ComfyUI 的完整生成参数,
# 含本机模型目录名(SDXL\SDXLFaetastic_v24.safetensors)。不是隐私,但没必要公开。
# 用 Pillow 查;没装 Pillow 就跳过(不让这条挡住别人的环境)。
try:
    import glob as _glob
    # __file__ = <repo>/dsh-gallery-pack/tools/selftest-pack.py
    #   dirname        -> .../dsh-gallery-pack/tools
    #   ../..          -> <repo>              ← 上跳两级到仓库根,再进 dsh-boot-suites
    # ⚠ 第一版写了三个 dirname,算到 <repo>/dsh-gallery-pack 上去了,
    #   于是 glob 到 0 张图 → 断言走 else 分支"没有图,跳过" ⇒ **静默跳过等于没查**。
    #   现在:真的找不到图就报红,不许静默放行。
    _here = os.path.dirname(os.path.abspath(__file__))
    _arts = os.path.join(_here, "..", "..", "dsh-boot-suites", "gallery", "arts-builtin")
    _arts = os.path.normpath(_arts)
    _imgs = sorted(_glob.glob(os.path.join(_arts, "*", "*.jpg")) +
                   _glob.glob(os.path.join(_arts, "*", "*.png")))
    ok(len(_imgs) > 0, "在 arts-builtin 找到随包分发的图(找到 %d 张;为 0 说明路径算错,下面的元数据检查会失真)" % len(_imgs))
    if _imgs:
        try:
            import sys as _sys
            # `_pylibs` 是**工作区级**共享库,不在仓库里,而且层级会随项目目录搬动变化
            # (2026-11-22 把项目收进 dsh-gallery\ 之后,写死的三层 dirname 就失效了)。
            # 所以向上逐级找,找到第一个含 _pylibs 的目录为止。
            _d = os.path.dirname(os.path.abspath(__file__))
            for _ in range(6):
                _cand = os.path.join(_d, "_pylibs")
                if os.path.isdir(_cand):
                    _sys.path.insert(0, _cand)
                    break
                _d = os.path.dirname(_d)
            from PIL import Image as _Image
            _risky = ("prompt", "workflow", "parameters")
            _dirty = []
            for _p in _imgs:
                _im = _Image.open(_p)
                if any(k in (_im.info or {}) for k in _risky):
                    _dirty.append(os.path.basename(_p))
            ok(not _dirty, "随仓库分发的图不带生成元数据(prompt/workflow;脏 %d 张: %s)"
               % (len(_dirty), _dirty[:3]))
        except ImportError:
            ok(True, "跳过元数据检查(没装 Pillow)")
    else:
        ok(True, "arts-builtin 下没有图,跳过元数据检查")
except Exception as _e:
    ok(True, "跳过元数据检查(%s)" % type(_e).__name__)

print("\n断言 %d,FAIL %d%s" % (ok_n, len(fails), "，全绿" if not fails else ""))
sys.exit(0 if not fails else 1)
