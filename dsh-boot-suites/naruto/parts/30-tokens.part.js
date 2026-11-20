// =============================================================
// 30-tokens · 从一套画面的调色推导 89 个 --dsw-* token
//
// 为什么是"推导"而不是"每套画面手写 89 行":16 套 x 89 x 深浅两态 = 2848 个值,
// 人只能审"这个红对不对",审不动这种基数。人只定 5 个锚点色 + 几个不透明度旋钮,
// 其余按规则展开;**规则本身逐条命名**(TOKEN_RULES),自测断言 89 个名字全覆盖 ——
// 宿主哪天加了新 token,这里会显式报缺,不会静默漏色。
//
// ⚠ 2026-11-13 按产物考古结论定的两条硬规矩(_scratch/boot-suite-probe/msg-containers.md):
//   1) bg-base / bg-layer-* / sidebar-fill **一律实色**。考古实测 --dsw-alias-bg-base 是画布,
//      composer 的 sticky 遮挡渐变、compactionButton、ReasoningRow 的 sticky 头都吃它;
//      把它调成半透明会连带弄掉那些遮挡层。画面不再靠"把界面调透"露出来 ——
//      改成直接画在会话区容器上当背景(见 60-boot),所以这里没有 app/panel 旋钮了。
//   2) 只有"要盖在画面上、里面要有字"的面才留不透明度旋钮:
//      bubble(用户气泡 + steering 回显) / input(输入框卡片,附件卡共用) /
//      code(代码块) / menu(浮层族)。这几个的 alpha 就是需求 5 的手感旋钮。
//   3) 助手正文框在产物里**没有任何 background 声明、也没有 token**,不在本表能覆盖的范围,
//      由 60-boot 用 [data-chat-flow-kind] / [data-slot] 写 CSS 补 —— 别以为改 token 就够了。
//   4) --dsw-specific-bubble-highlight 考古结论是"定义了但全仓 0 处消费",改它无效;
//      这里照旧给值(不亏),但别把它当可读性的依赖。
// =============================================================

