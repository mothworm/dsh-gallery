#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""磨砂玻璃的**反馈回路**(唯一裁决命令)。一条命令,红/绿,秒级。

    python dsh-gallery-pack\tools\check-glass.py

## 历史

这份脚本的前身是 `check-frame-clearance.py`:它断言"五遁底框的墨不许落进正文矩形"。
2026-11-21 用户裁定**四遁底框整体废弃、改成磨砂玻璃**,那个判据的对象(位图)已经不存在了,
所以整份替换 —— 位图不在了还留着那条回路,只会变成一条永远绿的假闸门。

## 它现在断言什么

磨砂玻璃的做法是给卡片加 `backdrop-filter: blur(...)` + 半透明底色。
这类效果有三个具体的翻车方式,每一条都能在**源码层面**判定(不需要截图):

  1. **玻璃糊到整页/侧栏**:backdrop-filter 只许出现在卡片选择器上。
     挂到 body/sidebar 会把整屏内容糊掉(而且工作区 AGENTS 里记着它与超椭圆圆角冲突)。
  2. **雾感旋钮接不上**:`--bs-glass-fog` 必须真的进 calc(),否则拖滑块没反应。
  3. **颜色旋钮接不上**:`--bs-glass-tint` 必须真的进 color-mix()。
  4. **档位门控失效**:`data-bs-glass` 这条门必须存在,否则选「关」时玻璃还在。
  5. **素材复活**:代码里不许再出现 frame-*.png —— 用户的火影素材包要能整体拆走。
  6. **旋钮互吃**:玻璃规则里不许出现 --bs-card-*(拖文字底滑块不许连坐玻璃)。

这些是**结构断言**,比"跑一次截图看着还行"可靠:截图会漏掉暗色主题、窄窗口、
以及"这次恰好没触发"的情形。真机观感另行验收(见交接单)。
"""
import argparse
import os
import re
import sys

_WSROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSS = os.path.join(_WSROOT, "dsh-boot-suites", "gallery", "parts", "50-css.part.js")
DOM = os.path.join(_WSROOT, "dsh-boot-suites", "gallery", "parts", "70-dom.part.js")
BUILT = os.path.join(_WSROOT, "dsh-boot-suites", "gallery", "lib", "client.js")


def read(p):
    with open(p, "r", encoding="utf-8") as f:
        return f.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()
    css, dom, built = read(CSS), read(DOM), read(BUILT)
    checks = []

    def chk(name, cond, detail=""):
        checks.append((name, bool(cond), detail))

    # ① backdrop-filter 只许在卡片规则里。
    #    判法:源码里 CSS 是**字符串数组拼接**的,一条规则被拆成多个 "..." 片段。
    #    所以不能靠"往前找 data-bs-glass"这种字面匹配 —— 选择器那一行是
    #    `":root[data-bs-glass] " + CARD_SEL + "{"`,和 backdrop-filter 之间还隔着几十行注释。
    #    正确做法:把相邻的字符串片段拼起来看,**每一处 backdrop-filter 必须落在
    #    含 data-bs-glass 且含 CARD_SEL 的那条规则里**。
    #    规则边界 = 源码里出现 `{`(说明选择器结束)到下一个 `}`。
    def rule_texts(src):
        """把 CSS 片段**连同它们之间的代码记号**一起连成一条长串。

        关键:CARD_SEL 是**代码变量**,不是字符串 —— 它出现在字符串片段之间
        (`":root[data-bs-glass] " + CARD_SEL + "{"`)。只抽引号里的内容会把 CARD_SEL 丢掉,
        于是"选择器里有没有 CARD_SEL"永远为假。这里把引号内容与代码记号一起保留。
        """
        out = []
        for line in src.split("\n"):
            s = line.strip()
            if s.startswith("//"):
                continue                      # 注释不参与规则还原
            out.append(s)
        return " ".join(out)

    flat = rule_texts(css)
    rules = re.findall(r"([^{}]*)\{([^{}]*)\}", flat)
    scoped, orphan = 0, []
    for sel, body in rules:
        if "backdrop-filter" in body:
            if "data-bs-glass" in sel and "CARD_SEL" in sel:
                scoped += 1
            else:
                orphan.append(sel.strip()[:60])
    chk("① 玻璃只加在卡片上(每条 backdrop-filter 规则都同时带 data-bs-glass 与 CARD_SEL)",
        scoped > 0 and not orphan,
        "合规 %d 条,越界 %d 条 %s" % (scoped, len(orphan), orphan if orphan else ""))

    # ①b 不许出现在 body / panel / sidebar 这类大块上
    for kw in ("-bg", "-scrim", "-panel", "body"):
        pat = re.compile(r'"[^"]*' + re.escape(kw) + r'[^"]*\{[^"]*backdrop-filter')
        bad = bool(pat.search(css))
        chk("①b 玻璃没有挂到 %s 上" % kw, not bad, "" if not bad else "出现在 %s 规则里" % kw)

    # ② 雾感进 calc
    chk("② 雾感旋钮真的进 calc()(拖滑块会改变效果)",
        re.search(r"blur\(calc\(var\(--bs-glass-fog", css) is not None, "")
    chk("②b 雾感同时驱动底色不透明度",
        re.search(r"var\(--bs-glass-fog,\d+\) \* \d+%\)", css) is not None, "")

    # ③ 颜色进 color-mix
    chk("③ 颜色旋钮真的进 color-mix()",
        re.search(r"color-mix\([^)]*var\(--bs-glass-tint", css) is not None, "")

    # ④ 档位门控
    chk("④ 玻璃被 data-bs-glass 门控",
        ":root[data-bs-glass]" in css and 'removeAttribute("data-bs-glass")' in dom
        and 'setAttribute("data-bs-glass", mode)' in dom, "")

    # ⑤ 素材零引用
    for f in ("frame-doton", "frame-katon", "frame-raton", "frame-suiton", "frame-futon"):
        chk("⑤ 代码里不引用 %s.png" % f, f not in built and f not in dom and f not in css, "")

    # ⑤b 旧的位图底框属性退场
    for tok in ("--bs-frame-src", "data-bs-fit", "data-bs-frame-occ"):
        chk("⑤b %s 已退场" % tok, tok not in built, "")

    # ⑥ 旋钮互吃
    m = re.search(r'"backdrop-filter[^"]*"', css)
    glass_rule = css[max(0, m.start() - 2000):m.end() + 2000] if m else ""
    chk("⑥ 拖文字底滑块不连坐玻璃(玻璃规则里没有 --bs-card-*)",
        bool(glass_rule) and "--bs-card-" not in glass_rule, "")

    ok = sum(1 for _n, c, _d in checks if c)
    if not args.quiet:
        for n, c, d in checks:
            print("  %-4s %s%s" % ("ok" if c else "FAIL", n, ("  [" + d + "]") if d else ""))
    bad = len(checks) - ok
    if bad:
        print("\nFAIL: %d / %d 条不成立" % (bad, len(checks)))
        return 1
    print("\nPASS: %d / %d 条全部成立。" % (ok, len(checks)))
    return 0


if __name__ == "__main__":
    sys.exit(main())