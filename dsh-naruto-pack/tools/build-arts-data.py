# -*- coding: utf-8 -*-
"""arts/ 生成器:一个文件夹 = 一个开屏预设。只读判据、只写 arts/,不碰插件、不装机。

用法:
  py -3.10 build-arts-data.py <素材根> <survey/global-measure.json> <arts目录> [--only=konan,...]

每张图的 pos/kb/z0/z/dur 全部由 measure-arts.py 的客观判据 + 下面 PLAN 表推导,
三条人工逐宫实测过的幕(konan 66 / itachi 48 / brothers 23)按任务书原值使用,不改。
决策过程(含每一步用了哪个判据、哪个方向链)写进 arts/<preset>/measure.json。
"""
import sys, os, json, time, argparse

# 本机 Python 工具库:优先环境变量 DSH_PYLIBS,否则取「工作区根/_pylibs」(本脚本在 tools/ 下,上跳三级)。
# 写死绝对路径会把开发机的目录结构发布出去,而且换一台机器就 ImportError。
import os as _os, sys as _sys
_WSROOT = _os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
for _c in (_os.environ.get("DSH_PYLIBS"), _os.path.join(_WSROOT, "_pylibs")):
    if _c and _os.path.isdir(_c):
        _sys.path.insert(0, _c)
        break
from PIL import Image, ImageOps

VA = 16.0 / 9.0
LONG, QUALITY = 1600, 80

# 任务书指定的不可用编号 + 本轮实测追加(append 的证据见 UNUSABLE_EVIDENCE)
BANNED_TASK = {"21", "36", "51", "79", "84"}
HOLD_TASK = {"07"}                      # 待复核,先别用
EXTRA = {"22", "50"}                    # 实测确认同样带「返回」按钮(见下)
UNUSABLE_EVIDENCE = {
    "07": "任务书:待复核,本轮不用",
    "21": "任务书:游戏UI污染", "36": "任务书:游戏UI污染", "51": "任务书:游戏UI污染",
    "79": "任务书:游戏UI污染", "84": "任务书:游戏UI污染",
    "22": "本轮追加:左下角白像素密度 5.27/千(与被禁的 21=5.18、79=5.27、36=5.32、84=34.8 同一簇);"
          "且文件名是 Screenshot_*(与 21/51/79/07 同类);视觉语义复核=「返回」按钮叠加层。兄弟之战还有 23/24/26 够用。",
    "50": "本轮追加:左下角白像素密度 5.18/千,同上簇;Screenshot_* 文件名;视觉语义复核=黄色木叶箭头+白描边「返回」二字。"
          "剔除后 最终章舍人 只剩 52/53 两张(51 也被任务书禁),<3 幕 → 该文件夹本轮不做。",
}
BANNED = BANNED_TASK | HOLD_TASK | EXTRA

# ---------- 人工逐宫实测过的 3 幕(任务书 (a),不许改) ----------
FIXED = {
    "66": dict(pos="62% 22%", z0=1.16, z=1.05, kb=["4% 5%", "-4% -4%"], dur=1250,
               note="任务书(a):竖图人物中上,动势左下→右上,负空间左上/右上"),
    "48": dict(pos="50% 30%", z0=1.13, z=1.06, kb=["-4% 0%", "2% -1%"], dur=850, pupil="50% 24%",
               note="任务书(a):面部中上、面向镜头=刹车点;上下各烘死一条纯白 matte 带→z 全程≥1.06 裁在框外"),
    "23": dict(pos="50% 44%", z0=1.08, z=1.20, kb=["0% 0%", "0% -3%"], dur=900, pupil="50% 40%",
               note="任务书(a):两张大脸占左右、中心最暗、中央交手小人→向心推近把它放大"),
}

