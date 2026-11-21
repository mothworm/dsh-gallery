// 一次性降厚脚本(2026-11-14 用户实测:「默认都 50% 已经足够看清字了」)。
// 只改 palettes/tuned/*.json 的 card.a / card.b / card.quiet,**eye / ink / accent / art 一律不碰**。
//
// 两个设计点,别"顺手简化"掉:
//  1. **按 BASE 基准映射,不读当前值** ⇒ 脚本可重跑、结果幂等。上一版读当前值再映射,重跑一次
//     就会把 0.63 当成"原始 0.63"压到窗口下界 0.55,悄悄改掉十套的调好的值。
//  2. **亮部占大头的两套有例外**(见 OVERRIDE):自测里"主文字 vs 画面最亮块"那道 4.5 对比门,
//     在 madara(4.4)/ minato(4.3)上因为降厚而跌破。降厚不能降过可读性 —— 让它们停在 0.72/0.70,
//     其余十套正常落在 0.55–0.65。selftest 的窗口上界因此是 0.74,不是 0.70。
// 跑法:cwd = 插件目录,`node tools/squash-card.mjs`
import fs from "node:fs";

const DIR = "palettes/tuned/";
// 第一轮降厚时盘上的实测旧值(a / b / quiet),当基准用
const BASE = {
	danzo: [0.92, 0.88, 0.70], hanabi: [0.94, 0.90, 0.76], "hinata-last": [0.96, 0.935, 0.80],
	hinata: [0.96, 0.93, 0.80], itachi: [0.945, 0.91, 0.76], kakashi: [0.94, 0.90, 0.76],
	konan: [0.94, 0.91, 0.76], "madara-god": [0.955, 0.93, 0.78], madara: [0.92, 0.88, 0.70],
	minato: [0.94, 0.90, 0.76], sasuke: [0.945, 0.91, 0.75], tobirama: [0.95, 0.92, 0.78],
};
const OVERRIDE = { madara: [0.72, 0.70, 0.52], minato: [0.72, 0.70, 0.52] };
const SRC_MIN = 0.72, SRC_MAX = 0.97;
const map = (v, lo, hi) => {
	const t = Math.min(1, Math.max(0, (Number(v) - SRC_MIN) / (SRC_MAX - SRC_MIN)));
	return Math.round((lo + t * (hi - lo)) * 1000) / 1000;
};
let n = 0, skip = [];
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith(".json"))) {
	const key = f.replace(/\.json$/, "");
	const p = DIR + f;
	const o = JSON.parse(fs.readFileSync(p, "utf8"));
	if (!o.card) { skip.push(key + "(没有 card)"); continue; }
	if (!BASE[key]) { skip.push(key + "(不在 BASE 表里,拒绝猜旧值)"); continue; }
	const b = BASE[key];
	const to = OVERRIDE[key] || [map(b[0], 0.55, 0.65), map(b[1], 0.55, 0.65), map(b[2], 0.46, 0.56)];
	const from = [o.card.a, o.card.b, o.card.quiet];
	o.card.a = to[0]; o.card.b = to[1]; o.card.quiet = to[2];
	fs.writeFileSync(p, JSON.stringify(o, null, 2) + "\n");
	n++;
	console.log(key.padEnd(14), "基准 " + b.join("/"), "盘上 " + from.join("/"), "-> " + to.join("/") + (OVERRIDE[key] ? "   ← 4.5 对比门例外" : ""));
}
console.log("降厚完成:" + n + " 套" + (skip.length ? " / 跳过:" + skip.join(", ") : ""));
