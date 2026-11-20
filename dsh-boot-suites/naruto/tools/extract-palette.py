#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
dsh-boot-suite-naruto / tools/extract-palette.py  (v2)

从「开机画面」反推主题配色的**自动层**。产物 palettes/auto/<preset>.auto.json,
人工微调层 palettes/<preset>.json,由 build-client.mjs 合并(auto 打底 + tuned 覆盖)。
auto 目录整个可删可重跑,别在里面手改。

v2 相对 v1 的两处实质修正:
 1) v1 抽的是整图 —— 大面积天空/暗部把主色垄断了,角色本身的配色(铠甲/瞳术/查克拉)
    在 9216 个采样点里占不到 0.35% 的门槛,于是 madara 抽出"亮蓝"这种离谱结果。
    现在按 preset.json 的 act.pos(构图焦点)**裁一个 60%x70% 的焦框**单独抽一遍,
    accent/glow 优先取焦框内的结果,背景色才取整图的。
 2) v1 的 paper(浅色底)是从图里"找最亮的流行色",暗调图根本没有亮像素 → 掉进兜底
    拿了个中间调。现在**浅色面一律推导**(从 ground/accent 的色相派生),不再假抽。
    只保留真正"图上有的东西"作为抽取项:ground / accent / accent2 / neutral / glow。

跑法(本机 Pillow 是 cp310 扩展,必须 Python 3.10 + PYTHONPATH):
  $env:PYTHONPATH="<工作区根>\\_pylibs"          # 各人机器路径不同,别把绝对路径写进仓库
  py -3.10 tools\\extract-palette.py                 # 全部预设
  py -3.10 tools\\extract-palette.py madara hinata   # 只跑指定的