# ---------- 16→15 支预设(最终章舍人 因可用素材只剩 2 张而落空,见 BANNED) ----------
# acts=幕顺序(全局编号);pupil=该幕给瞳孔光环;brake=正面直视特写(短幕)
PLAN = [
 dict(id="konan", folder="漂南", title="晓·小南", open="akatsuki-cloud",
      card=["晓 · 小南", "AKATSUKI · DSH 开屏动画"], acts=["66", "69", "67", "65", "68"],
      pupil=[], brake=["66"],
      why="66 晓袍侧脸(人工标定幕)→69 破碎镜像躺卧→67 双联白翼→65 黄昏纸翼俯望→68 纸翼放射收尾"),
 dict(id="itachi", folder="晓朱鼬", title="晓·鼬", open="akatsuki-cloud",
      card=["晓 · 鼬", "AKATSUKI · DSH 开屏动画"], acts=["45", "46", "48", "49"],
      pupil=["48", "49"], brake=["48"],
      why="45 水墨放飞乌鸦→46 水面结印→48 噤声特写(人工标定幕,刹车点)→49 遮面立绘收。47 弃用:人物只剩针尖大的剪影"),
 dict(id="brothers", folder="兄弟之战", title="兄弟之战", open="akatsuki-cloud",
      card=["兄弟之战", "UCHIHA BROTHERS · DSH 开屏动画"], acts=["23", "24", "26"],
      pupil=["23", "24"], brake=["23"],
      why="23 双写轮眼对峙(人工标定幕,开场)→24 千鸟+须佐骨架→26 草薙剑蒙太奇收。22 带「返回」按钮已剔,25 脸小昏暗弃用"),
 dict(id="sasuke", folder="侠隐佐助", title="侠隐·佐助", open="akatsuki-cloud",
      card=["侠隐 · 佐助", "SASUKE · DSH 开屏动画"], acts=["01", "04", "05", "03", "06"],
      pupil=["06"], brake=["06"],
      why="01 月夜握刀→04 雷龙麒麟(大远)→05 紫炎旋涡→03 千鸟×紫炎双人对峙→06 写轮眼正面特写收"),
 dict(id="madara", folder="斑", title="宇智波斑", open="akatsuki-cloud",
      card=["宇智波 · 斑", "MADARA · DSH 开屏动画"], acts=["40", "42", "41", "44"],
      pupil=["44"], brake=["44"],
      why="40 红甲团扇→42 黑衣持叶+蓝须佐→41 查克拉旋流→44 血月抱胸写轮眼收。43 与 42 同场景双版本,弃一"),
 dict(id="madara-god", folder="神驹斑", title="神驹·斑", open="akatsuki-cloud",
      card=["神驹 · 斑", "MADARA · DIVINE STEED"], acts=["81", "82", "83"],
      pupil=[], brake=[],
      why="正好 3 张:81 火焰旋涡突进→82 红旗军阵→83 纵马扬蹄(竖幅,正中「神驹」名义)收"),
 dict(id="hashirama", folder="侠隐柱间", title="侠隐·柱间", open="none",
      card=["侠隐 · 柱间", "HASHIRAMA · DSH 开屏动画"], acts=["14", "15", "13", "16"],
      pupil=[], brake=[],
      why="14 落日盘龙→15 双龙钟影→13 龙脊小人(大远)→16 掌心小人收。语义复核提示:这批是古风长袍+墨龙题材,"
          "没有护额/铠甲特征(侠隐皮肤本就是古风),契合度存疑但文件夹名义为准"),
 dict(id="kakashi", folder="须佐卡卡西", title="须佐·卡卡西", open="none",
      card=["须佐 · 卡卡西", "KAKASHI · DSH 开屏动画"], acts=["89", "87", "85", "86"],
      pupil=["85", "86"], brake=["85", "86"],
      why="89 环刃+须佐巨人(唯一真正对得上「须佐卡卡西」名义的全身幕)→87 Q版雷切→85 写轮眼正脸特写→86 岁月双脸拼贴收。"
          "84 任务书禁;88/90 混入带土另一个人,焦点分散,弃用"),
 dict(id="hinata", folder="八极雏田", title="八极·雏田", open="none",
      card=["八极 · 雏田", "HINATA · DSH 开屏动画"], acts=["27", "28", "30", "32", "34", "35"],
      pupil=[], brake=["34"],
      why="9 张取 6:27 宫苑起手亮相→28 双掌推柔拳→30 侧身出招+白龙→32 赤谷站桩→34 俯身冲拳直取镜头→35 雪山弓步亮掌收。"
          "29 休闲日常调性不符、31/33 人物缩成小点与 32/35 重复,弃"),
 dict(id="hinata-last", folder="最终章雏田", title="最终章·雏田", open="none",
      card=["最终章 · 雏田", "THE LAST · HINATA"], acts=["54", "55", "56"],
      pupil=[], brake=["55"],
      why="只有 3 张可用:54 双焰对峙→55 星空仰望(THE LAST 正装)→56 雪中握手收"),
 dict(id="minato", folder="侠隐四代", title="侠隐·四代", open="none",
      card=["侠隐 · 水门", "MINATO · DSH 开屏动画"], acts=["10", "08", "11", "12", "09"],
      pupil=[], brake=["10"],
      why="10 竹室侧坐(最静态,开场)→08 竹林飞雷神光轨→11 黑金劲装伸手→12 腾空螺旋丸→09 竹梢逆光收。07 待复核未用"),
 dict(id="danzo", folder="漂泊团藏老登", title="漂泊·团藏", open="none",
      card=["漂泊 · 团藏", "DANZO · DSH 开屏动画"], acts=["70", "71", "73", "72", "74"],
      pupil=["72", "74"], brake=["72"],
      why="70 巨树下拄杖(大远)→71 火光拔刀横斩→73 荒原剑气→72 绷带手臂上的写轮眼群(瞳术特写)→74 掌心写轮眼收"),
 dict(id="tobirama", folder="漂泊扉间", title="漂泊·扉间", open="none",
      card=["漂泊 · 扉间", "TOBIRAMA · DSH 开屏动画"], acts=["75", "76", "77", "78"],
      pupil=[], brake=["75"],
      why="4 张全用:75 白发挥刀+水龙(唯一正脸)→76 孤旅夜水→77 芦苇水龙结印→78 插剑静水收"),
 dict(id="tsunade", folder="侠隐纲手", title="侠隐·纲手", open="none",
      card=["侠隐 · 纲手", "TSUNADE · DSH 开屏动画"], acts=["17", "19", "20"],
      pupil=[], brake=["20"],
      why="17 落日船板斜倚→19 仰视举坛(张力最大)→20 榻上俯瞰收。18 主角位让给另一个红衣角色,单人开屏焦点分散,弃"),
 dict(id="hanabi", folder="武当花火", title="武当·花火", open="none",
      card=["武当 · 花火", "HANABI · DSH 开屏动画"], acts=["57", "61", "59", "62", "60", "58"],
      pupil=["58"], brake=["58"],
      why="7 张取 6:57 秋宫出掌托金光→61 水墨峡谷练剑→59 雪夜宫阙舞白带(唯一冷夜)→62 云海升腾→60 逆光回眸→58 白眼冲镜特写收。63 纯剪影无脸,弃"),
]

