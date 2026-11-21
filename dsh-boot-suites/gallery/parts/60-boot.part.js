// =============================================================
// 60-boot · 与开屏插件 v5 契约的**唯一**接触点 + 动态样式
//
// 硬约束(交接单关键决策 3):新主题只通过 window.__dshBootGallery 取画面,
// 绝不自己拼 /dsh-boot-gallery/arts/... 那条路径 —— 猜路径等于把两个插件又绑死。
// 清单里每个文件条目自带 url(presetEntry 里拼好的、带 ?v= 的),
// 所以"用哪张图"我说了算,"这张图在哪个 URL"永远是开屏插件说了算。
//
// 动态样式的两条产物考古结论(2026-11-13,见 _scratch/boot-suite-probe/msg-containers.md):
//   · 画面直接画在会话区容器 [data-conversation-content] 上 —— 那层在产物里没有任何背景声明,
//     所以画面可以开到近不透明,同时界面画布 bg-base 保持实色(bg-base 被 composer 的
//     sticky 渐变和 sticky 折叠头共用,调透会连带弄坏遮挡层)。
//   · 助手正文框**没有 token 可用**,必须写 CSS 规则,选 zero-hash 的语义属性选择器。
//   · 两者都在 data/surfaces.json 里;宿主升级把选择器换了,只改那个文件。
// =============================================================

function bootApi() { return (typeof window !== "undefined" && window.__dshBootGallery) || null; }

// 契约版本闸门:低于 5 就没有 manifest()/thumbUrl(),只能退回"占位眼 + 说明条"
const NEED_API = 5;
// 等多久算"没有开屏插件"。自测把它调小,免得为了验一条降级等 8 秒。
let API_WAIT_MS = 8000;
let apiWaitUntil = 0;
function whenApi(then) {
	const a = bootApi();
	if (a) {
		if (typeof a.manifest !== "function" || typeof a.thumbUrl !== "function" || Number(a.version) < NEED_API) {
			diagWarn("boot-api-too-old", "version=" + String(a.version) + " 需要 >=" + NEED_API);
			return;
		}
		DIAG.apiVersion = Number(a.version);
		then(a);
		return;
	}
	// 两个插件谁先 apply 没保证,所以给一段等待窗口;到点还没有就**明说**
	if (!apiWaitUntil) apiWaitUntil = Date.now() + API_WAIT_MS;
	if (Date.now() > apiWaitUntil) {
		diagWarn("boot-api-missing", "没等到 window.__dshBootGallery,只能画占位眼");
		render(STATE.with({ art: null, preset: null, why: "no-boot-api" }));
		return;
	}
	setTimeout(() => whenApi(then), 250);
}

// 资源包里可以放一个**不是主题**的共享素材目录 `arts/ui/`(11-19 时放五遁配饰底框)。
// ⚠ 它**不会**带 files:目录里没有 preset.json,宿主在 index.js:221-222 就 ok:false 返回了
//   (以前这行注释写的是"靠 presetEntry 天然带 files[].url",那是**错的**)。
// 11-21 二次改向之后**没有代码再读它了**:配饰换成磨砂玻璃,不依赖任何位图;
//   保留这层过滤是因为 ① 老资源包里那个目录还在,摘掉它选单才不会被它污染;
//   ② 将来资源包要支持"整包导入"时,这里就是识别共享素材目录的入口。它仍留在 st.ui 上。
const UI_ID = "ui";
function stateFromManifest(api, m) {
	const all = (m && Array.isArray(m.presets)) ? m.presets.filter((p) => p && typeof p.id === "string") : [];
	const list = all.filter((p) => p.id !== UI_ID);
	const ui = all.find((p) => p.id === UI_ID) || null;
	const selected = (m && m.selected) || null;
	const item = list.find((p) => p.id === selected) || null;
	return {
		list, selected, manual: !!(m && m.manual), ui,
		preset: item ? item.id : null,
		title: item ? (item.title || item.id) : null,
		art: item ? artOf(api, item) : null,
		why: !list.length ? "empty-manifest" : (item && item.ok ? null : "preset-not-usable"),
	};
}

