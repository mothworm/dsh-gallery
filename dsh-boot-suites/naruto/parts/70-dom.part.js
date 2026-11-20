// =============================================================
// 70-dom · 挂载:背景层 / 悬浮球 / 选图面板 / 说明条
// 面板格数是**清单长度 + 1(自动那格)**,没有任何写死的数字。
// =============================================================

const STATE = {
	st: { pal: normalizePalette(null), art: null, preset: null, title: null, list: [], ui: null, manual: false, why: "not-mounted" },
	with(patch) { return Object.assign({}, this.st, patch); },
};
let el = {};          // 这几个节点缓存住,别每次 querySelector
let tkTheme = null;   // ctx.inject(["theme"]) 给的句柄
let panelOpen = false;
// 构建戳:探针日志和「点配饰按钮」那条日志**共用这一个常量**。写成两处字面量的话,
// 总有一天只改了一处 —— 那时日志一半说 b1931、一半说 b2011,而两边都"看起来像新代码在跑"。
const BUILD_STAMP = "b2011";
let PENDING;          // 刚点过、等清单回读出同一个 id 才算真生效
let chipHold = 0, chipTimer = null;

function mk(tag, id, cls) {
	const n = document.createElement(tag);
	if (id) n.id = id;
	if (cls) n.className = cls;
	return n;
}
function cssTag() {
	const sel = "style[data-plugin-css=" + JSON.stringify(PKG + "/style") + "]";
	let s = document.head.querySelector(sel);
	if (!s) {
		s = document.createElement("style");
		s.dataset.plugin = PKG;
		s.dataset.pluginCss = PKG + "/style";
		document.head.appendChild(s);
	}
	return s;
}

// 兜底浮层才需要对齐聊天区左边界(正常路径是把画面画在会话区容器上,天然就在里面)。
function alignFallback() {
	if (!el.bg || ART_TARGET) return;
	let left = 0;
	for (const sel of artTargets()) {
		let n = null;
		try { n = document.querySelector(sel); } catch (e) { continue; }
		if (n && typeof n.getBoundingClientRect === "function") {
			const r = n.getBoundingClientRect();
			if (r.width > 240) { left = Math.round(r.left); break; }
		}
	}
	el.bg.style.left = left + "px";
	if (el.scrim) el.scrim.style.left = left + "px";
}

function render(st) {
	STATE.st = st;
	const pal = st.pal;
	resolveArtTarget();
	cssTag().textContent = shellCss + dynCss(pal, st);
	// tuned/滑块的值最后盖一层内联变量:localStorage 里的这图专属档 > tuned 文件档
	applyCardVars(pal);
	// token 覆盖 = 需求 4/5 的主执行路径(周边透出画面,气泡与输入框保住实底)
	if (tkTheme && typeof tkTheme.overrideTokens === "function") {
		try { tkTheme.overrideTokens(PKG, tokensFor(pal)); DIAG.paletteHit = st.preset || null; }
		catch (e) { diagWarn("overrideTokens-threw", e && e.message); }
	} else if (tkTheme) {
		diagWarn("theme-api-shape", "ctx.theme.overrideTokens 不可用,只能靠 CSS 兜底");
	}
	// 球心:苦无系优先用**官方苦无图**(用户 11-14:手绘 SVG「不太还原」,核实属实),拿不到再回退手绘。
	// 为什么走 <img src> 而不是在 SVG 里塞 <image href>:eyeUri() 是 data:image/svg+xml 的 data URI,
	// **被当作图片文档加载的 SVG 出于安全不能再引用外部资源**,href 指哪都不会出图。
	// URL 从哪来:/arts/<预设>/<文件> 是 boot-naruto 的清单查表路由(ART_MIME 收 .jpg/.jpeg/.png/.webp),
	// 所以把当前画面 URL 的文件名换掉就行 —— **图只住图库,一行都不烘进代码**(规矩见 dsh-naruto-pack\SHARE.md)。
	// 只装代码包的人没有图库 -> onerror 回退手绘 SVG:不报错、不空球。所以手绘那套**不许删**。
	if (el.ballImg) {
		// 球心图的文件名从 `eye.photo` 来(神驹斑的永恒万花筒就是靠它换的),没写就沿用苦无那套约定。
		const want = String(pal.eye.photo || (pal.eye.kind === "kunai" ? "kunai.png" : "")).trim();
		const photo = (want && st.art && st.art.url) ? String(st.art.url).replace(/[^/]*$/, want) : null;
		if (photo) {
			el.ballImg.onerror = function () { el.ballImg.onerror = null; el.ballImg.src = eyeUri(pal); DIAG.ballPhoto = "fallback"; };
			el.ballImg.src = photo;
			DIAG.ballPhoto = "photo";
		} else {
			el.ballImg.onerror = null;
			el.ballImg.src = eyeUri(pal);
			DIAG.ballPhoto = "drawn";
		}
	}
	// 眼睛转 = 瞳术在转;**器物转 = 在甩飞刀**。苦无/纸蝶停转(球还是能拖、能点开面板)。
	// 11-16 补第三条:**照片一律不许转**。-spin 是 26s 作用在 ball>img 上(50-css:67),手绘纹章转着看
	// 是设计(万花筒本来就该转),但**一张眼睛照片转起来就是"歪"** —— 用户点名的恰好是这两套:
	// 团藏(sharingan,杏仁眼自带倾角)与兄弟之战(mangekyou6,佐助那枚图案不对称)。
	// 卡卡西/神驹斑没被投诉,是因为它们的图案旋转对称、转了看不出来 —— 那是巧合不是设计,
	// 所以这里按"是不是照片"划界,而不是按种类赌哪张照片经得起转。
	if (el.ball) el.ball.classList.toggle("no-spin", pal.eye.kind === "kunai" || pal.eye.kind === "paper" || !!pal.eye.photo);
	if (el.ball) el.ball.title = (st.title || "未取到画面") + " · " + (EYE_KINDS[pal.eye.kind] || pal.eye.kind);
	alignFallback();
	paintPanel();
	probeCards();
	paintChip();
}