ap = argparse.ArgumentParser()
ap.add_argument("root"); ap.add_argument("measure"); ap.add_argument("out")
ap.add_argument("--only", default=None)
A = ap.parse_args()
MJ = json.load(open(A.measure, encoding="utf-8"))
M = MJ["idx"]


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def cover(ai, z):
    """16:9 视口上 cover 之后再 scale(z):可见带占整图的高/宽比例。"""
    return min(1.0, ai / VA) / z, min(1.0, VA / ai) / z


def align(anchor, frac):
    """object-position 取多少才能让「可见带中心」正好落在 anchor 上。"""
    if frac >= 0.995:
        return anchor
    return clamp((anchor - frac / 2.0) / (1.0 - frac), 0.0, 1.0)


def side_vec(side):
    """九宫格方位 → 平移单位方向。约定与人工标定幕自洽:
    出场侧=右 ⇒ translate X 为负(画面被推向左,镜头滑向图的右侧)。"""
    return (("R" in side) and -1 or (("L" in side) and 1 or 0),
            ("B" in side) and -1 or (("T" in side) and 1 or 0))


def outer_extremes(m):
    """最暗/最亮只在**外圈 8 格**里选,中心格不参加。
    原因:这批壁纸普遍带暗角渐晕,中心格几乎总是最亮 —— 按全九格选会让每幕的"出场"都收成
    (0%,0%),链条变成"镜头一直在刹车",直接违反铁律。外圈选完仍是客观像素判据(数据都来自 grid[])。"""
    cells = [g for row in m["grid"] for g in row if not (g["r"] == 1 and g["c"] == 1)]
    sd = lambda g: (("T" if g["r"] == 0 else "B" if g["r"] == 2 else "") +
                    ("L" if g["c"] == 0 else "R" if g["c"] == 2 else "")) or "C"
    dk = min(cells, key=lambda g: g["lum"]); br = max(cells, key=lambda g: g["lum"])
    return sd(dk), sd(br), dk, br


