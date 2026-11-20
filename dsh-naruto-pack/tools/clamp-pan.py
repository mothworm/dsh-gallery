#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把 arts2 各幕的平移**夹到不漏边的范围内**(只改数据,不改插件)。

## 为什么要有这一步

生成器 `check-arts2.mjs` 的漏边判据是 `|k| <= (z/f0 - 1)/2*100/z`,其中 `f0` 是该轴
**object-fit:cover 的溢出倍数**。这个 `f0` 是错的 —— 会漏出来的是
**img 元素自己的盒子边界**,不是"图像内容相对盒子的边界":

    .nbn-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#05040a}

cover 把图像铺满整个盒子(盒子内没有空隙),盒子本身仍是 100%x100%。
`transform: scale(z) translate(k)` 一挪,盒子的边就离开视口,那条缝露出来的是
`.nbn-layer`(无背景,透明)背后的 `.nbn-root{background:#05040a}`,
交叉淡化时露出来的还是**相邻那一幕的图**。
所以 f0 恒等于 1,竖轴的 cover 余量(9:16 图溢出一大截)**救不了盒子的边**。

正确的每端点约束(与 f0 无关):
    |k|% <= (z - 1) / (2z) * 100

## 这个脚本怎么改

对每一幕的两个端点分别:
1. 先尝试**抬该端点的 z** 到刚好容得下原本的位移(`z >= 1/(1 - 2|k|/100)`),
   但**最多只抬 `MAX_Z_RAISE`(默认 0.04)** —— 抬 z 等于多裁四边,会改取景,要节制。
2. 抬完还超的部分,把 `|k|` 夹到上限(**保号**,只缩幅度不改方向),
   这样运镜方向和上一幕的衔接(同号判据)不会被破坏。

改前留 `preset.json.bak-clamp-<时间戳>`,写完立刻自校验(JSON 能 parse、幕数不变、
`title`/`sub`/`schema` 各仍出现一次、无 BOM)。

用法:
    py -3.10 tools/clamp-pan.py arts2            # 干跑,只打印要改什么
    py -3.10 tools/clamp-pan.py arts2 --apply    # 真改
