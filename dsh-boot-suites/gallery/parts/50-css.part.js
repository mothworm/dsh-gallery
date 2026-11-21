// =============================================================
// 50-css · 静态外壳样式(与调色无关的那部分)
// 动态部分(吃当前画面配色的)在 dynCss(),因为它要随选中的开机画面重算。
//
// 两条本机已经踩过、别再踩的:
//   · corner-shape: DSH 全局把 `*` 设成 superellipse(1.5),不显式写 round 就永远不圆
//   · backdrop-filter 不用(与圆角/超椭圆冲突),玻璃感一律渐变 + 阴影堆
// =============================================================

// 文本框的选择器**全部从 data/surfaces.json 来**,宿主升级换了结构只改那个文件。
// 兜底值写死成"会话节点本体"那条 —— SURFACES 万一没注入进来,文本框也不能消失。
const CARD_SEL = (SURFACES && SURFACES.card) || '[data-slot="conversation.chat.node"]';
function kindSel(role) {
	const map = (SURFACES && SURFACES.cardKinds) || {};
	const list = Array.isArray(map[role]) ? map[role] : [];
	return list.length ? list.join(",") : CARD_SEL;   // 没配就退化成一视同仁,不能整类没样式
}
const KIND_SEL = { assistant: kindSel("assistant"), quiet: kindSel("quiet") };

