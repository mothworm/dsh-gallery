// =============================================================
// 40-eye · 球心瞳术(程序化 SVG)
//
// 为什么不用位图:球本身只有 74px,瞳术是**同心圆 + 旋转对称图形**,
// 用 SVG 画可以任意倍率不糊、配色直接吃这套画面的 accent/glow,而且整只眼睛
// 是几百字节文本 —— 换角色不用出图、不用压缩、不用 base64 内嵌(madara 那份 2.6 MB
// 的 client.js 就是被内嵌图撑出来的,这条路可以不再走一遍)。
//
// three.js 的可行性还没验;真要用,应该只替换这只眼(见交接单关键决策 4),
// 所以这里把绘制收在 eyeSvg()/eyeUri() 两个函数后面,换实现只动这一段。
//
// 确定性:所有角度都由 rotate(i*120) 这类式子给出,**没有随机数**。
// =============================================================

const EYE_KINDS = {
	sharingan: "写轮眼", mangekyou: "万花筒", mangekyou6: "万花筒·六芒星", mangekyouPin: "万花筒·风车",
	rinnegan: "轮回眼", byakugan: "白眼", chakra: "查克拉", sensor: "感知眼",
	kunai: "飞雷神苦无", paper: "纸蝶", unknown: "未配色",
};
// 瞳纹是**人物设定**,不是抽色能决定的:佐助 = 六芒星写轮眼(两个交叠正三角,三折对称;
// 见 https://baike.baidu.com/item/六芒星写輪眼/4476181 与 Wikimedia 的 Sasuke MS 图),
// 鼬/斑那种三刃风车(mangekyou)是另一只,不能混用 —— 所以这里新开一个 kind。

