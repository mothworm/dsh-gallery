#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""五遁底框成品生成器(丙方案:整图缩放 + 只留外环,中央烤成透明)。

为什么是这个形状(2026-11-19 用户选定丙,依据见 _handoffs\dsh-可视化\20261119-133558-*.md):
  素材是 1929x1222 的**整幅画面**,四角特效向内伸入 >=520 px(占高度 43%)。
  - 单一 border-image 九宫:小 slice 把那 43% 的画面整块丢掉;大 slice 又必须把角缩到 border-width,细节糊掉。
  - 四角精灵 1:1(乙):角图小就没画面感、大就压字,而且每遁要 5 个文件。
  - 丙:整图非等比缩到卡片,只保留外圈一条环,内侧羽化淡出,中央完全透明。
    变形确实存在,但被关进窄环里(环上多是描边与软火光,肉眼难察觉);
    中央透明 ⇒ 那块**吃滑块的 CSS 填充层**照旧管文字底,所以「拖滑块改透明度」不受影响(用户的硬要求)。

两个必须记住的量纲教训(都是本轮实测翻出来的,别再改回去):
  1) **先裁到画面实际边界再缩放**。素材的画框线不在画布最外缘:InnerBG 面板从 x=106/1929(5.5%)、
     y=109/1222(8.9%) 才开始。不裁就直接缩,外环会整条落在透明留白里 —— 实测环内只有 0.5% 不透明。
  2) **环厚要按"渲染后多厚"定,不是按成品图坐标拍脑袋**。成品画布 720x260,卡片实际高约 120~230,
     所以成品图里 58 px 才等于渲染出来约 27~19 px 的可见环。改 --tw/--th 必须同时改 --ring。

输入:火影遁术文本框\PSD分层\{earth,fire,thunder,water,wind}.psd   层名 InnerBG / Frame / Deco
产出:<out>\frame-{doton,katon,raton,suiton,futon}.png(每遁 1 张,中央透明,RGBA)

⚠ 解释器:必须用**系统 python 3.10**(_pylibs 是 cp310 编译的)。别用 DSH 自带 3.12,
   否则 _pylibs 里那份 Pillow 会报 `cannot import name '_imaging'`(ABI 不匹配,本轮实测过)。

