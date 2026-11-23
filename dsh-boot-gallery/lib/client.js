window.__ModuleLoader__.load({
	id: "dsh-boot-gallery",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		// =====================================================================
		// 开屏动画 · 浏览器侧 bundle（通用主题框架，不绑定任何特定作品）
		//   1) 默认走**图片分镜**（素材由运行时从 arts/ 目录读，不内嵌）
		//   2) 若宿主侧 ~/\.dsh\boot-naruto\clips\ 里有 mp4/webm，则改播那一段
		//   3) 若宿主侧 ~/\.dsh\boot-naruto\arts\<preset>\ 里有预设(preset.json + 图)，
		//      就用那个预设自己的分镜替掉内置幕 —— **一个预设只用一个素材文件夹的图**
		//   4) 每次启动 DSH 播一次；点画面或 Esc 跳过；Ctrl+Alt+B 强制重播（调试用）
		// 优先级:mp4 片源 > 预设 > 内置兜底。任何一环失败(网络 / 404 / JSON 坏 / schema 不对 /
		// acts 空)都必须**原样**落到下一级，最坏就是内置兜底 —— 内置兜底一个字节都不许变。
		// 注意:**不要**在这里导出 inject —— 客户端加载器对没激活的条目是直接抛的
	//        ("web boot: N entries did not activate"),整个 GUI 会起不来。
		// =====================================================================

		const PKG = "dsh-boot-gallery";
		const STYLE_ID = PKG + "-style";
		const BOOT_KEY = PKG + ":boot";          // sessionStorage:一次应用启动 = 一个标签页
		const CLIPS_ROUTE = "/" + PKG + "/clips.json";
		const PRESETS_ROUTE = "/" + PKG + "/presets.json";
		const ARTS_ROUTE = "/" + PKG + "/arts";           // 同源前缀:预设的 preset.json 与图片只从这儿取
	const FR = "/" + PKG + "/frames/";
	// —— 11-14 拆分:片头分镜帧已从代码剥走,改从图库取(frames/ 目录,不属于任何预设)。
	// 只装代码包、没下图库的人:这里让碎图**不出现**(隐藏该 img,露出下面的云/渐变层),
	// 并**一次性**把 frames=missing 报进 boot.log(走现成的 /report 通道),别每帧刷一条。
	let __framesWarned = false;
	document.addEventListener("error", (ev) => {
		const t = ev.target;
		if (!t || t.tagName !== "IMG" || !t.currentSrc || t.currentSrc.indexOf("/frames/") < 0) return;
		t.style.display = "none";
		if (__framesWarned) return;
		__framesWarned = true;
		try { fetch("/" + PKG + "/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ frames: "missing" }) }).catch(() => {}); } catch (e) {}
	}, true);
		const REPLAY_KEY = { ctrl: true, alt: true, key: "b" };

		// ---- 预设契约(宿主 lib/index.js、素材生成方、这里,三处必须一致)----
		const PRESET_SCHEMA = 1;        // preset.json 的 schema 不等于它 = 坏数据 = 回落内置
		const MAX_PRESET_ACTS = 8;      // 单预设最多几幕(别人塞 50 张也别想拖死浏览器)
		const PRESET_PROBE_MS = 1500;   // 清单 / preset.json 各自的取回预算
		const PRESET_ENABLE = true;     // 关掉就永远走内置(排障用)
		// 11-19 用户改口径:视频不再"目录里有就抢占所有预设",改成**由预设自己点名**。
		// VIDEO_GLOBAL = true 才回到老语义(丢进 clips 就全局播);默认 false ⇒ 只有 preset.json 里
		// 写了 `"clip": "<clips 目录里的真文件名>"` 的那个预设播视频,其余预设**逐帧和以前一模一样**。
		// 兼容性:clip 是**未知键**,老宿主(presetEntry 只硬校验 schema/acts)和老客户端都会安静忽略,
		// 所以同一份资源包在新老 DSH 上都能用 —— 老版本只是继续用全局语义(要真视频就把 VIDEO_GLOBAL 改 true)。
		const VIDEO_GLOBAL = false;

		// ---- 时间轴(单位 ms;想整体加快就把 SPEED 调大)----
		const SPEED = 1.0;
		const CROSS = 420;      // 交叉溶解
		const EXIT = 460;       // 退场「虚化淡出」时长,必须 < HANDOFF
		const HANDOFF = 520;    // 浮层真正卸载的等待时间
		const VIDEO_PROBE_MS = 1200;

		// 动线设计(2026-11-08,依据 9 张定稿图的逐宫实测:主体宫位 / 负空间 / 动势线 / 明暗落差)
		// 一条连续视线轨道:左下起 → 一路向右上推进 → 中段横向甩 → 对撞收在中心 → 终幕向两侧拉开
		// 铁律:每一幕的**出场方向 = 下一幕的入场方向**,观众的视线被甩向哪边,下一幕的主体就得从那边出现。
		const TIMELINE = [
			{ kind: "cloud", dur: 300 },
			// 幕1(唯一竖构图 900x1600):cover 到 16:9 时裁的是**上下**不是左右,主体带(中上+正中)靠 pos 顶进可见带。
			// 动势 = 左下往右上,所以从右下推入、往左上退 => 出场方向=右
			{ kind: "img", src: FR + "01.jpg", pos: "62% 22%", z0: 1.16, z: 1.05, kb: ["4% 5%", "-4% -4%"], dur: 1250 },
			// 幕2:正面直视镜头 = 全片第一个**刹车点**,所以只做极小的横移。图里上下各烘死约 4% 纯白 matte 带,
			// 靠 z 全程 >=1.06 把它裁在框外(否则从幕1 的黑底切过来就是撞一面白墙,实测落差 +37 是最陡的一处)。
			{ kind: "img", src: FR + "02.jpg", pos: "50% 30%", z0: 1.13, z: 1.06, kb: ["-4% 0%", "2% -1%"], dur: 850, pupil: "50% 24%" },
			// 幕3:中心朝右上放射 + 大 C 形环抱 => 顺放射往右上冲 => 出场方向=右上
			{ kind: "img", src: FR + "03.jpg", pos: "52% 58%", z0: 1.0, z: 1.14, kb: ["-4% 2%", "4% -4%"], dur: 850 },
			// 幕4:右半是全组最大的一块负空间,和幕3 的出场方向**接得上** => 从右往左长滑接住,
			// 落点在左中的亮边 => 出场方向=左。左下角的来源水印:AR 2.22 的 cover 本就裁掉左右各约 11%,
			// 再把 z 抬到 1.06 以上就彻底藏进框外。人物只占约 3% 面积,所以这一幕给到 800ms 让人找得到主体。
			{ kind: "img", src: FR + "04.jpg", pos: "55% 50%", z0: 1.10, z: 1.06, kb: ["6% -2%", "-5% 2%"], dur: 800 },
			// 幕5:从左侧急推入中心 + 白闪(接幕4 向左的出场方向)。贴边(主体穿框)在这里无所谓,要的就是炸开
			{ kind: "img", src: FR + "05.jpg", pos: "50% 46%", z0: 1.0, z: 1.18, kb: ["-7% 4%", "0% 0%"], dur: 430, flash: true },
			// 幕6 ⊕ 幕7 对撞:左图重心在上半、负空间在下半 => 左半**自下往上**升起;右图动势是右上→左下俯冲 =>
			// 右半**自上而下**砸进来。两股相反的力正好在中线上相撞,clash 那道白竖线才有"被撞出来"的理由。
			{ kind: "duel", a: FR + "06.jpg", aPos: "40% 30%", b: FR + "07.jpg", bPos: "60% 42%", dur: 1350 },
			// 幕8:两张大脸占满左右两侧、中心最暗 => **向心推近**,把中央那两个小主体(缩略后只有 20px)
			// 放大成主角。底部约 3% 的烘死白雾带同样靠 z>=1.08 裁掉。瞳孔环挪到正中偏上。
			{ kind: "img", src: FR + "08.jpg", pos: "50% 44%", z0: 1.08, z: 1.2, kb: ["0% 0%", "0% -3%"], dur: 900, pupil: "50% 40%" },
			// 幕9 终幕:左半向左爆发、右半向右下拖拽 => **向两侧拉开**(退到近 1.0),把右上那块全片最暗的负空间
			// 空出来给竖排片名。明暗落差在这一步反而帮上忙:最亮的一张退到最暗的一张,读作"落幕"而不是"闪屏"。
			{ kind: "img", src: FR + "09.jpg", pos: "46% 46%", z0: 1.2, z: 1.02, kb: ["0% 0%", "3% 1%"], dur: 900, title: "开屏动画", sub: "dsh-boot-gallery", by: "dsh-boot-gallery" },
		];

		// ---- 预设(preset)分镜:把 preset.json 的 acts 归一化成上面 TIMELINE 的**同一种形状** ----
		// 规矩:逐字段验类型,**不合范围/形状的一律回默认值**(不许用 0 顶上去,0 会让画面塌成一条线);
		//       幕数硬截到 MAX_PRESET_ACTS;文件必须是白名单位图,URL 只能拼同源 /arts/<预设>/ 前缀。
		const PID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;              // 与宿主 safeSeg 同一条
		const PFILE_RE = /^[a-z0-9][a-z0-9._-]{0,99}$/;           // 单个文件段,不含斜杠
		const PIMG_RE = /\.(jpe?g|png|webp)$/;                    // 与宿主 ART_MIME 同一张白名单
		const PPCT_RE = /^-?\d+(\.\d+)?% -?\d+(\.\d+)?%$/;        // "62% 22%"
		const PTOK_RE = /^-?\d+(\.\d+)?(%|px|vw|vh|em|rem)$/;     // kb 里的一个位移量
		const ACT_DEF = { dur: 900, pos: "50% 50%", z0: 1.075, z: 1, pupil: "" };
		const KB_DEF = ["0% 0%", "0% 0%"];

		const numOr = (v, def, lo, hi) => (typeof v === "number" && isFinite(v) && v >= lo && v <= hi ? v : def);
		const pctOr = (v, def) => (typeof v === "string" && PPCT_RE.test(v.trim()) ? v.trim() : def);
		function artFileKey(s) {
			if (typeof s !== "string") return "";
			const f = s.trim().toLowerCase();
			if (!PFILE_RE.test(f) || !PIMG_RE.test(f) || f.indexOf("..") >= 0 || f.indexOf("/") >= 0) return "";
			return f;
		}
		function kbOr(v, def) {
			if (!Array.isArray(v) || v.length !== 2) return def;
			const two = (s) => {
				const a = String(s).trim().split(/\s+/);
				return a.length === 2 && PTOK_RE.test(a[0]) && PTOK_RE.test(a[1]) ? a : null;
			};
			const a = two(v[0]); const b = two(v[1]);
			if (!a || !b) return def;
			return [a[0] + " " + a[1], b[0] + " " + b[1]];   // 形状和内置 TIMELINE 的 kb 保持一致(两条 "x y" 字符串)
		}
		// 同源 URL;ver 来自 presets.json 的 files[],对不上就干脆不带 ?v=(宿主会发 no-cache,不会错发 immutable)
		function artUrl(id, file, ver) {
			const u = ARTS_ROUTE + "/" + encodeURIComponent(String(id)) + "/" + encodeURIComponent(String(file));
			return ver ? u + "?v=" + encodeURIComponent(String(ver)) : u;
		}
		// 任何失败(没有 fetch / 非 2xx / JSON 坏 / 超时 / abort)一律 resolve(null),永不 reject
		// 失败原因顺手记进 PRESET_WHY。为什么要记:宿主的 admit 验的是**鉴权 cookie**,
		// 而桌面版(Electron dsh-app:)渲染进程手里到底有没有这个 cookie 我没测过 ——
		// 要是将来给路由加了门禁、桌面版拿 401,现象是"预设静默不播、只剩内置",
		// 有了这个字段 boot.log 就能一眼分清"401 被门禁挡了"和"素材目录是空的"。
		let PRESET_WHY = "";
		function getJson(url, ms) {
			const bad = (w) => { PRESET_WHY = w; };
			return new Promise((resolve) => {
				let done = false;
				const once = (v) => { if (!done) { done = true; resolve(v); } };
				try {
					const ctl = new AbortController();
					const to = setTimeout(() => { try { ctl.abort(); } catch (e) {} bad("timeout"); once(null); }, ms || PRESET_PROBE_MS);
					fetch(url, { cache: "no-store", signal: ctl.signal })
						.then((r) => {
							if (!r || !r.ok) { clearTimeout(to); bad(!r ? "no-response" : "http " + r.status); once(null); return; }
							return r.json().then((j) => { clearTimeout(to); once(j && typeof j === "object" ? j : null); }, () => { clearTimeout(to); bad("bad json"); once(null); });
						})
						.catch(() => { clearTimeout(to); bad("network"); once(null); });
				} catch (e) { bad("no fetch"); once(null); }
			});
		}
		// 清单里只认 ok===true 且 id 合规的条目;"无选择就用清单第一个"
		function pickPreset(m) {
			const list = m && Array.isArray(m.presets) ? m.presets : [];
			const usable = list.filter((p) => p && typeof p.id === "string" && PID_RE.test(p.id) && p.ok === true);
			if (!usable.length) return null;
			const sel = typeof m.selected === "string" ? m.selected : "";
			const hit = usable.filter((p) => p.id === sel)[0];
			return hit || usable[0];
		}
		// preset.json → 可播的分镜数组;坏数据一律返回 null(= 回落内置)
		function presetTimeline(doc, item) {
			if (!doc || typeof doc !== "object" || Array.isArray(doc)) return null;
			if (doc.schema !== PRESET_SCHEMA) return null;
			if (!Array.isArray(doc.acts) || doc.acts.length === 0) return null;
			const ver = {};
			if (item && Array.isArray(item.files)) item.files.forEach((f) => { if (f && typeof f.name === "string") ver[f.name.toLowerCase()] = f.version; });
			const out = [];
			if (doc.open === "none") { /* 这个预设不要开场 */ } else { out.push({ kind: "cloud", dur: 300 }); }
			let n = 0;
			for (const a of doc.acts) {
				if (n >= MAX_PRESET_ACTS) break;
				if (!a || typeof a !== "object") continue;
				const f = artFileKey(a.file);
				if (!f) continue;
				out.push({
					kind: "img", src: artUrl(item.id, f, ver[f]), file: f,
					dur: numOr(a.dur, ACT_DEF.dur, 120, 8000),
					pos: pctOr(a.pos, ACT_DEF.pos),
					z0: numOr(a.z0, ACT_DEF.z0, 0.2, 4),
					z: numOr(a.z, ACT_DEF.z, 0.2, 4),
					kb: kbOr(a.kb, KB_DEF),
					pupil: pctOr(a.pupil, ACT_DEF.pupil),
					flash: a.flash === true,
					title: typeof a.title === "string" && a.title.trim() ? a.title.trim().slice(0, 60) : "",
					sub: typeof a.sub === "string" && a.sub.trim() ? a.sub.trim().slice(0, 80) : "",
				});
				n++;
			}
			if (!out.some((s) => s.kind === "img")) return null;
			// 契约里 title/sub 是**预设级**的:落在最后一幕(和内置终幕同一套渲染代码);act 级写了就以 act 级为准
			const last = out[out.length - 1];
			if (last.kind === "img") {
				if (!last.title && typeof doc.title === "string" && doc.title.trim()) last.title = doc.title.trim().slice(0, 60);
				if (!last.sub && typeof doc.sub === "string" && doc.sub.trim()) last.sub = doc.sub.trim().slice(0, 80);
				if (last.title && !last.sub) last.sub = "";   // imgLayer 会写进 textContent,不能留 undefined
				last.by = PKG;
			}
			return out;
		}
		// 提前把远程图挂进浏览器缓存,免得交叉溶解时才现下(内置 data URI 不需要,跳过)
		function preloadPreset(tl) {
			try {
				if (!window || typeof window.Image !== "function") return;
				tl.forEach((s) => {
					if (s.kind === "img" && s.src && s.src.indexOf("data:") !== 0) { const im = new window.Image(); im.src = s.src; }
				});
			} catch (e) {}
		}
		function countActs(tl) { let c = 0; for (const s of tl) { if (s.kind === "img" || s.kind === "duel") c++; } return c; }

		// ---- 样式(数组 join:字符串里写反引号会把模板串提前截断,这里干脆不用模板串)----
		const CSS = [
			".nbn-root{position:fixed;inset:0;z-index:2147483000;background:#05040a;overflow:hidden;",
			"  pointer-events:auto;cursor:pointer;display:block;touch-action:none;",
			"  transition:opacity " + (EXIT / 1000) + "s ease,background-color " + (EXIT / 1000) + "s ease}",
			".nbn-root.nbn-leaving{opacity:0;pointer-events:none;background-color:transparent}",
			".nbn-stage{position:absolute;inset:0}",
			".nbn-layer{position:absolute;inset:0;opacity:0;transition:opacity " + (CROSS / 1000) + "s ease}",
			".nbn-layer.in{opacity:1}.nbn-layer.out{opacity:0}",
			".nbn-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#05040a;",
			"  filter:saturate(1.06) contrast(1.03);transform-origin:50% 50%;",
			"  animation:nbn-kb var(--d) cubic-bezier(.2,.6,.2,1) both}",
			// z0/z 是每幕自己的起止缩放。>1 会同时裁掉四边 —— 素材里烘死的纯白 matte 带和游戏"返回"水印就是这样藏出框外的
			"@keyframes nbn-kb{from{transform:scale(var(--z0,1.075)) translate(var(--k0),var(--k1))}",
			"  to{transform:scale(var(--z,1)) translate(var(--k2),var(--k3))}}",
			// 压暗四角,面板文字才读得清
			".nbn-vig{position:absolute;inset:0;pointer-events:none;",
			"  background:radial-gradient(120% 90% at 50% 45%,transparent 40%,rgba(3,2,8,.62) 100%)}",
			// 瞳纹:红瞳处一圈扩散的描边
			".nbn-pupil{position:absolute;left:var(--pl,62%);top:var(--pt,34%);width:14vmin;height:14vmin;margin:-7vmin 0 0 -7vmin;",
			"  border-radius:50%;border:2px solid rgba(196,32,42,.85);opacity:0;",
			"  box-shadow:0 0 3vmin rgba(196,32,42,.55) inset,0 0 4vmin rgba(196,32,42,.4);",
			"  animation:nbn-pupil var(--d) ease-out both}",
			"@keyframes nbn-pupil{0%{opacity:0;transform:scale(.35)}35%{opacity:1}100%{opacity:0;transform:scale(2.9)}}",
			// 白闪
			".nbn-flash{position:absolute;inset:0;background:#fff;opacity:0}",
			".nbn-flash.on{opacity:.92;transition:opacity .05s ease-out}",
			".nbn-flash.off{opacity:0;transition:opacity " + (CROSS / 1000) + "s ease-in}",
			// 晓云(手绘路径 + 描边生长)+ 纸片
			".nbn-cloud{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;",
			"  background:radial-gradient(90% 70% at 50% 55%,#16101c 0%,#05040a 70%)}",
			".nbn-cloud svg{width:52vmin;height:auto;overflow:visible}",
			".nbn-cloud path{fill:none;stroke:#b3242b;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;",
			"  stroke-dasharray:1400;stroke-dashoffset:1400;animation:nbn-draw var(--d) ease-out both;",
			"  filter:drop-shadow(0 0 1.2vmin rgba(179,36,43,.6))}",
			"@keyframes nbn-draw{from{stroke-dashoffset:1400}to{stroke-dashoffset:0}}",
			".nbn-flake{position:absolute;width:2.2vmin;height:3vmin;background:rgba(238,238,245,.9);opacity:0;",
			"  clip-path:polygon(50% 0,100% 35%,72% 100%,28% 100%,0 35%);",
			"  animation:nbn-flake var(--fd) linear var(--dl) both}",
			"@keyframes nbn-flake{0%{opacity:0;transform:translate3d(var(--x),110vh,0) rotate(0deg)}",
			"  12%{opacity:.85}88%{opacity:.5}100%{opacity:0;transform:translate3d(calc(var(--x) + 8vw),-12vh,0) rotate(240deg)}}",
			// 双图对撞:左右斜切 + 中线闪光
			".nbn-duel{position:absolute;inset:0}",
			".nbn-half{position:absolute;inset:0;background-size:cover;background-repeat:no-repeat}",
			".nbn-half.a{clip-path:polygon(0 0,58% 0,42% 100%,0 100%);background-position:var(--ap);",
			"  animation:nbn-in-l var(--d) cubic-bezier(.2,.7,.2,1) both}",
			".nbn-half.b{clip-path:polygon(58% 0,100% 0,100% 100%,42% 100%);background-position:var(--bp);",
			"  animation:nbn-in-r var(--d) cubic-bezier(.2,.7,.2,1) both}",
			"@keyframes nbn-in-l{from{transform:translate(-4%,7%) scale(1.08)}to{transform:translate(0,0) scale(1)}}",
			"@keyframes nbn-in-r{from{transform:translate(5%,-8%) scale(1.1)}to{transform:translate(0,0) scale(1)}}",
			".nbn-clash{position:absolute;left:50%;top:50%;width:3px;height:0;margin-left:-1.5px;",
			"  background:linear-gradient(#fff,rgba(255,255,255,.15));transform:translateY(-50%);",
			"  box-shadow:0 0 3vmin 1vmin rgba(255,255,255,.75);animation:nbn-clash var(--d) ease-out both}",
			"@keyframes nbn-clash{0%{height:0;opacity:0}22%{opacity:1}40%{height:96%}",
			"  72%{height:100%;opacity:.95}100%{height:100%;opacity:0}}",
			// 结尾标题:排在**右上**,因为终幕右上的实测亮度只有 16(全片最暗的一块负空间),放中间会被雷电和紫披风压住
			".nbn-title{position:absolute;right:7vw;top:11vh;left:auto;bottom:auto;text-align:right;opacity:0;",
			"  animation:nbn-title .62s ease-out .22s both}",
			".nbn-title b{display:inline-block;writing-mode:vertical-rl;text-orientation:upright;",
			"  font:700 8vmin/1.15 \"Yu Mincho\",\"SimSun\",serif;letter-spacing:1.3vmin;",
			"  color:#f4efe6;text-shadow:0 0 3vmin rgba(179,36,43,.75),0 .4vmin .8vmin rgba(0,0,0,.8)}",
			".nbn-title i{display:block;clear:right;margin-top:1.8vmin;font:400 2.1vmin/1 \"Segoe UI\",sans-serif;",
			"  letter-spacing:.7vmin;font-style:normal;color:rgba(224,214,200,.8)}",
			"@keyframes nbn-title{from{opacity:0;transform:translateY(-2.4vmin)}to{opacity:1;transform:none}}",
			// 跳过提示:顶到窗口标题区之下,别和系统窗口按钮抢点击
			".bgl-skip{position:absolute;top:calc(env(titlebar-area-height,0px) + 14px);right:18px;",
			"  font:400 12px/1 \"Segoe UI\",sans-serif;letter-spacing:1px;color:rgba(232,226,216,.62);",
			"  background:rgba(8,6,12,.42);border:1px solid rgba(255,255,255,.14);border-radius:999px;",
			"  padding:7px 12px;opacity:0;animation:nbn-fadein .5s ease .55s both;pointer-events:none}",
			"@keyframes nbn-fadein{to{opacity:1}}",
			".nbn-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000}",
			// —— 预设选单面板(nbp-*)。它是**独立元素**,不挂在 .nbn-root 里,所以动画收尾后还活着 ——
			// 未最大化的窗口实测 1267x517:原先只有 max-width、**没有 max-height**,17 张卡(16 套+自动)
			// 一超高就往屏幕外长(面板自身没滚动条 => 被推出去的那几张根本点不到);而且锚在右下,
			// 右下正是输入框那一带,矮窗口里就是"糊在输入框上"。所以改右上锚定 + 高度封顶 + 可滚。
			".nbp-wrap{position:fixed;right:14px;top:14px;z-index:2147483000;",
			"  display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;",
			"  max-width:min(540px,42vw);max-height:calc(100vh - 150px);overflow:auto;overscroll-behavior:contain;",
			"  padding:2px 2px 4px 0;",
			"  font:400 12px/1.2 \"Segoe UI\",\"Microsoft YaHei\",sans-serif;",
			"  opacity:0;animation:nbn-fadein .35s ease .05s both}",
			".nbp-hd{flex:1 0 100%;text-align:right;color:rgba(232,226,216,.72);letter-spacing:.6px;",
			"  text-shadow:0 1px 6px rgba(0,0,0,.8)}",
			".nbp-hd b{color:#e8b13a;font-weight:600}",
			".nbp-card{display:flex;flex-direction:column;gap:4px;width:96px;padding:5px;cursor:pointer;",
			"  background:rgba(9,7,14,.9);border:1px solid rgba(255,255,255,.16);border-radius:8px;",
			"  color:rgba(232,226,216,.86);font:inherit;text-align:left;backdrop-filter:blur(3px)}",
			".nbp-card:hover{border-color:rgba(232,177,58,.6);background:rgba(18,14,26,.78)}",
			".nbp-on{border-color:#e8b13a;box-shadow:0 0 0 1px rgba(232,177,58,.45) inset}",
			".nbp-th{width:100%;height:58px;object-fit:cover;border-radius:5px;background:#05040a;display:block}",
			".nbp-auto-th{display:flex;align-items:center;justify-content:center;height:58px;border-radius:5px;",
			"  background:rgba(232,177,58,.14);color:#e8b13a;font:600 11px/1 \"Segoe UI\",sans-serif;letter-spacing:1px}",
			".nbp-auto{align-items:center}",
			".nbp-nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
			".nbp-msg{flex:1 0 100%;text-align:right;min-height:16px;color:#e8b13a;text-shadow:0 1px 6px rgba(0,0,0,.8)}",
			"@media (prefers-reduced-motion:reduce){.nbn-img,.nbn-clash,.nbn-pupil,.nbn-flake,.nbn-cloud path,.nbn-title,.nbp-wrap{animation:none;opacity:1}}",
		].join("\n");

		function ensureStyle() {
			if (typeof document === "undefined") return;
			if (document.getElementById(STYLE_ID)) return;
			const tag = document.createElement("style");
			tag.id = STYLE_ID;
			tag.dataset.plugin = PKG;
			tag.dataset.pluginCss = PKG + "/overlay";
			tag.textContent = CSS;
			try { document.head.appendChild(tag); } catch (e) {}
		}

		// ---- 启动一次的作用域:sessionStorage 优先,不可用退回内存位 ----
		let bootPlayedInMemory = false;
		function store() { try { return window.sessionStorage || null; } catch (e) { return null; } }
		function alreadyBooted() {
			const s = store();
			if (!s) return bootPlayedInMemory;
			try { return s.getItem(BOOT_KEY) != null; } catch (e) { return bootPlayedInMemory; }
		}
		function markBooted() {
			bootPlayedInMemory = true;
			const s = store();
			if (!s) return;
			try { s.setItem(BOOT_KEY, String(Date.now())); } catch (e) {}
		}
		function reducedMotion() {
			try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
		}

		const d = (ms) => Math.round(ms / SPEED);
		const el = (cls, tag) => { const n = document.createElement(tag || "div"); n.className = cls; return n; };

		function imgLayer(s) {
			const layer = el("nbn-layer");
			const img = el("nbn-img", "img");
			img.src = s.src;
			img.alt = "";
			img.draggable = false;
			img.style.objectPosition = s.pos;
			img.style.setProperty("--d", d(s.dur) + "ms");
			img.style.setProperty("--k0", s.kb[0].split(" ")[0]); img.style.setProperty("--k1", s.kb[0].split(" ")[1]);
			img.style.setProperty("--k2", s.kb[1].split(" ")[0]); img.style.setProperty("--k3", s.kb[1].split(" ")[1]);
			img.style.setProperty("--z0", s.z0 == null ? 1.075 : s.z0); img.style.setProperty("--z", s.z == null ? 1 : s.z);
			layer.appendChild(img);
			layer.appendChild(el("nbn-vig"));
			if (s.pupil) {
				const p = el("nbn-pupil"); p.style.setProperty("--d", d(s.dur) + "ms");
				// pupil 可以写成 "50% 24%" 把红瞳环挪到那张脸真正的位置上
				if (typeof s.pupil === "string") { const a = s.pupil.split(" "); p.style.setProperty("--pl", a[0]); p.style.setProperty("--pt", a[1] || "50%"); }
				layer.appendChild(p);
			}
			if (s.title) {
				const t = el("nbn-title");
				const b = el("nbn-h", "b"); b.textContent = s.title;
				const i = el("nbn-h", "i"); i.textContent = s.sub;
				t.appendChild(b); t.appendChild(i); layer.appendChild(t);
			}
			return layer;
		}

		function cloudLayer(s) {
			const layer = el("nbn-layer nbn-cloud");
			layer.style.setProperty("--d", d(s.dur) + "ms");
			// 晓云:五瓣云 + 下缘四道尖,近似纹样(不是官方矢量)
			const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			svg.setAttribute("viewBox", "0 0 320 220");
			const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
			p.setAttribute("d", "M52 132c-22-4-26-32-6-44-6-24 20-40 40-30 8-20 40-22 52-4 14-14 42-10 50 8 22-6 42 12 36 32 20 8 20 34 2 42-2 30-38 42-58 26-12 20-46 18-58-4-20 12-48 2-56-26z");
			svg.appendChild(p);
			layer.appendChild(svg);
			for (let i = 0; i < 16; i++) {
				const f = el("nbn-flake");
				f.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "vw");
				f.style.setProperty("--dl", (Math.random() * 0.5).toFixed(2) + "s");
				f.style.setProperty("--fd", (1.1 + Math.random() * 1.3).toFixed(2) + "s");
				layer.appendChild(f);
			}
			return layer;
		}

		function duelLayer(s) {
			const layer = el("nbn-layer nbn-duel");
			layer.style.setProperty("--d", d(s.dur) + "ms");
			const a = el("nbn-half a"); a.style.backgroundImage = "url(" + s.a + ")"; a.style.setProperty("--ap", s.aPos);
			const b = el("nbn-half b"); b.style.backgroundImage = "url(" + s.b + ")"; b.style.setProperty("--bp", s.bPos);
			layer.appendChild(a); layer.appendChild(b);
			layer.appendChild(el("nbn-clash"));
			layer.appendChild(el("nbn-vig"));
			return layer;
		}

		let root = null, timers = [], live = [];
		let activeTimeline = TIMELINE;   // 本次真正在播的分镜(内置 9 幕,或被某个预设换掉)
		function clearTimers() { for (const t of timers) clearTimeout(t); timers = []; }
		function finish() {
			clearTimers();
			if (!root || root.dataset.leaving) return;
			root.dataset.leaving = "1";
			root.classList.add("nbn-leaving");
			const dead = root;
			root = null;
			setTimeout(() => { try { dead.remove(); } catch (e) {} }, HANDOFF);
			// 2026-11-10 用户拍板:桌面上只留一个球,选单**不再开机自动糊一脸**。
			// 入口改成两个:Ctrl+Alt+P,以及 madara 悬浮球面板里的「开机动画主题」一项(走 window.__dshBootGallery.panel.open())。
			// 回滚这一次改动 = 把下面注释掉的那一行恢复回来。
			// setTimeout(() => { try { openPanel(); } catch (e) {} }, HANDOFF + 220);
		}
		function onKey(ev) {
			// 面板开着的时候,Esc 与 Ctrl+Alt+P 都先归面板(不然按下 Esc 会变成"跳过动画",
			// 而用户此刻看着的是选单,他要的是关掉选单)
			if (panelEl) {
				const pk = String(ev.key).toLowerCase();
				if (ev.key === "Escape" || (ev.ctrlKey && ev.altKey && !ev.shiftKey && pk === "p")) {
					ev.preventDefault(); closePanel(); return;
				}
			} else if (ev.ctrlKey && ev.altKey && !ev.shiftKey && String(ev.key).toLowerCase() === "p") {
				ev.preventDefault(); openPanel(); return;
			}
			if (ev.key === "Escape") { if (root) { ev.preventDefault(); finish(); } return; }
			if (ev.ctrlKey && ev.altKey && !ev.shiftKey && String(ev.key).toLowerCase() === REPLAY_KEY.key) {
				ev.preventDefault();
				bootPlayedInMemory = false;
				try { const s = store(); if (s) s.removeItem(BOOT_KEY); } catch (e) {}
				run(true);
			}
		}

		function playTimeline(tl) {
			activeTimeline = tl;
			root = el("nbn-root");
			root.id = PKG;
			const stage = el("nbn-stage");
			root.appendChild(stage);
			const hint = el("bgl-skip");
			hint.textContent = "点击画面或按 Esc 跳过";
			root.appendChild(hint);
			root.addEventListener("click", () => finish());
			document.body.appendChild(root);

			let t = 0;
			tl.forEach((s, i) => {
				const step = d(s.dur);
				timers.push(setTimeout(() => {
					if (!root) return;
					const layer = s.kind === "cloud" ? cloudLayer(s) : s.kind === "duel" ? duelLayer(s) : imgLayer(s);
					if (s.flash) {
						const fl = el("nbn-flash on");
						layer.appendChild(fl);
						requestAnimationFrame(() => { fl.classList.remove("on"); fl.classList.add("off"); });
					}
					stage.appendChild(layer);
					requestAnimationFrame(() => layer.classList.add("in"));
					live.push(layer);
					if (live.length > 2) {
						const old = live.shift();
						old.classList.add("out");
						timers.push(setTimeout(() => { try { old.remove(); } catch (e) {} }, CROSS + 40));
					}
				}, t));
				t += step;
			});
			timers.push(setTimeout(finish, t + 240));
		}
		// 内置兜底:永远是那 9 幕,一个字节都不许变
		// 2026-11-24：内置兜底也要"有兜底的兜底"。
		// 仓库**不分发任何 frames/ 图片**，TIMELINE 里的 src 在干净机器上必然 404，
		// 以前会糊出一层黑屏 + 红环，看起来像"装坏了"。现在先探第一张帧图：
		// 取不到就**直接不播**，把首屏还给宿主。
		function playBuiltin() {
			const first = (TIMELINE.find((a) => a && a.src) || {}).src;
			if (!first) { finish(); return; }
			if (typeof Image === "undefined") { playTimeline(TIMELINE); return; }
			const probe = new Image();
			probe.onload = () => { playTimeline(TIMELINE); };
			probe.onerror = () => {
				report({ mode: "skip", clips: -1, clip: "", preset: "", acts: 0, why: "builtin-frames-missing" });
				finish();
			};
			probe.src = first;
		}

		// ---- mp4 接口:宿主目录里有片子就播片子 ----
		function probeClips(cb) {
			let done = false;
			const once = (v) => { if (!done) { done = true; cb(v); } };
			try {
				const ctl = new AbortController();
				const to = setTimeout(() => { try { ctl.abort(); } catch (e) {} once(null); }, VIDEO_PROBE_MS);
				fetch(CLIPS_ROUTE, { cache: "no-store", signal: ctl.signal })
					.then((r) => (r.ok ? r.json() : null))
					.then((j) => { clearTimeout(to); once(j && Array.isArray(j.clips) && j.clips.length ? j : null); })
					.catch(() => { clearTimeout(to); once(null); });
			} catch (e) { once(null); }
		}

		function playVideo(clips, selected) {
			const pick = (clips.find((c) => c.name === selected) || clips[0]);
			root = el("nbn-root");
			root.id = PKG;
			const v = el("nbn-video", "video");
			v.src = pick.url;
			v.muted = true; v.autoplay = true; v.playsInline = true;
			v.setAttribute("muted", ""); v.setAttribute("autoplay", ""); v.setAttribute("playsinline", "");
			root.appendChild(v);
			const hint = el("bgl-skip");
			// 2026-11-21 用户:「主题和开机画面是没有声音的,点击开声音就别写了」。
			// 核实属实:本项目的主题全是**静态图分镜**,不播音频;
			// 只有 preset.json 写了 "clip" 才会走到这条 playVideo() 分支(当前一套都没有),
			// 所以"点击开声音"这句提示对真实用户是**永远不会应验的**。
			// 连点击里那句 `v.muted = false` 一起去掉 —— 留着一个开声音的动作配一行不说话的提示,只会让人以为坏了。
			// (全屏也一并去掉:开机是自动播完就进去的,没有"用户要全屏看"这个场景。)
			hint.textContent = "Esc 跳过";
			root.appendChild(hint);
			root.addEventListener("click", () => {
				// 点一下 = 跳过,这是唯一有意义的动作
				finish();
			});
			v.addEventListener("ended", () => finish());
			v.addEventListener("error", () => setTimeout(finish, 600));
			document.body.appendChild(root);
			// 卡住 25s 就退场(图片分镜不需要,视频需要)
			timers.push(setTimeout(() => { if (root && v.readyState < 2) finish(); }, 25000));
			timers.push(setTimeout(() => { if (root && v.paused && v.currentTime < 0.2) finish(); }, 6000));
		}

		// 把决策回报给宿主(桌面版没控制台);失败静默,绝不因为诊断把自己搞挂
		function report(fields) {
			try {
				const ctl = new AbortController()
				setTimeout(() => { try { ctl.abort() } catch (e) {} }, 2000)
				fetch('/' + PKG + '/report', {
					method: 'POST', cache: 'no-store', signal: ctl.signal,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(Object.assign({ at: Date.now(), surface: String(location.protocol || ''), ua: String(navigator.userAgent || '').slice(0, 60) }, fields)),
				}).catch(() => {})
			} catch (e) {}
		}

		// ---- 预设启动链:presets.json → arts/<预设>/preset.json → 归一化成 acts ----
		// 每一环失败都直接把 cb(null) 交回去,由调用方落内置 9 幕;这条链上不允许有任何 throw 逃出去。
		function probePreset(cb) {
			let done = false;
			const once = (v) => { if (!done) { done = true; cb(v); } };
			getJson(PRESETS_ROUTE, PRESET_PROBE_MS).then((m) => {
				const item = pickPreset(m);
				if (!item) return once(null);
				// preset.json 自己也在清单里带了 version;拿不到就不带 ?v=(退化成 no-cache,不会错发 immutable)
				getJson(artUrl(item.id, "preset.json", item.version), PRESET_PROBE_MS).then((doc) => {
					const tl = presetTimeline(doc, item);
					if (!tl) return once(null);
					// clip 从 doc 里带出去:presetTimeline 只产 acts,不认识任何其它键,所以这里单独取。
					// 不是字符串就当空串 ⇒ 行为与"这预设没写 clip"完全一致。
					once({ preset: item, clip: (doc && typeof doc.clip === "string") ? doc.clip.trim() : "", timeline: tl });
				});
			});
		}

		// 选哪个预设 = POST 到 presets.json 写 selection.json 的 preset 字段(下次启动生效)
		function postPreset(id) {
			const want = id === null || id === undefined || id === "" ? null : String(id).trim().toLowerCase();
			// 形状不对就连网络都不发:宿主也会拒,但这里先拒能省一次往返并且不留下"看起来成功了"的错觉
			if (want !== null && !PID_RE.test(want)) return Promise.resolve({ ok: false, preset: null, why: "bad-id" });
			const body = JSON.stringify({ preset: want });
			return new Promise((resolve) => {
				let done = false;
				const once = (v) => { if (!done) { done = true; resolve(v); } };
				try {
					const ctl = new AbortController();
					const to = setTimeout(() => { try { ctl.abort(); } catch (e) {} once({ ok: false, preset: null, why: 'timeout' }); }, 2000);
					fetch(PRESETS_ROUTE, {
						method: 'POST', cache: 'no-store', signal: ctl.signal,
						headers: { 'Content-Type': 'application/json' }, body,
					})
						.then((r) => {
							if (!r || !r.ok) {
								clearTimeout(to);
								const st = r ? r.status : '?';
								// 把**响应体**也念出来是定责用的:本插件的门禁拒人是 401 unauthorized / 403 forbidden(有文字),
								// 而宿主在 handler 之前答掉的 400 是**空体**。以前面板上只写「没写进去:http 400」,
								// 分不清是谁答的;加上体(或"空体")这个信息之后,用户截一张图就够定责了。
								const bad = (txt) => once({ ok: false, preset: null, why: String('http ' + st + (txt ? ' ' + txt : '(空响应体)')).slice(0, 90) });
								if (r && typeof r.text === 'function') {
									return r.text().then((t) => bad(String(t || '').replace(/\s+/g, ' ').trim().slice(0, 48)), () => bad(''));
								}
								return bad('');
							}
							return r.json().then((j) => { clearTimeout(to); once({ ok: true, preset: j && typeof j.preset === 'string' ? j.preset : null, raw: j }); }, () => { clearTimeout(to); once({ ok: false, preset: null, why: 'bad json' }); });
						})
						.catch(() => { clearTimeout(to); once({ ok: false, preset: null, why: 'network' }); });
				} catch (e) { once({ ok: false, preset: null, why: String((e && e.message) || e).slice(0, 60) }); }
			});
		}

		// ---- 预设选单面板 (nbp-*) ----
		// 为什么不照字面做成「开机先进选单、不自动播」:那样开机画面就不是动画了,每次开机变成做一道选择题。
		// 现在的行为(2026-11-10 起):动画照播 → **收尾什么都不弹** → 想看选单按 Ctrl+Alt+P,
		// 或者点 madara 悬浮球面板里的「开机动画主题」;点开挑一张,POST presets.json 写 selection.json(下次开机生效)。
		// 面板是**独立元素**,不挂在 .nbn-root 里,
		// 所以动画离场(把 root remove 掉)不会把它一起带走。
		let panelEl = null;
		function safeId(s) { return typeof s === "string" && PID_RE.test(s.toLowerCase()); }
		function closePanel() {
		if (!panelEl) return;
		try { panelEl.remove(); } catch (e) {}
		panelEl = null;
		}
		function openPanel() {
		if (typeof document === "undefined" || !document.body || panelEl) return;
		// 拿不到清单就什么都不画。开机路径上"安静地没有"永远好过"吵地出错":
		// 面板坏不能连带动画,所以这里不 throw、不弹空框、不写错误态。
		getJson(PRESETS_ROUTE, PRESET_PROBE_MS).then((m) => {
		if (panelEl || !m || !Array.isArray(m.presets)) return;
		const usable = m.presets.filter((p) => p && p.ok !== false && safeId(p.id));
		if (!usable.length) return;
		const wrap = document.createElement("div");
		wrap.className = "nbp-wrap";
		wrap.dataset.plugin = PKG;
		const hd = document.createElement("div");
		hd.className = "nbp-hd";
		// 实测被用户截图里的数字绕住过:"16 套"却看见 17 张卡(多出的是「自动」格)。
		// 标题把这一点说破,省得以为有一张是坏图/重复项。
		hd.textContent = "开机主题 " + usable.length + " 套 + 自动 · 点一张下次生效 · Ctrl+Alt+P 收起/唤出";
		const msg = document.createElement("div");
		msg.className = "nbp-msg";
		wrap.appendChild(hd);
		// 第一格是「自动」:发 postPreset(null)。宿主 L447 那条三元早就可以收 null,
		// writeSelection 落成 "preset": null,readSelection 再把非字符串读成 null,
		// 于是「清单里 mtime 最新的那套」重新变成默认 —— 这正是新增主题后不用点就能播的老行为。
		const auto = document.createElement("button");
		auto.className = "nbp-card nbp-auto" + (m.manual ? "" : " nbp-on");
		auto.type = "button";
		auto.title = "跟随最新做的主题";
		const ad = document.createElement("span");
		ad.className = "nbp-th nbp-auto-th";
		ad.textContent = "AUTO";
		const an = document.createElement("span");
		an.className = "nbp-nm";
		an.textContent = "自动 · 最新一套";
		auto.appendChild(ad);
		auto.appendChild(an);
		auto.addEventListener("click", () => {
			msg.textContent = "写入中…";
			postPreset(null).then((r2) => {
				if (r2 && r2.ok) {
					const cs = wrap.querySelectorAll(".nbp-card");
					for (let i2 = 0; i2 < cs.length; i2++) {
						if (cs[i2] === auto) cs[i2].classList.add("nbp-on");
						else cs[i2].classList.remove("nbp-on");
					}
					msg.textContent = "已改为自动 · 下次开机播清单里最新的那套";
				} else {
					msg.textContent = "没写进去:" + ((r2 && r2.why) || "?");
				}
			});
		});
		wrap.appendChild(auto);
		usable.forEach((p) => {

		const b = document.createElement("button");
		b.className = "nbp-card" + (p.id === m.selected ? " nbp-on" : "");
		b.type = "button";
		b.title = p.id;
		// 缩略图必须挑这一幕的图,不是 files[0] —— 清单 files[] 第一项就是 preset.json,
		// 拿它当 img src 每套都会走 error 分支,面板只剩名字没有画面(2026-11-09 自测打出来的)
		const pics = (Array.isArray(p.files) ? p.files : []).filter((f) => f && /^\d\d\.jpe?g$/i.test(f.name));
		const f0 = pics.length ? pics[0] : null;
		const img = document.createElement("img");
		img.className = "nbp-th";
		img.alt = "";
		try { img.loading = "lazy"; img.decoding = "async"; } catch (e) {}
		// 缩略图坏了就整块藏起来:破图标比没有图更难看,而名字还在
		img.addEventListener("error", () => { img.style.display = "none"; });
		img.src = artUrl(p.id, (f0 && f0.name) || "01.jpg", (f0 && f0.version) || p.version);
		const nm = document.createElement("span");
		nm.className = "nbp-nm";
		nm.textContent = p.title || p.id;
		b.appendChild(img);
		b.appendChild(nm);
		b.addEventListener("click", () => {
		msg.textContent = "写入中…";
		postPreset(p.id).then((r) => {
		if (r && r.ok) {
		const cards = wrap.querySelectorAll(".nbp-card");
		for (let i = 0; i < cards.length; i++) {
		if (cards[i] === b) cards[i].classList.add("nbp-on");
		else cards[i].classList.remove("nbp-on");
		}
		msg.textContent = "已选定 " + (p.title || p.id) + " · 下次开机生效";
		} else {
		// 失败要说得出为什么:形状不对、被拒、网络断了,这三种在用户这边长得一模一样
		msg.textContent = "没写进去:" + ((r && r.why) || "?");
		}
		});
		});
		wrap.appendChild(b);
		});
		wrap.appendChild(msg);
		// 没点之前提示行是空的,像一块死空间;先写明当前是哪一套,金色描边才有解释
		const cur = usable.filter(function (q) { return q.id === m.selected; })[0] || null;
		msg.textContent = cur
		  ? "当前 · " + (cur.title || cur.id) + (m.manual ? " · 已固定,点一张换下一套" : " · 自动跟随最新")
		  : "共 " + usable.length + " 套 · 点一张换下一套";
		document.body.appendChild(wrap);
		panelEl = wrap;
		});
		}

		function run(force) {
			if (reducedMotion()) { markBooted(); return; }
			if (!force && alreadyBooted()) return;
			markBooted();
			probeClips((j) => {
				let pick = null
				if (j) pick = j.clips.find((c) => c.name === j.selected) || j.clips[0] || null
				// 尾部索引(moov 在 mdat 之后)的片子先黑几秒才动,不如不播图片以外的东西
				if (pick && pick.faststart === false) pick = null
				// 老语义(有 mp4 就全局抢占)现在默认关:VIDEO_GLOBAL=false ⇒ 丢掉 pick,让下面预设分支说话
				if (!VIDEO_GLOBAL) pick = null
				if (pick) {
					report({ mode: 'video', clips: j ? j.clips.length : -1, clip: pick.name, preset: '', acts: 1, force: !!force })
					playVideo(j.clips, pick.name)
					return
				}
				if (!PRESET_ENABLE) {
					report({ mode: 'builtin', clips: j ? j.clips.length : -1, clip: '', preset: '', acts: TIMELINE.length, force: !!force, why: 'preset-disabled' })
					playBuiltin();
					return
				}
				// 每次探测前清零,免得上一次的原因串到这次的报告里
				PRESET_WHY = ""
				probePreset((p) => {
					if (p) {
						// 诊断链:播之前就把 preset=<id> acts=<n> mode=preset 写进现有的 report()
						// 11-19 新语义:预设自己点名 clip(preset.json 的 "clip" 键)才播视频 ——
						// 必须是 clips 里真实存在的同名文件、且 faststart 不是 false(否则首帧前纯黑,不如播图)。
						const vhit = p.clip ? ((j && Array.isArray(j.clips)) ? j.clips : []).find((c) => c && c.name === p.clip && c.faststart !== false) : null;
						if (vhit) {
							report({ mode: 'video', clips: j ? j.clips.length : -1, clip: vhit.name, preset: p.preset.id, acts: 1, force: !!force })
							playVideo(j.clips, vhit.name)
							return
						}
						// 点名了却没找到:**照旧播该预设自己的分镜**(绝不悄悄换内容),单独报一条让人看得见
						if (p.clip) report({ mode: 'clip-miss', clips: j ? j.clips.length : -1, clip: p.clip, preset: p.preset.id, why: 'clip-not-in-clips-dir-or-no-faststart' })
						report({ mode: 'preset', clips: j ? j.clips.length : -1, clip: '', preset: p.preset.id, acts: countActs(p.timeline), open: p.preset.open, force: !!force })
						preloadPreset(p.timeline);
						playTimeline(p.timeline);
					} else {
						report({ mode: 'builtin', clips: j ? j.clips.length : -1, clip: '', preset: '', acts: TIMELINE.length, force: !!force, why: PRESET_WHY || 'preset-unavailable' })
						playBuiltin();
					}
				});
			});
		}

		function apply() {
			if (typeof document === "undefined" || typeof window === "undefined") return;
			if (window.__dshBootGallery) return;
			ensureStyle();
			document.addEventListener("keydown", onKey);
			window.__dshBootGallery = {
				// v4 = 收尾不再自动浮面板,面板只能由 Ctrl+Alt+P 或外部入口(悬浮球)叫出来。
				// v5 = 给悬浮球的环形面板补两份**只读数据接口**:manifest()(整份清单,含 selected/manual)
				//      与 thumbUrl(item)。把"缩略图挑哪张"的规则留在本插件里,是为了让"面板全是破图"
				//      那个坑(files[0] 是 preset.json,不是图)只有一个修法,不用两个插件各修一遍。
				version: 5,
				play: () => run(true),
				skip: () => finish(),
				// 选单面板入口:开机不再自动浮,这里(和 Ctrl+Alt+P)是**仅有**的两种打开方式
				panel: { open: openPanel, close: closePanel, isOpen: () => !!panelEl },
				timeline: TIMELINE,                       // 内置 9 幕兜底,永远是它
				get active() { return activeTimeline },   // 本次实际在播的那套(预设或内置)
				// 清单 Promise;拿不到就回空数组(永不 reject,调用方不用写 catch)
				presets: () => getJson(PRESETS_ROUTE, PRESET_PROBE_MS).then((m) => (m && Array.isArray(m.presets) ? m.presets : [])),
				// 整份清单:外圈要画"当前生效那套"的高亮,只有 presets 数组不够(金框信息在 selected/manual 里)
				manifest: () => getJson(PRESETS_ROUTE, PRESET_PROBE_MS).then((m) => (m && Array.isArray(m.presets) ? m : { presets: [], selected: null, manual: false })),
				// 某一格的缩略图 URL;拿不到该文件的 version 就不带 ?v=(退化成 no-cache,绝不错发 immutable)
				thumbUrl: (p) => {
					if (!p || typeof p.id !== "string" || !safeId(p.id)) return "";
					const pics = (Array.isArray(p.files) ? p.files : []).filter((f) => f && /^\d\d\.jpe?g$/i.test(f.name));
					const f0 = pics.length ? pics[0] : null;
					return artUrl(p.id, (f0 && f0.name) || "01.jpg", (f0 && f0.version) || p.version);
				},
				// 写选择(下次启动生效);playNow 为真则立刻按新选择播一次
				usePreset: (id, playNow) => postPreset(id).then((r) => {
					if (r && r.ok && playNow) { if (root) finish(); run(true); }
					return r;
				}),
				// 调试:把某个 preset.json 的 acts 归一化成可播分镜(坏数据返回 null)
				normalizePreset: (doc, item) => presetTimeline(doc, item || { id: "x", files: [] }),
			};
			// 等首帧把壳画完再上屏,避免和启动骨架屏叠在一起。
			// 300 → 60:用户 2026-08 拍板"更早盖住首屏白屏",这里能省的就省(真正的大头是 bundle 装配耗时,见 README「已知边界」)。
			setTimeout(() => run(false), 60);
		}

		exports.apply = apply;
		return module.exports;
	},
});