// 常用几何:圆心 50,50,虹膜半径 34,瞳孔 12
function svgWrap(inner, ring) {
	return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">'
		+ '<defs><radialGradient id="g" cx="34%" cy="26%" r="78%">'
		+ '<stop offset="0%" stop-color="' + ring.hi + '" stop-opacity="0.95"/>'
		+ '<stop offset="52%" stop-color="' + ring.mid + '" stop-opacity="0.55"/>'
		+ '<stop offset="100%" stop-color="' + ring.lo + '" stop-opacity="0.92"/>'
		+ '</radialGradient></defs>'
		+ '<circle cx="50" cy="50" r="49" fill="' + ring.lo + '"/>'
		+ '<circle cx="50" cy="50" r="49" fill="url(#g)"/>'
		+ inner
		// 玻璃高光:统一一条,免得每只眼各画各的
		+ '<ellipse cx="36" cy="30" rx="12" ry="7.5" fill="#FFFFFF" fill-opacity="0.30"/>'
		+ '<ellipse cx="33" cy="27" rx="4.2" ry="2.6" fill="#FFFFFF" fill-opacity="0.55"/>'
		+ '</svg>';
}
function comma(cx, cy, r, ang, col) {
	// 勾玉:一个圆加一条甩出去的尾巴,整体按 ang 旋转
	return '<g transform="rotate(' + ang + ' ' + cx + ' ' + cy + ')">'
		+ '<circle cx="' + cx + '" cy="' + (cy - r) + '" r="5.6" fill="' + col + '"/>'
		+ '<path d="M' + (cx - 3.4) + ' ' + (cy - r + 2.6) + ' Q' + cx + ' ' + (cy - 1.5) + ' '
		+ (cx + 3.4) + ' ' + (cy - r + 2.6) + ' Q' + cx + ' ' + (cy - r + 6.4) + ' '
		+ (cx - 3.4) + ' ' + (cy - r + 2.6) + ' Z" fill="' + col + '"/>'
		+ '</g>';
}
function blade(cx, cy, ang, col, w) {
	// 万花筒的一枚刃(三代斑/鼬那种钝三角,不是直针)
	return '<g transform="rotate(' + ang + ' ' + cx + ' ' + cy + ')">'
		+ '<path d="M' + cx + ' ' + (cy - 30) + ' C' + (cx + w) + ' ' + (cy - 17) + ' '
		+ (cx + 3.2) + ' ' + (cy - 7) + ' ' + cx + ' ' + (cy - 4) + ' C' + (cx - 3.2) + ' ' + (cy - 7) + ' '
		+ (cx - w) + ' ' + (cy - 17) + ' ' + cx + ' ' + (cy - 30) + ' Z" fill="' + col + '"/></g>';
}
function hexagram(cx, cy, R, col, w) {
	// 六芒星 = 两个正三角交叠。角度全部由 120° 等分算出来,没有魔法数字也没有随机数。
	// 用 stroke 而不是 fill:佐助的瞳纹是"刃状线条",中间要露出红底。
	const tri = (off) => [0, 1, 2].map((i) => {
		const a = ((off + i * 120) * Math.PI) / 180;
		return (cx + R * Math.sin(a)).toFixed(2) + "," + (cy - R * Math.cos(a)).toFixed(2);
	}).join(" ");
	return '<polygon points="' + tri(0) + '" fill="none" stroke="' + col + '" stroke-width="' + w
		+ '" stroke-linejoin="round"/>'
		+ '<polygon points="' + tri(60) + '" fill="none" stroke="' + col + '" stroke-width="' + w
		+ '" stroke-linejoin="round"/>';
}
function bladeStraight(cx, cy, ang, col, w) {
	// 卡卡西那只的读法是**直边、带扫掠角**的三枚刃(风车感来自斜边,不是弧线);
	// 和鼬的 blade()(钝三角 + 弧线)刻意区分开 —— 两只都叫"万花筒"但不能画成同一只。
	return '<g transform="rotate(' + ang + ' ' + cx + ' ' + cy + ')">'
		+ '<path d="M' + cx + ' ' + (cy - 31) + ' L' + (cx + w) + ' ' + (cy - 12) + ' L'
		+ (cx + w * 0.34) + ' ' + (cy - 5.5) + ' L' + (cx - w * 0.5) + ' ' + (cy - 14) + ' Z" fill="' + col + '"/></g>';
}
function kunai(C) {
	// 飞雷神苦无(水门/扉间):三叉刃 + 白色术式札 + 环首。这是**器物**不是眼睛,
	// 所以不画虹膜圆盘,让 svgWrap 的画面渐变当底,苦无本身用钢色 + 深色描边立出来。
	const edge = 'stroke="' + C.ink + '" stroke-width="1.2" stroke-linejoin="round"';
	return '<g>'
		// 三叉刃:中叉直立,两侧叉外撇(原作那把的叉尖是分开的三片)
		+ '<path d="M50 9 L54.6 30 L54.6 49 L45.4 49 L45.4 30 Z" fill="' + C.steel + '" ' + edge + '/>'
		+ '<path d="M35.5 19 L42.4 33 L44.6 49 L37.4 49 L31.2 34 Z" fill="' + C.steelDark + '" ' + edge + '/>'
		+ '<path d="M64.5 19 L57.6 33 L55.4 49 L62.6 49 L68.8 34 Z" fill="' + C.steelDark + '" ' + edge + '/>'
		// 刃口高光:只给中叉一条,三叉都亮就糊了
		+ '<line x1="50" y1="14" x2="50" y2="46" stroke="#FFFFFF" stroke-width="1.4" stroke-opacity="0.34"/>'
		+ '<rect x="36" y="48" width="28" height="5" rx="2" fill="' + C.steelDark + '" ' + edge + '/>'
		// 术式札(「飛雷神」三字是这把刀的身份,不能省)
		+ '<rect x="41.5" y="53.5" width="17" height="13" rx="1.8" fill="' + C.tag + '" ' + edge + '/>'
		+ '<text x="50" y="63.4" font-size="7.2" text-anchor="middle" font-family="serif" fill="' + C.ink + '">飛雷神</text>'
		+ '<rect x="47.4" y="66" width="5.2" height="13" rx="1.6" fill="' + C.steelDark + '" ' + edge + '/>'
		+ '<circle cx="50" cy="84" r="5.6" fill="none" stroke="' + C.steel + '" stroke-width="2.6"/>'
		+ '</g>';
}
function paper(C) {
	// 小南的纸蝶:**折纸**味靠的是硬边多边形 + 折痕线 + 左右两片不同明度(一张纸两面对光),
	// 不是渐变。整体略微歪 8°,像刚散出去的那一下。
	return '<g transform="rotate(-8 50 50)">'
		+ '<polygon points="50,45 19,20 32,53" fill="' + C.paper + '" stroke="' + C.fold + '" stroke-width="1"/>'
		+ '<polygon points="50,45 81,20 68,53" fill="' + C.paper2 + '" stroke="' + C.fold + '" stroke-width="1"/>'
		+ '<polygon points="50,51 27,70 43,61" fill="' + C.paper2 + '" stroke="' + C.fold + '" stroke-width="1"/>'
		+ '<polygon points="50,51 73,70 57,61" fill="' + C.paper + '" stroke="' + C.fold + '" stroke-width="1"/>'
		// 折痕:从翅根拉到翅尖,这是"纸"最关键的证据
		+ '<line x1="50" y1="45" x2="26" y2="28" stroke="' + C.fold + '" stroke-width="0.9" stroke-opacity="0.85"/>'
		+ '<line x1="50" y1="45" x2="74" y2="28" stroke="' + C.fold + '" stroke-width="0.9" stroke-opacity="0.85"/>'
		+ '<polygon points="50,35 53.2,52 50,69 46.8,52" fill="' + C.ink + '"/>'
		+ '<path d="M48.4 36 Q42 25 35.5 22.5" fill="none" stroke="' + C.ink + '" stroke-width="1.4" stroke-linecap="round"/>'
		+ '<path d="M51.6 36 Q58 25 64.5 22.5" fill="none" stroke="' + C.ink + '" stroke-width="1.4" stroke-linecap="round"/>'
		+ '</g>';
}
function rings(cx, cy, col, spec) {
	// spec = [[r, width], ...] 同心环(轮回眼的"涟漪")
	return spec.map((p) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + p[0] + '" fill="none" '
		+ 'stroke="' + col + '" stroke-width="' + p[1] + '"/>').join("");
}
function striate(cx, cy, r0, r1, n, col, w, a) {
	// 自虹膜边缘向外的放射细纹(白眼的丝状结构)
	let out = "";
	for (let i = 0; i < n; i++) {
		const ang = (i * (360 / n));
		out += '<g transform="rotate(' + ang + ' ' + cx + ' ' + cy + ')">'
			+ '<line x1="' + cx + '" y1="' + (cy - r0) + '" x2="' + cx + '" y2="' + (cy - r1) + '" '
			+ 'stroke="' + col + '" stroke-width="' + w + '" stroke-opacity="' + a + '"/></g>';
	}
	return out;
}