const TOKEN_RULES = {
	// —— 应用底 / 各级浮层(实色,画布) ——
	"bg-base": "base",
	"bg-layer-1": "layer1", "bg-layer-2": "layer2", "bg-layer-3": "layer3",
	"bg-overlay": "overlay", "bg-skeleton": "skeleton",
	"bg-module-platform": "modulePlatform", "bg-multi-select": "multiSelect",
	// —— 遮罩:盖在内容上的黑,不随角色变色调,只随模式变深浅 ——
	"bg-mask-1": "mask1", "bg-mask-2": "mask2", "bg-mask-3": "mask3",
	"bg-mask-drop": "maskDrop", "bg-mask-photo": "maskPhoto",
	// —— 品牌色 / 按钮 ——
	"brand-primary": "brand", "brand-primary-invert": "brandInvert",
	"brand-primary-new-colorprimary-new-color": "brand2", "brand-text": "brandText",
	"button-primary-fill": "brand", "button-primary-hover": "brandHi", "button-primary-dimmed": "brandDim",
	"button-contrast-fill": "contrast", "button-elevated-fill": "elevated",
	"button-floating-fill": "floating", "button-floating-hover": "floatingHi",
	"button-ghost-active-fill": "ghostActiveFill", "button-ghost-active-border": "ghostActiveBorder",
	"button-ghost-active-hover": "ghostActiveHover",
	"button-info-fill": "info", "button-info-hover": "infoHi",
	"button-tool-bar-fill": "toolBar", "button-tool-bar-fill-invisible": "toolBarInv",
	"button-tool-bar-hover": "toolBarHi",
	// —— 文字层级 ——
	"label-primary": "label1", "label-primary-bluish": "label1Blue",
	"label-primary-dimmed": "label2", "label-secondary": "label2", "label-tertiary": "label3",
	"label-caption": "caption", "label-dimmed": "dimmed",
	"label-primary-foreground": "onBrand", "label-primary-inverted": "inverted",
	// —— 交互底 ——
	"interactive-bg-hover": "hover", "interactive-bg-active": "active",
	"interactive-bg-hover-accent": "hoverAccent", "interactive-bg-hover-danger": "hoverDanger",
	"interactive-bg-hover-solid": "hoverSolid",
	// —— 描边 ——
	"border-l1": "line1", "border-l2": "line2", "border-l3": "line3", "border-l4": "line4",
	"border-l2-darkmode-thin": "lineThin", "border-inverted": "borderInverted", "border-inverted2": "borderInverted2",
	// —— 滚动条 ——
	"scrollbar-bg-l1": "sb1", "scrollbar-bg-l2": "sb2",
	"scrollbar-hover-l1": "sbH1", "scrollbar-hover-l2": "sbH2",
	// —— 状态色:不跟角色走。红是红、绿是绿,否则报错看起来像主题的一部分 ——
	"state-business-primary": "biz", "state-business-tertiary": "biz3",
	"state-error-primary": "err", "state-error-secondary": "err2",
	"state-success-primary": "ok", "state-success-secondary": "ok2", "state-success-tertiary": "ok3",
	"state-warn-label": "warnLabel", "state-warn-primary": "warn",
	"state-warn-secondary": "warn2", "state-warn-tertiary": "warn3",
	// —— 浮层 ——
	"toast-bg": "toast", "tooltip-bg": "tooltip", "tip": "tip",
	"menu": "menu", "selector": "selector", "login-input": "loginInput",
	// —— 需求 5 的正主 ——
	"bubble": "bubble", "bubble-highlight": "bubbleHi", "input-major": "input",
	// —— 侧栏 ——
	"sidebar-fill": "sidebar", "sidebar-nav-item-hover": "sbHover",
	"sidebar-nav-item-active": "sbActive", "sidebar-nav-item-active-accent": "sbActiveAccent",
	// —— Markdown ——
	"markdown-code-block": "code", "markdown-code-block-banner": "codeBanner",
	"markdown-code-segment-selected": "codeSegSel", "markdown-code-segment-unselected": "codeSegUnsel",
	"markdown-inline-code": "inlineCode", "markdown-citation": "citation",
	"markdown-placeholder": "placeholder", "markdown-tag": "tag",
};

// 主强调色的取色优先级:画面近单色时(抽色会给出一个几乎黑的 accent)往后退一档,
// 而不是硬把那个灰当品牌色用 —— hashirama / itachi 两套就是这种情况。
function brandSource(ink) {
	const order = [ink.accent, ink.glow, ink.accent2, ink.neutral];
	for (const c of order) if (c && satOf(c) >= 0.18) return c;
	// 一个有彩度的都没有:从 ground 借色相顶一个出来,并且让调用方看得见这件事
	return shift(ink.ground, 0.10, 0.34);
}

