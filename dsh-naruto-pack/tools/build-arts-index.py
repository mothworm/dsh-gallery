# -*- coding: utf-8 -*-
"""由 arts/_build-report.json + 各预设 measure.json 生成 arts/INDEX.md(避免手抄错数字)。"""
import sys, os, json
ARTS = sys.argv[1]
rep = json.load(open(os.path.join(ARTS, "_build-report.json"), encoding="utf-8"))["presets"]
L = ["# arts/ 开屏动画预设索引(一个素材文件夹 = 一套)", "",
     "契约字段(与 `dsh-boot-naruto` 的 preset.json 一致,不自创):",
     "`{schema:1, id, title, open, acts:[{file,dur,pos,z0,z,kb,pupil?,flash}], title, sub}`",
     "**注意:`title` 故意出现两次**(前置短名 + 末尾展示名),照任务书样例原样落盘;`JSON.parse` last-wins,",
     "所以插件 `presetTimeline()` 取到的是**末尾的展示名**(例:`晓 · 小南`),前置短名只是给人看的。",
     "编号 = `tools/prep-images.py --list` 的**全局编号**(136 张排一次),不是文件夹内序号。",
     "`open=akatsuki-cloud` 时宿主还会**前置 300ms 晓云**,所以上屏 = Σdur + 300ms。",
     "判据/取景留证:每个预设目录下有 `measure.json`;整表的可视带渲染见 `../survey/presets-sheet.jpg`。", "",
     "| preset | 文件夹 | 幕数 | 素材编号 | 总时长 | 上屏 | 开场 | 一句话动线说明 |", "|---|---|---|---|---|---|---|---|"]
for r in sorted(rep, key=lambda x: x["id"]):
    mj = json.load(open(os.path.join(ARTS, r["id"], "measure.json"), encoding="utf-8"))
    L.append("| `%s` | %s | %d | %s | %.2fs | %.2fs | %s | %s |" % (
        r["id"], r["folder"], r["n"], " ".join("`%s`" % i for i in r["idxs"]),
        r["total"] / 1000.0, (r["total"] + (300 if r["open"] != "none" else 0)) / 1000.0,
        r["open"], r["why"]))
L.append("")
L.append("共 %d 支 / %d 幕 / %.1f MB;单套 %.2f–%.2fs。" % (
    len(rep), sum(r["n"] for r in rep), sum(r["bytes"] for r in rep) / 1048576.0,
    min(r["total"] for r in rep) / 1000.0, max(r["total"] for r in rep) / 1000.0))
L.append("")
L.append("## 没产出的预设")
L.append("")
L.append("- **`toneri`(最终章舍人)** —— 该文件夹 4 张里 `51` 是任务书指定的 UI 污染张,`50` 本轮实测也带「返回」按钮"
         "(左下角白像素密度 5.18/千,与被禁的 21=5.18/79=5.27/36=5.32/84=34.8 同一簇;文件名同为 `Screenshot_*`;"
         "两轮独立语义复核都指到同一个黄色木叶箭头 + 白描边「返回」)。剩下 `52`/`53` 只有 2 张,"
         "低于契约的 3 幕下限,按「可用素材 <3 的文件夹不做」本轮**不做**。"
         "要救它只有两条路:① 用户补一张舍人图;② 照 `arts2/` 的做法把 `50` 用 cover+z 把左下角推出可见带"
         "(能藏掉按钮,但等于把 UI 素材当立绘用,需用户点头)。")
L.append("")
L.append("## 方向链(铁律:上一幕出场向量 = 下一幕入场向量)")
L.append("")
L.append("每条链里 **前一幕的出场向量 = 后一幕的入场向量**(主导轴同号);人工标定幕用给定值,相邻幕反向让位。")
L.append("")
for r in sorted(rep, key=lambda x: x["id"]):
    d = json.load(open(os.path.join(ARTS, r["id"], "preset.json"), encoding="utf-8"))
    kb = [(a["kb"][0], a["kb"][1]) for a in d["acts"]]
    L.append("- **%s**(%s):%s" % (r["id"], r["folder"], " ⇒ ".join("[%s → %s]" % (e, x) for e, x in kb)))
    for i in range(len(kb) - 1):
        A = [float(x.rstrip("%")) for x in kb[i][1].split(" ")]
        B = [float(x.rstrip("%")) for x in kb[i + 1][0].split(" ")]
        ax = 0 if abs(A[0]) >= abs(A[1]) else 1
        if A[ax] == 0 and B[ax] == 0:
            L.append("    - ⚠ act%d→act%d 两段都收中心,衔接会停一拍" % (i + 1, i + 2))
        elif A[ax] * B[ax] < 0:
            L.append("    - ⚠ act%d→act%d 主导轴反号:%s → %s" % (i + 1, i + 2, kb[i][1], kb[i + 1][0]))
open(os.path.join(ARTS, "INDEX.md"), "w", encoding="utf-8", newline="\n").write("\n".join(L) + "\n")
print(os.path.join(ARTS, "INDEX.md"), os.path.getsize(os.path.join(ARTS, "INDEX.md")), "B")