// 一套画面的调色 -> 一只眼。kind 由调色文件点名(眼 = 人物设定,不该由抽色脚本猜)
function eyeInner(kind, C) {
	switch (kind) {
		case "sharingan":
			return '<circle cx="50" cy="50" r="34" fill="' + C.red + '"/>'
				+ '<circle cx="50" cy="50" r="34" fill="none" stroke="' + C.ink + '" stroke-width="3.4"/>'
				+ '<circle cx="50" cy="50" r="11" fill="' + C.ink + '"/>'
				+ comma(50, 50, 22, 0, C.ink) + comma(50, 50, 22, 120, C.ink) + comma(50, 50, 22, 240, C.ink);
		case "mangekyou":
			return '<circle cx="50" cy="50" r="34" fill="' + C.red + '"/>'
				+ '<circle cx="50" cy="50" r="34" fill="none" stroke="' + C.ink + '" stroke-width="3"/>'
				+ blade(50, 50, 0, C.ink, 11.5) + blade(50, 50, 120, C.ink, 11.5) + blade(50, 50, 240, C.ink, 11.5)
				+ '<circle cx="50" cy="50" r="7.5" fill="' + C.ink + '"/>'
				+ '<circle cx="50" cy="50" r="16" fill="none" stroke="' + C.ink + '" stroke-width="1.6" stroke-opacity="0.75"/>';
		case "rinnegan":
			return '<circle cx="50" cy="50" r="35" fill="' + C.iris + '"/>'
				+ rings(50, 50, C.ink2, [[31, 3.0], [24.5, 2.6], [18.5, 2.3], [13, 2.0], [8, 1.7]])
				+ '<circle cx="50" cy="50" r="3.4" fill="' + C.ink + '"/>';
		case "byakugan":
			return '<circle cx="50" cy="50" r="35" fill="' + C.pale + '"/>'
				+ striate(50, 50, 12, 34, 36, C.vein, 0.9, 0.30)
				+ '<circle cx="50" cy="50" r="35" fill="none" stroke="' + C.rim + '" stroke-width="2.2" stroke-opacity="0.55"/>'
				+ '<circle cx="50" cy="50" r="12" fill="' + C.pupil + '" fill-opacity="0.55"/>';
		case "chakra":
			return '<circle cx="50" cy="50" r="33" fill="' + C.iris + '"/>'
				+ '<circle cx="50" cy="50" r="33" fill="none" stroke="' + C.ink2 + '" stroke-width="2.4"/>'
				+ '<circle cx="50" cy="50" r="17" fill="none" stroke="' + C.ink2 + '" stroke-width="1.6" stroke-opacity="0.7"/>'
				+ comma(50, 50, 25, 45, C.ink2) + comma(50, 50, 25, 225, C.ink2)
				+ '<circle cx="50" cy="50" r="8" fill="' + C.ink + '" fill-opacity="0.72"/>';
		case "sensor":
			return '<circle cx="50" cy="50" r="33" fill="' + C.iris + '"/>'
				+ rings(50, 50, C.ink2, [[26, 1.4], [18, 1.2]])
				+ '<circle cx="50" cy="50" r="9" fill="' + C.ink + '" fill-opacity="0.8"/>'
				+ '<line x1="50" y1="8" x2="50" y2="20" stroke="' + C.ink2 + '" stroke-width="1.6" stroke-opacity="0.6"/>'
				+ '<line x1="50" y1="80" x2="50" y2="92" stroke="' + C.ink2 + '" stroke-width="1.6" stroke-opacity="0.6"/>';
		case "mangekyou6":
			// 佐助:红底 + 黑六芒星(刃尖几乎顶到虹膜边) + 中心瞳孔。
			// R=30 / stroke 5.2 ⇒ 外沿 32.6,离 r=34 的边留 1.4,不会糊成一团黑边。
			return '<circle cx="50" cy="50" r="34" fill="' + C.red + '"/>'
				+ '<circle cx="50" cy="50" r="34" fill="none" stroke="' + C.ink + '" stroke-width="3.2"/>'
				+ hexagram(50, 50, 30, C.ink, 5.2)
				+ '<circle cx="50" cy="50" r="8.6" fill="' + C.ink + '"/>'
				+ '<circle cx="50" cy="50" r="8.6" fill="none" stroke="' + C.red + '" stroke-width="1.1" stroke-opacity="0.5"/>';
		case "mangekyouPin":
			// 卡卡西(写轮眼移植自带土):三枚**直边**刃 + 瞳环,风车的旋转感靠扫掠角
			return '<circle cx="50" cy="50" r="34" fill="' + C.red + '"/>'
				+ '<circle cx="50" cy="50" r="34" fill="none" stroke="' + C.ink + '" stroke-width="3"/>'
				+ bladeStraight(50, 50, 0, C.ink, 9.5) + bladeStraight(50, 50, 120, C.ink, 9.5)
				+ bladeStraight(50, 50, 240, C.ink, 9.5)
				+ '<circle cx="50" cy="50" r="13.5" fill="none" stroke="' + C.ink + '" stroke-width="2.6"/>'
				+ '<circle cx="50" cy="50" r="6.2" fill="' + C.ink + '"/>';
		case "kunai":
			return kunai(C);
		case "paper":
			return paper(C);
		default:
			// 未配色:画得见的灰芒 + 一个问号感的斜杠,而不是"随便给只写轮眼"
			return '<circle cx="50" cy="50" r="32" fill="#4A4448"/>'
				+ '<circle cx="50" cy="50" r="32" fill="none" stroke="#7E767C" stroke-width="2" stroke-dasharray="5 4"/>'
				+ '<line x1="34" y1="66" x2="66" y2="34" stroke="#B9B0B6" stroke-width="4" stroke-linecap="round"/>'
				+ '<text x="50" y="92" font-size="13" font-family="sans-serif" fill="#B9B0B6" text-anchor="middle" opacity="0.9">?</text>';
	}
}
function eyeColors(pal) {
	const ink = pal.ink, E = (pal && pal.eye) || {};
	// 写轮眼的红**不能由抽色接管**:佐助这套画面 accent = #242D74(蓝紫),按旧规则会被画成"蓝轮眼"。
	// 只有色相本来就在红 family(≤45° 或 ≥335°)才敢借画面的红;否则回落到经典瞳红。
	// tuned 里的 eye.red / eye.ink 永远优先(眼 = 人物设定)。
	const h = hueOf(ink.accent), s = satOf(ink.accent);
	const redFamily = (h <= 45 || h >= 335);
	const red = E.red || (redFamily && s > 0.18
		? rgb2hex(hsl2rgb(h, clamp(s, 0.42, 0.90), 0.44)) : "#8E1B22");
	return {
		red,
		ink: E.ink || "#120E10",
		ink2: rgba(E.ink || "#160F12", 0.80),
		iris: mix(ink.accent2 || ink.accent, ink.ground, 0.30),
		pale: E.pale || "#EDE7F2",
		vein: "#B9A8C6",
		rim: "#8E7F9A",
		pupil: "#6E5F78",
		// 器物/纸类图案专用(飞雷神苦无是钢 + 白纸札,小南的纸是冷白),
		// 同样允许 tuned 点名:同一把苦无在水门的青底和扉间的钢底上该有不同的钢色。
		steel: E.steel || "#C9CED8",
		steelDark: E.steelDark || "#767F8D",
		tag: E.tag || "#EDE6D6",
		paper: E.paper || "#F3F0F6",
		paper2: E.paper2 || "#E3DFEA",
		fold: E.fold || "#C2BCD1",
	};
}
function eyeSvg(pal) {
	const p = normalizePalette(pal);
	const C = eyeColors(p);
	return svgWrap(eyeInner(p.eye.kind, C), {
		hi: shift(p.ink.glow || p.ink.accent, 0.18, 0),
		mid: p.ink.ground,
		lo: tint(p.ink.ground, clamp(satOf(p.ink.ground) + 0.10, 0.10, 0.55), 0.05),
	});
}
function eyeUri(pal) {
	return "data:image/svg+xml," + encodeURIComponent(eyeSvg(pal)).replace(/'/g, "%27");
}
// 面板/兜底用的小图:同样的绘制,只是指定"先按这套配色画个未知眼"
const PLACEHOLDER_EYE_URI = null; // 真正的占位在 apply 里按当前调色生成
