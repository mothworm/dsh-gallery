// =============================================================
// 20-color · 颜色工具
// 全整数/浮点运算,无随机、无外部依赖 —— 同一份调色永远算出同一组 token,
// 这样"第 7 个色不对"这类反馈才可复现(布图案禁 Math.random 是同一条纪律)。
// =============================================================

function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function clamp01(x) { return clamp(x, 0, 1); }

function hex2rgb(h) {
	const s = String(h || "").trim().replace(/^#/, "");
	if (!/^[0-9a-fA-F]{6}$/.test(s) && !/^[0-9a-fA-F]{3}$/.test(s)) return [128, 128, 128];
	const f = s.length === 3 ? s[0] + s[0] + s[1] + s[1] + s[2] + s[2] : s;
	return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
}
function rgb2hex(rgb) {
	return "#" + rgb.map((c) => ("0" + clamp(Math.round(c), 0, 255).toString(16)).slice(-2)).join("").toUpperCase();
}

// HSL: h 0..360,s/l 0..1
function rgb2hsl(rgb) {
	const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
	const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
	let h = 0;
	const l = (mx + mn) / 2;
	const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
	if (d !== 0) {
		if (mx === r) h = 60 * (((g - b) / d) % 6);
		else if (mx === g) h = 60 * ((b - r) / d + 2);
		else h = 60 * ((r - g) / d + 4);
		if (h < 0) h += 360;
	}
	return [h, s, l];
}
function hsl2rgb(h, s, l) {
	h = ((h % 360) + 360) % 360; s = clamp01(s); l = clamp01(l);
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;
	const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
		: h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
	return [(t[0] + m) * 255, (t[1] + m) * 255, (t[2] + m) * 255];
}

function H(hex) { return rgb2hsl(hex2rgb(hex)); }
// 从某个色取色相,重配饱和度/亮度:整套"同族色阶"都由它生成,保证不换角色气质
function tint(hex, s, l) { const h = H(hex); return rgb2hex(hsl2rgb(h[0], s, l)); }
function shift(hex, dl, ds) { const h = H(hex); return rgb2hex(hsl2rgb(h[0], clamp01(h[1] + (ds || 0)), clamp01(h[2] + dl))); }
function satOf(hex) { return H(hex)[1]; }
function hueOf(hex) { return H(hex)[0]; }

function rgba(hex, a) {
	const c = hex2rgb(hex);
	return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (Math.round(clamp01(a) * 1000) / 1000) + ")";
}
// 把 rgba()/rgb()/#hex 里的不透明度读出来 —— 自测要靠它验"气泡有没有保住实底"
function alphaOf(cssColor) {
	const s = String(cssColor || "");
	const m = s.match(/rgba?\([^)]*,\s*([\d.]+)\s*\)/);
	if (m) return Number(m[1]);
	return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) || /^rgb\(/.test(s) ? 1 : Number.NaN;
}
function mix(a, b, t) {
	const x = hex2rgb(a), y = hex2rgb(b);
	return rgb2hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

// WCAG 相对亮度与对比度:配色"好不好看"只能人眼定,但"文字糊不糊"可以先用数字筛掉一批。
function relLum(hex) {
	const c = hex2rgb(hex).map((v) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(fg, bg) {
	const a = relLum(fg), b = relLum(bg);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
// 在 bg 上把 fg 朝"更亮"方向顶到对比度达标;顶到极值仍不达标就回纯白(至少不会更糟)
function legible(fg, bg, min) {
	let out = fg;
	for (let i = 0; i < 24 && contrast(out, bg) < (min || 4.5); i++) out = shift(out, 0.035, 0);
	if (contrast(out, bg) < (min || 4.5)) {
		out = fg;
		for (let i = 0; i < 24 && contrast(out, bg) < (min || 4.5); i++) out = shift(out, -0.035, 0);
	}
	return contrast(out, bg) >= (min || 4.5) ? out : (relLum(bg) > 0.4 ? "#141013" : "#F7F3F5");
}
// 前景自动选深/浅:按钮底色定了,字色就不能再拍脑袋。
// ⚠ 别用"亮度 > 某阈值"来判 —— 中间调(相对亮度 0.2~0.5,比如 L=0.58 的青)两条路都不达标,
// 自测就是这么抓到 2.2:1 的。正确做法是把两个候选都算一遍,取对比度高的那个。
function onColor(bg) {
	const light = tint(bg, 0.05, 0.985);
	const dark = tint(bg, 0.32, 0.085);
	const prefer = contrast(light, bg) >= contrast(dark, bg) ? light : dark;
	if (contrast(prefer, bg) >= 4.5) return prefer;
	// 还是不够(底色太"中间"):推到极值,宁可难看也要读得清
	const black = "#0B0908", white = "#FFFFFF";
	return contrast(white, bg) >= contrast(black, bg) ? white : black;
}