def kb_str(dx, dy, orient, aspect):
    """平移量:主导轴给足 4-5%,次轴收一点。竖图纵向才是裁切轴 → Y 用 5%。"""
    tall = orient == "v"
    wide = aspect > VA + 0.25
    mx = 4
    my = 5 if tall else (4 if wide else 3)
    return "%d%% %d%%" % (dx * mx, dy * (my if abs(dy) else 0))


def pick_pos(m, z0, z):
    ai = m["aspect"]
    fv, fh = cover(ai, (z0 + z) / 2.0)
    cx, cy = m["cx"], m["cy_top"]
    fx, fy = m["face_cx"], m["face_cy_top"]
    py_anchor = fy if fy >= 0 else cy
    px_anchor = fx if fx >= 0 else cx
    if fv < 0.75 or fh < 0.75:
        # 裁得狠(竖图/超宽图):pos 必须让可见带罩住"脸/细节重心",全图面积重心会把头裁到框外
        py = align(py_anchor, fv); px = align(px_anchor, fh); how = "face-band"
    else:
        py = align(cy, fv); px = align(cx, fh); how = "centroid"
    pos = "%d%% %d%%" % (clamp(round(px * 100), 25, 75), clamp(round(py * 100), 15, 60))
    return pos, how, dict(fv=round(fv, 3), fh=round(fh, 3),
                          anchor=round((py_anchor if (fv < .75 or fh < .75) else cy), 3),
                          anchor_x=round((px_anchor if (fv < .75 or fh < .75) else cx), 3))


def pick_zoom(m):
    area, edge, matte = m["area"], m["edge_share"], m["matte"]
    if area < 0.08:
        z0, z, kind = 1.00, round(clamp(1.10 + (0.08 - area), 1.10, 1.18), 2), "push:主体占比%.1f%%<8%%" % (area * 100)
    elif edge > 0.25:
        z0, z, kind = 1.12, 1.02, "pull:主体落在边带%.1f%%>25%%" % (edge * 100)
    else:
        z0, z, kind = 1.03, 1.09, "hold:占比%.1f%%/边带%.1f%% 都居中,缓推" % (area * 100, edge * 100)
    if matte:
        f0, f = z0, z
        z0, z = max(z0, 1.06), max(z, 1.06)
        kind += ";有白边(上%.1f%%/下%.1f%%)→ z 下限抬到 1.06(原 %.2f/%.2f)" % (
            m["matte_top"] * 100, m["matte_bot"] * 100, f0, f)
    return z0, z, kind


