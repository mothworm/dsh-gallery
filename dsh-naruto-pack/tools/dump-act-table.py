# -*- coding: utf-8 -*-
"""打印每幕的决策依据对照表,查 pos 为什么和锚点不自洽。"""
import sys, os, json, glob
# 本机 Python 工具库:优先环境变量 DSH_PYLIBS,否则取「工作区根/_pylibs」(本脚本在 tools/ 下,上跳三级)。
# 写死绝对路径会把开发机的目录结构发布出去,而且换一台机器就 ImportError。
import os as _os, sys as _sys
_WSROOT = _os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
for _c in (_os.environ.get("DSH_PYLIBS"), _os.path.join(_WSROOT, "_pylibs")):
    if _c and _os.path.isdir(_c):
        _sys.path.insert(0, _c)
        break
ARTS = sys.argv[1]
GM = json.load(open(sys.argv[2], encoding="utf-8"))["idx"]
VA = 16.0 / 9.0
print("%-11s %-4s %-5s %-9s %-6s %-6s %-14s %-8s %-8s %-7s %-7s" % (
    "preset", "act", "idx", "pos", "fv", "fh", "kb", "area", "edge", "face", "cent"))
for pj in sorted(glob.glob(os.path.join(ARTS, "*", "measure.json"))):
    d = json.load(open(pj, encoding="utf-8"))
    for a in d["acts"]:
        m = GM[a["idx"]]
        ai = m["aspect"]
        print("%-11s %-4s %-5s %-9s %-6.3f %-6.3f %-14s %-8.3f %-8.3f %-7s %-7s %s" % (
            d["preset"], a["file"], a["idx"], a["pos"], a["geo"]["fv"], a["geo"]["fh"],
            "%s|%s" % (a["kb"][0], a["kb"][1]), m["area"], m["edge_share"],
            "%.2f,%.2f" % (m["face_cx"], m["face_cy_top"]), "%.2f,%.2f" % (m["cx"], m["cy_top"]),
            a["pos_from"]))