function primitives(ink, glass, mode) {
	const dark = mode === "dark";
	const hg = hueOf(ink.ground), sa = satOf(ink.ground);
	// 表面里色相"渗染"的上限 0.30:再高整屏发假,插画的气质反而被冲掉
	const s = clamp(sa * 0.55, 0.06, 0.30);
	const bSrc = brandSource(ink);
	const bHue = hueOf(bSrc), bSat = clamp(satOf(bSrc), 0.34, 0.86);
	const brand = dark ? rgb2hex(hsl2rgb(bHue, bSat, 0.58)) : rgb2hex(hsl2rgb(bHue, clamp(bSat, 0.42, 0.92), 0.42));
	const a2Src = ink.accent2 && satOf(ink.accent2) >= 0.16 ? ink.accent2 : (ink.glow || bSrc);
	const brand2 = dark
		? rgb2hex(hsl2rgb(hueOf(a2Src), clamp(satOf(a2Src), 0.26, 0.74), 0.64))
		: rgb2hex(hsl2rgb(hueOf(a2Src), clamp(satOf(a2Src), 0.38, 0.86), 0.36));

	// 实色系的"同族色阶":深浅各一条,底 -> 一层 -> 二层 -> 三层 -> 浮层
	const hueForSurf = dark ? hg : hueOf(bSrc);
	const ramp = (l) => rgb2hex(hsl2rgb(hueForSurf, dark ? s : clamp(s * 0.7, 0.04, 0.16), l));
	const surf = dark
		? { base: ramp(0.062), l1: ramp(0.094), l2: ramp(0.126), l3: ramp(0.168), ov: ramp(0.205), sk: ramp(0.115) }
		: { base: ramp(0.975), l1: ramp(0.996), l2: ramp(0.982), l3: ramp(0.950), ov: ramp(0.997), sk: ramp(0.930) };

	const label1 = dark ? tint(ink.glow || bSrc, 0.08, 0.955) : tint(ink.ground, 0.26, 0.155);
	const label2 = dark ? tint(bSrc, 0.10, 0.795) : tint(ink.ground, 0.20, 0.36);
	const label3 = dark ? tint(bSrc, 0.10, 0.645) : tint(ink.ground, 0.16, 0.50);
	const caption = dark ? tint(bSrc, 0.10, 0.555) : tint(ink.ground, 0.14, 0.585);
	const dimmed = dark ? tint(bSrc, 0.08, 0.47) : tint(ink.ground, 0.10, 0.66);
	// 需要"实底"的字面:气泡 / 输入框 / 代码块 / 浮层,不透明度由 glass 旋钮给
	const surfBubble = dark ? rgb2hex(hsl2rgb(hg, s * 1.05, 0.115)) : "#FFFFFF";
	const surfBubbleHi = dark ? rgb2hex(hsl2rgb(hg, s * 0.9, 0.155)) : "#FFFFFF";
	const surfInput = dark ? rgb2hex(hsl2rgb(hg, s * 1.1, 0.095)) : "#FFFFFF";
	const surfCode = dark ? rgb2hex(hsl2rgb(hg, s * 0.8, 0.045)) : "#F4F1EF";
	const surfMenu = dark ? rgb2hex(hsl2rgb(hg, s * 1.1, 0.135)) : "#FFFFFF";
	const surfTip = dark ? rgb2hex(hsl2rgb(hg, s, 0.18)) : "#FFFDFC";

	// —— 滚动条滑块极性 ——
	// 不能只看主题开关 `dark`。宿主里凡是设了 `scrollbar-width:thin` 的元素,Chromium **忽略伪元素**,
	// 50-css 那块轨道底在那儿不生效,滑块是直接压在开机画面上的。永夜这套 ground 亮度实测 0.074,
	// 浅色主题下按老写法就是「黑滑块压黑画」—— 抬 alpha 也救不了,极性本身就选错了。
	// 规则:**画面极暗(ground 亮度 < 0.20)就强制白滑块**,其余情况跟主题模式走。
	// 阈值敢这么定是因为:白滑块压在中灰轨道底上一样看得见,所以这条不会把"有底块"的那批搞坏。
	// 通则:凡是**没有自己底板**的令牌(滚动条、发丝边、无底板文字),极性都得跟画面亮度商量。
	const sbLum = (h) => {
		const m = /^#?([0-9a-f]{6})$/i.exec(String((h || "")).trim());
		if (!m) return 0.5;
		return parseInt(m[1].slice(0, 2), 16) / 255 * 0.2126 + parseInt(m[1].slice(2, 4), 16) / 255 * 0.7152 + parseInt(m[1].slice(4, 6), 16) / 255 * 0.0722;
	};
	const sbPol = sbLum(ink.ground) < 0.20 ? "#FFFFFF" : (dark ? "#FFFFFF" : "#000000");

	const P = {
		base: surf.base, layer1: surf.l1, layer2: surf.l2, layer3: surf.l3,
		overlay: surf.ov, skeleton: surf.sk,
		modulePlatform: dark ? "#0C0909" : "#FFFFFF",
		multiSelect: rgba(brand, dark ? 0.22 : 0.16),

		mask1: rgba("#000000", dark ? 0.55 : 0.30), mask2: rgba("#000000", dark ? 0.28 : 0.16),
		mask3: rgba("#000000", dark ? 0.62 : 0.44), maskDrop: dark ? rgba("#241C20", 0.72) : rgba("#FFFFFF", 0.78),
		maskPhoto: rgba("#000000", dark ? 0.62 : 0.50),

		brand, brandHi: shift(brand, dark ? 0.07 : -0.06), brandDim: rgba(brand, 0.52),
		brandInvert: dark ? tint(brand, 0.30, 0.12) : "#FFFFFF",
		brand2, brandText: dark ? shift(brand, 0.10, 0) : shift(brand, -0.04, 0),
		contrast: dark ? "#F4EFEF" : "#171214",
		elevated: rgba(surf.l3, glass.menu), floating: rgba(surf.l3, glass.menu),
		floatingHi: rgba(ramp(dark ? 0.28 : 0.999), glass.menu),
		ghostActiveFill: rgba(brand, dark ? 0.18 : 0.12),
		ghostActiveBorder: rgba(brand, dark ? 0.42 : 0.34),
		ghostActiveHover: rgba(brand, dark ? 0.26 : 0.18),
		info: dark ? "#3E6C93" : "#2F5D86", infoHi: dark ? "#4B7FA8" : "#37699A",
		toolBar: rgba(surf.l2, glass.menu), toolBarInv: "transparent",
		toolBarHi: rgba(brand, dark ? 0.20 : 0.14),

		label1, label2, label3, caption, dimmed,
		label1Blue: dark ? mix(label1, "#9CC2E8", 0.30) : mix(label1, "#2C4F74", 0.30),
		onBrand: onColor(brand),
		inverted: dark ? "#15110F" : "#FAF6F3",

		hover: rgba(dark ? "#FFFFFF" : "#000000", dark ? 0.07 : 0.05),
		active: rgba(brand, dark ? 0.22 : 0.16),
		hoverAccent: rgba(brand, dark ? 0.15 : 0.11),
		hoverDanger: rgba("#D34A4A", 0.16),
		hoverSolid: brand,

		line1: rgba(dark ? "#FFFFFF" : "#000000", dark ? 0.09 : 0.07),
		line2: rgba(dark ? "#FFFFFF" : "#000000", dark ? 0.14 : 0.11),
		line3: rgba(dark ? "#FFFFFF" : "#000000", dark ? 0.22 : 0.17),
		line4: rgba(dark ? "#FFFFFF" : "#000000", dark ? 0.32 : 0.26),
		lineThin: rgba("#FFFFFF", 0.10),
		borderInverted: dark ? "#12100F" : "#FFFFFF",
		borderInverted2: dark ? "#2A2426" : "#F0ECEA",

		// 滚动条静止态。极性与阈值的推导在 `const P = {` 之前(sbPol),这里只消费。
		// 厚度与 50-css 那块轨道底配套;hover 才吃品牌色 —— 瞬时状态讲和谐,常驻状态讲对比。
		sb1: rgba(sbPol, dark ? 0.26 : 0.30), sb2: rgba(sbPol, dark ? 0.34 : 0.38),
		sbH1: rgba(brand, 0.70), sbH2: rgba(brand, 0.85),

		biz: "#E0A63C", biz3: rgba("#E0A63C", 0.20),
		err: "#D9534F", err2: rgba("#D9534F", 0.30),
		ok: "#35A76B", ok2: rgba("#35A76B", 0.30), ok3: rgba("#35A76B", 0.16),
		warn: "#E0A63C", warn2: rgba("#E0A63C", 0.30), warn3: rgba("#E0A63C", 0.16),
		warnLabel: dark ? "#F0C777" : "#8A5A0B",

		toast: rgba(surfMenu, glass.menu), tooltip: dark ? rgba("#120E10", 0.97) : rgba("#241C20", 0.95),
		tip: rgba(surfTip, glass.menu), menu: rgba(surfMenu, glass.menu),
		selector: rgba(dark ? rgb2hex(hsl2rgb(hg, s, 0.185)) : "#FFFFFF", glass.menu),
		loginInput: rgba(dark ? rgb2hex(hsl2rgb(hg, s, 0.11)) : "#FFFFFF", glass.input),

		// —— 需求 5:这几个面永远比周边更实,下限锁 0.86,调旋钮也调不出"糊字"来 ——
		bubble: rgba(surfBubble, Math.max(glass.bubble, 0.86)),
		bubbleHi: rgba(surfBubbleHi, Math.max(glass.bubble, 0.86)),
		input: rgba(surfInput, Math.max(glass.input, 0.88)),
		code: rgba(surfCode, Math.max(glass.code, 0.88)),
		sidebar: dark ? rgb2hex(hsl2rgb(hg, s * 1.15, 0.075)) : rgb2hex(hsl2rgb(hueOf(bSrc), 0.24, 0.955)),
		sbHover: rgba(dark ? "#FFFFFF" : "#000000", dark ? 0.07 : 0.05),
		sbActive: rgba(brand, dark ? 0.22 : 0.14),
		sbActiveAccent: rgba(brand, dark ? 0.34 : 0.22),

		codeBanner: rgba(dark ? rgb2hex(hsl2rgb(hg, s * 0.8, 0.085)) : "#EAE5E2", Math.max(glass.code, 0.88)),
		codeSegSel: rgba(brand, 0.28), codeSegUnsel: rgba(dark ? "#FFFFFF" : "#000000", dark ? 0.06 : 0.04),
		inlineCode: rgba(brand, dark ? 0.18 : 0.12),
		citation: rgba(brand2, dark ? 0.22 : 0.16),
		placeholder: dark ? rgba(label3, 0.55) : rgba(label3, 0.60),
		tag: rgba(brand, dark ? 0.16 : 0.10),
	};

	// 文字层统一按所在底校一遍对比度:配色再好看,字糊了就是不合格
	const onBase = surf.base;
	P.label1 = legible(P.label1, onBase, dark ? 8.5 : 8.0);
	P.label2 = legible(P.label2, onBase, 5.2);
	P.label3 = legible(P.label3, onBase, 3.6);
	P.brand = legible(P.brand, onBase, 3.0);
	// 顺序要紧:onBrand 必须在 brand 被 legible 改过**之后**再算,
	// 否则按钮底色动了、字色还配着旧底 -> 主按钮上的字对比度掉到 2.x(自测抓到过)
	P.onBrand = onColor(P.brand);
	return P;
}