def outer_extremes(m):
    """最暗/最亮只在**外圈 8 格**里选,中心格不参加(判据数字全部来自 grid[])。
    原因:这批壁纸普遍带暗角渐晕,中心格几乎总是最亮 —— 按全九格选会让每幕"出场"都收成
    (0%,0%),整条链变成"每幕都在刹车",直接违反铁律。"""
    cells = [g for row in m["grid"] for g in row if not (g["r"] == 1 and g["c"] == 1)]
    sd = lambda g: ((("T" if g["r"] == 0 else "B" if g["r"] == 2 else "") +
                     ("L" if g["c"] == 0 else "R" if g["c"] == 2 else "")) or "C")
    dk = min(cells, key=lambda g: g["lum"]); br = max(cells, key=lambda g: g["lum"])
    return sd(dk), sd(br), dk, br


def build(p):
    acts, proofs = [], []
    n = len(p["acts"])
    prev_out = None
    for i, idx in enumerate(p["acts"]):
        m = M[idx]
        assert idx not in BANNED, "编号 %s 不可用却进了 %s" % (idx, p["id"])
        fx = FIXED.get(idx)
        z0, z, zkind = pick_zoom(m)
        pos, how, geo = pick_pos(m, z0, z)
        ent_side, exit_side = outer_extremes(m)[:2]
        why = ["判据:area=%.3f edge=%.3f matte=%s → %s" % (m["area"], m["edge_share"], 
                ("上%.1f%%/下%.1f%%" % (m["matte_top"] * 100, m["matte_bot"] * 100)) if m["matte"] else "无", zkind)]
        if fx:
            pos, z0, z, kb, dur = fx["pos"], fx["z0"], fx["z"], list(fx["kb"]), fx["dur"]
            why.insert(0, "人工逐宫实测幕,任务书原值:" + fx["note"])
        else:
            # 方向链:入场方向 = 上一幕出场方向(铁律);起幕用自身最暗格,末幕向中心收
            if i == 0:
                d_in = side_vec(ent_side)
                why.append("起幕入场=本幕最暗格 %s(镜头从空/暗处推入)" % ent_side)
            else:
                d_in = prev_out
                why.append("入场沿上一幕出场方向(本幕自身最暗格=%s)" % ent_side)
            if i == n - 1:
                d_out = (0, 0)
                why.append("末幕向中心收")
            elif FIXED.get(p["acts"][i + 1]):
                # 下一幕是人工标定幕:它的入场方向是定死的,这一幕的出场必须照它写(铁律优先于本幕最亮格)
                v = [int(x.rstrip("%")) for x in FIXED[p["acts"][i + 1]]["kb"][0].split(" ")]
                d_out = ((1 if v[0] > 0 else (-1 if v[0] < 0 else 0)),
                         (1 if v[1] > 0 else (-1 if v[1] < 0 else 0)))
                why.append("出场改写成下一幕(人工标定幕 %s)给定的入场方向 %s,本幕自身最亮格 %s 只做次要轴" % (
                    p["acts"][i + 1], FIXED[p["acts"][i + 1]]["kb"][0], exit_side))
            else:
                d_out = side_vec(exit_side)
                why.append("出场=本幕最亮格 %s" % exit_side)
            kb = [kb_str(d_in[0], d_in[1], m["orient"], m["aspect"]),
                  kb_str(d_out[0], d_out[1], m["orient"], m["aspect"])]
            why.append("pos=%s(%s 锚点,可见带 fv=%.2f/fh=%.2f);kb 符号约定:出场侧右⇒X负" % (
                pos, how, geo["fv"], geo["fh"]))
        # 时长(规范 c)
        if fx:
            dur_note = "任务书给定 %dms" % dur
        elif m["area"] < 0.08:
            dur = int(clamp(round(1150 + (0.08 - m["area"]) * 1875), 1150, 1300)); dur_note = "主体<8%%→%dms" % dur
        elif idx in p.get("brake", []):
            dur = 800; dur_note = "正面直视特写(刹车点)→800ms"
        else:
            dur = 900; dur_note = "默认 900ms"
        act = dict(file="%02d.jpg" % (i + 1), dur=dur, pos=pos, z0=round(z0, 2), z=round(z, 2), kb=kb, flash=False)
        if fx and fx.get("pupil"):
            act["pupil"] = fx["pupil"]; why.append("pupil=%s(任务书原值)" % fx["pupil"])
        elif idx in p.get("pupil", []):
            pa = [int(x.rstrip("%")) for x in act["pos"].split(" ")]
            act["pupil"] = "%d%% %d%%" % (clamp(pa[0], 25, 75), clamp(pa[1] - 5, 10, 60))
            why.append("pupil=%s(语义复核:这一幕是瞳术特写;Y 比 pos 上移 5,与 48/23 两幕的人工标定同规律)" % act["pupil"])
        acts.append(act)
        proofs.append(dict(file=act["file"], idx=idx, rel=m["rel"], src=[m["w"], m["h"]], out=[m["out_w"], m["out_h"]],
                           orient=m["orient"], pos=act["pos"], pos_from=how, geo=geo, z0=act["z0"], z=act["z"],
                           zoom_kind=zkind, kb=act["kb"], dur=act["dur"], pupil=act.get("pupil"),
                           area=m["area"], edge_share=m["edge_share"], band_cov=m["band_cov"],
                           matte=[m["matte_top"], m["matte_bot"]], cx=m["cx"], cy_top=m["cy_top"],
                           face_anchor=[m["face_cx"], m["face_cy_top"]], bbox=m["subj_bbox"],
                           dark_cell=m["dark_cell"], bright_cell=m["bright_cell"], grid=m["grid"],
                           why=why + [dur_note], banned_hit=idx in BANNED))
        prev_out = side_vec(exit_side) if not FIXED.get(idx) else tuple(
            int(v.rstrip("%")) and (1 if int(v.rstrip("%")) > 0 else -1) for v in FIXED[idx]["kb"][1].split(" "))
    # 整套 3.5–6.5s:只动非人工幕
    tot = sum(a["dur"] for a in acts)
    fixed_i = {i for i, x in enumerate(p["acts"]) if x in FIXED}
    if tot < 3500 or tot > 6500:
        flex = [i for i in range(n) if i not in fixed_i]
        ftot = sum(acts[i]["dur"] for i in flex) or 1
        want = clamp(tot, 3500, 6500) - sum(acts[i]["dur"] for i in fixed_i)
        k = want / ftot
        for i in flex:
            acts[i]["dur"] = int(clamp(round(acts[i]["dur"] * k), 600, 1400))
            proofs[i]["why"].append("时长归一:整套 %dms 越界 3.5–6.5s → 本幕 ×%.3f" % (tot, k))
        tot = sum(a["dur"] for a in acts)
    # 铁律自检:出场方向与下一幕入场方向不能反号(人工幕除外)
    breaks = []
    for i in range(n - 1):
        a = [int(x.rstrip("%")) for x in acts[i]["kb"][1].split(" ")]
        b = [int(x.rstrip("%")) for x in acts[i + 1]["kb"][0].split(" ")]
        ax = 0 if abs(a[0]) >= abs(a[1]) else 1
        if a[ax] and b[ax] and a[ax] * b[ax] < 0:
            breaks.append("act%d→act%d 反号:%s vs %s" % (i + 1, i + 2, acts[i]["kb"][1], acts[i + 1]["kb"][0]))
        elif a[ax] == 0 and b[ax] == 0:
            breaks.append("act%d→act%d 双方都收中心,镜头会停住:%s → %s" % (i + 1, i + 2, acts[i]["kb"][1], acts[i + 1]["kb"][0]))
    return acts, proofs, tot, breaks


