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
const BUILD_STAMP = "b2113";
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
	// 所以把当前画面 URL 的文件名换掉就行 —— **图只住图库,一行都不烘进代码**(规矩见 dsh-gallery-pack\SHARE.md)。
	// 只装代码包的人没有图库 -> onerror 回退手绘 SVG:不报错、不空球。所以手绘那套**不许删**。
	// ⚠ 2026-11-21 第二次修:球心图的来源从 `pal.eye.photo` 改成 **preset 自己的清单条目**。
	// 为什么必须改:pal 来自 palettes/<id>.json(调色文件),而 17 套调色已随火影素材移出仓库,
	// 新导入的主题根本没有调色文件 ⇒ paletteFor() 返回 normalizePalette(null)
	// ⇒ eye.photo 永远是 undefined ⇒ 球心退回手绘占位眼。
	// 正确来源是 preset.json 里的 `eye` 字段:它随主题一起被导入,不依赖调色。
	// 两种来源都保留(调色里的 eye 优先,它是"人工微调过"的强证据),清单里的兜底。
	//
	// 声明提到 if 块外面:下面 no-spin / title 也要用它。
	// (第一版写在 if (el.ballImg) 里面,外面那段只能靠 typeof 兜着 —— 那就等于没生效。)
	const itemEye = (st.item && st.item.eye) || null;
	const eyeSrc = Object.assign({}, (itemEye || {}), (pal.eye || {}));
	// pal.eye 总是被 normalizePalette 补成 {kind:'unknown'},会盖掉清单里的真值 ⇒
	// 只接受 pal 里"比 unknown 更具体"的 kind,其余一律用清单的。
	if (!pal.eye || pal.eye.kind === "unknown") eyeSrc.kind = (itemEye && itemEye.kind) || "unknown";
	if (pal.eye && pal.eye.photo) eyeSrc.photo = pal.eye.photo;
	if (el.ballImg) {
		const want = String(eyeSrc.photo || (eyeSrc.kind === "kunai" ? "kunai.png" : "")).trim();
		const photo = (want && st.art && st.art.url) ? String(st.art.url).replace(/[^/]*$/, want) : null;
		// 手绘回退必须用**合并后的 eyeSrc**,不能直接喂 pal。
		//
		// ⚠ 2026-11-21 第三次修(用户:最终章舍人/宇智波斑/小南/雏田×2/花火 悬浮球还没有图案)。
		// 这六套本来就没有照片(轮回眼/白眼/纸蝶只能手绘),走的是 else 分支;
		// 而那一行原本写 `eyeUri(pal)`,pal.eye.kind 被 normalizePalette 补成了 **'unknown'**
		// ⇒ 画出来是"未配色占位眼"或一片空 —— 正是用户看到的"没有图案"。
		// 把合并好的 eyeSrc 塞回 pal 再画,手绘才会用 preset.json 里真正的 kind。
		const palForEye = Object.assign({}, pal, { eye: eyeSrc });
		if (photo) {
			el.ballImg.onerror = function () { el.ballImg.onerror = null; el.ballImg.src = eyeUri(palForEye); DIAG.ballPhoto = "fallback"; };
			el.ballImg.src = photo;
			DIAG.ballPhoto = "photo";
		} else {
			el.ballImg.onerror = null;
			el.ballImg.src = eyeUri(palForEye);
			DIAG.ballPhoto = "drawn";
			DIAG.ballEyeKind = String(eyeSrc.kind || "unknown");
		}
	}
	// 眼睛转 = 瞳术在转;**器物转 = 在甩飞刀**。苦无/纸蝶停转(球还是能拖、能点开面板)。
	// 11-16 补第三条:**照片一律不许转**。-spin 是 26s 作用在 ball>img 上(50-css:67),手绘纹章转着看
	// 是设计(万花筒本来就该转),但**一张眼睛照片转起来就是"歪"** —— 用户点名的恰好是这两套:
	// 团藏(sharingan,杏仁眼自带倾角)与兄弟之战(mangekyou6,佐助那枚图案不对称)。
	// 卡卡西/神驹斑没被投诉,是因为它们的图案旋转对称、转了看不出来 —— 那是巧合不是设计,
	// 所以这里按"是不是照片"划界,而不是按种类赌哪张照片经得起转。
	//
	// ⚠ 这里也必须用合并后的 eyeSrc:原来读 pal.eye.kind 永远是 unknown,
	// 于是"苦无不许转"那条对 minato/tobirama 根本不生效(它们转起来了),照片那条也看不出来。
	if (el.ball) {
		const spinKey = eyeSrc;
		el.ball.classList.toggle("no-spin", spinKey.kind === "kunai" || spinKey.kind === "paper" || !!spinKey.photo);
		el.ball.title = (st.title || "未取到画面") + " · " + (EYE_KINDS[spinKey.kind] || spinKey.kind);
	}
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
	// 文案组装(2026-11-22 修「每一套都显示 未配色·未配色」)
	//
	// 两个"未配色"来自两处不同原因,现在**都不该再出现**:
	//   ① EYE_KINDS[unknown] = "未配色" —— 只有 pal.eye.kind 是 unknown 时才会取到。
	//      但球心现在从 preset.json 的 eye 读(见上面那段),每套都有真 kind,不该再是 unknown。
	//      真取到了 unknown 就是**说明**有问题,所以保留这条显示 —— 它是诊断信号,不是噪音。
	//   ② untuned = !PALETTES[st.preset] —— 17 套调色已随火影素材移出仓库,
	//      于是**每一套**都满足这个条件 ⇒ 每套都挂一个"未配色"。
	//      可这个标记原本的意思是"这套画面还没人工调过色,用的是自动抽色",是给**做主题的人**看的;
	//      现在调色整体不再内置,它就是恒真的废话,用户每次选主题都被它烦一次。
	//      ⇒ 删掉。缺调色已经由 palette-missing 记进 boot.log(给开发者看),不该占用户的屏。
	const noCard = DIAG.cardBoxy === 0 ? " · 文本框未生效!" : "";
	// ⚠ 这里**不能**读 st.pal.eye.kind:pal 来自调色文件,而调色已不再内置,
	//   它的 eye.kind 恒为 'unknown' ⇒ 每套都会显示"未配色"(用户报的就是这个)。
	//   真实的 kind 在清单条目里(st.item.eye),与球心那段同一个来源。
	//   这段代码在 ballTitle 里,拿不到上面那个 eyeSrc 局部变量,所以在这里独立取一次。
	const itemEyeT = (st.item && st.item.eye) || null;
	const palEyeT = (st.pal && st.pal.eye) || null;
	const eyeKindT = (palEyeT && palEyeT.kind && palEyeT.kind !== "unknown")
		? palEyeT.kind
		: ((itemEyeT && itemEyeT.kind) || "unknown");
	// unknown 时整段不显示 —— 它是诊断信号,交给 boot.log,不该每套都挂在标题上。
	const eyeLabel = (eyeKindT === "unknown") ? "" : (EYE_KINDS[eyeKindT] || eyeKindT);
	return (st.title || st.preset || "?") + (eyeLabel ? " · " + eyeLabel : "") + noCard;
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