// 一套画面的完整 token 覆盖表:{ "--dsw-alias-xxx": { light, dark } }
function tokensFor(palette) {
	const pal = normalizePalette(palette);
	// —— 11-14 用户截图:界面底部一条横贯的 #F6F7F8 近白带(接缝在画面 74.8% 高、中段比两端高 40px 的枕形顶边) ——
	// 病根不在画,在**两套值都发给宿主、由宿主自己的 light/dark 开关挑**:
	// 宿主处于 light 模式时画布吃 ramp(0.975)≈#F6F7F8、输入框吃 #FFFFFF,而卡片 CSS 永远跟着暗画走
	// => 「暗卡片 + 白画布」混在一屏,底栏顶边就露成一条白带。
	// 规矩:**预设声明的 mode 说了算**,同一套值同时填进 light 与 dark 两个槽(这套包本来就是"画 + 主题"一体)。
	// 逃生舱:预设写 "mode":"auto" 才恢复老的两套随宿主开关(注意 normalizePalette 会把 mode 夹成 light|dark,
	// 所以这里读的是**原始 palette.mode**,不是归一化后的 pal.mode)。
	const declared = String((palette && palette.mode) || "dark").toLowerCase();
	const pair = declared === "auto";
	const want = primitives(pal.ink, pal.glass, declared === "light" ? "light" : "dark");
	const light = pair ? primitives(pal.ink, pal.glass, "light") : want;
	const dark = pair ? primitives(pal.ink, pal.glass, "dark") : want;
	const out = {};
	let missed = 0;
	for (const name of TOKEN_NAMES || []) {
		const key = String(name).replace(/^--dsw-(?:alias|specific)-/, "");
		const rule = TOKEN_RULES[key];
		if (!rule || !light.hasOwnProperty(rule) || !dark.hasOwnProperty(rule)) {
			// 宿主加了新 token 而这里没写规则:给个中性值顶上并**记账**,不静默
			if (rule) diagWarn("token-rule-dangling", key + " -> " + String(rule));
			out[name] = { light: light.layer2, dark: dark.layer2 };
			missed++;
			continue;
		}
		out[name] = { light: light[rule], dark: dark[rule] };
	}
	if (missed) diagWarn("tokens-uncovered", missed + " 个 token 没有规则,用面板底色顶上");
	if (brandSource(pal.ink) === shift(pal.ink.ground, 0.10, 0.34) || satOf(pal.ink.accent) < 0.18) {
		diagWarn("accent-weak", pal.preset + " 这套画面抽不出有彩度的强调色,主色从 ground 借的 —— 该写 tuned 了");
	}
	// 人工逃生舱:规则算出来就是不对的那个 token,允许在调色文件里点名改
	if (pal.tokens && Object.keys(pal.tokens).length) {
		for (const k of Object.keys(pal.tokens)) {
			const v = pal.tokens[k];
			out[k] = (v && typeof v === "object" && ("light" in v || "dark" in v))
				? { light: v.light, dark: v.dark }
				: { light: v, dark: v };
		}
	}
	return out;
}