用法: python build-frames.py --psd "D:\\...\\火影遁术文本框\\PSD分层" --out "D:\\...\\dsh-naruto-pack\\ui"
"""
import argparse
import os
import sys

# 本机 Python 工具库:优先环境变量 DSH_PYLIBS,否则取「工作区根/_pylibs」(本脚本在 tools/ 下,上跳三级)。
# 写死绝对路径会把开发机的目录结构发布出去,而且换一台机器就 ImportError。
import os as _os, sys as _sys
_WSROOT = _os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
for _c in (_os.environ.get("DSH_PYLIBS"), _os.path.join(_WSROOT, "_pylibs")):
    if _c and _os.path.isdir(_c):
        _sys.path.insert(0, _c)
        break

# 元素英文名 -> 遁。必须和 70-dom.part.js 的 DECO_MODES 键一致,改一边要改另一边。
ALIAS = {"earth": "doton", "fire": "katon", "thunder": "raton", "water": "suiton", "wind": "futon"}
# PSD 层名 -> 语义。InnerBG 故意**不进成品**:中央归吃滑块的 CSS 填充层。
LAYER_MAP = {"innerbg": "inner", "frame": "border", "deco": "corners"}
# 深度配对表要扫的候选横内缩(归一化)。改这里就同时改了 build_one 和 main 的汇总,别在函数里再写字面量。
XS = (0.06, 0.08, 0.10, 0.12, 0.14, 0.16)


def fold_depth(arr, band, margin):
    """把一层的「深度」折回外环。**饱和映射 + 显式留空**,不是裁切也不是幂映射。

    深度 t = min(u, 1-u),u 是该轴归一化坐标,t ∈[0,T](T=0.5 就是画布中线)。
    正向映射 g(u) = u                          (u ≤ band,带内一个像素都不动)
             = band + (u-band)/K, K=(T-band)/margin   (带外**等比**压进 band+margin 以内)
    g 严格单调、斜率恒为 1 或 1/K ≤ 1(所以任何地方都不会**放大**),且 g(T) = band+margin。
    ⇒ 目标深度 > band+margin 的那些像素**没有任何源**(留空),采样时直接填透明。

    三条设计约束,每条都是踩过坑之后加进来的:
      1) 不用 clamp("超过带宽就压到带宽边"):clamp 让带内一大片目标全映射到同一个源点,
         等于在环带内缘**抹出一道新的 smear 硬边**(11-19 丙方案样张翻过的那类车)。
      2) 也不用幂映射 t'=t^p/T^(p-1):它在 t→T 处导数 = p > 1,即**中心附近是放大的**,
         实测风遁"两轴都深的死角墨像素"从 68 涨到 491 —— 折叠反而把浅处内容摊进了正文区。
      3) 留空要**显式填 0**,不能靠 np.interp 的边界钳位(它会把最外层的像素一直平摊出去)。

    于是有一个可用的保证:每条轴的墨最深只到 band+margin ⇒
    **CSS 内缩只要 ≥ (band_x+margin_x) 宽 与 (band_y+margin_y) 高,文字区与素材重叠恒等于 0**
    —— 这不是"看起来干净",是可以写进闸门当断言的几何事实。

    ⚠ 只该对 Deco(四角特效)用。Frame(描边环)一折就断线,卡片会失去框感。
    """
    import numpy as np
    h, w = arr.shape[:2]
    T = 0.5

    def lut(n, band, margin):
        """返回 (逐目标像素的源浮点坐标, 该目标是否有源)。

        正向 g(u) = u (u ≤ band) ; = band + (u-band)/K (u > band),K = (T-band)/margin。
        ⇒ g(band)=band、g(T)=band+margin,**整段线性**,目标深度上限就是 band+margin。

        这里要的是**逆映射** g⁻¹:gather 是"目标 ← 源",所以 src = band + (t'-band)*K。

        三段踩坑史,别再改回去:
          1) 用 clamp("超过带宽就压到带宽边")⇒ 一大片目标映射到同一个源点 = 环带内缘一道新的
             smear 硬边(11-19 丙方案样张翻过的那类车)。
          2) 用幂映射 t'=t^p/T^(p-1) ⇒ 在 t→T 处导数 = p > 1,**中心附近是放大的**;
             实测风遁"两轴都深的死角墨像素"从 68 涨到 491 —— 折叠反而把浅处摊进了正文区。
          3) 用饱和双曲线 g=band+s/(1+s/L) ⇒ 渐近线处逆映射**发散**,最外一列目标采到画布正中,
             合成自检里 25 个墨像素直接变 0(test-fold.py [7] 实测)。双线性采样表示不了无穷斜率。
        """
        pos = np.arange(n, dtype="float64")
        t = np.minimum(pos, n - 1 - pos) / float(n - 1)       # 目标的 t' ∈[0,T]
        lim = band + margin
        has = t <= lim + 1e-12                                # 超过 lim 的目标没有源 = 透明
        k = (T - band) / max(1e-9, margin)                    # 压缩倍率:带外多少深度压进 margin
        src_t = np.where(t <= band, t, band + (t - band) * k)  # 带内恒等:一个像素都不动
        src_t = np.clip(src_t, 0.0, T)
        u = np.where(np.arange(n) < n / 2.0, src_t, 1.0 - src_t)
        return u * (n - 1), has, k, (t <= band)

    def gather(a2d, idx, has, axis, k, inband):
        """按**支撑域取最大值**(max-pool),不是线性插值、也不是裸最近邻。

        三个版本都是被测试逼着换的,别改回去:
          线性插值 ⇒ K=21× 压缩时 5px 的团被摊成 0.24px 的淡影,峰值掉到阈值下
                    (test-fold.py 旧版实测 25 个墨像素只剩 2 个且变暗)。
          裸最近邻 ⇒ 不摊薄,但**会把细节整个掉进采样缝**:同一个参数下
                    (0.30,0.50) 的团活着、(0.30,0.20) 的团四象限全零(test-fold.py [3] 实测)。
          max-pool ⇒ 目标像素认领"它对应的那段源"里最亮的一个 ⇒ 又窄又亮、不丢。
        每个轴的窗口半径 r = ceil(k/2)+1(k=该轴压缩倍率);带内 k=1 时 r=1,等于 1~2px 的
        轻微膨胀 —— 内容是软光晕,膨胀看不出来,而且**最终净空以实测深度表为准**,不以理论值为准。
        """
        if a2d.ndim != 3:
            raise ValueError("gather 只处理 (h, w, ch) 三层数组,收到 %d 层" % a2d.ndim)
        n = a2d.shape[axis]
        i0 = np.clip(np.rint(idx).astype("int64"), 0, n - 1)
        base = a2d[:, i0] if axis == 1 else a2d[i0, :]
        r = int(np.ceil(k / 2.0)) + 1
        if axis == 1:
            out, msk = base.copy(), inband[None, :, None]
            for d in range(1, r + 1):
                for j in (np.clip(i0 + d, 0, n - 1), np.clip(i0 - d, 0, n - 1)):
                    out = np.maximum(out, a2d[:, j])
            out = np.where(msk, base, out)                   # 带内不膨胀:那里支撑域就是 1px
            out[:, ~has] = 0.0                               # 无源的目标列 = 透明,不平摊
        else:
            out, msk = base.copy(), inband[:, None, None]
            for d in range(1, r + 1):
                for j in (np.clip(i0 + d, 0, n - 1), np.clip(i0 - d, 0, n - 1)):
                    out = np.maximum(out, a2d[j, :])
            out = np.where(msk, base, out)
            out[~has, :] = 0.0
        return out

    out = arr.astype("float64")
    ix, hx, kx, ibx = lut(w, band[0], margin[0])
    iy, hy, ky, iby = lut(h, band[1], margin[1])
    out = gather(out, ix, hx, 1, kx, ibx)
    out = gather(out, iy, hy, 0, ky, iby)
    return np.clip(out, 0.0, 255.0)


def depth_table(alpha, xs):
    """对每个候选**横向**内缩 bx,回答"纵向要让到多深才彻底避开墨"。

    为什么不用单轴的 max_depth(我第一版就是这个错):描边环沿顶边**横贯整幅**,
    所以"任一墨像素的最大横向归一化深度"永远是 ~0.5,那个"保证"是空话。
    真正能拿去当 CSS `in` 的只有**配对** (bx, by):
        中央矩形 {t_x > bx 且 t_y > by} 无墨  ⇔  by ≥ max{ t_y : 墨且 t_x ≥ bx }
    同理反过来也成立,所以这里横、纵各报一遍。

    max 会被一颗漏网像素绑架,所以同时给 p99.5(允许千分之几的软边)。
    """
    import numpy as np
    s = np.asarray(alpha) > 8
    h, w = s.shape
    yy, xx = np.mgrid[0:h, 0:w]
    tx = np.minimum(xx, w - 1 - xx) / float(w - 1)
    ty = np.minimum(yy, h - 1 - yy) / float(h - 1)
    rows = []
    for bx in xs:
        m = s & (tx >= bx)
        n = int(m.sum())
        rows.append((round(bx, 3),
                     round(float(ty[m].max()), 3) if n else 0.0,
                     round(float(np.percentile(ty[m], 99.5)), 3) if n else 0.0,
                     n))
    cols = []
    for by in xs:
        m = s & (ty >= by)
        n = int(m.sum())
        cols.append((round(by, 3),
                     round(float(tx[m].max()), 3) if n else 0.0,
                     round(float(np.percentile(tx[m], 99.5)), 3) if n else 0.0,
                     n))
    return rows, cols


def build_one(psd_path, out_path, tgt_w, tgt_h, ring, feather, pad,
              fold=None, fold_layers=("corners",)):
    """把一张 PSD 合成成底框成品(丙方案)。

    11-20 改:Deco 层折回外环,而且**折在成品画布坐标下**,不是在源分辨率上。
    为什么挪坐标:ring / feather / 中央清账判据全都在成品坐标里说话,
    折在源分辨率上等于"折的尺子和清账的尺子不是同一把",调参时看不见因果。
    Frame(描边环)永远不折:折了就断线,卡片失去框感。
    """
    import numpy as np
    from PIL import Image
    from psd_tools import PSDImage
    psd = PSDImage.open(psd_path)
    seq = []                                     # [(语义名, 已摆到 PSD 画布坐标的整幅 RGBA)] —— **保持 PSD 层序**
    inner_rect = None
    for ly in psd:
        nm = LAYER_MAP.get(str(ly.name).strip().lower())
        im = ly.topil()
        if im is None or nm is None:
            continue
        im = im.convert("RGBA")
        if nm == "inner":
            bb = im.getchannel("A").getbbox()
            if bb:
                inner_rect = (ly.left + bb[0], ly.top + bb[1], ly.left + bb[2], ly.top + bb[3])
            continue                             # InnerBG 故意不进成品:中央归吃滑块的 CSS 填充层
        full = Image.new("RGBA", (psd.width, psd.height), (0, 0, 0, 0))
        full.paste(im, (max(0, ly.left), max(0, ly.top)))
        seq.append((nm, full))
    if not seq:
        print("  !! %s 的 Frame/Deco 两层全空,不出图" % os.path.basename(psd_path))
        return None

    # 裁框用**所有层的并集 bbox**(与 11-19 行为一致)。量纲教训 1:画面框线不在画布最外缘。
    uni = None
    for _nm, full in seq:
        u = np.asarray(full.getchannel("A"))
        uni = u if uni is None else np.maximum(uni, u)
    nz = np.flatnonzero(uni.max(axis=1)), np.flatnonzero(uni.max(axis=0))
    abox = (int(nz[1][0]), int(nz[0][0]), int(nz[1][-1]) + 1, int(nz[0][-1]) + 1)
    p = max(0, int(pad))
    box = (max(0, abox[0] - p), max(0, abox[1] - p),
           min(psd.width, abox[2] + p), min(psd.height, abox[3] + p))

    # ⚠ 整条链**只做一次 resample**(合成完 → crop → resize)。
    # 曾经改成"每层各自 resize 到成品再合成",两次 LANCZOS ≠ 一次,产物字节当场变了
    # (土 118,119 → 123,423 B),那样 A/B 就分不清是折叠的功劳还是重采样顺序的副作用。
    # 所以折叠挪到 crop 之后、合成之前的**源分辨率**上做:crop/paste 是无损位移,不引入新采样;
    # 而 box 正好等于成品画布的四边,所以这里的归一化深度与 ring/feather 说话用的是同一把尺子。
    folded, canvas = [], None
    for nm, full in seq:
        im = full
        if fold and nm in fold_layers:
            arr = fold_depth(np.asarray(full.crop(box)), fold[0], fold[1])
            im = Image.new("RGBA", (psd.width, psd.height), (0, 0, 0, 0))
            im.paste(Image.fromarray(arr.astype("uint8"), "RGBA"), (box[0], box[1]))
            folded.append(nm)
        canvas = im if canvas is None else Image.alpha_composite(canvas, im)
    img = canvas.crop(box).resize((tgt_w, tgt_h), Image.LANCZOS)
    a = np.asarray(img).astype("float64")
    yy, xx = np.mgrid[0:tgt_h, 0:tgt_w]
    d = np.minimum(np.minimum(xx, tgt_w - 1 - xx), np.minimum(yy, tgt_h - 1 - yy)).astype("float64")
    # keep:环内 1,往外 feather 距离线性淡到 0。feather 太小会在内缘留下"笔直硬切边"(11-19 样张翻过车)。
    keep = np.clip((ring + feather - d) / max(1.0, float(feather)), 0.0, 1.0)
    a[:, :, 3] *= keep
    Image.fromarray(a.astype("uint8"), "RGBA").save(out_path, optimize=True)

    al = a[:, :, 3]
    s8 = al > 8
    cx = al[tgt_h // 2 - 8:tgt_h // 2 + 8, tgt_w // 2 - 40:tgt_w // 2 + 40]

    def ink(bx, by):
        x0 = int(round(tgt_w * bx))
        y0 = int(round(tgt_h * by))
        return round(100.0 * s8[y0:tgt_h - y0, x0:tgt_w - x0].mean(), 2)

    dt_rows, dt_cols = depth_table(al, XS)
    return {
        "bytes": os.path.getsize(out_path), "size": (tgt_w, tgt_h),
        "ring": ring, "feather": feather, "pad": p, "folded": folded,
        "fold": fold, "depth_rows": dt_rows, "depth_cols": dt_cols,
        "crop": box, "crop_wh": (box[2] - box[0], box[3] - box[1]),
        "opaque_ring_pct": round(100.0 * (al[d < ring] > 8).mean(), 1),
        "centre_max_alpha": int(cx.max()), "inner_rect": inner_rect,
        # 文字区脏度:括号里是「横内缩 / 纵内缩」占卡片宽高的比例(整图拉伸 ⇒ 画布%=卡片%)
        "ink_10_14": ink(0.10, 0.14), "ink_12_16": ink(0.12, 0.16), "ink_16_20": ink(0.16, 0.20),
        # 还有多少墨落在"两轴都深"的死角里(t_x>0.25 且 t_y>0.25)——这类像素必压在正文上
        "deep_ink_px": int(((np.minimum(xx, tgt_w - 1 - xx) > 0.25 * tgt_w) &
                            (np.minimum(yy, tgt_h - 1 - yy) > 0.25 * tgt_h) & s8).sum()),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--psd", required=True, help="PSD分层 目录")
    ap.add_argument("--out", required=True, help="成品目录(frame-<遁>.png)")
    ap.add_argument("--tw", type=int, default=720, help="成品画布宽(默认 720)")
    ap.add_argument("--th", type=int, default=260, help="成品画布高(默认 260 ⇒ 2.77:1,贴近典型卡片)")
    ap.add_argument("--ring", type=int, default=58, help="保留外环厚(成品图坐标;渲染到 120 高卡片约 27px)")
    ap.add_argument("--feather", type=int, default=30, help="内侧羽化(成品图坐标;<18 会看见硬切边)")
    ap.add_argument("--pad", type=int, default=12, help="裁到画面边界后向外留多少源像素")
    ap.add_argument("--only", default=None, help="只出一张(earth/fire/... 或 doton/katon/...)")
    ap.add_argument("--fold", action="store_true",
                    help="开启 Deco 折叠压回环带。**默认关闭** = 与 11-19 发货产物逐字节相同"
                         "(等价性已经实测:五张 SHA256-12 全等)")
    ap.add_argument("--band", default="0.10,0.14",
                    help="折叠带内不区 (横%,纵%%),逗号分隔:带内一个像素都不动")
    ap.add_argument("--margin", default="0.03,0.05",
                    help="带外允许的最额外余量 (横%,纵%%):墨最深 = band+margin")
    ap.add_argument("--fold-layers", default="corners", dest="fold_layers",
                    help="哪些语义层参与折叠,逗号分隔(corners/border)。"
                         "**border 折叠会打断描边环**,只在故意做对照时才动。")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    want = ALIAS.get(args.only, args.only) if args.only else None
    fl = tuple(x.strip() for x in args.fold_layers.split(",") if x.strip())
    band = tuple(float(v) for v in args.band.split(","))
    margin = tuple(float(v) for v in args.margin.split(","))
    fold = (band, margin) if args.fold else None
    n = 0
    worst = [(bx, 0.0, 0.0) for bx in XS]
    for stem, mode in sorted(ALIAS.items()):
        if want and mode != want:
            continue
        src = os.path.join(args.psd, stem + ".psd")
        if not os.path.isfile(src):
            print("  -- %s 没找到 %s.psd,跳过" % (mode, stem))
            continue
        dst = os.path.join(args.out, "frame-%s.png" % mode)
        r = build_one(src, dst, args.tw, args.th, args.ring, args.feather, args.pad,
                      fold=fold, fold_layers=fl)
        if not r:
            continue
        n += 1
        print("  %-7s -> frame-%s.png  %d B" % (stem, mode, r["bytes"]))
        print("          裁到画面 %dx%d(源坐标 %s) -> 成品 %dx%d(%.2f:1)" % (
            r["crop_wh"][0], r["crop_wh"][1], r["crop"], r["size"][0], r["size"][1],
            r["size"][0] / float(r["size"][1])))
        print("          环 %dpx + 羽化 %dpx:环内不透明 %.1f%%,渲染到 120 高卡片约 %.0f px 厚" % (
            r["ring"], r["feather"], r["opaque_ring_pct"], r["ring"] * 120.0 / r["size"][1]))
        print("          折叠 %s 作用于 %s" % (
            ("带 %s 余量 %s" % (r["fold"][0], r["fold"][1])) if r["fold"] else "关闭",
            r["folded"] or "无一层(=老行为)"))
        print("          中央取样区最大 alpha=%d(必须 0;内底面板源矩形 %s)" % (
            r["centre_max_alpha"], r["inner_rect"]))
        print("          横内缩 bx → 纵需让到 by [max | p99.5] (参与墨像素):")
        print("            " + "  ".join("x%.0f%%→%.1f%%|%.1f%%(%d)"
                                         % (100 * bx, 100 * mx, 100 * p95, n)
                                         for (bx, mx, p95, n) in r["depth_rows"]))
        print("          文字区脏度(区内墨>8 占比): (10,14)=%.2f%% (12,16)=%.2f%% (16,20)=%.2f%%"
              "  两轴都深的死角墨像素=%d" % (
                  r["ink_10_14"], r["ink_12_16"], r["ink_16_20"], r["deep_ink_px"]))
        for i, (bx, mx, p95, cnt) in enumerate(r["depth_rows"]):
            worst[i] = (bx, max(worst[i][1], mx), max(worst[i][2], p95))
        if r["centre_max_alpha"] > 0:
            print("          !! 中央还有东西 —— 特效画进文字区了,得回头处理素材")
    if n:
        print("  —— 五遁取**最坏值**(CSS 该用的 in_x/in_y 就来自这张表;整图拉伸 ⇒ 画布%=卡片%) ——")
        for w in worst:
            bx, mx, p95 = w[0], w[1], w[2]
            print("     x=%2.0f%% ⇒ y 需让到 %5.1f%% (p99.5 %5.1f%%)   420 宽卡 in_x=%.0fpx;"
                  "230 高卡 in_y=%.0fpx  120 矮卡 in_y=%.0fpx" % (
                      100 * bx, 100 * mx, 100 * p95, 420 * bx, 230 * mx, 120 * mx))
    print("  共出 %d 张 -> %s" % (n, args.out))
    return 0 if n else 2


if __name__ == "__main__":
    sys.exit(main())