// ---- 主题轮播(2026-11-21 用户要求:「开机动画进去后主题可以轮播」)----
//
// 语义先说清,免得和后面对不上:
//   · 「主题」= 一整套开机画面 + 桌面背景 + 配色,也就是清单里的一套 preset;
//   · 「壁纸」= 当前这套 preset 里的某一张图(arts/<id>/01.jpg…)。用户说的
//     「进入 dsh 桌面版后的主题图片可以在各主题里的图里自动切换或者手动选」= 这一层。
// 所以有两个独立开关:
//   ROTATE_KEY —— 是否按时间自动换**主题**(到点切到清单里下一套);
//   WALL_KEY   —— 是否在当前套的几张图之间自动换**壁纸**(只换背景,不动配色)。
//
// 为什么轮播要自己实现而不是交给宿主:宿主的 usePreset(id, replay) 只负责"切到哪套",
// 没有定时器。而这个插件本来就是开屏层的主人,定时器放这里最自然。
// ⚠ 轮播切主题时**不重播开机动画**(replay=false):否则每隔几分钟整个屏幕闪一次开屏,
//   那就不是轮播了。想看开机动画走底部的「立刻重播开机」。
const ROTATE_KEY = NS + "-rotate";
const WALL_KEY = NS + "-wall";
const ROTATE_SEC_DEFAULT = 180;   // 3 分钟换一套。太短会让人觉得"画面一直在跳"。
let rotateTimer = 0, wallTimer = 0;
function rotateOn() {
	try { return window.localStorage.getItem(ROTATE_KEY) === "1"; } catch (e) { return false; }
}
function setRotate(on) {
	try { window.localStorage.setItem(ROTATE_KEY, on ? "1" : "0"); } catch (e) {}
	scheduleRotate();
	applyDecoVars(null);
}
function wallOn() {
	try { return window.localStorage.getItem(WALL_KEY) === "1"; } catch (e) { return false; }
}
function setWall(on) {
	try { window.localStorage.setItem(WALL_KEY, on ? "1" : "0"); } catch (e) {}
	scheduleWall();
	applyDecoVars(null);
}
// 轮播:到点挑**清单里下一套**(跳过坏条目和当前这套)
function nextPresetId() {
	const st = STATE.st;
	const ok = (st.list || []).filter((p) => p && p.ok);
	if (ok.length < 2) return null;
	const i = ok.findIndex((p) => p.id === st.preset);
	return ok[(i + 1 + ok.length) % ok.length].id;
}
function scheduleRotate() {
	if (rotateTimer) { clearInterval(rotateTimer); rotateTimer = 0; }
	if (!rotateOn()) return;
	rotateTimer = setInterval(() => {
		if (!rotateOn()) { scheduleRotate(); return; }
		const id = nextPresetId();
		if (!id) return;
		// 轮播换主题走 choose() 的同一条路(它有失败即报的诊断),但不重播开机动画
		choose(id, { replay: false });
	}, ROTATE_SEC_DEFAULT * 1000);
}
// 壁纸轮播:只在**当前这套**的图之间换。实现方式 = 换背景层那一张,不动配色。
// 图从 STATE.st.art 同源的 files 里取(NN.jpg),所以不需要新接口。
function scheduleWall() {
	if (wallTimer) { clearInterval(wallTimer); wallTimer = 0; }
	if (!wallOn()) return;
	wallTimer = setInterval(() => {
		if (!wallOn()) { scheduleWall(); return; }
		nextArt();
	}, 90 * 1000);   // 90s 换一张壁纸:比主题轮播快,但又不会闪
}
function nextArt() {
	const st = STATE.st;
	const api = bootApi();
	if (!api || !st || !st.art) return;
	// 这套 preset 的所有 NN.jpg 按名字排序,取当前的下一个。
	// 当前是哪张:先看"上一次手动切过去的那张"(STATE.wallNow),再看 art.file,最后从 url 里抠。
	// 只看 art.file 是不够的 —— 走 thumbUrl 那条路时 art.file 恒为 null,永远从第一张重来。
	const files = (st.art && Array.isArray(st.art.files) ? st.art.files : [])
		.filter((f) => f && f.url && /^0\d\.(jpe?g|png|webp)$/i.test(String(f.name || "")));
	if (files.length < 2) {
		// 只有一张(或缺 files)时给出可诊断信号,而不是默默什么都不做
		diagWarn("wall-next-nofiles", "这套只有 " + files.length + " 张幕图,无法换下一张");
		return;
	}
	files.sort((a, b) => String(a.name).localeCompare(String(b.name)));
	const fromUrl = /([^/]+?)\?/.exec(String(st.art.url || ""));
	const cur = String(st.wallNow || st.art.file || (fromUrl ? fromUrl[1] : "") || "");
	const i = files.findIndex((f) => f.name === cur);
	const nx = files[(i + 1 + files.length) % files.length];
	if (!nx) return;
	STATE.wallNow = nx.name;
	applyWallArt(nx);
}
// 换壁纸:**改 STATE.st.art 再重新 render**,而不是去改 DOM 节点的 background-image。
//
// ⚠ 2026-11-21 第二次修。第一版写的是:
//     const bg = document.getElementById(NS + "-bg"); bg.style.backgroundImage = ...
//   两个错:
//   ① **改错了对象**。正常路径下 `#-bg` 是 `display:none` 的兜底浮层(见 60-boot 的 dynCss:
//      `#<NS>-bg,#<NS>-scrim{display:none}`),真正的画面是画在**会话区容器**(ART_TARGET)上的;
//      给一个隐藏节点设 background-image,视觉上等于什么都没做。
//   ② **抢不过渲染**。就算改对了节点,下一次 render() 会用 dynCss 重新生成整段 CSS 把它盖掉。
//   正确做法是把新的图塞进 st.art.url/pos,让 render() 自己重算 —— 这样亮暗罩、冲淡、veil
//   那些层都跟着一起换,不会出现"图换了但纱还是旧的"。
function applyWallArt(f) {
	if (!f || !f.url) return;
	const cur = STATE.st;
	const art = Object.assign({}, cur.art, {
		url: cleanUrl(f.url),
		pos: "center",
		file: String(f.name || ""),
		src: "wall",
	});
	STATE.wallNow = String(f.name || "");
	render(STATE.with({ art: art }));
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
	if (el.rotBtn) {
		el.rotBtn.textContent = "主题轮播:" + (rotateOn() ? "开" : "关");
		el.rotBtn.setAttribute("aria-pressed", rotateOn() ? "true" : "false");
	}
	if (el.wallBtn) {
		el.wallBtn.textContent = "壁纸轮播:" + (wallOn() ? "开" : "关");
		el.wallBtn.setAttribute("aria-pressed", wallOn() ? "true" : "false");
	}
	// 文案按用户 2026-11-21 的要求改过:选开机画面**就是**选桌面主题,同一套东西。
	// 原来只写"开机画面",会让人以为是两件互不相干的事。
	if (el.hd) el.hd.textContent = "主题壁纸 · 共 " + st.list.length + " 套"
		+ (st.manual ? " · 已固定" : " · 自动跟随")
		+ (rotateOn() ? " · 轮播中" : "");
	// 底部说明也说清楚"同一套"这件事,以及开机动画何时生效。
	if (el.note) el.note.textContent = "选中即同时换桌面主题与开机画面 · 开机动画下次启动播放";
	paintTune();
}