function chipText(st) {
	if (!st.art) {
		if (st.why === "no-boot-api") return "没接到开屏插件(v5)· 只能画占位眼";
		if (st.why === "empty-manifest") return "开屏插件里一个预设都没有";
		if (st.why === "selection-not-applied") return "点了但没写进去(看 boot.log)";
		return "这套画面取不到图:" + String(st.why || "unknown");
	}
	const untuned = !PALETTES || !PALETTES[st.preset];
	// 文本框没命中 = 字会直接压在画上,这事必须摆在脸上(上一轮就是这么糊的,而且悄无声息)
	const noCard = DIAG.cardBoxy === 0 ? " · 文本框未生效!" : "";
	return (st.title || st.preset || "?") + " · " + (EYE_KINDS[st.pal.eye.kind] || "") + (untuned ? " · 未配色" : "") + noCard;
}
// 数两件事:**命中几个**、以及**其中几个真生成盒子**。
// 只数命中是不够的 —— [data-slot] 锚点带 display:contents,命中了也画不出底(2026-11-14 真机定案)。
function probeCards() {
	const sel = (SURFACES && SURFACES.card) || '[data-chat-flow-kind] > [data-slot="conversation.chat.node"] > div';
	let n = -1, boxy = 0;
	try {
		const list = document.querySelectorAll(sel);
		n = list.length;
		for (let i = 0; i < n; i++) {
			let d = "unknown";
			try { d = getComputedStyle(list[i]).display } catch (e) {}
			if (d !== "contents" && d !== "none") boxy++;
		}
	} catch (e) { n = -1; }
	DIAG.cardCount = n; DIAG.cardBoxy = boxy;
	if (n === 0) diagWarn("card-target-missing", "一个都没匹配上:" + sel + " —— 文字会直接压在画面上");
	else if (n > 0 && boxy === 0) diagWarn("card-no-box", "命中 " + n + " 个但全是 display:contents/none,底色画不出来:落点要往下一层");
	else if (n < 0) diagWarn("card-target-probe-threw", sel);
	if (el.hit) paintHit();
	return boxy;
}
function paintChip() {
	if (!el.chip) return;
	const st = STATE.st;
	const degraded = !st.art || DIAG.cardBoxy === 0;
	el.chip.textContent = chipText(st);
	el.chip.style.display = (degraded || chipHold > 0) ? "block" : "none";
	el.chip.style.opacity = degraded ? "1" : String(Math.min(1, chipHold / 1.2));
	if (el.ball) {
		const r = el.ball.getBoundingClientRect();
		el.chip.style.left = Math.max(6, Math.round(r.left - 40)) + "px";
		el.chip.style.top = Math.round(r.top - 26) + "px";
	}
}
function showChip(sec) {
	chipHold = sec || 2.6;
	paintChip();
	if (chipTimer) clearTimeout(chipTimer);
	chipTimer = setTimeout(() => { chipTimer = null; chipHold = 0; paintChip(); }, chipHold * 1000);
}

// ---- 面板 ----
function paintPanel() {
	if (!el.grid) return;
	const st = STATE.st;
	const api = bootApi();
	while (el.grid.firstChild) el.grid.removeChild(el.grid.firstChild);

	// 「自动」永远第一格:usePreset(null) = 不固定,跟随最新一套
	const auto = mk("div", null, "cell" + (!st.manual && st.preset ? " sel" : ""));
	auto.style.backgroundImage = "none";
	auto.style.backgroundColor = "rgba(255,255,255,.07)";
	const alab = mk("div", null, "lab");
	alab.textContent = "自动" + (!st.manual ? " ·当前" : "");
	auto.appendChild(alab);
	auto.addEventListener("click", () => choose(null));
	el.grid.appendChild(auto);

	for (const item of st.list) {
		const cell = mk("div", null, "cell" + (item.id === st.preset ? " sel" : "") + (item.ok ? "" : " bad"));
		const uri = item.ok ? safeCall(() => api && api.thumbUrl(item)) : "";
		if (uri) cell.style.backgroundImage = "url(\"" + uri + "\")";
		const lab = mk("div", null, "lab");
		lab.textContent = item.ok ? String(item.title || item.id) : "坏:" + String(item.error || item.id).slice(0, 12);
		cell.appendChild(lab);
		if (item.ok) cell.addEventListener("click", () => choose(item.id));
		el.grid.appendChild(cell);
	}
	if (el.hd) el.hd.textContent = "开机画面 · 共 " + st.list.length + " 套" + (st.manual ? " · 已固定" : " · 自动跟随");
	if (el.note) el.note.textContent = "主题已立刻切换 · 开机画面下次启动生效";
	paintTune();
}

function choose(id) {
	const api = bootApi();
	if (!api || typeof api.usePreset !== "function") { diagWarn("usePreset-missing"); showChip(3); return; }
	const r = safeCall(() => api.usePreset(id, false));
	if (!r || typeof r.then !== "function") { diagWarn("usePreset-no-promise"); return; }
	r.then((res) => {
		if (!res || res.ok === false) { diagWarn("usePreset-rejected", JSON.stringify(res).slice(0, 140)); showChip(4); return; }
		PENDING = id;
		refresh();
		showChip(2.6);
	}).catch((e) => diagWarn("usePreset-threw", e && e.message));
}
function playNow() {
	const api = bootApi();
	if (!api || typeof api.usePreset !== "function") { diagWarn("usePreset-missing"); return; }
	safeCall(() => api.usePreset(STATE.st.preset, true));
	showChip(1.6);
}

// ---- 刷新:向契约要一次清单 ----
function refresh() {
	whenApi((api) => {
		const p = safeCall(() => api.manifest());
		if (!p || typeof p.then !== "function") {
			diagWarn("manifest-no-promise");
			render(STATE.with({ pal: paletteFor(STATE.st.preset), art: null, why: "manifest-fail" }));
			return;
		}
		p.then((m) => {
			DIAG.lastManifestAt = Date.now();
			const st = stateFromManifest(api, m);
			DIAG.presetCount = st.list.length;
			// 点过但 selection.json 回读不出同一个 id(写盘失败/门禁拦了)—— 标出来,不假装成功
			if (PENDING !== undefined) {
				if (st.selected === PENDING || (PENDING === null && !st.manual)) PENDING = undefined;
				else st.why = st.why || "selection-not-applied";
			}
			st.pal = paletteFor(st.preset);
			render(st);
			if (st.why) showChip(4);
		}).catch((e) => {
			diagWarn("manifest-rejected", e && e.message);
			render(STATE.with({ pal: paletteFor(STATE.st.preset), art: null, why: "manifest-reject" }));
		});
	});
}

