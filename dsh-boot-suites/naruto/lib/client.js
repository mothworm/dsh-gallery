window.__ModuleLoader__.load({
	id: "dsh-boot-suite-naruto",
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

		const PALETTES = {"brothers":{"preset":"brothers","title":"兄弟之战","hero":{"file":"03.jpg","pos":"50% 44%","eye":"50% 40%","acts":3,"fallback":null,"errors":[]},"ink":{"ground":"#1B2324","neutral":"#F2F2F2","accent":"#9B4C56","accent2":"#324344","glow":"#9B4C56"},"eye":{"kind":"mangekyou6","photo":"eye.png","_why_kind":"11-15 补 —— auto 的 eye.kind 一直是空(产物里是 unknown),球心只能画兜底眼。用户给的素材是佐助的万花筒(六芒样式),按 sasuke 同一支持 mangekyou6,手绘回退才与照片同一枚图案。","_why_photo":"素材 289x384 白底,主体是正圆纹章(bbox 226x226 宽高比 1.00),下方烘着黑字「佐助」——这是素材卡的设计,不是水印,但压在 60px 球心上是脏点。走**最大连通块**:3 个块里保留 39,956 px 的主体,丢掉 1,919 px 的文字;边缘环均亮 3.4、环上 >180 = 0(三张里最干净)。"}},"danzo":{"preset":"danzo","title":"漂泊 · 团藏","hero":{"file":"04.jpg","pos":"51% 45%","eye":"51% 41%","acts":5,"fallback":null,"errors":[]},"ink":{"ground":"#120D12","neutral":"#2A2126","accent":"#D92B2F","accent2":"#8E7798","glow":"#F0A09B"},"eye":{"kind":"sharingan","photo":"eye.png","_why_photo":"11-15 用户给官方素材,但只有 123x148 且**写实渲染**(另两张是扁平矢量),主体顶满画布四边。最大连通块把顶部「3勾玉」UI 条(1,051 px)丢掉了;剩下的白边**不是抠图漏的**——它自己就有米黄瞳周与眼白,所以边缘环指标(643/均亮119/>180=150)在这里区分不了\"物体自己的白\"和\"残留的白\",取收缩 2px 那档保留杏仁形。圆形裁切试过,圆内近白 17-21%(杏仁眼放进圆里必然留白角),否掉。","red":"#C21F26","_note":"他右臂上排着的就是**三勾玉**写轮眼(不是万花筒),所以复用 sharingan;accent 从 auto 的霓虹红 #FE4344 压深一档,当品牌色时不刺眼"},"art":{"opacity":0.87,"dim":0.22,"saturate":1.05,"veil":0},"card":{"a":0.63,"b":0.614,"quiet":0.46},"mode":"dark","tokens":{}},"hanabi":{"preset":"hanabi","title":"武当 · 花火","hero":{"file":"06.jpg","pos":"51% 8%","eye":null,"acts":6,"fallback":null,"errors":[]},"ink":{"ground":"#2C2E42","neutral":"#3A3C52","accent":"#FDCC6A","accent2":"#8E86C0","glow":"#FFE7B0"},"eye":{"kind":"byakugan","pale":"#EFEAF6","_note":"白眼:瞳色淡近乎银,筋脉走冷灰紫"},"art":{"opacity":0.82,"dim":0.26,"saturate":1.05,"veil":0},"card":{"a":0.638,"b":0.622,"quiet":0.476},"mode":"dark","tokens":{}},"hashirama":{"preset":"hashirama","title":"侠隐 · 柱间","hero":{"file":"04.jpg","pos":"48% 8%","eye":null,"acts":4,"fallback":null,"errors":[]},"ink":{"ground":"#1C1C1B","neutral":"#1C1C1B","accent":"#151412"},"eye":{"kind":"byakugan","photo":"eye.png","_why_photo":"11-16 用户指定:与「侠隐·纲手」共用同一张木叶村徽(黑底白线稿)。抠图方向与其它几套**相反**(抠近黑、留白线);16 个连通块里只留最大那块(169,511 px,村徽是连笔的),15 个碎点(≤18 px)滤掉。主体 881x643、宽高比 1.37(横向线稿,不是圆,填充率 0.299 是正常值);256² 上最粗 26.6 px ⇒ 44px 球上约 4.6 px,不需要加粗。","_why_kind":"kind 只是**图库缺失时的兜底画法**和面板标签。柱间的 auto 本来没有 eye 块(构建 L75 会填成 unknown),这里补一个最不张扬的 byakugan 淡色圆 —— **不是**设定他是白眼,照片在就永远用照片。","_why_no_spin":"照片类一律停转(70-dom 的 no-spin 判据是 !!pal.eye.photo);线稿 logo 转起来只会糊。"}},"hinata":{"preset":"hinata","title":"八极 · 雏田","hero":{"file":"06.jpg","pos":"54% 50%","eye":null,"acts":6,"fallback":null,"errors":[]},"ink":{"ground":"#241C26","neutral":"#3A3340","accent":"#C7586E","accent2":"#9C8AD0","glow":"#E8D9B8"},"eye":{"kind":"byakugan","_note":"白眼:近白淡紫、无瞳孔环、放射细纹。绘制里 pale/vein 是写死的 —— 白眼本来就不是彩色的"},"glass":{"bubble":0.965,"input":0.975,"code":0.95,"menu":0.975},"art":{"opacity":0.8,"dim":0.3,"saturate":1.02,"veil":0},"card":{"a":0.646,"b":0.634,"quiet":0.492},"mode":"dark","tokens":{}},"hinata-last":{"preset":"hinata-last","title":"最终章 · 雏田","hero":{"file":"03.jpg","pos":"55% 53%","eye":null,"acts":3,"fallback":null,"errors":[]},"ink":{"ground":"#1E2340","neutral":"#2A2F52","accent":"#6C63A8","accent2":"#D8D2EC","glow":"#EFEAF8"},"eye":{"kind":"byakugan","pale":"#F0ECF8","_note":"白眼(用户点名)"},"art":{"opacity":0.8,"dim":0.3,"saturate":1,"veil":0},"card":{"a":0.646,"b":0.636,"quiet":0.492},"mode":"dark","tokens":{}},"itachi":{"preset":"itachi","title":"晓 · 鼬","hero":{"file":"03.jpg","pos":"50% 50%","eye":"50% 24%","acts":4,"fallback":null,"errors":[]},"ink":{"ground":"#12100F","neutral":"#241E1B","accent":"#B3202A","accent2":"#C9BFB2","glow":"#E0A08A"},"eye":{"kind":"mangekyou","photo":"eye.png","red":"#9E1420","_note":"鼬的万花筒 = 三枚钝三角弯刃(blade()),不是卡卡西那只风车","_why_photo":"11-16 用户给的官方素材(291x321 白底红盘)。抠图走**最大连通块**:4 个连通块里留 41,846 px 那块,丢掉的 1,567 px 正是左下角那个独立文字块(vision 说是「鼬」字样)——最大连通块就是为了一刀切掉这种独立文字。主体 bbox 231x230 宽高比 1.00、框内填充率 0.788(正圆理论值 0.785)⇒ 没混进别的东西也没被切。重裁成 256² 居中正方,中心实测 49.8/49.6。","_why_no_spin":"照片类一律停转(70-dom: no-spin 判据 !!pal.eye.photo)。手绘 mangekyou 转起来是设计,照片转起来就是歪 —— 团藏/兄弟之战 11-16 就是这么挨批的。"},"art":{"opacity":0.84,"dim":0.24,"saturate":1.08,"veil":0},"card":{"a":0.64,"b":0.626,"quiet":0.476},"mode":"dark","tokens":{}},"kakashi":{"preset":"kakashi","title":"须佐 · 卡卡西","hero":{"file":"03.jpg","pos":"30% 49%","eye":"30% 45%","acts":4,"fallback":null,"errors":[]},"ink":{"ground":"#15131C","neutral":"#241F31","accent":"#9A86E0","accent2":"#F4D4A3","glow":"#C9C6F5"},"eye":{"kind":"mangekyouPin","photo":"eye.png","_why_photo":"11-15 用户给官方素材(427x388 白底)。走**最大连通块**抠图:左缘那只邻眼切片(4,450 px)被规则整块丢掉,主体 bbox 306x306 宽高比 1.00(正圆),边缘环均亮 22.3、环上 >180 = 0。图库没装时仍回退手绘 mangekyouPin。","red":"#A81622","_note":"卡卡西的万花筒 = 三枚**直边扫掠刃** + 瞳环(和鼬的钝三角弯刃分开画)。auto 的 accent 浅金 #F4D4A3 色相 36° 落在红 family 里,会把瞳红抽成橙色,所以 eye.red 点名"},"art":{"opacity":0.82,"dim":0.26,"saturate":1.06,"veil":0},"card":{"a":0.638,"b":0.622,"quiet":0.476},"mode":"dark","tokens":{}},"konan":{"preset":"konan","title":"晓 · 小南","hero":{"file":"06.jpg","pos":"53% 49%","eye":null,"acts":6,"fallback":null,"errors":[]},"ink":{"ground":"#141019","neutral":"#241C2B","accent":"#7E6FA8","accent2":"#D9E4F2","glow":"#EAF1FA"},"eye":{"kind":"paper","paper":"#F4F2F8","paper2":"#E2DDEC","fold":"#B9AED0","ink":"#1A1424","_note":"纸蝶:硬边折纸四翅 + 折痕 + 触角,左右两片不同明度(一张纸两面对光)"},"art":{"opacity":0.82,"dim":0.26,"saturate":1.04,"veil":0},"card":{"a":0.638,"b":0.626,"quiet":0.476},"mode":"dark","tokens":{}},"madara":{"preset":"madara","title":"宇智波 · 斑","hero":{"file":"04.jpg","pos":"52% 41%","eye":"52% 37%","acts":4,"fallback":null,"errors":[]},"ink":{"ground":"#170F1C","neutral":"#2B2430","accent":"#9C1B2B","accent2":"#9A7FC4","glow":"#D8B75E"},"eye":{"kind":"rinnegan","_note":"斑 = 轮回眼(瞳面同心涟漪);写轮眼留给佐助/鼬/卡卡西那一支"},"glass":{"bubble":0.96,"input":0.97,"code":0.95,"menu":0.97},"art":{"opacity":0.86,"dim":0.24,"saturate":1.08,"veil":0},"card":{"a":0.72,"b":0.7,"quiet":0.52},"mode":"dark","tokens":{}},"madara-god":{"preset":"madara-god","title":"神驹 · 斑","hero":{"file":"03.jpg","pos":"50% 26%","eye":null,"acts":3,"fallback":null,"errors":[]},"ink":{"ground":"#171515","neutral":"#2B2A2C","accent":"#98262B","accent2":"#C9A227","glow":"#E3C08A"},"eye":{"kind":"mangekyou","photo":"eye.png","_note":"11-14 换成官方素材球心:这枚图案是**永恒万花筒**(素材下方水印文字自己写着「…狂永恒万花筒」),不是轮回眼,所以 kind 从 rinnegan 改成 mangekyou —— 图库没装时回退的手绘 SVG 也该画万花筒才对得上。photo 指向图库里的 eye.png(图不进代码,规矩见 dsh-naruto-pack/SHARE.md)。"},"glass":{"bubble":0.965,"input":0.975,"code":0.95,"menu":0.975},"art":{"opacity":0.84,"dim":0.2,"saturate":1.05,"veil":0},"card":{"a":0.644,"b":0.634,"quiet":0.484},"mode":"dark","tokens":{}},"minato":{"preset":"minato","title":"侠隐 · 水门","hero":{"file":"05.jpg","pos":"44% 49%","eye":null,"acts":5,"fallback":null,"errors":[]},"ink":{"ground":"#121A1C","neutral":"#22302F","accent":"#77B5B0","accent2":"#D8B65C","glow":"#9FD6D2"},"eye":{"kind":"kunai","steel":"#CFD6DE","steelDark":"#79838F","tag":"#EDE6D6","_note":"用户点名:**飞雷神苦无**(水门的招牌器物),原来的“查克拉”占位撤掉"},"glass":{"bubble":0.96,"input":0.97,"code":0.945,"menu":0.97},"art":{"opacity":0.82,"dim":0.26,"saturate":1.04,"veil":0},"card":{"a":0.72,"b":0.7,"quiet":0.52},"mode":"dark","tokens":{}},"sasuke":{"preset":"sasuke","title":"侠隐 · 佐助","hero":{"file":"05.jpg","pos":"56% 50%","eye":"56% 46%","acts":5,"fallback":null,"errors":[]},"ink":{"ground":"#101627","neutral":"#1B2338","accent":"#4B63C8","accent2":"#9FB6FF","glow":"#C9D8FF"},"eye":{"kind":"mangekyou6","photo":"eye.png","red":"#A81622","ink":"#0B080C","_why_photo":"11-16 用户给的官方素材(312x399 白底黑盘六瓣)。**最大连通块**留 40,153 px,丢掉的 1,177 + 1,014 px 是圆盘正下方那两个独立的黑字「佐」「助」,34 px 那个是左上角贴边的红色碎屑 —— 三样杂物一次清掉。主体 bbox 227x226 宽高比 1.00、填充率 0.783(正圆 0.785)。重裁 256² 居中,中心 49.8/49.6。","_why_no_spin":"照片类一律停转(70-dom: no-spin 判据 !!pal.eye.photo)。上面那条兄弟之战「图案歪」的两个成因之一就是它在转。"},"glass":{"bubble":0.96,"input":0.975,"code":0.95,"menu":0.98},"art":{"opacity":0.84,"dim":0.26,"saturate":1.06,"veil":0},"card":{"a":0.64,"b":0.626,"quiet":0.472},"mode":"dark","tokens":{}},"tobirama":{"preset":"tobirama","title":"漂泊 · 扉间","hero":{"file":"04.jpg","pos":"49% 45%","eye":null,"acts":4,"fallback":null,"errors":[]},"ink":{"ground":"#222A34","neutral":"#2E3742","accent":"#C4565B","accent2":"#9FB4C6","glow":"#DDE7F0"},"eye":{"kind":"kunai","steel":"#D3D9E2","steelDark":"#7C8698","tag":"#EFE8D8","_note":"飞雷神苦无源自他这一脉,与水门同一件器物(钢色略冷)"},"art":{"opacity":0.8,"dim":0.28,"saturate":1.05,"veil":0},"card":{"a":0.642,"b":0.63,"quiet":0.484},"mode":"dark","tokens":{}},"tobirama-night":{"preset":"tobirama-night","title":"永夜 · 扉间","hero":{"file":"04.jpg","pos":"49% 51%","eye":null,"acts":4,"fallback":null,"errors":[]},"ink":{"ground":"#0B1524","neutral":"#16202E","accent":"#4FC5EF","accent2":"#2F7FD6","glow":"#7FD4F2"},"eye":{"kind":"kunai","steel":"#CFE3F2","steelDark":"#5F7690","tag":"#8FD8F5","_note":"同漂泊那一脉的飞雷神苦无;永夜这套把钢色压冷、把咒印 tag 换成发光青(02 帧里三把苦无自己就在发光),和水门/扉间本体那两支区分开"},"art":{"opacity":0.88,"dim":0.1,"saturate":1.12,"veil":0},"card":{"a":0.58,"b":0.56,"quiet":0.44},"mode":"dark","tokens":{}},"toneri":{"preset":"toneri","title":"最终章 · 舍人","hero":{"file":"02.jpg","pos":"51% 22%","eye":"51% 18%","acts":3,"fallback":null,"errors":[]},"ink":{"ground":"#1B2A38","neutral":"#2B3E4C","accent":"#45D9C0","accent2":"#5CEAD6","glow":"#9CF5E6"},"eye":{"kind":"byakugan","pale":"#EAF4F8","_note":"舍人是大筒木一族,瞳术是白眼(02.jpg 里那对发青的白眼就是证据)。auto 没配 eye -> 以前掉进 unknown 画成占位眼。白眼本来就不是彩色的,所以 pale 给近白带淡青,不跟 accent 走。"},"art":{"opacity":0.84,"dim":0.18,"saturate":1.06,"veil":0},"card":{"a":0.62,"b":0.6,"quiet":0.45},"mode":"dark","tokens":{}},"tsunade":{"preset":"tsunade","title":"侠隐 · 纲手","hero":{"file":"04.jpg","pos":"57% 46%","eye":null,"acts":4,"fallback":null,"errors":[]},"ink":{"ground":"#3B2415","neutral":"#131414","accent":"#AB8C65","accent2":"#224643","glow":"#F4DB95"},"eye":{"kind":"byakugan","photo":"eye.png","_why_photo":"11-16 用户指定:同一张木叶村徽(黑底白线稿)给「侠隐·纲手」与「侠隐·柱间」当球心。抠图方向与其它几套**相反**(抠近黑、留白线);16 个连通块里只有 1 个够大(169,511 px,村徽本身是连笔的),另 15 个碎点(≤18 px)按面积滤掉。主体 881x643、宽高比 1.37(横向线稿,不是圆,所以填充率 0.299 是正常值,不能拿正圆 0.785 那把尺量它);256² 上最粗处 26.6 px ⇒ 44px 球上约 4.6 px,**不需要加粗**。","_why_kind":"kind 只是**图库缺失时的兜底画法**和面板标签。纲手/柱间的 auto 本来根本没有 eye 块(构建 L75 会填成 unknown),所以这里补一个最不张扬的 byakugan 淡色圆 —— **不是**设定这两人是白眼,照片在就永远用照片。","_why_no_spin":"照片类一律停转(70-dom 的 no-spin 判据是 !!pal.eye.photo);线稿 logo 转起来只会糊成一团。"}}};
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
		const PKG = "dsh-boot-suite-naruto";

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
			// 配饰底框(11-19 档位重做:无 / 土遁 / 火遁 / 雷遁 / 水遁 / 风遁)。
			// URI 不写死在这里:70-dom 从 boot-naruto 清单的 files[].url 解析出 `arts/ui/frame-<遁>.png`,
			// 写进 --bs-frame-src;资源包没放那个目录(或老宿主不认识)就是 none ⇒ 该档自动退化成「无」。
			// 贴法 = **丙:整图缩放 + 只留外环**(用户看过甲/乙/丙对照样张后 11-19 选定)。成品 PNG 的中央在生成时
			// 就烤成**全透明**,所以整张按 background-size:100% 100% 贴满卡片之后,中央仍是那块吃滑块的 CSS 填充层
			// ⇒ 「拖滑块改透明度」只改文字底、底框纹丝不动(这条语义从旧九宫继承,一个字没变)。
			// 为什么不用 border-image 九宫(11-18 那版,已废):素材实测四角特效向内伸入 ≥520 px(占高度 43%),
			// 小 slice 会把大部分画面整块丢掉;大 slice 又必须把角缩到 border-width,细节糊掉;
			// 而且左右竖边中段各有一个独立三勾玉圆徽,一拉就变形。**看到有人"顺手改回 border-image"先问用户。**
			// 旧四档(叶纹/风车/叶纹+风车/白绝)连同 --bs-deco-a/-b/-o 一起删了,同上。
			CARD_SEL + "::after{content:\"\";position:absolute;inset:0;pointer-events:none;",
			"border-radius:inherit;corner-shape:round;",
			"background-image:var(--bs-frame-src,none);background-repeat:no-repeat;",
			"background-position:center;background-size:100% 100%;}",
			// 文字内缩:激活底框时把文字从边上抬起来,否则左上那团圆素会压住第一行行首(核对表 10 格全中)。
			// **只在 70-dom 挂上 data-bs-frame 时才匹配**,而它只在"量到了宿主原 padding 基线"之后才挂 ——
			// 所以没选底框、或资源包没到位时,这一条规则一个像素都不生效(用户的硬要求:其他效果不变)。
			// 四个值 = 宿主基线 + 环宽,由 JS 实测写入;这里故意不给 fallback 值,量不到基线就宁可不内缩。
			":root[data-bs-frame] " + CARD_SEL + "{",
			"padding-top:var(--bs-frame-pt);padding-right:var(--bs-frame-pr);",
			"padding-bottom:var(--bs-frame-pb);padding-left:var(--bs-frame-pl)}",
			// 面板里配饰那排按钮的选中态(按钮本身已有样式,这里只补 pressed)
			"#" + NS + "-panel .row button[aria-pressed=true]{background:var(--bs-brand,#c9a227);color:#1A1208;border-color:rgba(255,255,255,.42)}",
			"#" + NS + "-panel .row i{font-style:normal;opacity:.72;margin-right:2px}",
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
			// 这块白卡是**宿主自己的**:我们的 dsh-boot-naruto 用的是 `nbn-skip` 类,不是 `_hint_u7vgf_`,
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
		// 硬约束(交接单关键决策 3):新主题只通过 window.__dshBootNaruto 取画面,
		// 绝不自己拼 /dsh-boot-naruto/arts/... 那条路径 —— 猜路径等于把两个插件又绑死。
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

		function bootApi() { return (typeof window !== "undefined" && window.__dshBootNaruto) || null; }

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
				diagWarn("boot-api-missing", "没等到 window.__dshBootNaruto,只能画占位眼");
				render(STATE.with({ art: null, preset: null, why: "no-boot-api" }));
				return;
			}
			setTimeout(() => whenApi(then), 250);
		}

		// 资源包里可以放一个**不是主题**的共享素材目录 `arts/ui/`(11-19:五遁配饰底框,全局一套)。
		// ⚠ 它**不会**带 files:目录里没有 preset.json,宿主在 index.js:221-222 就 ok:false 返回了
		//   (以前这行注释写的是"靠 presetEntry 天然带 files[].url",那是**错的**,真机上底框因此永远 frame=0)。
		//   所以 URL 由 70-dom 的 frameUrl 兜底:先查 files,查不到就从宿主给的 arts URL 推前缀拼。
		// 它既不该进选单、也不该算进"共 N 套",所以在这里一次性摘掉,原条目留进 st.ui 给配饰层查 URL。
		// 老宿主/没有该目录 ⇒ ui = null ⇒ 五遁档自动退化成「无」,不报错。
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
		const BUILD_STAMP = "b2111";
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
		// 底框成品的几何。**唯一来源是生成器**:`dsh-naruto-pack\tools\build-frames.py`(默认 --mode deco)。
		//
		// 11-21 用户裁决换掉旧环带方案的原话:「不够好看,这种五遁文本框配饰能不能弄到文本框的真正边缘呢,
		// 而不是在原本文本框里边展现」。旧方案只留一条环带,把素材里**构成"框"的主体**剃掉了,
		// 只剩四角碎片。现在成品 = PSD 的 Frame+Deco 两层并集**整张原样缩放**(720x456,与 PSD 同比例):
		// 框线就在卡片边上、四角浪花骑在四个角上,和素材原稿一样;中央仍透明 ⇒ 吃滑块的填充层照旧管文字底。
		//
		// 内缩据此重算:框线内沿在成品图里约在 x=13%、y=11.5% 处(实测浪花/框线的内边缘) ——
		// 但**四角浪花只占上面一段**,正文要躲开的是"角素的实际高度",不是整张图的比例。
		// 取保守值:横 13%(卡宽)、纵 15.5%(卡宽 —— 注意纵向也用卡宽折算,因为卡片高随内容变、
		// 而底图是等比拉伸的:纵向比例 = 卡高/456*720,用卡宽做尺子才不会被"矮卡"算成 0 净空)。
		const FRAME_ASPECT = 456.0 / 720.0;      // 成品图 高/宽;纵向百分比 = 卡宽 * 这个 * 图内纵向百分比
		const FRAME_INSET = { x: 0.130, y: 0.150 };
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
					// 纵向:底图是按 100% 100% 拉伸的,图内纵向百分比落到卡片上 = 卡高 * 该百分比。
					// 卡高随内容变(矮卡 120 / 高卡 230),而我们**不想**让净空随卡高忽大忽小
					// (用户点名「矮卡纵向被压扁」就是这么来的)⇒ 统一按**卡宽 × 图纵横比 × 图内纵向百分比**算,
					// 于是三种卡高拿到同一个 px 数,而不是"矮卡算出来 0"。
					const ey = Math.round(cwUse * FRAME_ASPECT * FRAME_INSET.y);
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
					// 构建戳(现在 b2111 = 整张装饰层 deco 模式 + 新内缩;前一版 b2011 = 各向异性环带 C 档):
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
	},
});
