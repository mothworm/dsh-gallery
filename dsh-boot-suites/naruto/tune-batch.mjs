// 一次性:落 7 份 tuned + 改水门球心(2026-11-14 用户点名八个球心图案)。
// 相对路径按 cwd 解析 —— 跑之前先 cd 到 dsh-boot-suites/naruto。
import fs from "node:fs"

const P = "palettes/tuned/"
const W = (n, o) => {
	fs.writeFileSync(P + n + ".json", JSON.stringify(o, null, 2) + "\n")
	console.log("write tuned/" + n + ".json")
}
const base = (title, ink, eye, art, card) => ({ title, ink, eye, art, card, mode: "dark", tokens: {} })

W("danzo", Object.assign(base("漂泊 · 团藏",
	{ ground: "#120D12", accent: "#D92B2F", accent2: "#8E7798", glow: "#F0A09B", neutral: "#2A2126" },
	{
		kind: "sharingan", red: "#C21F26",
		_note: "他右臂上排着的就是**三勾玉**写轮眼(不是万花筒),所以复用 sharingan;accent 从 auto 的霓虹红 #FE4344 压深一档,当品牌色时不刺眼",
	},
	{ opacity: 0.87, dim: 0.22, saturate: 1.05, veil: 0 },
	{ a: 0.92, b: 0.88, quiet: 0.70 }),
{ _note: "auto 实测 lum 0.28 / bright 13.9%,是暗图里最暗的一套,卡片可以薄一档让插画多透" }))

W("kakashi", Object.assign(base("须佐 · 卡卡西",
	{ ground: "#15131C", accent: "#9A86E0", accent2: "#F4D4A3", glow: "#C9C6F5", neutral: "#241F31" },
	{
		kind: "mangekyouPin", red: "#A81622",
		_note: "卡卡西的万花筒 = 三枚**直边扫掠刃** + 瞳环(和鼬的钝三角弯刃分开画)。auto 的 accent 浅金 #F4D4A3 色相 36° 落在红 family 里,会把瞳红抽成橙色,所以 eye.red 点名",
	},
	{ opacity: 0.82, dim: 0.26, saturate: 1.06, veil: 0 },
	{ a: 0.94, b: 0.90, quiet: 0.76 }),
{ _note: "accent 换成须佐能乎的紫,选中态与卡片细脊才认得出是这套" }))

W("itachi", Object.assign(base("晓 · 鼬",
	{ ground: "#12100F", accent: "#B3202A", accent2: "#C9BFB2", glow: "#E0A08A", neutral: "#241E1B" },
	{ kind: "mangekyou", red: "#9E1420", _note: "鼬的万花筒 = 三枚钝三角弯刃(blade()),不是卡卡西那只风车" },
	{ opacity: 0.84, dim: 0.24, saturate: 1.08, veil: 0 },
	{ a: 0.945, b: 0.91, quiet: 0.76 }),
{ _note: "auto 抽坏了:accent == ground == #14191F,a2/glow 为空 —— 直接当品牌色会是一条近黑的细脊,所以整套人补(晓袍黑 + 红云 + 乌鸦)" }))

W("konan", Object.assign(base("晓 · 小南",
	{ ground: "#141019", accent: "#7E6FA8", accent2: "#D9E4F2", glow: "#EAF1FA", neutral: "#241C2B" },
	{
		kind: "paper", paper: "#F4F2F8", paper2: "#E2DDEC", fold: "#B9AED0", ink: "#1A1424",
		_note: "纸蝶:硬边折纸四翅 + 折痕 + 触角,左右两片不同明度(一张纸两面对光)",
	},
	{ opacity: 0.82, dim: 0.26, saturate: 1.04, veil: 0 },
	{ a: 0.94, b: 0.91, quiet: 0.76 }),
{ _note: "auto 没有 glow(画面里没有干净亮块),补蓝紫发色与冷白纸色" }))

W("hanabi", Object.assign(base("武当 · 花火",
	{ ground: "#2C2E42", accent: "#FDCC6A", accent2: "#8E86C0", glow: "#FFE7B0", neutral: "#3A3C52" },
	{ kind: "byakugan", pale: "#EFEAF6", _note: "白眼:瞳色淡近乎银,筋脉走冷灰紫" },
	{ opacity: 0.82, dim: 0.26, saturate: 1.05, veil: 0 },
	{ a: 0.94, b: 0.90, quiet: 0.76 }),
{ _note: "auto 的浅金 accent 本来就对(武当装束的暖金),只把 ground 压深一档给面板留对比" }))

W("hinata-last", Object.assign(base("最终章 · 雏田",
	{ ground: "#1E2340", accent: "#6C63A8", accent2: "#D8D2EC", glow: "#EFEAF8", neutral: "#2A2F52" },
	{ kind: "byakugan", pale: "#F0ECF8", _note: "白眼(用户点名)" },
	{ opacity: 0.80, dim: 0.30, saturate: 1.00, veil: 0 },
	{ a: 0.96, b: 0.935, quiet: 0.80 }),
{ _note: "亮部占 74.8%,16 套里最亮的一张:auto accent #242C53 和底色几乎同色(等于没品牌色),换成淡紫外套;卡片给最厚一档" }))

W("tobirama", Object.assign(base("漂泊 · 扉间",
	{ ground: "#222A34", accent: "#C4565B", accent2: "#9FB4C6", glow: "#DDE7F0", neutral: "#2E3742" },
	{ kind: "kunai", steel: "#D3D9E2", steelDark: "#7C8698", tag: "#EFE8D8", _note: "飞雷神苦无源自他这一脉,与水门同一件器物(钢色略冷)" },
	{ opacity: 0.80, dim: 0.28, saturate: 1.05, veil: 0 },
	{ a: 0.95, b: 0.92, quiet: 0.78 }),
{ _note: "auto ground #424A54 偏亮会让面板发灰,压深到 #222A34" }))

// 水门:已有的 tuned 只换球心,别的不碰
const m = JSON.parse(fs.readFileSync(P + "minato.json", "utf8"))
m.eye = {
	kind: "kunai", steel: "#CFD6DE", steelDark: "#79838F", tag: "#EDE6D6",
	_note: "用户点名:**飞雷神苦无**(水门的招牌器物),原来的“查克拉”占位撤掉",
}
fs.writeFileSync(P + "minato.json", JSON.stringify(m, null, 2) + "\n")
console.log("patched tuned/minato.json -> eye.kind=kunai")