// ---- 悬浮球:指针事件一套同时管鼠标与触摸 ----
const POS_KEY = NS + "-pos";
function loadPos() {
	try {
		const raw = window.localStorage.getItem(POS_KEY);
		if (!raw) return null;
		const p = JSON.parse(raw);
		return (Number.isFinite(p.x) && Number.isFinite(p.y)) ? p : null;
	} catch (e) { return null; }
}
function savePos(p) { try { window.localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch (e) {} }

function mountBall() {
	const ball = mk("div", NS + "-ball");
	const img = mk("img");
	img.alt = "";
	ball.appendChild(img);
	document.body.appendChild(ball);
	el.ball = ball; el.ballImg = img;

	const saved = loadPos();
	let x = saved ? saved.x : (window.innerWidth || 1200) - 74 - 22;
	let y = saved ? saved.y : (window.innerHeight || 800) - 74 - 110;
	const put = () => {
		const W = window.innerWidth || 1200, H = window.innerHeight || 800;
		x = clamp(x, 4, Math.max(4, W - 78)); y = clamp(y, 4, Math.max(4, H - 78));
		ball.style.left = Math.round(x) + "px"; ball.style.top = Math.round(y) + "px";
		ball.style.right = "auto"; ball.style.bottom = "auto";
		placePanel();
		paintChip();
	};
	put();

	let down = null;
	ball.addEventListener("pointerdown", (e) => {
		down = { x: e.clientX, y: e.clientY, bx: x, by: y, moved: false };
		ball.classList.add("dragging");
		try { ball.setPointerCapture(e.pointerId); } catch (err) {}
		if (e.preventDefault) e.preventDefault();
	});
	ball.addEventListener("pointermove", (e) => {
		if (!down) return;
		const dx = e.clientX - down.x, dy = e.clientY - down.y;
		if (Math.abs(dx) + Math.abs(dy) > 4) down.moved = true;
		x = down.bx + dx; y = down.by + dy;
		put();
	});
	const up = (e) => {
		if (!down) return;
		const moved = down.moved;
		down = null;
		ball.classList.remove("dragging");
		if (moved) savePos({ x, y });
		else togglePanel();
		if (e && e.pointerId !== undefined) { try { ball.releasePointerCapture(e.pointerId); } catch (err) {} }
	};
	ball.addEventListener("pointerup", up);
	ball.addEventListener("pointercancel", up);
	window.addEventListener("resize", () => { put(); render(STATE.st); });
}

// ---- 卡片调参:界面上的真滑块 ----
// 为什么是刚需而不是调试小工具:图片因版权被 gitignore、或插件上市场给别人用时,**没有 tuned 文件可改**。
// 存 localStorage 按 preset 分别记(每张画该有不同的厚度,这正是这一轮的真结论)。
const CARD_KEY = NS + "-card";
const VAR_OF = { a: "--bs-card-a", b: "--bs-card-b", q: "--bs-card-q" };
function cardStore() {
	try { const v = JSON.parse(window.localStorage.getItem(CARD_KEY) || "{}"); return v && typeof v === "object" ? v : {} } catch (e) { return {} }
}
function cardSave(m) {
	try { window.localStorage.setItem(CARD_KEY, JSON.stringify(m)) } catch (e) { diagWarn("card-store-failed", e && e.message) }
}
function cardKey() { return (STATE.st && STATE.st.preset) || "_auto" }
let cardTimer = null, cardDraft = null;
// 内联写在 <html> 上 —— 和宿主写 token 同一招,压过 dynCss 的 :root 规则,所以拖动是**立刻**见效
function applyCardVars(pal) {
	const d = { a: Math.round(pal.card.a * 100), b: Math.round(pal.card.b * 100), q: Math.round(pal.card.quiet * 100) };
	const o = cardStore()[cardKey()];
	if (o && typeof o === "object") for (const k in VAR_OF) {
		const n = Number(o[k]);
		if (Number.isFinite(n)) d[k] = clamp(n, 30, 100);
	}
	// 防抖还没落盘的手上值优先 —— 否则拖滑块途中被一次后台 render() 重置回 tuned 档,
	// 用户会觉得"滑块自己弹回去、拧不动"(自测抓到过,真机上更隐蔽:三拍 render 就发生在 60/300/1200ms)
	if (cardDraft) for (const k in VAR_OF) if (Number.isFinite(Number(cardDraft[k]))) d[k] = clamp(Number(cardDraft[k]), 30, 100);
	for (const k in VAR_OF) document.documentElement.style.setProperty(VAR_OF[k], d[k] + "%");
	applyDecoVars(pal);   // 配饰颜色吃同一份 palette,所以搭这趟车,不另找渲染时机
	el.curCard = d;
	return d;
}
function cardCommit() {
	if (cardTimer) clearTimeout(cardTimer);
	cardDraft = Object.assign({}, el.curCard);   // 快照:定时器回调晚 450ms,那时 curCard 可能已被改
	const mine = cardDraft;
	cardTimer = setTimeout(() => {
		cardTimer = null;
		if (cardDraft === mine) cardDraft = null;   // 草稿已落盘,交出优先权
		const m = cardStore(); m[cardKey()] = mine; cardSave(m);
	}, 450);
}
// ---- 配饰:六档 无 / 土遁 / 火遁 / 雷遁 / 水遁 / 风遁(用户 11-19 点名重构)----
// 旧四档(叶纹/风车/叶纹+风车/白绝)整条删掉:用户判定"去掉当前配饰",无配饰版留在开源侧即可。
// 「无」= 纯 CSS 文本框(零素材);五遁 = 位图底框,**代码里一个字节素材都不许有** —— URI 只能从
// boot-naruto 清单的 files[].url 解析(见 60-boot 开头硬约束),真文件在私有资源包 arts/ui/ 里。
// 底框是**整图缩放 + 只留外环**(丙,用户 11-19 看过甲/乙/丙对照样张后选定):
// 成品 PNG 中央烤成透明,整张按 `background-size:100% 100%` 贴满卡片 ⇒ 中央仍是那块吃滑块的 CSS 填充层,
// 所以"点开悬浮球拖滑块改透明度"只改文字底、底框纹丝不动(这条语义从九宫时代继承下来,没变)。
// `in` 的历史:11-19~11-20 上午这里每档还带一个硬编码的纵向内缩像素值(横向再 +10),也就是"底图 720 宽再缩到
// 卡片时,横竖都白内缩同样的几十 px"。11-20 换成按**比例**算(见上面 FRAME_INSET),单位从 px 变成 %,
// 所以档位表里只剩 file;那个字段整个删掉了 —— 留着它迟早有人以为它还在生效。
// 配饰颜色现在不吃 palette(位图底框自带颜色),但 applyDecoVars(pal) 的调用点(L316 render)照旧,
// 所以这个变量留着当"最后一次见过的 palette"占位 —— 删了它,那行赋值就是 ReferenceError。
let decoPal = null;
const DECO_KEY = NS + "-deco";
// 底框成品的**环带几何**(成品画布 720x260 的像素,横,纵)。**唯一来源是生成器**:
// `dsh-naruto-pack\tools\build-frames.py --ring 44,14 --feather 26,10 --aniso`(用户 11-20 定 C 档)。
// 这里只抄它的输出,不许自己另调一套 —— 抄错了净空就会算错(而那种错在真机上是"首行被角素压住",
// 看起来像审美问题,不像算错)。配套对照表(probe-clear.py 出的五遁最坏值,x=10% 一档):纵需让到 8.9%。
const FRAME_W = 720, FRAME_H = 260;
const FRAME_RING = [44, 14];      // 保留外环厚 横/纵
const FRAME_FEATHER = [26, 10];   // 内侧羽化 横/纵
// 卡片内缩 = **比例**内缩(画布% == 卡片%),因为整图按 `background-size:100% 100%` 拉伸 ⇒ 底图上的
// 一个百分比落到卡片上还是同一个百分比。11-20 之前这里是硬编码 26/36 px:矮卡(120)上 26px 等于
// 22% 纵向、高卡(230)上只等于 11% —— 同一套数字在三种卡高上净空不同,这就是用户点名的
// 「矮卡纵向被压扁」的第二个成因(第一个是环带本身用了 min(到四边距离),已由 --aniso 治掉)。
//
// ⚠ **比例的分子分母必须同一量纲**。第一版写的是 (ring+feather)/FRAME_W 对**两轴**都除 720,
// 结果是 ins_x=9.72% / ins_y=3.69% —— 纵向只有横向的 38%,自测当场抓到 `纵向小于横向`。
// 纵轴的 24px 是 24/260,不是 24/720。改这里之前先想清楚"这一维的 100% 到底是谁"。
const FRAME_INSET = {
	x: (FRAME_RING[0] + FRAME_FEATHER[0]) / FRAME_W * 1.15,   // 70/720 = 9.72% -> 11.18%
	y: (FRAME_RING[1] + FRAME_FEATHER[1]) / FRAME_H * 1.15,   // 24/260 = 9.23% -> 10.61%
};
// 卡片宽度**不写常数**:产品里量 node.getBoundingClientRect().width(下面 applyDecoVars),
// 所以窗口拖窄、宿主改宽都自动跟上。这一行曾经留了个 `FRAME_CARD_W = 420` 的"参考宽",
// 结果产品里根本没人用它 —— 那只会让人以为内缩按 420 写死。
const DECO_MODES = {
	none: { file: null },
	doton: { file: "frame-doton.png" },
	katon: { file: "frame-katon.png" },
	raton: { file: "frame-raton.png" },
	suiton: { file: "frame-suiton.png" },
	futon: { file: "frame-futon.png" },
};
// 面板按钮的顺序 = 用户给的顺序,别自己排
const DECO_LABELS = [["none", "无"], ["doton", "土遁"], ["katon", "火遁"], ["raton", "雷遁"], ["suiton", "水遁"], ["futon", "风遁"]];
function decoGet() {
	// 旧存档(both / leaf / windmill / shuriken / zetsu)一律降级成 none:
	// 不许因为改了档位就崩,也不许画出半只旧纹样。
	try { const v = window.localStorage.getItem(DECO_KEY); return DECO_MODES[v] ? v : "none"; } catch (e) { return "none"; }
}
// 底框在哪:首选清单条目 st.ui 的 files[].url(自带 ?v=,缓存最理想)。
// **但 `arts/ui/` 里没有 preset.json,宿主会在这里直接返回 ok:false / files:[]**
// (dsh-boot-naruto\lib\index.js:221-222 `if (!manReal) { e.error='缺 preset.json'; return e }`,
//  那段"目录全扫填 files"的代码在它**后面**,永远轮不到) ⇒ 只信清单的话,真机上底框永远是 frame=0。
// 兜底:自己拼 `<前缀>/arts/ui/<文件>`。这条路由不要求目录是主题(index.js:372-400 只做
// safeSeg + readdir 真名匹配 + ART_MIME),所以对**最新和稍早的宿主都成立**;前缀不硬编码,
// 从宿主自己给出的某个 arts URL 里切出来 —— 路由换了名照样跟得上。
function artsPrefix() {
	// st 的形状是 {list:[宿主原样条目…], ui:条目|null, selected, …}:URL 在 **list 的数组元素**上,
	// 不在 st 的直接属性上(第一版在这里栽过:`for (const k in st)` 一个 .url 都找不到,等于没兜底)。
	const st = STATE.st || {};
	const cand = Array.isArray(st.list) ? st.list.slice() : [];
	if (st.ui) cand.push(st.ui);
	for (const it of cand) {
		const u = it && typeof it.url === "string" ? it.url : "";
		const i = u.indexOf("/arts/");
		if (i > 0) return u.slice(0, i);
	}
	return null;
}
function frameUrl(file) {
	const ui = STATE.st && STATE.st.ui;
	const fs = (ui && Array.isArray(ui.files)) ? ui.files : [];
	const hit = fs.find((f) => f && String(f.name).toLowerCase() === file && f.url);
	if (hit) return cleanUrl(hit.url);
	// 兜底拼路径有个**必须成立的前提**:`arts/ui/` 这个目录真的存在。
	// 它的同步探针就是 `ui` 条目本身 —— 宿主对"没有 preset.json 的目录"仍会列一条 ok:false 的条目
	// (真清单实测:ui 存在、error='缺 preset.json'、files=[]),而目录根本不存在时 st.ui 是 null。
	// 少了这道判断,没放资源包的机器会拿到一个 404 的背景图(CSS 背景图的 404 **不报错、不留痕迹**),
	// 而 data-bs-frame 已经挂上 ⇒ 文字白内缩 26/36px 却看不见框 —— 比"退化成无"更难看。
	if (!ui) return null;
	const p = artsPrefix();
	return p ? cleanUrl(p + "/arts/ui/" + file) : null;
}
// 卡片 padding 是**宿主的**,我们不拥有它、也不许猜一个数:第一次要内缩时实测一份基线
// (那时候 data-bs-frame 还没挂上,我们的规则不匹配,量到的就是宿主原值),之后按 `基线 + in` 写。
// 量不到(还没有卡片)就**只画框、不内缩**并留诊断 —— 宁可首行被角素压一下,也不改坏没激活底框的卡片。
let padBase = null;
function ensurePadBaseline() {
	if (padBase) return padBase;
	let node = null;
	try { node = document.querySelector(CARD_SEL); } catch (e) { node = null; }
	if (!node) return null;
	try {
		const cs = window.getComputedStyle(node);
		padBase = {
			t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0,
			b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0,
		};
	} catch (e) { padBase = null; }
	return padBase;
}
function applyDecoVars(pal) {
	if (pal) decoPal = pal;
	const mode = decoGet();
	const m = DECO_MODES[mode] || DECO_MODES.none;
	const uri = m.file ? frameUrl(m.file) : null;
	if (m.file && !uri) diagWarn("frame-missing", m.file + " 不在 arts/ui/ 清单里,这档退回无配饰");
	const root = document.documentElement;
	root.style.setProperty("--bs-frame-src", uri ? 'url("' + uri + '")' : "none");
	// 注意:data-bs-frame **只管文字内缩**那条规则(见 50-css)。底框画不画由 --bs-frame-src 决定,
	// 所以摘掉这个属性不会让框消失,只会让文字回到宿主要的那份 padding ⇒ "没激活底框时一个样式都没变"靠它兜底。
	root.removeAttribute("data-bs-frame");
	if (uri) {
		const b = ensurePadBaseline();
		// 比例内缩要换算成 px,就得知道卡片有多宽 —— 宽是宿主的(常见 420,也可能被用户拖窄)。
		// 量不到(还没有卡片 / 宽为 0)就**不内缩**并留诊断,与"量不到基线"同一原则:
		// 宁可首行被角素压一下,也不拿一个猜出来的百分比去改坏所有卡片。
		let cw = 0;
		try {
			const node = document.querySelector(CARD_SEL);
			if (node) cw = node.getBoundingClientRect().width || 0;
		} catch (e) { cw = 0; }
		if (b && cw > 0) {
			// 夹具/真机都可能量到一个极窄的宽度;夹到 [240, 900] 免得算出荒谬的内缩(窄卡宁可按 240 算,宽卡按 900 封顶)
			const cwUse = Math.min(900, Math.max(240, cw));
			const ex = Math.round(cwUse * FRAME_INSET.x);   // 横向:按卡宽折算
			const ey = Math.round(cwUse * FRAME_INSET.y);   // 纵向:同一把尺子(画布% == 卡片%,所以也按卡宽折算)
			root.style.setProperty("--bs-frame-pt", (b.t + ey) + "px");
			root.style.setProperty("--bs-frame-pr", (b.r + ex) + "px");
			root.style.setProperty("--bs-frame-pb", (b.b + ey) + "px");
			root.style.setProperty("--bs-frame-pl", (b.l + ex) + "px");
			root.setAttribute("data-bs-frame", mode);
			lastFrameInset = { x: ex, y: ey, cw: Math.round(cw) };
		} else if (!b) {
			diagWarn("frame-pad-skipped", "量不到卡片基线 padding,这档不内缩(首行可能被角素压住)");
		} else {
			diagWarn("frame-width-skipped", "量不到卡片宽度(为 0),这档按比例内缩算不出来 ⇒ 不内缩");
		}
	}
	if (el.decoBtns) for (const k in el.decoBtns) el.decoBtns[k].setAttribute("aria-pressed", k === mode ? "true" : "false");
}
// 上一次真正写进 CSS 的内缩(px)。给探针用:**它是"用户点了一下之后确实生效了吗"的直接证据**,
// 而不是"我读了一遍源码里写着 26"。
let lastFrameInset = null;
function setDeco(k) {
	if (!DECO_MODES[k]) return;
	try { window.localStorage.setItem(DECO_KEY, k); } catch (e) { diagWarn("deco-store-failed", e && e.message); }
	lastFrameInset = null;
	applyDecoVars(null);
	// 11-20 补证据:交接单里「真机验收 `deco=<遁> frame=1` 至今没有」的根因是 **点按钮这条路径一行日志都不打**
	// (只有 panelOpen 时的 contrastProbe 会打,而那时用户已经点完了)。这里补一条**点完立刻发**的记录,
	// 和探针那条同一套字段(deco/frame),另加 inx/iny(实际写进 CSS 的 px 内缩)与 cw(量到的卡宽)。
	// 落盘规则是"只写标量"(宿主 lib/index.js:663),所以这里全部是标量,数组会被静默丢掉。
	try {
		const uri = (DECO_MODES[k] || DECO_MODES.none).file ? frameUrl(DECO_MODES[k].file) : null;
		const ins = lastFrameInset;
		fetch("/dsh-boot-naruto/report", {
			method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				deco: k, frame: uri ? 1 : 0, b: BUILD_STAMP,
				inx: ins ? ins.x : -1, iny: ins ? ins.y : -1, cw: ins ? ins.cw : 0,
			}),
		}).catch(() => {});
	} catch (e) {}
}