def process(idx, dst):
    m = M[idx]
    im = ImageOps.exif_transpose(Image.open(os.path.join(A.root, m["rel"])))
    if im.mode in ("P", "RGBA", "LA") or (im.mode == "RGB" and "transparency" in im.info):
        im = im.convert("RGBA")
        im = Image.alpha_composite(Image.new("RGBA", im.size, (8, 6, 10, 255)), im).convert("RGB")
    else:
        im = im.convert("RGB")
    w, h = im.size
    if max(w, h) > LONG:                       # 只缩不放
        s = LONG / float(max(w, h))
        im = im.resize((int(round(w * s)), int(round(h * s))), Image.LANCZOS)
    im.save(dst, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    return im.size, os.path.getsize(dst)


todo = [p for p in PLAN if not A.only or p["id"] in A.only.split(",")]
rep = []
for p in todo:
    outd = os.path.join(A.out, p["id"])
    os.makedirs(outd, exist_ok=True)
    acts, proofs, tot, breaks = build(p)
    for a, pr in zip(acts, proofs):
        sz, byt = process(pr["idx"], os.path.join(outd, a["file"]))
        pr["out"] = list(sz); pr["bytes"] = byt
    txt = u'{\n "schema": 1,\n "id": %s,\n "title": %s,\n "open": %s,\n "acts": %s,\n "title": %s,\n "sub": %s\n}\n' % (
        json.dumps(p["id"]), json.dumps(p["title"], ensure_ascii=False), json.dumps(p["open"]),
        json.dumps(acts, ensure_ascii=False, indent=1), json.dumps(p["card"][0], ensure_ascii=False),
        json.dumps(p["card"][1], ensure_ascii=False))
    json.loads(txt)
    with open(os.path.join(outd, "preset.json"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(txt)
    doc = dict(preset=p["id"], folder=p["folder"], generated=time.strftime("%F %T"),
               source=dict(measure=A.measure, viewport_ratio=VA, long_edge=LONG, quality=QUALITY,
                           bg_delta=MJ["bg_delta"], edge_band=MJ["edge_band"],
                           thresholds=dict(area_push=MJ["area_push"], edge_pull=MJ["edge_pull"])),
               method=dict(pos="面积重心(四角色差>%.0f)+16:9 cover 可见带对齐;裁得狠(fv/fh<0.75)的图改用"
                           "「肤色×细节」锚点带对齐,因为纯面积重心会把头裁到框外(66 号实测:面积重心在 60%%,"
                           "人工标定 22%%)",
                           kb="最暗格=入场侧、最亮格=出场侧;出场方向=下一幕入场方向;出场右⇒X 负",
                           zoom="面积<8%%推近/边带>25%%拉远/否则缓推;有白边则 z≥1.06",
                           dur="默认 900;主体<8%%→1150-1300;正面直视特写 750-850;整套线性归一到 3.5-6.5s",
                           pupil="只给语义复核确认是瞳术特写的幕,Y 比 pos 上移 5(与 48/23 人工标定同规律)"),
               unusable=BANNED, unusable_evidence=UNUSABLE_EVIDENCE,
               fixed_acts=[i for i, x in enumerate(p["acts"]) if x in FIXED],
               plan_why=p["why"], total_dur=tot, chain_warnings=breaks, acts=proofs)
    with open(os.path.join(outd, "measure.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=1)
    rep.append(dict(id=p["id"], folder=p["folder"], n=len(acts), idxs=[a["idx"] for a in proofs],
                    total=tot, open=p["open"], bytes=sum(a["bytes"] for a in proofs),
                    why=p["why"], breaks=breaks))
    print("%-12s %d幕 %5.2fs %6.1fKB %s%s" % (p["id"], len(acts), tot / 1000.0,
          sum(a["bytes"] for a in proofs) / 1024, " ".join(x["idx"] for x in proofs),
          ("   !CHAIN " + " | ".join(breaks)) if breaks else ""))
os.makedirs(A.out, exist_ok=True)
with open(os.path.join(A.out, "_build-report.json"), "w", encoding="utf-8", newline="\n") as fh:
    json.dump(dict(generated=time.strftime("%F %T"), presets=rep, unusable=BANNED,
                   evidence=UNUSABLE_EVIDENCE, dropped=["toneri(最终章舍人:51 任务书禁 + 50 实测带「返回」按钮 → 只剩 2 张)"]),
               fh, ensure_ascii=False, indent=1)
print("\n共 %d 支 / %.1f MB" % (len(rep), sum(r["bytes"] for r in rep) / 1048576.0))
