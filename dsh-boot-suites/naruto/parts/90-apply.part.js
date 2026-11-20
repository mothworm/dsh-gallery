// =============================================================
// 90-apply · 入口与对外把手
// =============================================================

function apply(ctx) {
	if (typeof document === "undefined" || typeof window === "undefined") return;

	if (ctx && typeof ctx.inject === "function") {
		ctx.inject(["theme"], (tk) => {
			tkTheme = tk && tk.theme ? tk.theme : null;
			if (!tkTheme) diagWarn("no-theme-service", "ctx.theme 不在,token 覆盖这条路没了");
			// token 覆盖要在每次 apply 重跑(宿主可能重建了主题服务),所以在这里补一次 render
			render(STATE.st);
		});
	} else {
		diagWarn("no-inject", "拿不到 ctx.inject,只能上 CSS");
	}

	mountLayers();
	const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
	if (mq && mq.matches && el.ball) el.ball.classList.add("no-spin");
	refresh();

	// 调试把手:真机上不用改代码就能问"你到底拿到了什么"
	window.__dshBootSuite = {
		version: 1,
		diag: () => JSON.parse(JSON.stringify(DIAG)),
		refresh: () => refresh(),
		presets: () => Object.keys(PALETTES || {}).sort(),
		current: () => ({ preset: STATE.st.preset, title: STATE.st.title, art: STATE.st.art, why: STATE.st.why }),
		palette: (id) => (PALETTES && PALETTES[id]) ? PALETTES[id] : null,
		tokens: (id) => tokensFor(paletteFor(id || STATE.st.preset)),
		css: () => cssTag().textContent,
	};
}

// 自测入口:假 DOM 里直接调纯函数,不必真开浏览器
exports.apply = apply;
exports.__test = {
	NS, PKG, DIAG, TOKEN_RULES, TOKEN_NAMES, PALETTES, FALLBACK_PALETTE,
	hex2rgb, rgb2hex, rgb2hsl, hsl2rgb, rgba, alphaOf, satOf, hueOf, mix, tint, shift, relLum, contrast, legible, onColor, brandSource,
	primitives, tokensFor, normalizePalette, paletteFor,
	eyeSvg, eyeUri, eyeColors, EYE_KINDS,
	shellCss, dynCss, chipText, stateFromManifest, artOf, artLayers,
	probeCards, SURFACES, CARD_SEL, KIND_SEL,
	el, cardKey, cardJson, cardStore, resetCard, applyCardVars, VAR_OF,
	setApiWait: (ms) => { API_WAIT_MS = Number(ms) || 0; apiWaitUntil = 0; },
	get artTarget() { return ART_TARGET; },
	STATE,
};
return module.exports;