function cardJson() {
	const c = el.curCard || { a: 94, b: 90, q: 76 };
	return '{\n  "card": { "a": ' + c.a / 100 + ', "b": ' + c.b / 100 + ', "quiet": ' + c.q / 100 + ' }\n}';
}
function onSlide(k) {
	const s = el.sliders && el.sliders[k]; if (!s || !el.curCard) return;
	const n = clamp(Number(s.inp.value) || 0, 30, 100);
	el.curCard[k] = n; s.out.textContent = n + "%";
	document.documentElement.style.setProperty(VAR_OF[k], n + "%");
	if (el.cardJson) el.cardJson.value = cardJson();
	paintHit();
	cardCommit();
}
function resetCard() {
	if (cardTimer) clearTimeout(cardTimer);
	cardTimer = null; cardDraft = null;      // 复位要连**没落盘的草稿**一起清,否则 450ms 后又把旧值写回来
	const m = cardStore(); delete m[cardKey()]; cardSave(m);
	const pal = STATE.st && STATE.st.pal;
	if (pal) applyCardVars(pal);
	paintTune(); paintHit(); showChip(1.6);
}
// 命中数 + **盒子数**:两个都要,因为 display:contents 的锚点"命中了却生不成盒子",
// 上一版就是栽在这里(选择器完全正确,视觉效果为零,而且一声不响)。
function paintTune() {
	const c = el.curCard; if (!c || !el.sliders) return;
	for (const k in VAR_OF) { const s = el.sliders[k]; if (!s) continue; s.inp.value = String(c[k]); s.out.textContent = c[k] + "%" }
	if (el.cardJson) el.cardJson.value = cardJson();
}
function paintHit() {
	if (!el.hit) return;
	const bad = !DIAG.cardBoxy;
	el.hit.textContent = bad
		? "文本框没生效:命中 " + DIAG.cardCount + " 个、其中真盒子 " + DIAG.cardBoxy + " 个"
		: "文本框生效:" + DIAG.cardBoxy + " 条消息有底";
	el.hit.classList.toggle("bad", bad);
}
function panelEl() {
	if (el.panel) return el.panel;
	const p = mk("div", NS + "-panel");
	el.hd = mk("div", null, "hd"); p.appendChild(el.hd);
	el.grid = mk("div", null, "grid"); p.appendChild(el.grid);
	// —— 调参区:三根滑块 + 生效读数 + 可复制的 tuned 片段 ——
	const tune = mk("div", null, "tune");
	const tt = mk("div", null, "t"); tt.textContent = "文字底框厚度 · 按这张图记住";
	tune.appendChild(tt);
	el.sliders = {};
	[["a", "正文"], ["b", "下端"], ["q", "次要"]].forEach((pair) => {
		const k = pair[0];
		const row = mk("label");
		const cap = mk("i"); cap.textContent = pair[1];
		const inp = mk("input"); inp.type = "range"; inp.min = "30"; inp.max = "100"; inp.step = "1";
		const out = mk("b");
		inp.addEventListener("input", () => onSlide(k));
		row.appendChild(cap); row.appendChild(inp); row.appendChild(out);
		tune.appendChild(row);
		el.sliders[k] = { inp: inp, out: out };
	});
	// —— 配饰档位:必须能在界面上关(纹样是"喜欢才留"的东西,不能硬编码强塞给用户)——
	const drow = mk("div", null, "row");
	const dcap = mk("i"); dcap.textContent = "配饰";
	drow.appendChild(dcap);
	el.decoBtns = {};
	DECO_LABELS.forEach((pr) => {   // 六档:无 / 土遁 / 火遁 / 雷遁 / 水遁 / 风遁(顺序就是用户给的顺序)
		const b = mk("button"); b.type = "button"; b.textContent = pr[1];
		b.addEventListener("click", (e) => { if (e && e.stopPropagation) e.stopPropagation(); setDeco(pr[0]); });
		drow.appendChild(b); el.decoBtns[pr[0]] = b;
	});
	tune.appendChild(drow);
	el.hit = mk("div", null, "hit"); tune.appendChild(el.hit);
	const r2 = mk("div", null, "row");
	const rst = mk("button"); rst.type = "button"; rst.textContent = "复位";
	rst.addEventListener("click", (e) => { if (e && e.stopPropagation) e.stopPropagation(); resetCard(); });
	el.cardJson = mk("textarea"); el.cardJson.readOnly = true; el.cardJson.title = "拷回 palettes/tuned/<preset>.json 用";
	r2.appendChild(rst); r2.appendChild(el.cardJson); tune.appendChild(r2);
	p.appendChild(tune);
	const foot = mk("div", null, "foot");
	const btn = mk("button"); btn.type = "button"; btn.textContent = "立刻重播开机";
	btn.addEventListener("click", (e) => { if (e && e.stopPropagation) e.stopPropagation(); playNow(); });
	el.note = mk("span");
	foot.appendChild(btn); foot.appendChild(el.note);
	p.appendChild(foot);
	document.body.appendChild(p);
	el.panel = p;
	p.addEventListener("click", (e) => { if (e && e.stopPropagation) e.stopPropagation(); });
	return p;
}
function placePanel() {
	if (!el.panel || !panelOpen || !el.ball) return;
	const r = el.ball.getBoundingClientRect();
	const pw = 328, VH = window.innerHeight || 800;
	const ph = Math.min(el.panel.offsetHeight || 320, VH * 0.66);
	el.panel.style.left = (r.left > pw + 40 ? Math.round(r.left - pw - 12) : Math.round(r.right + 12)) + "px";
	el.panel.style.top = clamp(Math.round(r.top - 20), 8, Math.max(8, VH - ph - 12)) + "px";
}
function togglePanel(force) {
	const p = panelEl();
	panelOpen = force === undefined ? !panelOpen : !!force;
	p.classList.toggle("open", panelOpen);
	if (panelOpen) { placePanel(); refresh(); contrastProbe("panel"); }   // 面板=用户能做的"重跑"手势,不用重启
}