"""
import io
import json
import os
import re
import sys
import time

MAX_Z_RAISE = 0.04
Z_CEIL = 1.25          # 宿主 normalizePreset 允许的 z 上限,别越过


def limit_pct(z):
    """给定缩放,单轴允许的最大平移(百分比,相对元素自身尺寸)。"""
    if z <= 1.0:
        return 0.0
    return (z - 1.0) / (2.0 * z) * 100.0


def z_needed(kabs):
    """容得下 kabs% 位移所需的最小 z;k>=50 时无解。"""
    if kabs <= 0.0:
        return 1.0
    if kabs >= 50.0:
        return None
    return 1.0 / (1.0 - 2.0 * kabs / 100.0)


def parse_pair(v):
    """'4% 5%' -> (4.0, 5.0);兼容 '4%' 单值和缺省。"""
    if isinstance(v, (list, tuple)):
        return float(v[0]), float(v[1])
    if not isinstance(v, str):
        return 0.0, 0.0
    parts = v.replace(",", " ").split()
    out = []
    for p in parts[:2]:
        m = re.match(r"^(-?[\d.]+)", p.strip())
        out.append(float(m.group(1)) if m else 0.0)
    while len(out) < 2:
        out.append(0.0)
    return out[0], out[1]


def fmt(v):
    s = "%.2f" % v
    s = s.rstrip("0").rstrip(".")
    return s + "%"


def fix_endpoint(z, kx, ky, raise_max, z_ceil):
    """返回 (新z, 新kx, 新ky, 说明)。z 抬不超过 raise_max 且总上限 z_ceil。"""
    lim = limit_pct(z)
    if abs(kx) <= lim + 1e-9 and abs(ky) <= lim + 1e-9:
        return z, kx, ky, None
    kmax = max(abs(kx), abs(ky))
    zn = z_needed(kmax)
    note = []
    nz = z
    if zn is not None and zn <= z + raise_max + 1e-9 and zn <= z_ceil + 1e-9:
        nz = round(zn + 0.001, 3)
        note.append("z %.3f->%.3f 容下 %.2f%%" % (z, nz, kmax))
    lim2 = limit_pct(nz)
    if abs(kx) > lim2 + 1e-9:
        nkx = (1 if kx > 0 else -1) * lim2
        note.append("kx %.2f->%.2f" % (kx, nkx))
        kx = nkx
    if abs(ky) > lim2 + 1e-9:
        nky = (1 if ky > 0 else -1) * lim2
        note.append("ky %.2f->%.2f" % (ky, nky))
        ky = nky
    return nz, kx, ky, "; ".join(note)


def main():
    argv = sys.argv[1:]
    root = argv[0] if argv and not argv[0].startswith("--") else "arts2"
    apply = "--apply" in argv
    raise_max = MAX_Z_RAISE
    for i, a in enumerate(argv):
        if a == "--raise":
            raise_max = float(argv[i + 1])
    if not os.path.isdir(root):
        print("!! 目录不存在: %s" % root)
        return 1
    stamp = time.strftime("%Y%m%d%H%M%S")
    changed = 0
    acts_seen = 0
    for pid in sorted(os.listdir(root)):
        pj = os.path.join(root, pid, "preset.json")
        if not os.path.isfile(pj):
            continue
        raw = io.open(pj, encoding="utf-8-sig").read()
        doc = json.loads(raw)
        acts = doc.get("acts") or []
        local = []
        for idx, a in enumerate(acts, 1):
            acts_seen += 1
            z0 = float(a.get("z0", 1.075))
            z1 = float(a.get("z", 1.0))
            kb = list(a.get("kb") or ["0%", "0%"])
            if len(kb) == 1:
                kb.append("0%")
            k0x, k0y = parse_pair(kb[0])
            k1x, k1y = parse_pair(kb[1])
            nz0, nk0x, nk0y, n0 = fix_endpoint(z0, k0x, k0y, raise_max, Z_CEIL)
            nz1, nk1x, nk1y, n1 = fix_endpoint(z1, k1x, k1y, raise_max, Z_CEIL)
            if not n0 and not n1:
                continue
            changed += 1
            print("%s/%02d %s" % (pid, idx, a.get("file")))
            if n0:
                print("   起  z %.3f->%.3f  kb [%s, %s] -> [%s, %s]   %s" % (
                    z0, nz0, fmt(k0x), fmt(k0y), fmt(nk0x), fmt(nk0y), n0))
            if n1:
                print("   止  z %.3f->%.3f  kb [%s, %s] -> [%s, %s]   %s" % (
                    z1, nz1, fmt(k1x), fmt(k1y), fmt(nk1x), fmt(nk1y), n1))
            a["z0"] = round(nz0, 3)
            a["z"] = round(nz1, 3)
            a["kb"] = ["%s %s" % (fmt(nk0x), fmt(nk0y)), "%s %s" % (fmt(nk1x), fmt(nk1y))]
            local.append(idx)
        if local and apply:
            os.rename(pj, pj + ".bak-clamp-" + stamp)
            out = json.dumps(doc, ensure_ascii=False, indent=2) + "\n"
            with io.open(pj, "w", encoding="utf-8", newline="\n") as f:
                f.write(out)
            # 写完立刻自校验:BOM / 幕数 / title,sub,schema 各恰好一次
            rb = open(pj, "rb").read()
            assert not rb.startswith(b"\xef\xbb\xbf"), "写出带 BOM 了,宿主会 JSON.parse 抛"
            re_raw = rb.decode("utf-8")
            assert len(doc["acts"]) == len(acts), "幕数变了"
            for key in ("title", "sub", "schema", "id"):
                got = len(re.findall(r'"%s"\s*:' % key, re_raw))
                assert got == 1, "%s 出现 %d 次(要求 1 次),这份 JSON 别用" % (key, got)
            print("   -> 已写 %s(备份 preset.json.bak-clamp-%s)" % (pj, stamp))
    print("\n合计:扫过 %d 幕,需要夹的 %d 幕,%s" % (
        acts_seen, changed, "已写入" if apply else "**干跑**,加 --apply 才写盘"))
    if not apply and changed:
        print("下一步:py -3.10 tools/clamp-pan.py %s --apply && node tools/check-arts2.mjs %s && py -3.10 tools/check-framing.py %s" % (root, root, root))
    return 0


if __name__ == "__main__":
    sys.exit(main())