const shellCss = [
	".", NS, "-off{display:none!important}",
	// —— 画面背景层:left 由 JS 对齐到聊天容器,别用 inset:0(那会连左侧会话栏一起糊上)——
	"#", NS, "-bg{",
	"position:fixed;top:0;right:0;bottom:0;left:0;",
	"z-index:0;",                       // 负数会被窗口自身底色整块盖住
	"pointer-events:none;",
	"background-repeat:no-repeat;background-size:cover;background-position:center;",
	"transition:opacity .55s ease, filter .55s ease;",
	"will-change:opacity;",
	"}",
	"#", NS, "-scrim{",
	"position:fixed;top:0;right:0;bottom:0;left:0;",
	"z-index:0;pointer-events:none;",
	"}",
	// —— 悬浮球 ——
	"#", NS, "-ball{",
	"position:fixed;z-index:10001;",
	"width:74px;height:74px;",
	"border-radius:999px;corner-shape:round;",
	"overflow:hidden;",
	"cursor:grab;user-select:none;",
	"box-shadow:0 0 0 1px rgba(255,255,255,.18),0 3px 7px -1px rgba(0,0,0,.55),0 10px 26px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.34),inset 0 -3px 7px rgba(0,0,0,.42);",
	"transition:transform .18s ease, box-shadow .18s ease;",
	"}",
	// —— 球体 3D 质感层:必须挂在 ::after 上,不能写进 background ——
	// 60-boot 用 `background:` **简写**铺从画面算出来的动态底色,简写会把 background-image 重置成 none;
	// 两条规则特异度相同、只比文档顺序,靠顺序赢太脆 -> 质感层走伪元素(顺带也不插 DOM、不违反项目规矩)。
	// 光位按苦无自身受光定:主高光 10–11 点、锐 specular 同侧、反弹光 7–8 点、暗部 4–5 点、rim 2–3 点。
	// **光源不许挪到右侧**:苦无亮面朝上偏左,主光挪到右边两套光就互相拆台,一眼假。
	"#", NS, "-ball::after{",
	"content:\"\";position:absolute;inset:0;pointer-events:none;border-radius:inherit;",
	"background:",
	"radial-gradient(circle at 30% 24%,rgba(255,255,255,.40),rgba(255,255,255,.12) 24%,transparent 46%),",
	"radial-gradient(circle at 23% 17%,rgba(255,255,255,.26),transparent 17%),",
	"radial-gradient(circle at 74% 80%,rgba(180,220,255,.16),transparent 40%),",
	// 11-18 用户批准:右下这片黑 **由 .46 洗到 .26 并外推到 74%78%/62%**。
	// 原因:球心图现在只到 0.82R,原本铺到半径 56% 的黑会盖进盘内;实测截图上"盘缘被压住"
	// 主要来自**顶部**(L53 白眩光 + 球底深色 L148),右下只是次要 —— 所以这里只洗淡,**不许调回 .46**。
	"radial-gradient(circle at 74% 78%,rgba(0,0,0,.26),transparent 62%),",
	"radial-gradient(circle at 72% 26%,rgba(255,255,255,.20),transparent 34%)",
	"}",
	"#", NS, "-ball:hover::after{filter:brightness(1.2)}",
	"#", NS, "-ball.dragging::after{filter:brightness(.9) saturate(.9)}",
	"#", NS, "-ball:hover{transform:scale(1.045)}",
	"#", NS, "-ball.dragging{cursor:grabbing;transform:scale(.97)}",
	"#", NS, "-ball>img{",
	"width:100%;height:100%;display:block;",
	"border-radius:999px;corner-shape:round;",
	"pointer-events:none;",
	"animation:", NS, "-spin 26s linear infinite;",
	"}",
	"#", NS, "-ball.no-spin>img{animation:none}",
	"@keyframes ", NS, "-spin{to{transform:rotate(360deg)}}",
	"@media (prefers-reduced-motion:reduce){#", NS, "-ball>img{animation:none}}",
	// —— 选图面板:一格 = 一个开机画面文件夹 ——
	"#", NS, "-panel{",
	"position:fixed;z-index:10002;",
	"display:none;",
	"flex-direction:column;gap:8px;",
	"padding:10px;",
	"width:328px;max-height:66vh;overflow-y:auto;",
	"border-radius:16px;corner-shape:round;",
	"box-shadow:0 18px 46px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,255,255,.13);",
	// 面板文字颜色由 dynCss 按当前画面算(--bs-fg / --bs-fg-dim,两个都保证 ≥4.5),
	// 这里只给**兜底值**,别让变量还没注进来时整块面板是灰蒙蒙的。
	"color:var(--bs-fg,#EFE9E3);",
	"}",
	"#", NS, "-panel.open{display:flex}",
	"#", NS, "-panel .hd{font-size:11px;letter-spacing:.10em;padding:0 2px 2px;color:var(--bs-fg-dim,#CFC7CE);font-weight:600}",
	"#", NS, "-panel .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}",
	// 格子是 class 不是 id(一格 = 一个画面,数量由清单长度决定,绝不写死)
	"#", NS, "-panel .cell{",
	"position:relative;aspect-ratio:1/1;overflow:hidden;",
	"border-radius:11px;corner-shape:round;",
	"cursor:pointer;",
	"background:#15110F center/cover no-repeat;",
	"box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);",
	"transition:transform .14s ease, box-shadow .14s ease;",
	"}",
	"#", NS, "-panel .cell:hover{transform:translateY(-2px)}",
	"#", NS, "-panel .cell.sel{box-shadow:inset 0 0 0 2px var(--bs-brand,#c9a227),0 6px 16px rgba(0,0,0,.4)}",
	"#", NS, "-panel .cell.bad{filter:grayscale(1) brightness(.6);cursor:not-allowed}",
	"#", NS, "-panel .cell .lab{",
	"position:absolute;left:0;right:0;bottom:0;padding:3px 5px 4px;",
	// 缩略图上压字是唯一"底不可控"的地方(图是用户自己的画),所以这里**不靠面板色**,
	// 靠一条自己的渐变兜底 + 字描边:白图黑图都读得清。
	"font-size:10px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
	"font-weight:650;color:#F8F4F0;text-shadow:0 1px 3px rgba(0,0,0,.95),0 0 6px rgba(0,0,0,.55);",
	"background:linear-gradient(to top,rgba(0,0,0,.9),rgba(0,0,0,.42) 58%,rgba(0,0,0,0));",
	"}",
	"#", NS, "-panel .cell.sel .lab{color:#FFFFFF;background:linear-gradient(to top,rgba(0,0,0,.94),rgba(0,0,0,.5) 62%,rgba(0,0,0,0))}",
	"#", NS, "-panel .cell.bad .lab{color:#F0C7C4}",
	"#", NS, "-panel .foot{display:flex;gap:8px;align-items:center;font-size:10.5px;color:var(--bs-fg-dim,#CFC7CE)}",
	"#", NS, "-panel .foot button{",
	"font:inherit;font-weight:600;padding:3px 9px;border-radius:9px;corner-shape:round;cursor:pointer;",
	"color:var(--bs-fg,#EFE9E3);background:var(--bs-btn-bg,rgba(255,255,255,.10));",
	"border:1px solid var(--bs-btn-bd,rgba(255,255,255,.26));",
	"box-shadow:inset 0 1px 0 rgba(255,255,255,.10);",
	"transition:transform .14s ease, box-shadow .14s ease, filter .14s ease;",
	"}",
	"#", NS, "-panel .foot button:hover{transform:translateY(-1px);filter:brightness(1.18)}",
	"#", NS, "-panel .foot button:active{transform:translateY(0);filter:brightness(.94)}",
	"#", NS, "-panel .foot button:focus-visible{outline:2px solid var(--bs-brand,#c9a227);outline-offset:1px}",
	// —— 统一文本框(2026-11-14 真机定稿,替代上一版失效的 `>` 规则)——
	// 目标 = 会话节点本体 SURFACES.card,**不用直接子代组合器**:上一版写
	// `[data-chat-flow-kind="assistant-step"] > [data-slot="conversation.chat.node"]`,
	// 真机 0 命中(宿主中间多包了一层)⇒ 字直接压在插画上糊掉。打在节点上,嵌套多深都命中。
	// 颜色一律吃 var(--dsw-*):深色态自动墨底、浅色态自动纸底,**不硬编码任何一个面**。
	// 厚度(--bs-card-a/b/q)由 dynCss 按当前画面注入,所以每张图可调而不用改这里。
	CARD_SEL + "{",
	"box-sizing:border-box;position:relative;",
	(SURFACES && SURFACES.cardBox) || "",
	"border-radius:16px;corner-shape:round;",
	// 填充只留**一层**:半透明,画面从底下透出来。厚度 = --bs-card-a/b,由 dynCss/滑块按当前画面注入。
	"background-image:linear-gradient(168deg,",
	"color-mix(in srgb,var(--dsw-alias-bg-layer-2) var(--bs-card-a,94%),transparent),",
	"color-mix(in srgb,var(--dsw-alias-bg-layer-1) var(--bs-card-b,90%),transparent));",
	// 描边 v2 = **box-shadow 发丝边**。上一版是「透明 border + 双层 background-clip」的第二层渐变细边,
	// 真机上基本看不见(用户 11-14 截图复核:「靠底色与背景的明暗差区分」)⇒ 作废。
	// 两条 box-shadow:**第一条不含 color-mix 当保底**(任何 Chromium 都画得出发丝边),
	// 第二条带品牌色,支持 color-mix 的引擎自动覆盖第一条。边与厚度解耦:拖滑块只改填充,边一直在。
	"box-shadow:0 0 0 1px rgba(255,255,255,.20),0 1px 2px rgba(0,0,0,.24),0 14px 34px -14px rgba(0,0,0,.44),inset 0 1px 0 rgba(255,255,255,.06);",
	"box-shadow:0 0 0 1px color-mix(in srgb,var(--bs-brand,#c9a227) 30%,rgba(255,255,255,.14)),0 1px 2px rgba(0,0,0,.24),0 14px 34px -14px rgba(0,0,0,.44),inset 0 1px 0 rgba(255,255,255,.06);",
	"transition:box-shadow .2s ease, transform .2s ease;",
	"}",
	// 品牌色细脊:几何只在 base 画一次,默认隐藏,谁该点亮自己说(省得每类抄一份)
	CARD_SEL + "::before{content:\"\";position:absolute;left:-1px;top:12%;width:2.5px;height:76%;",
	"border-radius:999px;corner-shape:round;opacity:0;pointer-events:none;",
	"background:linear-gradient(180deg,transparent,",
	"color-mix(in srgb,var(--bs-brand,#c9a227) 85%,transparent) 24% 76%,transparent);",
	"}",
	// 助手正文:细脊点亮 + 填充更实一档 + 阴影更深,和次要行拉开层次
	KIND_SEL.assistant + "::before{opacity:1}",
	KIND_SEL.assistant + "{",
	"box-shadow:0 1px 2px rgba(0,0,0,.26),0 18px 42px -16px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.075);",
	"}",
	KIND_SEL.assistant + ":hover{box-shadow:0 1px 2px rgba(0,0,0,.26),0 20px 46px -16px rgba(0,0,0,.56),inset 0 1px 0 rgba(255,255,255,.09)}",
// —— 2026-11-21 二次改向:四遁底框整个删掉,文本框底做成**磨砂玻璃** ——
	//
	// 用户原话:「放弃这个四遁文本框吧,文本框底做成磨砂玻璃吧……原本的配饰就变成选磨砂玻璃的颜色和雾感」。
	// 位图底框在 11-19 ~ 11-21 试过六种形态(环带 / 整图 / 外扩 / 只留四角 / 九宫拉伸 / 上下边饰),
	// 每种都要么挡字、要么把框删得只剩两成 ⇒ 整体废弃。**CSS 里不再出现任何 frame-*.png 引用。**
	//
	// 磨砂玻璃怎么做(这是本轮最需要小心的一处):
	// ⚠ 本文件的第 7 行写着「backdrop-filter 不用(与圆角/超椭圆冲突)」—— 那条是 11-14 的结论,
	//   当时是给**整页/侧栏**上玻璃,`backdrop-filter` 会把 corner-shape:superellipse 的圆角糊掉。
	//   这里的目标是**每张卡片**、且卡片本来就写了 corner-shape:round + border-radius,
	//   实测可行(见真机验收)。所以玻璃只加在卡片上,**绝不加在 body/侧栏/面板大块上**。
	// 两个旋钮(70-dom 写进根变量,这里消费):
	//   --bs-glass-tint : 玻璃颜色。`transparent` = 自动(只用宿主 --dsw-* 底色)。
	//   --bs-glass-fog  : 0~100。同时驱动「底色不透明度」和「模糊半径」:
	//                     雾越大 ⇒ 底色越实、模糊越强 ⇒ 越像毛玻璃;0 ⇒ 几乎全透。
	// 用 calc 从 0~100 换算出具体值,避免在 JS 里算样式(那样每次拖滑块都要重排)。
	// fog=0   ⇒ 底色 ~28%、blur 0
	// fog=100 ⇒ 底色 ~92%、blur 26px
	":root[data-bs-glass] " + CARD_SEL + "{",
	// ── 2026-11-21 重做:用户说「磨砂感和雾感拉满也不是很像」 ──
	// 诊断出来的三个毛病(都是"参数方向"问题,不是旋钮不够大):
	//   ① 模糊 26px 对 637px 宽的卡片**太大** —— 背景里的画被糊成一块均色,
	//      看不出"背后有东西"。真磨砂要能看见**形状在动**,只是不清晰。
	//   ② 渐变那两层在 fog=100 时堆到 92%/82%,**几乎盖死了背景**;
	//      模糊再强也看不见,因为底子已经是不透明的了。
	//   ③ ①② 互相抵消:雾越大 → 越糊 + 越实 → 越像"色块",越不像玻璃。
	// 改法:
	//   · blur 上限从 26px 降到 **14px**(fog=100),保持"能看出背后有画面";
	//   · 把不透明度从 92% 砍到 **58%**,让背景真的透过来;
	//   · 关键一步:**加颗粒**(下面 ::after 的 SVG feTurbulence)——
	//     真磨砂玻璃的质感来自"细碎的不规则",靠模糊是模拟不出来的,
	//     只有 blur 的玻璃永远像"半透明塑料"。
	//   · 再补一层低饱和的**冷白高光**,模拟光在毛面上的散射。
	//
	// ── 2026-11-22 第二轮:用户「还是再透一点(像磨砂亚克力)」 ──
	// 方向明确:要**更透**,但要保住磨砂感。磨砂亚克力的特征:
	//   · 能**清楚**看见背后的东西(不像毛玻璃那样只有个轮廓)  ⇒ 底色再降 + 模糊再降
	//   · 表面仍有均匀的细颗粒(不是镜面)                      ⇒ 颗粒层保留,略降一点
	//   · 有一道**亮边**(亚克力的切割边缘反光很强)             ⇒ 外边 ring 加亮
	// 具体:底色 58%→**38%**,模糊 0.14→**0.10px/级**(fog=100 时 10px),
	//       颗粒 0.009→0.0075(略微收一点,免得"透"了之后显得脏)。
	"background-color:color-mix(in srgb,",
	"var(--bs-glass-tint,transparent) calc(var(--bs-glass-fog,34) * 0.50%),",
	"var(--dsw-alias-bg-layer-2) calc(38% - var(--bs-glass-fog,34) * 0.16%));",
	"background-image:linear-gradient(168deg,",
	"color-mix(in srgb,var(--dsw-alias-bg-layer-2) calc(16% + var(--bs-glass-fog,34) * 0.22%),transparent),",
	"color-mix(in srgb,var(--dsw-alias-bg-layer-1) calc(12% + var(--bs-glass-fog,34) * 0.20%),transparent),",
	// 冷白散射光:左上打过来的漫射,磨砂面才有这种"发白发灰"的观感
	"linear-gradient(160deg,rgba(255,255,255,calc(var(--bs-glass-fog,34) * 0.0014)) 0%,",
	"rgba(255,255,255,0) 42%,rgba(255,255,255,calc(var(--bs-glass-fog,34) * 0.0008)) 100%));",
	// 模糊:上限 10px。0.10px/级 —— 亚克力比毛玻璃清楚得多,只是"不够锐"。
	"backdrop-filter:blur(calc(var(--bs-glass-fog,34) * 0.10px)) saturate(calc(100% + var(--bs-glass-fog,34) * 0.16%)) brightness(calc(100% + var(--bs-glass-fog,34) * 0.05%));",
	"-webkit-backdrop-filter:blur(calc(var(--bs-glass-fog,34) * 0.10px)) saturate(calc(100% + var(--bs-glass-fog,34) * 0.16%)) brightness(calc(100% + var(--bs-glass-fog,34) * 0.05%));",
	// 玻璃边缘:外圈一道亮边 + 内圈一道暗边 = 厚玻璃的"边缘折射"
	// 2026-11-22:外边从 .20 提到 **.30**,内高光 .16→.22 —— 亚克力越透,
	// 边缘反光就越关键:它是"这是一块板"的唯一线索,没有它整块就显得"没边"。
	"box-shadow:0 0 0 1px rgba(255,255,255,.30),0 1px 2px rgba(0,0,0,.22),",
	"0 16px 38px -18px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.22),",
	"inset 0 -1px 0 rgba(0,0,0,.12);",
	"position:relative;",
	"}",
	// ── 颗粒层:这才是「磨砂」的质感来源 ──
	// 只有 blur 的玻璃永远像"半透明塑料":光滑、均匀、能看出是个色块。
	// 真磨砂玻璃表面是**无数细小的凹凸**,光在每一处随机散射,
	// 所以近看有细碎的明暗噪点,而且这层噪点**压在内容之上**(不是压在背景上)。
	// 做法:一张 inline SVG 的 feTurbulence(分形噪声),当 background-image 重复铺满卡片。
	// 用 SVG 而不是位图 = 不用往仓库塞 PNG,而且缩放不糊、可以按 fog 调透明度。
	//
	// ⚠ 2026-11-21 调试记录(第一版颗粒看不见):
	//   ① baseFrequency 0.82 太细 —— 180px 的 tile 里塞了几千个噪点,缩到 1x 屏幕上
	//      被 CSS 采样抹平了,只剩"淡淡的灰"。改成 **0.55**,噪点变大一点才留得住。
	//   ② opacity 系数 0.0042 在 fog=34 时只有 0.14,肉眼几乎不可见。
	//      改成 **0.009**,fog=34 ⇒ 0.31,fog=100 ⇒ 0.90。
	//   ③ mix-blend-mode:overlay 在深色底上几乎不产生效果(overlay 对暗部作用弱)。
	//      改成 **soft-light 叠一层 + 普通的低透明覆盖** —— 暗底亮底都有颗粒。
	"@supports (background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E\")){",
	":root[data-bs-glass] " + CARD_SEL + "::before{",
	"content:\"\";position:absolute;inset:0;border-radius:inherit;corner-shape:round;",
	"pointer-events:none;z-index:0;",
	"background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23g)' opacity='0.72'/%3E%3C/svg%3E\");",
	"background-repeat:repeat;background-size:160px 160px;",
	// 颗粒强度吃 fog:0 = 完全看不见,100 = 明显的磨砂面。
	// 2026-11-22 从 0.009 收到 0.0075:底色降到 38% 之后,背景本身更清楚,
	// 颗粒就不用那么重;太重会在"透"的底子上显得脏(像屏幕有灰)。
	"opacity:calc(var(--bs-glass-fog,34) * 0.0075);",
	"mix-blend-mode:overlay;",
	"}",
	"}",
	/* ── 可读性补偿(2026-11-21)──
	   玻璃透出背景之后,白字压在"亮色天空"那一段会读不清 —— 这是真的隐患,
	   因为磨砂只是把背后**糊掉**,并没有让它**变暗**。
	   补偿方式不是盖一层纱(那会把玻璃又变成色块),而是:
	     · 卡片内容自己带一圈极淡的暗描边(text-shadow),让字在任何底子上都立得住;
	     · 只加在 .bs-glass 上,关掉玻璃时零影响。
	   这是给"透更多背景"买的保险,不是装饰。 */
	":root[data-bs-glass] " + CARD_SEL + "{",
	"text-shadow:0 1px 2px rgba(0,0,0,.34),0 0 12px rgba(0,0,0,.16);",
	"}",
	// 卡片内容要压在颗粒层之上,否则字会被噪点"咬"到(可读性红线)
	":root[data-bs-glass] " + CARD_SEL + ">*{position:relative;z-index:1}",
	// 关档(没挂 data-bs-glass)⇒ 上面这一整组规则一个像素都不生效,
	// 卡片退回原来那条"半透明渐变"的样式 ⇒ 用户的硬要求「其他效果不变」仍然成立。
	// 面板里玻璃那排按钮 + 颜色小圆点的选中态。
	"#" + NS + "-panel .row button[aria-pressed=true]{background:var(--bs-brand,#c9a227);color:#1A1208;border-color:rgba(255,255,255,.42)}",
	"#" + NS + "-panel .row i{font-style:normal;opacity:.72;margin-right:2px}",
	// 颜色小圆点:一排等大的圆,选中时套一圈品牌色外环。
	"#" + NS + "-panel .row.glass-tints{gap:5px}",
	"#" + NS + "-panel .row.glass-tints .tint{width:17px;height:17px;padding:0;border-radius:999px;corner-shape:round;",
	"border:1px solid rgba(255,255,255,.30);box-shadow:0 0 0 0 transparent;transition:box-shadow .14s ease}",
	"#" + NS + "-panel .row.glass-tints .tint.auto{",
	"background:linear-gradient(135deg,rgba(255,255,255,.85),rgba(140,150,170,.55) 55%,rgba(30,34,44,.85))}",
	"#" + NS + "-panel .row.glass-tints .tint[aria-pressed=true]{box-shadow:0 0 0 2px var(--bs-brand,#c9a227)}",
	// 面板里配饰那排按钮的选中态(按钮本身已有样式,这里只补 pressed)
	// (上面 L195-196 已有一条同样的规则,这里不再重复一份 —— 重复不会出错但会误导后来人。)
	// 轮播那排:三个按钮横排,标签让一点位,开关态靠 aria-pressed 上色。
	"#" + NS + "-panel .row.rotate{gap:6px;flex-wrap:wrap;padding:2px 0 4px}",
	"#" + NS + "-panel .row.rotate button{font-size:10.5px}",
	// —— 滚动条:补一块轨道底(用户 11-14 点名「给它绘制一个底色块」)——
	// 为什么是底块而不是"把滑块颜色加深":这条滚动条背后是**开机画面本身**,同一列里既有月影也有亮弧,
	// 亮度能差 6 档。背景一直在变的控件,调前景色永远修不好 —— 只能给它一个**已知的局部背景**。
	// 只写 track/thumb/corner,**宽度一概不动**(改宽度会推 layout,全站跟着抖;自测里有一条刹车盯着这个)。
	// 已知失效面:宿主/侧栏里设了 `scrollbar-width:thin` 的元素,Chromium 会忽略伪元素(那是标准属性优先),
	// 那些地方仍靠上面的 --dsw-alias-scrollbar-* 令牌保底,所以两条路都各留了一份。
	"::-webkit-scrollbar-track{background:rgba(128,128,128,.26)}",
	"::-webkit-scrollbar-track{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 62%,transparent)}",
	"::-webkit-scrollbar-thumb{border-radius:999px;corner-shape:round}",
	"::-webkit-scrollbar-corner{background:transparent}",
	// —— 宽内容不许逃出卡片(11-14 用户截图:宽表格右几列压在画上糊掉) ——
	// 根因不是"底色太短",是 **底色盒不跟着内容长**:表格的 min-content 宽度 > 卡片盒宽,
	// 而 overflow 默认 visible,于是右几列画在盒外、直接坐在开机画上。
	// 药方:让表格自己变成**横向滚动容器**(display:block + overflow-x:auto),列宽保持自然,
	// 溢出变成卡片内部一条滚动条,而不是溢出到画上。
	// 不用「固定表格布局」那一系(把列强制等宽):状态列(✅/❌)会和长路径列一样宽,更难看。
	// 注意 display:block 之后表格仍有匿名 table 包裹,thead/tbody 照旧对齐,列宽不受影响。
	CARD_SEL + " table{display:block;max-width:100%;overflow-x:auto}",
	// 行内代码里那种超长不中断 token(`$doTempWorkspace = -not $OnlyAttachments`)是第二个撑宽源:
	// 它会把单元格顶宽,进而顶宽整张表。给它允许断行,连"滚动"都不必出现。
	CARD_SEL + " code{overflow-wrap:anywhere;word-break:normal}",
	CARD_SEL + " pre{max-width:100%;overflow-x:auto}",
	// 卡片本身兜一层,但**不用 overflow:hidden**:那会裁掉 left:-1px 的竖脊,还会夹死卡内浮层。
	// 用 flex 老招 `min-width:0` —— 撑宽的真正原因是子项 min-width:auto 不肯缩到内容宽度以下。
	CARD_SEL + " > *{min-width:0;max-width:100%}",
	// 用户/引导行**故意不做卡片**:宿主给它们的是实底气泡(ui-chat:5737
	// `.cJsG2q_bubble{background:var(--dsw-specific-bubble)}`,真机也确认清楚),
	// 再套一层就是框中框。base 规则里已用 :not() 把它们排除,这里不再补规则。
	// 次要行(工具调用/过程折叠/系统行):更薄,免得整屏全是卡片把画面盖死
	KIND_SEL.quiet + "{",
	// 次要行:同样单层填充(比正文薄一档),描边也走 box-shadow 发丝边(比正文更淡)
	"background-image:linear-gradient(168deg,",
	"color-mix(in srgb,var(--dsw-alias-bg-layer-2) var(--bs-card-q,76%),transparent),",
	"color-mix(in srgb,var(--dsw-alias-bg-layer-1) var(--bs-card-q,76%),transparent));",
	"box-shadow:0 0 0 1px rgba(255,255,255,.13),0 1px 2px rgba(0,0,0,.16),0 8px 20px -12px rgba(0,0,0,.30);",
	"box-shadow:0 0 0 1px color-mix(in srgb,var(--bs-brand,#c9a227) 16%,rgba(255,255,255,.10)),0 1px 2px rgba(0,0,0,.16),0 8px 20px -12px rgba(0,0,0,.30);",
	"border-radius:12px;corner-shape:round;",
	"}",
	// 判定②(用户授权我自己定,11-14):**次要行也要有脊,但只给 .28**。
	// 看不见的设计等于没有;而它必须比正文的脊淡,否则「哪块是回答」的层级就没了。
	KIND_SEL.quiet + "::before{opacity:.28}",
	// reduced-motion:文本框不需要动画,这里只声明画框不跟着抖
	"@media (prefers-reduced-motion:reduce){" + CARD_SEL + "{transition:none}}",
	// —— 调参区:真滑块,不靠控制台 ——
	// 为什么必须有:图片因版权被 gitignore、或上插件市场给别人用时,**没有 tuned 文件可改**,
	// 只能靠界面上的滑块。所以滑块是这个插件的一等公民,不是调试工具。
	"#", NS, "-panel .tune{display:flex;flex-direction:column;gap:5px;padding:7px 8px 8px;",
	"border-radius:12px;corner-shape:round;",
	"background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018));",
	"box-shadow:inset 0 0 0 1px rgba(255,255,255,.10);}",
	"#", NS, "-panel .tune .t{font-size:10px;letter-spacing:.09em;color:var(--bs-fg-dim,#CFC7CE);font-weight:600}",
	"#", NS, "-panel .tune label{display:flex;align-items:center;gap:7px;font-size:10.5px;color:var(--bs-fg,#EFE9E3)}",
	"#", NS, "-panel .tune label>i{flex:0 0 46px;font-style:normal;white-space:nowrap;color:var(--bs-fg,#EFE9E3)}",
	"#", NS, "-panel .tune label>b{flex:0 0 34px;text-align:right;font-weight:650;color:var(--bs-fg,#EFE9E3);font-variant-numeric:tabular-nums}",
	"#", NS, "-panel .tune input[type=range]{flex:1 1 auto;min-width:0;-webkit-appearance:none;appearance:none;height:16px;background:transparent;cursor:pointer}",
	"#", NS, "-panel .tune input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:999px;corner-shape:round;",
	"background:linear-gradient(90deg,var(--bs-brand,#c9a227),rgba(255,255,255,.15))}",
	"#", NS, "-panel .tune input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;margin-top:-4px;",
	"border-radius:999px;corner-shape:round;background:#F3EDE6;box-shadow:0 0 0 1px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.5)}",
	"#", NS, "-panel .tune .hit{font-size:10px;color:var(--bs-fg-dim,#CFC7CE);font-variant-numeric:tabular-nums}",
	// 命中 0 个盒子 = 卡片根本没生效。这条**必须刺眼**,不能安静地让人以为"生效了只是不喜欢"
	"#", NS, "-panel .tune .hit.bad{color:#F4B9B5;opacity:1;font-weight:600}",
	"#", NS, "-panel .tune .row{display:flex;gap:6px;align-items:center}",
	"#", NS, "-panel .tune textarea{flex:1 1 auto;min-width:0;height:32px;resize:none;color:inherit;",
	"font:9.5px/1.35 ui-monospace,Consolas,monospace;border-radius:8px;corner-shape:round;padding:3px 5px;",
	"border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.30)}",
	// —— 说明条(也是诊断条:降级的时候它就亮着,不静默)——
	"#", NS, "-chip{",
	"position:fixed;z-index:10000;",
	"pointer-events:none;display:none;",
	"padding:4px 9px;border-radius:10px;corner-shape:round;",
	"font-size:11px;line-height:1.35;white-space:nowrap;",
	"box-shadow:0 5px 16px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.12);",
	"}",
	// —— 11-16 **撤掉**昨天那条"把交付卡浅色头压黑"的规则(原文注释掉留在下面当考古)——
	// 昨天装机后自检显示 under19=0 lights=0,我把它读成"修好了" —— **那是假绿**:三拍全在开屏动画
	// 刚结束的 5 秒内,而那张卡当时根本不在 DOM 里(用户在另一个会话)。缺证据 ≠ 证据表明没病。
	// 真机结果:头**仍然亮白** ⇒ 宿主那张表插在我们之后,同等特异度它赢,我这行 background-color 从没生效。
	// 与其留一条"时灵时不灵、万一赢了还会造成深头/浅身分段"的规则,不如让 70-dom 的 **heal 成为唯一确定机制**
	// (只把浅底上的浅字压深,不动底色,卡片保持完整浅色)。"整张卡跟着主题变黑"是另一个设计决定,
	// 要连正文深字与 SVG 图标一起改,已列为待用户拍板。
	// "div[class*=\"_card\"]>button[class*=\"_header\"]{background-color:var(--dsw-alias-bg-layer-2,#1B1A1D);color:var(--dsw-alias-label-primary,#F4F3F3)}",
	// —— 11-18:宿主开机卡那行提示实测 `#81858c` 压 `#ffffff` = **3.71**(低于 AA 4.5)——
	// 这块白卡是**宿主自己的**:我们的 dsh-boot-gallery 用的是 `bgl-skip` 类,不是 `_hint_u7vgf_`,
	// 所以源头改不到,只能从套件侧压,而且**必须 !important** —— 11-16 那条背景规则正是输在特异度上。
	// 只压**字色、不碰白底**:同卡里的 wordmark/图标描边是按浅底画的(实测 cr 18.9,本来就好),改底会把它们一起弄坏。
	// 选择器锁在 `_boot_` 之内,不外溢到会话区别的 `_hint_`。
	"div[class*=\"_boot_\"] [class*=\"_hint_\"]{color:#4A4D55 !important}",
	// #4A4D55 压白 ≈ **8.53**(过 AAA),原来 #81858c 只有 3.71。
	// 验收方式:探针的 `contrast=light` 行里这条 path(…_card…>…_hint…)的 `cr=` 应从 3.71 升到 ≥8。
].join("");