// 这套画面用哪张图当背景:
//   1) 调色文件点名了 hero.file 且清单里确有这个文件 -> 用它(人算过构图,首选)
//   2) 否则用契约给的缩略图(清单第一张图),至少不是破图
//   3) 都没有 -> null,render() 画"看得见的灰底"
function artOf(api, item) {
	const files = Array.isArray(item.files) ? item.files : [];
	const pal = PALETTES && PALETTES[item.id];
	const want = pal && pal.hero && pal.hero.file ? String(pal.hero.file).toLowerCase() : null;
	const hit = want ? files.find((f) => f && String(f.name).toLowerCase() === want) : null;
	if (hit && hit.url) return { url: cleanUrl(hit.url), pos: (pal.hero.pos || "center"), src: "hero", file: want };
	const uri = safeCall(() => api.thumbUrl(item));
	if (uri) return { url: cleanUrl(uri), pos: "center", src: "thumbUrl", file: null };
	const any = files.find((f) => f && /\.(jpe?g|png|webp)$/i.test(String(f.name || "")) && f.url);
	if (any) return { url: cleanUrl(any.url), pos: "center", src: "first-file", file: any.name };
	return null;
}
// URL 是从清单里拿的,不该有引号/括号;真出现也不能让它把 CSS 截断
function cleanUrl(u) { return String(u).replace(/["')\s]/g, ""); }

function safeCall(fn) { try { return fn(); } catch (e) { diagWarn("boot-api-threw", e && e.message); return null; } }

// 当前生效那套画面的调色;清单里没有 = 新加的开机画面还没配色,给灰底占位并**记账**
function paletteFor(presetId) {
	const p = PALETTES && PALETTES[presetId];
	if (p) return normalizePalette(p);
	if (presetId) diagWarn("palette-missing", "这套画面还没有调色: " + presetId);
	return normalizePalette(null);
}

// 运行时定下来的"画面该画在谁身上":命中的选择器,或 null(退回兜底浮层)
let ART_TARGET = null;
function artTargets() { return (SURFACES && Array.isArray(SURFACES.conversation) && SURFACES.conversation) || []; }
function resolveArtTarget() {
	let hit = null;
	for (const sel of artTargets()) {
		let n = null;
		try { n = document.querySelector(sel); } catch (e) { continue; }
		if (n && typeof n.getBoundingClientRect === "function") {
			const r = n.getBoundingClientRect();
			if (r.width > 240 && r.height > 200) { hit = sel; break; }
		}
	}
	if (ART_TARGET !== hit) {
		if (!hit && artTargets().length) diagWarn("art-target-missing", "会话区选择器一个都没命中,画面退回兜底浮层(会被正文压住)");
		ART_TARGET = hit;
		DIAG.surface = hit || "fallback-layer";
		return true;   // 变了 -> 调用方要重算样式
	}
	DIAG.surface = hit || "fallback-layer";
	return false;
}

// ---- 画面四层叠法(2026-11-14 真机反馈后重排) ----
// 从上往下(第一条 background-image 盖在最上,但**永远在正文之下**):
//   1) veil 底色纱  2) wash 冲淡  3) scrim 暗罩  4) url 画面
// 真机踩的坑:只铺画面时,正文底下什么都没有,字直接压在插画亮暗块上 -> 深浅主题都糊。
// veil 用 color-mix 吃 **宿主自己的 --dsw-alias-bg-base token**,所以它不需要知道当前是深色还是
// 浅色:token 在浅色态是米白、深色态是墨黑,纱就自动跟着换。硬编码一个颜色的做法已被否掉。
function veilLayer(pct) {
	const c = "color-mix(in srgb,var(--dsw-alias-bg-base) " + pct + "%,transparent)";
	return "linear-gradient(" + c + "," + c + ")";
}
function artLayers(pal, st) {
	const ink = pal.ink, A = pal.art;
	const wa = clamp01(1 - A.opacity);
	const washCol = rgba(tint(ink.ground, clamp(satOf(ink.ground) + 0.08, 0.10, 0.46), 0.05), wa);
	const d = A.dim;
	const scrimCol = tint(ink.ground, clamp(satOf(ink.ground) + 0.10, 0.12, 0.50), 0.028);
	const scrim = "linear-gradient(100deg," + rgba(scrimCol, d) + " 0%," + rgba(scrimCol, d * 0.45) + " 46%," + rgba("#000000", d * 0.30) + " 100%)";
	const img = [];
	if (A.veil > 0) img.push(veilLayer(Math.round(A.veil * 100)));
	img.push("linear-gradient(" + washCol + "," + washCol + ")", scrim, 'url("' + st.art.url + '")');
	const n = img.length;
	return {
		images: img.join(","),
		sizes: new Array(n).fill("cover").join(","),
		positions: new Array(n - 1).fill("center").join(",") + "," + (st.art.pos || "center"),
	};
}

function dynCss(pal, st, target) {
	// 第三个参数只为自测存在:传 null 就能在**不碰模块状态**的情况下验兜底分支
	const TGT = target === undefined ? ART_TARGET : target;
	const ink = pal.ink, g = pal.glass;
	const brand = rgb2hex(hsl2rgb(hueOf(brandSource(ink)), clamp(satOf(brandSource(ink)), 0.34, 0.86), 0.58));
	const out = [":root{--bs-brand:", brand, ";",
		// 文本框厚度三档(助手/用户/次要),由当前画面的 tuned 给;静态 CSS 只吃这三个变量
		"--bs-card-a:", Math.round(pal.card.a * 100) + "%;",
		"--bs-card-b:", Math.round(pal.card.b * 100) + "%;",
		"--bs-card-q:", Math.round(pal.card.quiet * 100) + "%;}",
		"#", NS, "-ball{background:", rgba(tint(ink.ground, 0.5, 0.10), 0.94), "}"];

	if (st && st.art && st.art.url) {
		const L = artLayers(pal, st);
		if (TGT) {
			out.push(TGT, "{background-image:", L.images, ";background-size:", L.sizes,
				";background-position:", L.positions, ";background-repeat:no-repeat;}");
			out.push("#", NS, "-bg,#", NS, "-scrim{display:none}");     // 有正经落点就别挂浮层(旧主题糊字就是这么来的)
		} else {
			// 兜底:宿主结构变了、找不到会话区容器 —— 用旧的固定浮层,但**压在正文下面**并说明
			out.push("#", NS, "-bg{display:block;opacity:", String(pal.art.opacity), ";",
				"background-image:url(\"", st.art.url, "\");background-size:cover;background-position:",
				(st.art.pos || "center"), ";filter:saturate(", String(pal.art.saturate), ");}",
				"#", NS, "-scrim{display:block;background:linear-gradient(100deg,",
				rgba(tint(ink.ground, 1, 0.03), pal.art.dim), ",", rgba("#000000", pal.art.dim * 0.3), ")}");
		}
	} else {
		out.push("#", NS, "-bg{display:block;opacity:1;filter:none;background:none;",
			"background-image:linear-gradient(160deg,", rgba(tint(ink.ground, 0.25, 0.10), 0.96), ",",
			rgba("#0D0B0C", 0.96), ");}",
			"#", NS, "-scrim{display:none}");
	}

	// —— 助手正文的底**不在这里**了 ——
	// 上一版在这里拼了一个 rgba(硬编码深色面, 0.9x) 的 `>` 规则:① 选择器真机 0 命中;
	// ② 颜色不分深浅,浅色主题会直接变成"深字压深底"。文本框整体移到 parts/50 的静态 CSS,
	// 吃 var(--dsw-*) token + 上面三个 --bs-card-* 变量,这里只负责把旋钮值算出来。
	// 面板/说明条里的字**算出来**,不再靠 opacity:.72 蒙 —— 真机点名"选图的字、滑块的字、
	// 重播按钮的字看不清"。legible() 对当前面板底保证 ≥4.5,次要文字也单独保证 ≥4.5,
	// 深浅与画面都跟着走(浅色画面的浅面板底自动把字压深,不会出现白字白底)。
	const panelInk = tint(ink.ground, 0.55, 0.115);
	const chipInk = tint(ink.ground, 1, 0.085);
	const FG = legible(tint(ink.glow || ink.accent, 0.18, 0.95), panelInk);
	const FG_DIM = legible(tint(ink.glow || ink.accent, 0.16, 0.82), panelInk);
	out.push("#", NS, "-panel{background:", rgba(panelInk, g.menu), ";--bs-fg:", FG, ";--bs-fg-dim:", FG_DIM,
		";--bs-btn-bg:", rgba(tint(panelInk, 0.32, 0.215), 1), ";--bs-btn-bd:", rgba(tint(panelInk, 0.26, 0.36), 1), "}",
		"#", NS, "-chip{background:", rgba(chipInk, 0.94), ";color:", legible(FG, chipInk), "}");
	return out.join("");
}