// choose(id, {replay}) —— 切到某套主题。
// replay 默认 false(点格子 = 立刻切换、不开机动画);轮播也传 false;
// 只有底部的「立刻重播开机」才走 playNow()。
// 为什么做成参数:轮播每隔几分钟切一次,若每次都重播开屏,屏幕会反复全屏闪 ——
// 那不是轮播是骚扰。这条 2026-11-21 当场定。
function choose(id, opts) {
	const replay = !!(opts && opts.replay);
	const api = bootApi();
	if (!api || typeof api.usePreset !== "function") { diagWarn("usePreset-missing"); showChip(3); return; }
	// 换套要把"当前壁纸"的记忆清掉:上一套的 03.jpg 名字不该带进新一套。
	STATE.wallNow = "";
	const r = safeCall(() => api.usePreset(id, replay));
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
// ---- 配饰 = **磨砂玻璃**(2026-11-21 二次改向:四遁底框整个删掉)----
//
// 用户原话:「放弃这个四遁文本框吧,文本框底做成磨砂玻璃吧……原本的配饰就变成选磨砂玻璃的颜色和雾感」。
//
// 为什么删而不是修:五遁位图底框在 11-19 ~ 11-21 之间试过环带 / 整图 / 外扩 / 只留四角 /
// 九宫拉伸 / 上下边饰六种形态,每一种都要么挡字、要么把框删得只剩两成。用户裁定不要了。
// ***代码里不再引用 frame-*.png 任何一个字节*** —— 见 selftest 里"素材零引用"那条断言。
// 素材本身仍留在磁盘上(用户要把资源包做成可导入的),但那是数据,不是代码依赖。
//
// 磨砂玻璃 = 两个**数值旋钮**,正交于下面的档位按钮:
//   GLASS_TINT —— 玻璃颜色(hex)。空 = 不吃颜色,交给宿主的 --dsw-* 底色。
//   GLASS_FOG  —— 雾感 0~100。0 = 全透,100 = 最雾(同时抬高底色不透明度、加大模糊半径)。
// 档位按钮只负责"一键套预设",拖滑块则是在当前档位上微调 —— 两者都写同一个 localStorage。
let decoPal = null;
const DECO_KEY = NS + "-deco";
const GLASS_TINT_KEY = NS + "-glass-tint";
const GLASS_FOG_KEY = NS + "-glass-fog";
// 默认雾感:现有「液态玻璃」档的出厂值。抽成常量是为了让 setDeco 上报时有个可靠的回退。
const GLASS_DEFAULT_FOG = 34;
// 可选颜色。第一项空串 = 「自动」(吃宿主底色),其余是几档常用色 + 一个自定义入口。
const GLASS_TINTS = ["", "#ffffff", "#111319", "#7ee7ff", "#ff9ec7", "#ffc861", "#ff7b72"];
const GLASS_TINT_NAMES = { "": "自动", "#ffffff": "白", "#111319": "黑", "#7ee7ff": "青", "#ff9ec7": "粉", "#ffc861": "琥珀", "#ff7b72": "珊瑚" };
const DECO_MODES = {
	none: { tint: "", fog: 0 },                    // 关:不做玻璃(纯半透明,CSS 门不挂)
	glass: { tint: "", fog: GLASS_DEFAULT_FOG },   // 液态玻璃:宿主底色 + 中等雾化(默认)
	native: { tint: "", fog: 12 },                 // 原生:几乎不动,只压一点点
};
// 面板按钮顺序 = 用户给的顺序
const DECO_LABELS = [["none", "关"], ["glass", "液态玻璃"], ["native", "原生"]];
function decoGet() {
	try {
		const v = window.localStorage.getItem(DECO_KEY);
		if (DECO_MODES[v]) return v;
		// 旧存档(both/leaf/windmill/shuriken/zetsu/doton/katon/raton/suiton/futon)
		// 都不再对应任何位图底框 ⇒ 一律落到 glass。**不许崩、不许画出半只旧纹样。**
		return "glass";
	} catch (e) { return "glass"; }
}
function glassTint() {
	try { const v = window.localStorage.getItem(GLASS_TINT_KEY); return v === null ? null : v; } catch (e) { return null; }
}
function glassFog() {
	try {
		const v = window.localStorage.getItem(GLASS_FOG_KEY);
		return v === null ? null : Math.max(0, Math.min(100, parseFloat(v) || 0));
	} catch (e) { return null; }
}
function setGlassTint(v) {
	try { window.localStorage.setItem(GLASS_TINT_KEY, v || ""); } catch (e) { diagWarn("glass-store-failed", e && e.message); }
	applyDecoVars(null);
}
function setGlassFog(v) {
	const n = Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
	try { window.localStorage.setItem(GLASS_FOG_KEY, String(n)); } catch (e) { diagWarn("glass-store-failed", e && e.message); }
	applyDecoVars(null);
}
function applyDecoVars(pal) {
	if (pal) decoPal = pal;
	const mode = decoGet();
	const m = DECO_MODES[mode] || DECO_MODES.glass;
	const root = document.documentElement;
	// —— 磨砂玻璃:只写两个 CSS 变量,不碰任何位图 ——
	// tint 空 = 不吃颜色(交给宿主的 --dsw-* 底色),"自定义"档才写具体值。
	// fog 0~100 ⇒ CSS 侧换算成 blur 半径与底色不透明度(见 50-css 的 rgba 混色)。
	const tint = glassTint() || m.tint || "";
	const fogSave = glassFog();
	const fog = fogSave === null ? m.fog : fogSave;
	root.style.setProperty("--bs-glass-tint", tint || "transparent");
	root.style.setProperty("--bs-glass-fog", String(fog));
	// 磨砂玻璃**贴在卡片自己的盒里**(backdrop-filter),不需要给正文让位 ⇒ 没有 padding 改写。
	// 玻璃只在"关"以外的档位生效;`data-bs-glass` 是 CSS 的门(和当年位图底框的门同一个套路):
	// 没挂这个属性 ⇒ 玻璃那组规则一个像素都不生效 ⇒ "没选玻璃时其他效果不变"仍成立。
	if (mode === "none") root.removeAttribute("data-bs-glass");
	else root.setAttribute("data-bs-glass", mode);
	if (el.decoBtns) for (const k in el.decoBtns) el.decoBtns[k].setAttribute("aria-pressed", k === mode ? "true" : "false");
	if (el.tintRow) for (const k in el.tintRow) el.tintRow[k].setAttribute("aria-pressed", (el.tintRow[k].dataset.tint || "") === (tint || "") ? "true" : "false");
	if (el.fogOut) el.fogOut.textContent = String(Math.round(fog));
}
// 上一次上报给探针的配饰读数占位。四遁底框删除后不再有"内缩 px"可报,
// 但 setDeco 里仍会清它,保留声明免得其余代码引用时炸(探针现在直接写常量 -1)。
let lastFrameInset = null;
function setDeco(k) {
	if (!DECO_MODES[k]) return;
	try { window.localStorage.setItem(DECO_KEY, k); } catch (e) { diagWarn("deco-store-failed", e && e.message); }
	// 点档位 = **一键套预设**:把该档的雾感写回去,覆盖用户之前拖过的值。
	//
	// 为什么不是"保留用户拖过的值":按钮的语义就是"切到这个外观"。若保留旧雾感,
	// 点「原生」会得到 native 的 12 之外的值 —— 按钮和它标的名字对不上,用户会以为没生效
	// (自测第二轮真的红了这一条,当时值停在 55)。想微调就拖滑块,那是另一个动作。
	// 颜色**不**跟着档位走:tint 是用户的品牌色选择,与"这档多雾"正交,换档不该把它冲掉。
	try { window.localStorage.setItem(GLASS_FOG_KEY, String(DECO_MODES[k].fog)); } catch (e) {}
	lastFrameInset = null;
	applyDecoVars(null);
	// 点档位这条路径必须**自己打一条日志**:只有 panelOpen 时的 contrastProbe 会打,
	// 而那时用户已经点完了(11-20 的教训)。字段沿用 deco/frame,并加 tint/fog 两个新值,
	// 这样 boot.log 里一眼能看出"玻璃选了没、雾感多少"。
	// 落盘规则是"只写标量"(宿主 lib/index.js:663),所以这里全部是标量,数组会被静默丢掉。
	try {
		const tint = glassTint() || (DECO_MODES[k] || {}).tint || "";
		const fogSave = glassFog();
		const fog = fogSave === null ? (DECO_MODES[k] || GLASS_DEFAULT_FOG) : fogSave;
		fetch("/dsh-boot-gallery/report", {
			method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				deco: k, frame: k === "none" ? 0 : 1, b: BUILD_STAMP,
				tint: tint || "auto", fog: Math.round(fog),
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
	// 玻璃的两个旋钮也要跟着回填,否则打开面板时滑块停在 0、显示和实际不一致
	// (磨砂玻璃是全局一份、不分图,所以从 localStorage 读,不从 el.curCard 读)。
	const fog = glassFog();
	if (el.fogInp) el.fogInp.value = String(Math.round(fog === null ? (DECO_MODES[decoGet()] || DECO_MODES.none).fog : fog));
	if (el.fogOut) el.fogOut.textContent = String(Math.round(fog === null ? (DECO_MODES[decoGet()] || DECO_MODES.none).fog : fog));
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
	// —— 轮播开关(2026-11-21 用户要求)——
	// 两个开关都要有,因为它们是两件事:
	//   「主题轮播」到点换**整一套**(开机画面 + 桌面背景 + 配色);
	//   「壁纸轮播」只在当前这套的几张图之间换背景,配色不动。
	// 用户原话是「主题可以轮播」+「主题图片可以在各主题里的图里自动切换或者手动选」⇒ 两条都要。
	const rot = mk("div", null, "row rotate");
	const rotCap = mk("i"); rotCap.textContent = "轮播";
	rot.appendChild(rotCap);
	el.rotBtn = mk("button"); el.rotBtn.type = "button";
	el.rotBtn.addEventListener("click", (e) => { if (e && e.stopPropagation) e.stopPropagation(); setRotate(!rotateOn()); paintPanel(); });
	rot.appendChild(el.rotBtn);
	el.wallBtn = mk("button"); el.wallBtn.type = "button";
	el.wallBtn.addEventListener("click", (e) => { if (e && e.stopPropagation) e.stopPropagation(); setWall(!wallOn()); paintPanel(); });
	rot.appendChild(el.wallBtn);
	// 「下一张」:手动换壁纸(用户说"或者手动选")
	el.nextBtn = mk("button"); el.nextBtn.type = "button"; el.nextBtn.textContent = "下一张";
	el.nextBtn.addEventListener("click", (e) => { if (e && e.stopPropagation) e.stopPropagation(); nextArt(); });
	rot.appendChild(el.nextBtn);
	p.appendChild(rot);
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
	// —— 磨砂玻璃:三个档位 + 颜色排 + 雾感滑块 ——
	// 用户 11-21:「原本的配饰就变成选磨砂玻璃的颜色和雾感」⇒ 这里就是那两个旋钮。
	const drow = mk("div", null, "row");
	const dcap = mk("i"); dcap.textContent = "玻璃";
	drow.appendChild(dcap);
	el.decoBtns = {};
	DECO_LABELS.forEach((pr) => {
		const b = mk("button"); b.type = "button"; b.textContent = pr[1];
		b.addEventListener("click", (e) => { if (e && e.stopPropagation) e.stopPropagation(); setDeco(pr[0]); });
		drow.appendChild(b); el.decoBtns[pr[0]] = b;
	});
	tune.appendChild(drow);
	// 颜色:一排小圆点。第一格「自动」= 不吃颜色,只用宿主自己的底色。
	const trow = mk("div", null, "row glass-tints");
	const tcap = mk("i"); tcap.textContent = "颜色";
	trow.appendChild(tcap);
	el.tintRow = [];
	GLASS_TINTS.forEach((hex) => {
		const b = mk("button"); b.type = "button";
		b.className = "tint" + (hex ? "" : " auto");
		b.dataset.tint = hex;
		b.title = GLASS_TINT_NAMES[hex] || hex;
		if (hex) b.style.background = hex;
		b.addEventListener("click", (e) => { if (e && e.stopPropagation) e.stopPropagation(); setGlassTint(hex); });
		trow.appendChild(b); el.tintRow.push(b);
	});
	tune.appendChild(trow);
	// 雾感:0~100。拖它就是"磨砂得更厉害",实时生效,按图无关、全局一份。
	const frow = mk("label");
	const fcap = mk("i"); fcap.textContent = "雾感";
	const finp = mk("input"); finp.type = "range"; finp.min = "0"; finp.max = "100"; finp.step = "1";
	const fout = mk("b");
	finp.addEventListener("input", () => setGlassFog(finp.value));
	frow.appendChild(fcap); frow.appendChild(finp); frow.appendChild(fout);
	tune.appendChild(frow);
	el.fogInp = finp; el.fogOut = fout;
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
	// 轮播的定时器在挂载时就按存档恢复 —— 用户上次开了轮播,重启后应该还在轮播,
	// 而不是每次开桌面都要重新去点一下开关。
	scheduleRotate();
	scheduleWall();
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
		const post = (o) => { try { fetch("/dsh-boot-gallery/report", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) }).catch(() => {}) } catch (e) {} };
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
			// deco / frame = 11-19 新加的验收列:**刷新一次页面就能判定配饰到底生效了没有**。
			//   deco = 当前档位字面(none / glass / native);磨砂玻璃替换四遁底框后沿用这一列。
			//   frame 沿用旧名,现在表示"玻璃有没有生效"(1 生效 / 0 关)—— 宿主侧落盘字段不改,
			//   免得老日志工具读不到;tint / fog 两个新标量直接给出实际数值。
			// 构建戳(现在 b2112 = 磨砂玻璃;前一版 b2111 = 整张装饰层 deco 模式):
			// 日志里出现当前这个戳,就是"新代码真在跑"的直接证据,不用肉眼比对。
			const curMode = decoGet();
			const curTint = glassTint();
			const curFogSave = glassFog();
			const curFog = curFogSave === null ? (DECO_MODES[curMode] || DECO_MODES.none).fog : curFogSave;
			post({
				contrast: tagKey, b: BUILD_STAMP, ran: probeRuns, examined: examined, on: on, off: off,
				under19: under, lights: lights.length, healed: healed,
				spin: ballEl ? (ballEl.classList.contains("no-spin") ? 0 : 1) : 2,
				deco: curMode, frame: curMode === "none" ? 0 : 1,
				tint: curTint || "auto", fog: Math.round(curFog),
				// 磨砂玻璃不再需要给正文让位,所以 inx/iny 恒为 -1、cw 恒为 0。
				// 字段保留是为了让老的验收脚本还能读,不会因为缺字段报错。
				inx: -1, iny: -1, cw: 0,
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