// 调色补齐:auto 层可能缺 glow/accent2,tuned 层可能只写了一两个字段
function normalizePalette(p) {
	const src = p && typeof p === "object" ? p : {};
	const ink = Object.assign({}, FALLBACK_PALETTE.ink, src.ink || {});
	for (const k of Object.keys(FALLBACK_PALETTE.ink)) {
		if (!/^#[0-9a-fA-F]{6}$/.test(String(ink[k] || ""))) ink[k] = FALLBACK_PALETTE.ink[k];
	}
	const glass = Object.assign({}, FALLBACK_PALETTE.glass, src.glass || {});
	for (const k of Object.keys(FALLBACK_PALETTE.glass)) {
		const v = Number(glass[k]);
		glass[k] = Number.isFinite(v) ? clamp01(v) : FALLBACK_PALETTE.glass[k];
	}
	const art = Object.assign({}, FALLBACK_PALETTE.art, src.art || {});
	art.opacity = clamp(Number(art.opacity) || FALLBACK_PALETTE.art.opacity, 0, 1);
	art.dim = clamp(Number(art.dim) || 0, 0, 0.85);
	art.saturate = clamp(Number(art.saturate) || 1, 0.4, 1.8);
	// 纱太薄 = 字糊(真机翻过一次),所以最高只让到 0.98;veil:0 是**合法的**"画面就是主角"
	// (别写成 Number(x) || 0.7 —— 那样 0 会被当假值顶回默认,这类坑踩过)
	art.veil = Number.isFinite(Number(art.veil)) ? clamp(Number(art.veil), 0, 0.98) : 0.70;
	// 文本框厚度:下限 0.30 —— 再薄就等于没框,字又会糊回画上(那已经是上一轮的事了)
	const card = Object.assign({}, FALLBACK_PALETTE.card, src.card || {});
	const thick = (v, d) => { const n = Number(v); return Number.isFinite(n) ? clamp(n, 0.30, 1) : d; };
	card.a = thick(card.a, 0.94); card.b = thick(card.b, 0.90); card.quiet = thick(card.quiet, 0.76);
	const hero = Object.assign({}, FALLBACK_PALETTE.hero, src.hero || {});
	const eye = Object.assign({}, FALLBACK_PALETTE.eye, src.eye || {});
	if (!EYE_KINDS[eye.kind]) { diagWarn("eye-kind-unknown", String(eye.kind) + " -> unknown"); eye.kind = "unknown"; }
	return {
		preset: src.preset || "?", title: src.title || src.preset || "?",
		ink, glass, art, card, hero, eye, mode: src.mode === "light" ? "light" : "dark", tokens: src.tokens || {},
	};
}
