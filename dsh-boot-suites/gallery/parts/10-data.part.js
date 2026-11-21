// =============================================================
// 10-data · 构建期注入的两份数据
//   PALETTES   : preset id -> 这一套画面的调色(由 palettes/auto + palettes/tuned 合并)
//   TOKEN_NAMES: 宿主的 89 个 --dsw-* token 名字(由 tools/extract-tokens.mjs 抽)
// 两份都在 build 时被替换;源码里留 null 占位,拿不到就是**看得见的**降级(见 30-tokens)。
// =============================================================

const PALETTES = /*__PALETTES__*/ null;
const TOKEN_NAMES = /*__TOKENS__*/ null;
// 消息容器/输入框的**实测选择器**(data/surfaces.json)。空数组 = 只靠 token 覆盖,
// 不额外压 CSS 规则。填了就是第二道保险,见 60-boot 的 dynCss 末尾。
const SURFACES = /*__SURFACES__*/ null;

// 兜底调色:清单里没有这个 preset(新增画面、或 id 打错)时用它。
// 刻意做成"灰"而不是"某个角色":灰底一眼就看得出"这套还没配色",不会伪装成设计过的样子。
const FALLBACK_PALETTE = {
	ink: { ground: "#241D20", accent: "#8C7B84", accent2: "#6E6268", glow: "#A9999F", neutral: "#4A4247" },
	hero: { file: null, pos: "center", eye: null },
	eye: { kind: "unknown" },
	// 只留"字要在上面读"的那几个面的不透明度旋钮(考古结论:画布面一律实色,画面直接当会话区背景)
	glass: { bubble: 0.95, input: 0.97, code: 0.94, menu: 0.97 },
	// opacity = 画面强度(1 = 完全原图,靠"冲淡"而不是"半透明");dim = 暗罩;saturate = 饱和
	// veil = **文字底下的底色纱**,吃 --dsw-alias-bg-base 自动跟深浅切换;真机反馈"字糊"就是它没做好
	art: { opacity: 0.80, dim: 0.22, saturate: 1.06, veil: 0 },
	// card = 统一文本框三档不透明度(a=助手/用户主底,b=正文渐变的下端,quiet=次要行)。
	// 数值直接进 color-mix 的百分比 —— 这是"每张画面唯一的可读性旋钮",
	// 取代已作废的逐套调 veil:2026-11-14 真机定论,同一张图里既有极亮又有极暗块时
	// (神驹·斑 = 白底 + 黑发红甲),任何整体纱都救不了字,只能给文字本身加框。
	card: { a: 0.94, b: 0.90, quiet: 0.76 },
	mode: "dark",
	tokens: {},
};

// 悬浮球 id / 元素 id 前缀:改这一个字符串就能整体换名,别在 DOM 里到处写死。
const NS = "dsh-bs";
const PKG = "__PACKAGE_ID__";

// 运行期诊断:任何"没拿到 / 降级了"都记在这里,**不静默**。
// 浏览器控制台敲 window.__dshBootSuite.diag() 看;自测也读这里。
const DIAG = { warns: [], lastManifestAt: 0, presetCount: 0, paletteHit: null, surface: null, apiVersion: null, cardCount: null, cardBoxy: null };
function diagWarn(code, detail) {
	const line = code + (detail === undefined ? "" : ": " + String(detail).slice(0, 160));
	if (DIAG.warns[DIAG.warns.length - 1] === line) return;
	DIAG.warns.push(line);
	if (DIAG.warns.length > 60) DIAG.warns.shift();
	try { console.warn("[" + PKG + "] " + line); } catch (e) {}
}