控制台是 GBK:本脚本**只打印 ASCII**,中文只进 UTF-8 文件。
任何降级(读不到 preset.json、缺图、解码失败)一律打印 WARN 并写进 JSON,不静默。
"""

import json
import os
import sys
import warnings
from colorsys import rgb_to_hsv, hsv_to_rgb

warnings.simplefilter("ignore", DeprecationWarning)  # Pillow 12 把 getdata 标了弃用,别刷屏

from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
SUITE = os.path.dirname(HERE)
ARTS = os.path.normpath(os.path.join(SUITE, "..", "..", "dsh-naruto-pack", "arts2"))
OUT_DIR = os.path.join(SUITE, "palettes", "auto")

THUMB = 96     # 整图抽样分辨率
FOCUS_BOX = (0.60, 0.70)   # 焦框占整图的比例(宽,高)——按 pos 居中后裁剪
MIN_SHARE = 0.0035         # 一个颜色至少占 0.35% 像素才算"画面里真有"


def hexs(rgb):
    return "#%02X%02X%02X" % tuple(max(0, min(255, int(round(c)))) for c in rgb)


def parse_pos(pos, default=(50.0, 50.0)):
    """'52% 41%' -> (52.0, 41.0)。解析不了就回默认并让调用方知道。"""
    try:
        parts = [p.strip().rstrip("%") for p in str(pos).split()]
        if len(parts) == 2:
            return (float(parts[0]), float(parts[1]))
    except Exception:
        pass
    return default


def load_preset(preset_dir, warn):
    """读 preset.json,挑 hero。规则与 v5 契约无关,纯粹是"哪张最能代表这套画面":
    有 pupil 的那一幕(脸部/眼部特写)> 最后一幕(收尾定帧)> 第一张图。"""
    meta = {"file": None, "pos": "center", "eye": None, "acts": 0, "title": None, "errors": []}
    pj = os.path.join(preset_dir, "preset.json")
    if not os.path.isfile(pj):
        meta["errors"].append("no preset.json")
        warn("no preset.json")
    else:
        try:
            with open(pj, "r", encoding="utf-8-sig") as f:
                doc = json.load(f)
            acts = [a for a in (doc.get("acts") or []) if isinstance(a, dict) and a.get("file")]
            meta["acts"] = len(acts)
            t = doc.get("title")
            if isinstance(t, str) and t.strip():
                meta["title"] = t.strip()[:40]
            if not acts:
                meta["errors"].append("acts empty")
                warn("acts empty")
            pupil = [a for a in acts if a.get("pupil")]
            hero = pupil[-1] if pupil else (acts[-1] if acts else None)
            if hero:
                meta["file"] = str(hero["file"]).lower()
                meta["pos"] = str(hero.get("pos") or "center")
                meta["eye"] = hero.get("pupil")
        except Exception as e:
            meta["errors"].append("preset.json: " + str(e)[:120])
            warn("preset.json parse failed: " + str(e)[:80])
    if not meta["file"]:
        imgs = sorted(n for n in os.listdir(preset_dir) if n.lower().endswith((".jpg", ".jpeg", ".png")))
        if imgs:
            meta["file"] = imgs[0].lower()
            meta["fallback"] = "first-image"
    return meta


def sample(im):
    """-> 量化后的像素类列表 [{count,rgb,hex,h,s,v,lum}],按 count 降序。"""
    im = im.convert("RGB")
    im.thumbnail((THUMB, THUMB), Image.LANCZOS)
    data = list(im.getdata())
    step = 8  # 256/32:每通道量化到 32 级
    hist = {}
    for r, g, b in data:
        key = (r >> 3, g >> 3, b >> 3)
        e = hist.get(key)
        if e is None:
            hist[key] = [1, r, g, b]
        else:
            e[0] += 1
            e[1] += r
            e[2] += g
            e[3] += b
    out = []
    for cnt, r, g, b in hist.values():
        rr, gg, bb = r / cnt, g / cnt, b / cnt
        h, s, v = rgb_to_hsv(rr / 255.0, gg / 255.0, bb / 255.0)
        out.append({
            "count": cnt, "rgb": (rr, gg, bb), "hex": hexs((rr, gg, bb)),
            "h": h * 360.0, "s": s, "v": v,
            "lum": 0.2126 * rr / 255.0 + 0.7152 * gg / 255.0 + 0.0722 * bb / 255.0,
        })
    out.sort(key=lambda x: -x["count"])
    return out, len(data)


def focus_crop(im, pos):
    """按 CSS 风格的 pos 裁焦框。pos 是该点在图内的百分比位置(与背景定位同义)。"""
    W, H = im.size
    cw, ch = int(W * FOCUS_BOX[0]), int(H * FOCUS_BOX[1])
    fx, fy = parse_pos(pos)
    left = int(W * fx / 100.0 - cw / 2.0)
    top = int(H * fy / 100.0 - ch / 2.0)
    left = max(0, min(W - cw, left))
    top = max(0, min(H - ch, top))
    return im.crop((left, top, left + cw, top + ch))


def choose(bs, total):
    freq = lambda e: e["count"] / float(total)
    real = [e for e in bs if freq(e) >= MIN_SHARE] or bs

    def w(e, p):
        return e["count"] ** p

    darks = [e for e in real if 0.05 <= e["lum"] <= 0.34]
    ground = max(darks, key=lambda e: w(e, 0.8) * (1.0 + 0.6 * e["s"])) if darks else \
        min(real, key=lambda e: e["lum"])

    cands = [e for e in real if e["s"] >= 0.20 and e["v"] >= 0.25]
    accent = max(cands, key=lambda e: e["s"] * (e["v"] ** 0.5) * w(e, 0.45)) if cands else ground

    def dhue(a, b):
        d = abs(a - b) % 360.0
        return min(d, 360.0 - d)

    c2 = [e for e in cands if e is not accent and dhue(e["h"], accent["h"]) >= 30.0]
    if not c2:
        c2 = [e for e in cands if e is not accent]
    accent2 = max(c2, key=lambda e: e["s"] * w(e, 0.45)) if c2 else None

    neut = [e for e in real if e["s"] <= 0.16]
    neutral = max(neut, key=lambda e: e["count"]) if neut else sorted(real, key=lambda e: e["s"])[0]

    glows = [e for e in real if e["s"] >= 0.28 and e["v"] >= 0.52]
    glow = max(glows, key=lambda e: e["v"] * e["s"] * w(e, 0.3)) if glows else None

    avg_lum = sum(e["lum"] * e["count"] for e in bs) / float(total)
    bright = sum(e["count"] for e in bs if e["lum"] >= 0.6) / float(total)
    return {
        "ground": ground, "accent": accent, "accent2": accent2,
        "neutral": neutral, "glow": glow,
        "avg_lum": avg_lum, "bright_share": bright, "usable": len(real),
    }


def rec(ch, key):
    e = ch.get(key)
    if e is None:
        return None
    return {"hex": e["hex"], "h": round(e["h"], 1), "s": round(e["s"], 3),
            "v": round(e["v"], 3), "lum": round(e["lum"], 3)}


def derive_light(ground_hex, accent_hex):
    """浅色面一律推导:取 accent(没有就 ground)的色相,压到很低的饱和度、很高的明度。
    暗调插画里"找不到"浅色,但浅色模式必须有——这是设计决定,不是从图上偷的。"""
    src = accent_hex or ground_hex
    r = int(src[1:3], 16) / 255.0
    g = int(src[3:5], 16) / 255.0
    b = int(src[5:7], 16) / 255.0
    h, s, v = rgb_to_hsv(r, g, b)
    out = {}
    for name, sv, vv in (("paper", 0.10, 0.975), ("paper_2", 0.14, 0.945), ("paper_3", 0.18, 0.905)):
        rr, gg, bb = hsv_to_rgb(h, sv, vv)
        out[name] = hexs((rr * 255, gg * 255, bb * 255))
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not os.path.isdir(ARTS):
        print("ERROR ARTS NOT FOUND: " + ARTS)
        return 2
    presets = sorted(d for d in os.listdir(ARTS) if os.path.isdir(os.path.join(ARTS, d)))
    if args:
        want = set(a.lower() for a in args)
        presets = [p for p in presets if p in want]
        for m in sorted(want - set(presets)):
            print("WARN unknown preset, skipped: " + m)
    os.makedirs(OUT_DIR, exist_ok=True)

    print("presets=%d  arts=%s" % (len(presets), ARTS))
    fails = 0
    for pid in presets:
        pdir = os.path.join(ARTS, pid)
        warns = []
        warn = lambda m: (warns.append(m), print("WARN %-12s %s" % (pid, m)))
        hero = load_preset(pdir, warn)
        img_path = os.path.join(pdir, hero["file"]) if hero["file"] else None
        if not img_path or not os.path.isfile(img_path):
            warn("no image at all -> entry skipped")
            fails += 1
            continue
        try:
            with Image.open(img_path) as raw:
                im = ImageOps.exif_transpose(raw)
                bs_full, total_full = sample(im)
                bs_focus, total_focus = sample(focus_crop(im, hero["pos"]))
        except Exception as e:
            warn("decode failed: " + str(e)[:100])
            fails += 1
            continue

        full = choose(bs_full, total_full)
        foc = choose(bs_focus, total_focus)
        # 背景/中性取整图(那才是"铺满屏幕的颜色"),强调色取焦框(那才是"这个角色")
        ink = {
            "ground": full["ground"]["hex"],
            "neutral": full["neutral"]["hex"],
            "accent": foc["accent"]["hex"],
            "accent2": foc["accent2"]["hex"] if foc["accent2"] else (
                full["accent2"]["hex"] if full["accent2"] else None),
            "glow": foc["glow"]["hex"] if foc["glow"] else (
                full["glow"]["hex"] if full["glow"] else None),
        }
        light = derive_light(ink["ground"], ink["accent"])

        doc = {
            "_generated_by": "tools/extract-palette.py v2 -- DO NOT HAND EDIT (每次重跑都被覆盖)",
            "_tuned_layer": "tuned/<preset>.json  (人工微调写这里,合并时覆盖本文件)",
            "preset": pid,
            "title": hero.get("title"),
            "hero": {"file": hero["file"], "pos": hero["pos"], "eye": hero["eye"],
                     "acts": hero["acts"], "fallback": hero.get("fallback"),
                     "errors": hero["errors"]},
            "source": {"image": os.path.basename(img_path), "bytes": os.path.getsize(img_path),
                       "focus_box": list(FOCUS_BOX)},
            "ink": ink,
            "light_derived": light,
            "evidence": {"full_frame": {k: rec(full, k) for k in ("ground", "accent", "accent2", "neutral", "glow")},
                         "focus_crop": {k: rec(foc, k) for k in ("ground", "accent", "accent2", "neutral", "glow")},
                         "avg_lum": round(full["avg_lum"], 3),
                         "bright_share": round(full["bright_share"], 4),
                         "focus_avg_lum": round(foc["avg_lum"], 3),
                         "distinct_colors": full["usable"]},
            "top6_full": [{"hex": e["hex"], "share": round(e["count"] / float(total_full), 4),
                           "h": round(e["h"], 1), "s": round(e["s"], 3), "v": round(e["v"], 3)}
                          for e in sorted(bs_full, key=lambda x: -x["count"])[:6]],
        }
        out = os.path.join(OUT_DIR, pid + ".auto.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("%-14s hero=%-8s g=%s a=%s a2=%-8s glow=%-8s avg=%.2f bright=%.1f%%%s" % (
            pid, doc["source"]["image"], ink["ground"], ink["accent"], ink["accent2"],
            ink["glow"], full["avg_lum"], full["bright_share"] * 100,
            ("  WARN x%d" % len(warns)) if warns else ""))
    print("done: %d ok, %d failed" % (len(presets) - fails, fails))
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