function mountLayers() {
	if (document.getElementById(NS + "-bg")) return;
	el.bg = mk("div", NS + "-bg");
	el.scrim = mk("div", NS + "-scrim");
	document.body.appendChild(el.bg);
	document.body.appendChild(el.scrim);
	el.chip = mk("div", NS + "-chip");
	document.body.appendChild(el.chip);
	mountBall();
	panelEl();               // 先建好,后面 placePanel 才有尺寸可算
	// 宿主首帧之后布局还会动几次,画面落点要重新认一遍(第一次可能还没排版好),给三拍
	[60, 300, 1200].forEach((ms) => setTimeout(() => { render(STATE.st); placePanel(); }, ms));
	// 别的窗口/面板改了选择,切回来就跟上
	document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
	contrastProbe("mount");
}

// ---- 对比度哨兵:把"底和字几乎同色"的元素连选择器一起报进 boot.log ----
// 为什么需要它(2026-11-15):用户发现 present/diff 卡的**文件名一片白**(两个会话都这样)。
// 截图上肉眼分不出"浅底深字"和"浅底浅字",而宿主那 89 个别名令牌**我们全都覆盖了** ——
// 那么那块 #FAFAFA 的浅底就没走令牌(组件自己硬编码的浅色)。11-14 我把 light/dark 两个槽
// 都填成深色值(治底部白带)之后:前景变成深色主题用的浅字,背景还是硬编码的浅底 ⇒ 隐形。
// 继续在截图上猜没意义,直接在真机上量 (元素路径 / 前景 / 背景 / WCAG 对比度)。
// **隐私**:只报路径与颜色,**不报文字内容** —— boot.log 是要发给朋友排查的。
function rgbOf(s) {
	const m = /rgba?\(([^)]+)\)/.exec(String(s || ""));
	if (!m) return null;
	const p = m[1].split(",").map((x) => parseFloat(x));
	if (p.length < 3 || p.some((v) => !Number.isFinite(v))) return null;
	return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
