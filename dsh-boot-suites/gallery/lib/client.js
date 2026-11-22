window.__ModuleLoader__.load({
	id: "dsh-boot-suite-gallery",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		// 由 tools/build-client.mjs 从 parts/ 拼接生成 —— **别直接改这个文件**,改 parts/*.part.js
		// 源 parts: 10-data.part.js + 20-color.part.js + 30-tokens.part.js + 40-eye.part.js + 50-css.part.js + 60-boot.part.js + 70-dom.part.js + 90-apply.part.js

		// =============================================================
		// 10-data · 构建期注入的两份数据
		//   PALETTES   : preset id -> 这一套画面的调色(由 palettes/auto + palettes/tuned 合并)
		//   TOKEN_NAMES: 宿主的 89 个 --dsw-* token 名字(由 tools/extract-tokens.mjs 抽)
		// 两份都在 build 时被替换;源码里留 null 占位,拿不到就是**看得见的**降级(见 30-tokens)。
		// =============================================================

		const PALETTES = {};
		const TOKEN_NAMES = ["--dsw-alias-bg-base","--dsw-alias-bg-layer-1","--dsw-alias-bg-layer-2","--dsw-alias-bg-layer-3","--dsw-alias-bg-mask-1","--dsw-alias-bg-mask-2","--dsw-alias-bg-mask-3","--dsw-alias-bg-mask-drop","--dsw-alias-bg-mask-photo","--dsw-alias-bg-module-platform","--dsw-alias-bg-multi-select","--dsw-alias-bg-overlay","--dsw-alias-bg-skeleton","--dsw-alias-border-inverted","--dsw-alias-border-inverted2","--dsw-alias-border-l1","--dsw-alias-border-l2","--dsw-alias-border-l2-darkmode-thin","--dsw-alias-border-l3","--dsw-alias-border-l4","--dsw-alias-brand-primary","--dsw-alias-brand-primary-invert","--dsw-alias-brand-primary-new-colorprimary-new-color","--dsw-alias-brand-text","--dsw-alias-button-contrast-fill","--dsw-alias-button-elevated-fill","--dsw-alias-button-floating-fill","--dsw-alias-button-floating-hover","--dsw-alias-button-ghost-active-border","--dsw-alias-button-ghost-active-fill","--dsw-alias-button-ghost-active-hover","--dsw-alias-button-info-fill","--dsw-alias-button-info-hover","--dsw-alias-button-primary-dimmed","--dsw-alias-button-primary-fill","--dsw-alias-button-primary-hover","--dsw-alias-button-tool-bar-fill","--dsw-alias-button-tool-bar-fill-invisible","--dsw-alias-button-tool-bar-hover","--dsw-alias-interactive-bg-active","--dsw-alias-interactive-bg-hover","--dsw-alias-interactive-bg-hover-accent","--dsw-alias-interactive-bg-hover-danger","--dsw-alias-interactive-bg-hover-solid","--dsw-alias-label-caption","--dsw-alias-label-dimmed","--dsw-alias-label-primary","--dsw-alias-label-primary-bluish","--dsw-alias-label-primary-dimmed","--dsw-alias-label-primary-foreground","--dsw-alias-label-primary-inverted","--dsw-alias-label-secondary","--dsw-alias-label-tertiary","--dsw-alias-markdown-citation","--dsw-alias-markdown-code-block","--dsw-alias-markdown-code-block-banner","--dsw-alias-markdown-code-segment-selected","--dsw-alias-markdown-code-segment-unselected","--dsw-alias-markdown-inline-code","--dsw-alias-markdown-placeholder","--dsw-alias-markdown-tag","--dsw-alias-scrollbar-bg-l1","--dsw-alias-scrollbar-bg-l2","--dsw-alias-scrollbar-hover-l1","--dsw-alias-scrollbar-hover-l2","--dsw-alias-state-business-primary","--dsw-alias-state-business-tertiary","--dsw-alias-state-error-primary","--dsw-alias-state-error-secondary","--dsw-alias-state-success-primary","--dsw-alias-state-success-secondary","--dsw-alias-state-success-tertiary","--dsw-alias-state-warn-label","--dsw-alias-state-warn-primary","--dsw-alias-state-warn-secondary","--dsw-alias-state-warn-tertiary","--dsw-alias-toast-bg","--dsw-alias-tooltip-bg","--dsw-specific-bubble","--dsw-specific-bubble-highlight","--dsw-specific-input-major","--dsw-specific-login-input","--dsw-specific-menu","--dsw-specific-selector","--dsw-specific-sidebar-fill","--dsw-specific-sidebar-nav-item-active","--dsw-specific-sidebar-nav-item-active-accent","--dsw-specific-sidebar-nav-item-hover","--dsw-specific-tip"];
		// 消息容器/输入框的**实测选择器**(data/surfaces.json)。空数组 = 只靠 token 覆盖,
		// 不额外压 CSS 规则。填了就是第二道保险,见 60-boot 的 dynCss 末尾。
		const SURFACES = {"_note":"画面落点 + 统一文本框落点。改这里就能跟上宿主升级,不用动 parts/*.part.js。","_provenance":"2026-11-14 升级:选择器来源从『静态考古 app.asar』换成 **live 宿主问出来的权威数据** —— cordis_inspect_query(client / Slots / listSubTree, root=conversation.chat)给出 conversation.chat.node 的 keyDomain 实际取值:\n  assistant-step, command, command-input, compaction, context, manual-compaction, model-retry, question-reply, steering, system-prompt, tool-call, turn-error, turn-max-tokens, turn-process, turn-tail, turn-trigger, unknown, user, workflow-run\n以及 Theme.listTokens 的权威 token 名单(见 data/tokens.json 的 _provenance)。","_why_not_descendant_combinator":"上一版写的是 `[data-chat-flow-kind=\"assistant-step\"] > [data-slot=\"conversation.chat.node\"]`,真机 0 命中(宿主中间多包一层),所以字直接压在画上糊掉。这一版把文本框**打在会话节点本体上**,嵌套多深都命中;角色差异只用后代组合器 ` ` 加装饰,不用 `>`。","_mode_note":"文本框的颜色一律走 var(--dsw-*) token(实现在 parts/50 的 shellCss),所以**深色态自动墨底、浅色态自动纸底**。绝不能再硬编码一个深色面 —— 那样浅色主题会出现『深字压深底』的新糊法。不透明度用 --bs-card-a/b 两个 CSS 变量,由 dynCss 按当前画面注入,所以每张图可调且不碰画布 token。","conversation":["[data-conversation-content]","[data-conversation-scroll]"],"card":"[data-chat-flow-kind]:not([data-chat-flow-kind=\"user\"]):not([data-chat-flow-kind=\"steering\"]) > [data-slot=\"conversation.chat.node\"] > div","_card_mechanism":"2026-11-14 考古定案(app.asar / dsh-client-ui-renderer/lib/client.js:1088-1103):SlotOutlet 渲染成 <div data-slot=… style=\"display:contents\">,注释原文 \"keeps the wrapper out of layout … the anchor is purely addressable surface\"。**display:contents 不生成盒子** ⇒ 给它加 background/padding/border **完全没有视觉效果**。这就是上一版『选择器没错、卡片却看不见』的真因(自测当时数到了节点数,却数不出'有没有盒子'——所以这次连盒子一起验)。正解 = 往下一层:outlet 的唯一子 div 就是内容根(AssistantMarkdown 的 .v5IAXa_root,逐字源码 ui-chat:5955;它是真盒子、宿主没给它任何 background)。用 `> div` 而不是哈希类名,升级不容易碎。","_card_not_user":"user/steering 用 :not() 排除:它们自带 `.cJsG2q_bubble{background:var(--dsw-specific-bubble)}`(实底气泡,真机也证实清楚可读),再套一层卡片会变成框中框。","cardBox":"padding:6px 12px;","cardBox_note":"盒子内边距加在**内容根**上(不是那个 contents 锚点)。上一版还配了 margin 负值去抵宿主 padding,现在目标层变了,先只用 padding;真机若嫌卡片之间太挤,加 row-gap 类的规则到 surfaces.json 而不是改这里。","cardKinds":{"assistant":["[data-chat-flow-kind=\"assistant-step\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"question-reply\"] > [data-slot=\"conversation.chat.node\"] > div"],"quiet":["[data-chat-flow-kind=\"tool-call\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"turn-process\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"turn-trigger\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"command\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"command-input\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"compaction\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"manual-compaction\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"context\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"turn-error\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"turn-max-tokens\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"model-retry\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"system-prompt\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"workflow-run\"] > [data-slot=\"conversation.chat.node\"] > div","[data-chat-flow-kind=\"unknown\"] > [data-slot=\"conversation.chat.node\"] > div"]},"_kinds_source":"19 个 kind 取值来自 live 宿主:cordis_inspect_query(client / Slots / listSubTree, root=conversation.chat)的 keyDomain 'already taken' 清单;user/steering 归宿主自己的气泡,不在这两张表里。","_quiet_note":"次要内容(工具调用/过程折叠/系统行)用更薄的一层底,免得整屏全是卡片、画面又被完全盖死。","legacy_assistant_removed":"2026-11-14:原 assistant[] 三条 `>` 规则与 dynCss 里硬编码的深色底一并作废,由上面的 card/cardKinds 取代。"};

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
		const PKG = "dsh-boot-suite-gallery";

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
				// item 原样带出来:球心图要读 preset.json 的 `eye` 字段(见 70-dom 球心那段),
				// 而那个字段只存在于清单条目里,不在调色文件里。没有它,导入的主题画不出球心图。
				item: item || null,
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
			// 本套可用的**幕图**清单(NN.jpg)。壁纸轮播/「下一张」要遍历它,所以必须跟着 art 一起出去。
			// ⚠ 2026-11-21 修:早先这里不返回 files,而 nextArt() 读的是 st.art.files ⇒ 永远是空的
			// ⇒ 函数在 `if (files.length < 2) return;` 那一行就退出了,「下一张」点了没反应。用户报的就是这个。
			const shots = files
				.filter((f) => f && f.url && /^0\d\.(jpe?g|png|webp)$/i.test(String(f.name || "")))
				.map((f) => ({ name: f.name, url: cleanUrl(f.url) }))
				.sort((a, b) => String(a.name).localeCompare(String(b.name)));
			const pal = PALETTES && PALETTES[item.id];
			const want = pal && pal.hero && pal.hero.file ? String(pal.hero.file).toLowerCase() : null;
			const hit = want ? files.find((f) => f && String(f.name).toLowerCase() === want) : null;
			if (hit && hit.url) return { url: cleanUrl(hit.url), pos: (pal.hero.pos || "center"), src: "hero", file: want, files: shots };
			const uri = safeCall(() => api.thumbUrl(item));
			if (uri) return { url: cleanUrl(uri), pos: "center", src: "thumbUrl", file: null, files: shots };
			const any = shots.length ? shots[0] : null;
			if (any) return { url: any.url, pos: "center", src: "first-file", file: any.name, files: shots };
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
			// 为什么必须改:pal 来自 palettes/<id>.json(调色文件),而 17 套调色已随主题素材移出仓库,
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
				// ⚠ 2026-11-21 第三次修(用户:多套主题的悬浮球还没有图案)。
				// 这几套本来就没有照片(轮回眼/白眼/纸蝶只能手绘),走的是 else 分支;
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
			//   ② untuned = !PALETTES[st.preset] —— 17 套调色已随主题素材移出仓库,
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
			// 轮播/壁纸(2026-11-21):自测要能点开关、能问"下一套是谁",所以一并暴露。
			rotateOn, setRotate, wallOn, setWall, nextPresetId, nextArt, choose,
			setApiWait: (ms) => { API_WAIT_MS = Number(ms) || 0; apiWaitUntil = 0; },
			get artTarget() { return ART_TARGET; },
			STATE,
		};
		return module.exports;
	},
});