function lumOf(c) {
	const f = (v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) };
	return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function hexOf(c) {
	const h = (v) => ("0" + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
	return "#" + h(c.r) + h(c.g) + h(c.b);
}
function contrastOf(fg, bg) {
	const a = lumOf(fg), b = lumOf(bg);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
// 往上找第一个"近乎不透明"的纯色底。**v2 不再因为 background-image 就放弃**:
// 我们那层文字卡的底本身就是渐变(走 background-image),v1 于是把"卡片里的文字"整类跳过了,
// 结果 scanned=44、什么真信号都没抓到 —— 正是自己要查的那一类被自己的规则排除掉了。
// 现在改成:路过图层就记一笔 viaImg,继续往上找纯色;一路找不到就退到画布色。
function effBgOf(node, cache) {
	let n = node, guard = 0, viaImg = false;
	const csOf = (el) => {
		if (cache && cache.has(el)) return cache.get(el);
		let c = null;
		try { c = getComputedStyle(el) } catch (e) {}
		if (cache) cache.set(el, c);
		return c;
	};
	while (n && n.nodeType === 1 && guard++ < 12) {
		const cs = csOf(n);
		if (!cs) break;
		const c = rgbOf(cs.backgroundColor);
		if (c && c.a > 0.75) return { c: c, viaImg: viaImg };
		if (cs.backgroundImage && cs.backgroundImage !== "none") viaImg = true;
		n = n.parentElement;
	}
	const root = csOf(document.documentElement) || csOf(document.body);
	const rc = root ? rgbOf(root.backgroundColor) : null;
	return rc && rc.a > 0.5 ? { c: rc, viaImg: true } : null;
}
function pathOf(node) {
	const bits = [];
	let n = node, guard = 0;
	while (n && n.nodeType === 1 && guard++ < 8) {
		let s = String(n.tagName || "?").toLowerCase();
		if (n.id) s += "#" + n.id;
		else if (typeof n.className === "string" && n.className.trim()) s += "." + n.className.trim().split(/\s+/).slice(0, 2).join(".");
		const kind = n.getAttribute ? n.getAttribute("data-chat-flow-kind") : null;
		if (kind) s += "[kind=" + kind + "]";
		const slot = n.getAttribute ? n.getAttribute("data-slot") : null;
		if (slot) s += "[slot]";
		bits.unshift(s);
		n = n.parentElement;
	}
	return bits.slice(-4).join(">");
}
let probeRuns = 0, probeLast = 0;
const postedTags = new Set();   // 每个触发标签只白嫖一条心跳(见 v5b 闸门注释)
function contrastProbe(tag) {
	// v5:改成**节流**而不是次数封顶。v4 写 probeRuns>7 就退出,于是 11-16 真机上那张交付卡出现的时刻
	// 早过了前 8 拍,探针一次都没扫到它,而日志偏偏打出一行 under19=0 lights=0 —— 看着像"修好了",
	// 实际是**病人不在场**。缺证据不等于证据表明没病(这条我自己写过,又在自家仪器上栽了)。
	const now = Date.now();
	if (now - probeLast < 900) return;
	probeLast = now;
	probeRuns++;
	try {
		const all = document.querySelectorAll("body *");
		const cache = new WeakMap();
		const rows = [], lights = [];
		let examined = 0, on = 0, off = 0, healed = 0;
		const VH = window.innerHeight || 800;
		for (let i = 0; i < all.length && examined < 700; i++) {
			const n = all[i];
			// v3:只要"子节点里有文字"就算,不再要求文字是**第一个**子节点 ——
			// 文件卡那类结构是 <span><svg/>文件名</span>,v1/v2 用 firstChild 判断把它们整类跳过了,
			// 结果 examined 只有 63,而真正要查的那条恰好在这 63 之外。
			const cn = n.childNodes;
			let hasTxt = false;
			for (let k = 0; k < cn.length; k++) if (cn[k].nodeType === 3 && cn[k].textContent.trim().length >= 2) { hasTxt = true; break }
			if (!hasTxt) continue;
			if (String(n.textContent || "").trim().length < 2) continue;
			const r = n.getBoundingClientRect();
			if (r.width < 8 || r.height < 6) continue;
			const vis = !(r.bottom < 0 || r.top > VH);   // v2:不在视口里也扫,只是标一笔(卡片常被滚出屏)
			if (vis) on++; else off++;
			let cs;
			try { cs = getComputedStyle(n) } catch (e) { continue }
			cache.set(n, cs);
			if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.05) continue;
			const fg = rgbOf(cs.color);
			if (!fg || fg.a < 0.6) continue;
			const bg = effBgOf(n, cache);
			if (!bg) continue;
			examined++;
			const cr = contrastOf(fg, bg.c);
			// —— 就地自愈:**任何**低于 1.9 的文字都救,换一种压得住当前底色的墨 ——
			// v5 只救"浅底浅字 / 深底深字"两种极端,11-16 真机当场漏了一条:
			//   cr=1.31  fg=#d0d0c5(亮度 0.65)压在 bg=#baba6e(0.50) —— **中调压中调**两个门都不进,healed=0。
			// 现在:深墨与浅墨各压一次当前底色,**取对比度高的一边**;当前画面的 ground/glow 只有在
			// 它自己就能达到 4.5 时才优先采用(浅色预设的 ground 也是浅的,直接拿会越改越糊)。
			// 仍然**只改文字色、不动底色** —— 改底会牵连同族按浅底画的图标描边,那是不可逆的视觉破坏;
			// 改字最坏只是"颜色不如设计稿",不会再出现"整行看不见"。
			// 这层还兼任**类名哈希的兜底**:宿主升级把 kuvljq_/xz4KEq_ 换掉,只要对比度掉下 1.9 就会被救回来。
			let healTo = "";
			if (cr < 1.9) {
				const ink = (STATE.st && STATE.st.pal && STATE.st.pal.ink) || null;
				const DARK = "#141316", LIGHT = "#F4F3F3";
				const cD = contrastOf(rgbOf(DARK), bg.c), cL = contrastOf(rgbOf(LIGHT), bg.c);
				const want = cD >= cL ? DARK : LIGHT;
				const tint = rgbOf(String((cD >= cL ? (ink && ink.ground) : (ink && ink.glow)) || want));
				healTo = (tint && contrastOf(tint, bg.c) >= 4.5) ? hexOf(tint) : want;
				if (hexOf(fg).toUpperCase() !== String(healTo).toUpperCase()) {
					try { n.style.color = healTo } catch (e) {}
					healed++;
				}
			}
			const rec = {
				p: pathOf(n), cr: Math.round(cr * 100) / 100, fg: hexOf(fg), bg: hexOf(bg.c),
				hl: healTo,                                      // 被救的话,新墨色进日志(便于看它救得对不对)
				bl: Math.round(lumOf(bg.c) * 100), viaImg: bg.viaImg ? 1 : 0, vis: vis ? 1 : 0,
				len: String(n.textContent).trim().length, px: Math.round(r.width) + "x" + Math.round(r.height),
			};
			rows.push(rec);
			if (rec.bl > 88) lights.push(rec);       // 近白底:即便它自己的字还凑合,也要知道"是谁在画 #FAFAFA"
		}
		rows.sort((x, y) => x.cr - y.cr);
		lights.sort((x, y) => y.bl - x.bl);
		const under = rows.filter((x) => x.cr < 1.9).length;
		// 宿主 /report 的落盘规则是"只写标量 + 整行截断到 300 字"(lib/index.js:663),
		// 所以**一条发现发一个 POST**:数组会被静默丢掉(v2 就是这么把 worst/lights 全丢光的)。
		const post = (o) => { try { fetch("/dsh-boot-naruto/report", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) }).catch(() => {}) } catch (e) {} };
		// v5b:防刷屏闸门**必须留一条能区分"扫过且干净"与"根本没扫"**。
		// v5 那版写的是"有发现才发,否则每 6 拍一次心跳",结果 11-16 install 后 15 秒日志里一行新都没有:
		// 我分不清是"没问题"还是"探针没跑起来" —— 这正是我这一轮第三次踩的"缺证据≠证据表明没病"。
		// 现在:**每个触发标签第一次必发**(mount/t1200/t4000/dom/panel 各一条,一页生命周期内封顶 5 条),
		// 明细仍然只在有发现时发。日志条数有界,但"我确实扫过了"永远看得见。
		const found = under > 0 || lights.length > 0 || healed > 0;
		if (!found) { rows.length = 0; lights.length = 0; }
		const tagKey = String(tag || "auto");
		if (found || !postedTags.has(tagKey)) {
			postedTags.add(tagKey);
			// b = 构建戳。**它回答的是本会话卡过我两次的问题:"我新装的代码到底加载了没有"**
			// (11-16 有一次 install 被中断、11-17 日志里又全是计数器高达 ran=92 的老页面,
			//  我两次都只能靠"日志里有没有新行"间接判断 —— 而"没有新行"可能只是我自己 -First 12 截断的。)
			// spin = 悬浮球此刻**有没有** no-spin 类。0=已停转(照片类应有的状态) 1=还在转 2=球不在。
			//   团藏「躺着」是素材倾角还是球在自转,这一列直接给答案,不用靠肉眼猜。
			//   (实测:danzo 素材主轴倾角 +0.9°,本来就是这个角度 —— 见 _scratch\ball3\measure.py)
			const ballEl = document.getElementById(NS + "-ball");
			// deco / frame = 11-19 新加的验收列:**刷新一次页面就能判定新底框层到底加载了没有**。
			//   deco = 当前档位字面(none/doton/katon/raton/suiton/futon);
			//   frame = 这一档的底框 URL 有没有从清单 st.ui.files[].url 里解析出来(1 有 / 0 没有)。
			//   frame=0 而 deco≠none ⇒ 十有八九是资源包没把 PNG 放进 arts\ui\,或文件名对不上(大小写除外)。
			//   为什么不能只看画面:border-image 的图挂了不留任何痕迹,"看不到框"和"没加载新代码"长一模一样。
			// 构建戳(现在 b2011 = 各向异性环带 C 档 ring 44,14 + 比例内缩;前一版 b1931 = 丙方案标量环 58/30):
			// 日志里出现当前这个戳,就是"新代码真在跑"的直接证据,不用肉眼比对。
			const curMode = decoGet();
			const curFile = (DECO_MODES[curMode] || DECO_MODES.none).file;
			post({
				contrast: tagKey, b: BUILD_STAMP, ran: probeRuns, examined: examined, on: on, off: off,
				under19: under, lights: lights.length, healed: healed,
				spin: ballEl ? (ballEl.classList.contains("no-spin") ? 0 : 1) : 2,
				deco: curMode, frame: curFile && frameUrl(curFile) ? 1 : 0,
				// 11-20:这条是**验收「文字不再被外环压住」的直接证据** —— 实际写进 CSS 的内缩,
				// 以及算它用的卡宽。五遁/三种卡高各打一行,表就能直接对 check: iny ≈ 卡高 x 10.6%。
				inx: lastFrameInset ? lastFrameInset.x : -1,
				iny: lastFrameInset ? lastFrameInset.y : -1,
				cw: lastFrameInset ? lastFrameInset.cw : 0,
			});
		}
		let sent = 0;
		for (const x of rows) {
			if (sent >= 4 || x.cr >= 1.9) break;
			post({ contrast: "hit", cr: x.cr, fg: x.fg, bg: x.bg, hl: x.hl, px: x.px, len: x.len, viaImg: x.viaImg, vis: x.vis, path: x.p.slice(0, 130) });
			sent++;
		}
		// 8 条(不是 2 条):同一张浅头里**同时有浅字和深字**(v1 实测:标题 #f4f3f3/1.06,而第二行说明是深灰正常)。
		// 只把头压黑会立刻把深字那行变成黑底黑字 —— 修一个 bug 造另一个。所以要把这一族所有文字元素一次看全。
		for (const x of lights.slice(0, 8)) {
			post({ contrast: "light", bl: x.bl, cr: x.cr, fg: x.fg, bg: x.bg, px: x.px, len: x.len, path: x.p.slice(0, 130) });
		}
		DIAG.contrast = under;
		DIAG.contrastWorst = rows.length ? (rows[0].cr + " " + rows[0].p) : "";
		if (under) diagWarn("low-contrast-text", under + " 处 <1.9,最差 " + rows[0].cr + " " + rows[0].fg + "/" + rows[0].bg + " " + rows[0].p);
	} catch (e) { diagWarn("contrast-probe-threw", e && e.message) }
}
// 手动重跑:控制台里 window.__bsContrast("改名后") —— 修完东西不用重启就能复查
try { window.__bsContrast = contrastProbe } catch (e) {}
// 卡片是宿主异步渲染的,mount 那一拍往往还没画出来;再补两拍(1.2s / 4s)
[1200, 4000].forEach((ms) => setTimeout(() => contrastProbe("t" + ms), ms));
// v5 **DOM 触发**:现象只在"那张卡被渲染出来"的那一刻才存在,而它可能发生在加载后好几分钟
// (切会话、agent 发 present 卡片、展开 diff) —— v4 只靠开机那几拍,所以 11-16 直接漏诊。
// 看到带 _card/_header/_title 的新节点就补扫一次(去抖 600ms;真没变化时一次都不扫)。
try {
	const MO = window.MutationObserver;
	if (MO && document.body) {
		let hot = 0;
		const HOT = /_(card|header|title|file|attach|deliver)/;
		new MO((muts) => {
			for (let i = 0; i < muts.length; i++) {
				const list = muts[i].addedNodes;
				for (let k = 0; k < list.length; k++) {
					const nd = list[k];
					if (!nd || nd.nodeType !== 1) continue;
					// 便宜的先筛:卡片容器只会是这几个标签,聊天流里每帧新增的 span/text 不必去挖它子树
					const tag = String(nd.tagName || "").toUpperCase();
					if (tag !== "DIV" && tag !== "BUTTON" && tag !== "SECTION" && tag !== "LI") continue;
					const cls = typeof nd.className === "string" ? nd.className : "";
					// 命中要嘛是它自己的类名带 _card/_header/_title,要嘛子树里真有这么一格(往下只问一次)
					const hit = HOT.test(cls) || (nd.querySelector && !!nd.querySelector("[class*=\"_title\"],[class*=\"_card\"],[class*=\"_header\"]"));
					if (!hit) continue;
					if (hot) clearTimeout(hot);
					hot = setTimeout(() => { hot = 0; contrastProbe("dom"); }, 600);
					return;
				}
			}
		}).observe(document.body, { childList: true, subtree: true });
	}
} catch (e) { diagWarn("contrast-observer-failed", e && e.message) }
