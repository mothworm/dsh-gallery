// dsh-boot-suite-naruto / tools/selftest.mjs
//
// 假 DOM 冒烟:加载**真实产物** lib/client.js,断言调色推导、瞳术绘制、v5 契约集成、
// 以及四条需求里能被数字化的那几条(画面强度 / 气泡输入框保实底 / 数量不硬编码 / 禁随机)。
// 目测的事(好不好看)不在这里,那是装机验收清单。
//
// 跑: node tools/selftest.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SUITE = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const BUNDLE = path.join(SUITE, 'lib', 'client.js')
const code = fs.readFileSync(BUNDLE, 'utf8')

let total = 0
// 11-20:底框内缩的期望值在**两个块作用域**里都要用(源码形状那段 + 行为段),所以挂一个全局。
// 由源码里的 FRAME_RING/FRAME_FEATHER 现算,不钉数字(见下面 GEO 的赋值处)。
let GEO = null
const fails = []
const ok = (cond, msg) => { total++; if (!cond) { fails.push(msg); console.log('  FAIL ' + msg) } else console.log('  ok   ' + msg) }
const near = (a, b, eps, msg) => ok(Math.abs(a - b) <= eps, msg + ' (实际 ' + a + ',期望 ' + b + ')')

// ---------------- 假 DOM ----------------
function mkNode(tag) {
  const n = {
    tagName: tag, children: [], parent: null, dataset: {}, style: {}, _l: {}, _text: '', _attr: {},
    getBoundingClientRect() { const r = n._r || { left: 0, top: 0, width: 0, height: 0 }; return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.left + r.width, bottom: r.top + r.height } },
    addEventListener(ev, cb) { (n._l[ev] = n._l[ev] || []).push(cb) },
    removeEventListener() {},
    appendChild(c) { c.parent = n; n.children.push(c); return c },
    removeChild(c) { const i = n.children.indexOf(c); if (i < 0) throw new Error('removeChild: 不是我的子节点'); n.children.splice(i, 1); c.parent = null; return c },
    setAttribute(k, v) { n._attr[k] = String(v) },
    getAttribute(k) { return n._attr[k] === undefined ? null : n._attr[k] },
    setPointerCapture() {}, releasePointerCapture() {},
    dispatch(ev, e) { (n._l[ev] || []).slice().forEach((f) => f(e || { stopPropagation() {}, preventDefault() {}, clientX: 0, clientY: 0 })) },
    listeners(ev) { return n._l[ev] || [] },
    get firstChild() { return n.children[0] || null },
    get childNodes() { return n.children },
    get textContent() { return n._text + n.children.map((c) => c.textContent).join('') },
    set textContent(v) { n.children.forEach((c) => { c.parent = null }); n.children = []; n._text = String(v) },
    get className() { return n._cls || '' },
    set className(v) { n._cls = String(v); n.classList._s = new Set(String(v).split(/\s+/).filter(Boolean)) },
  }
  n.classList = {
    _s: new Set(),
    add(...c) { c.forEach((x) => this._s.add(x)) },
    remove(...c) { c.forEach((x) => this._s.delete(x)) },
    contains(c) { return this._s.has(c) },
    toggle(c, on) { if (on === undefined) on = !this._s.has(c); if (on) this._s.add(c); else this._s.delete(c); return on },
  }
  // 让 id / type 直接可读写(mountLayers 用 getElementById 找背景层)
  for (const k of ['id', 'type', 'href', 'rel', 'title', 'alt']) {
    Object.defineProperty(n, k, { get() { return n._attr[k] }, set(v) { n._attr[k] = String(v) }, configurable: true })
  }
  // 真 DOM 节点都有这三个方法。11-19 丙方案要在 <html> 上挂/摘 data-bs-frame,
  // 替身当时**缺 removeAttribute**,于是 applyDecoVars 直接 TypeError —— 夹具不全也会伪装成产品有 bug。
  n.setAttribute = (k, v) => {
    n._attr[k] = String(v)
    if (k.startsWith('data-')) { const c = k.slice(5).replace(/-([a-z])/g, (_, x) => x.toUpperCase()); (n.dataset || (n.dataset = {}))[c] = String(v) }
  }
  n.removeAttribute = (k) => {
    delete n._attr[k]
    if (k.startsWith('data-')) { const c = k.slice(5).replace(/-([a-z])/g, (_, x) => x.toUpperCase()); if (n.dataset) delete n.dataset[c] }
  }
  return n
}
function walk(n, acc = []) { acc.push(n); for (const c of n.children) walk(c, acc); return acc }
// 只支持产物里真正会查的那几种,但**支持组合器**(`>` 与后代空格)和 `:not(...)`。
// 为什么 2026-11-14 要补上这一段:前两版糊字的 bug 都是"选择器字符串看着对、结构上选不到东西/选到不生成盒子的东西",
// 而这个替身当时只认单原子选择器,于是 139 条断言全绿却什么都没生效。结构必须能验,不然自测就是假的。
function atomMatches(n, s) {
  s = String(s).trim()
  // :not(...) 出现在**尾部**,而且可以连缀;必须从右往左剥,否则 [^\]]+ 会把 not 里的方括号当原子
  let m
  while ((m = s.match(/^(.*):not\(([^)]*)\)$/))) {
    if (atomMatches(n, m[2])) return false
    s = m[1].trim()
  }
  if (!s) return false
  const atoms = s.match(/\[[^\]]+\]|[.#][\w-]+|[a-zA-Z][\w-]*/g) || []
  if (!atoms.length || atoms.join('') !== s.replace(/\s+/g, '')) return false
  for (const a of atoms) {
    if (a.startsWith('[')) {
      const inner = a.slice(1, -1)
      const q = inner.indexOf('=')
      if (q < 0) { if (!hasAttr(n, inner)) return false }
      else {
        const k = inner.slice(0, q), v = inner.slice(q + 1).replace(/^["']|["']$/g, '')
        if (!hasVal(n, k, v)) return false
      }
    } else if (a.startsWith('.')) { if (!n.classList.contains(a.slice(1))) return false }
    else if (a.startsWith('#')) { if (n.id !== a.slice(1)) return false }
    else if (n.tagName !== a) return false
  }
  return true
}
function hasAttr(n, k) {
  if (k.startsWith('data-')) {
    const camel = k.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    return (n.dataset && n.dataset[camel] !== undefined) || n.getAttribute(k) !== null
  }
  return n.getAttribute(k) !== null
}
function hasVal(n, k, v) {
  if (k.startsWith('data-')) {
    const camel = k.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    const dv = n.dataset ? n.dataset[camel] : undefined
    return String(dv === undefined ? n.getAttribute(k) : dv) === v
  }
  return n.getAttribute(k) === v
}
function parseChain(sel) {
  const toks = String(sel).replace(/\s*>\s*/g, ' > ').trim().split(/\s+/)
  const out = []
  for (const t of toks) { if (t === '>') out[out.length - 1].next = 'child'; else out.push({ sel: t, next: null }) }
  return out
}
function matches(n, sel) {
  const chain = parseChain(sel)
  if (!chain.length) return false
  const step = (node, i) => {
    if (!node || !atomMatches(node, chain[i].sel)) return false
    if (i === 0) return true
    const rel = chain[i - 1].next
    if (rel === 'child') return step(node.parent, i - 1)
    for (let p = node.parent; p; p = p.parent) if (step(p, i - 1)) return true
    return false
  }
  return step(n, chain.length - 1)
}
globalThis.getComputedStyle = (n) => ({ display: (n && n._display) || 'block' })
function makeDoc() {
  const doc = {
    head: mkNode('head'), body: mkNode('body'), hidden: false, _l: {},
    // applyCardVars 把滑块值内联写在 <html> 上(和宿主写 token 同一招),替身得接得住 setProperty
    documentElement: (function () {
      const h = mkNode('html')
      h.style = { _p: {}, setProperty(k, v) { this._p[k] = String(v) }, getPropertyValue(k) { return this._p[k] || '' }, removeProperty(k) { delete this._p[k] } }
      return h
    })(),
    createElement: mkNode, createElementNS: (ns, t) => mkNode(t),
    getElementById: (id) => walk(doc.body).concat(walk(doc.head)).find((x) => x.id === id) || null,
    querySelector: (sel) => walk(doc.body).concat(walk(doc.head)).find((x) => matches(x, sel)) || null,
    querySelectorAll: (sel) => walk(doc.body).concat(walk(doc.head)).filter((x) => matches(x, sel)),
    addEventListener(ev, cb) { (this._l[ev] = this._l[ev] || []).push(cb) },
    removeEventListener() {},
  }
  // 产物里 cssTag() 用的是 document.head.querySelector(真 DOM 有,替身也得有)
  for (const k of ['head', 'body']) {
    doc[k].querySelector = (sel) => walk(doc[k]).find((x) => matches(x, sel)) || null
    doc[k].querySelectorAll = (sel) => walk(doc[k]).filter((x) => matches(x, sel))
  }
  return doc
}
const doc = makeDoc()
const store = new Map()
const win = {
  document: doc, innerWidth: 1600, innerHeight: 1000,
  localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false }),
  // 产品里量宿主 padding 基线用的是 window.getComputedStyle(不是 globalThis 那个),替身也得给一份;
  // 少了它,内缩那条路永远只走"量不到基线"的降级分支,自测就测不到真逻辑。
  getComputedStyle: (n) => ({
    display: (n && n._display) || 'block',
    paddingTop: '14px', paddingRight: '16px', paddingBottom: '14px', paddingLeft: '16px',
  }),
}
globalThis.document = doc
globalThis.window = win

let loaded = null
win.__ModuleLoader__ = { load: ({ id, factory }) => { loaded = { id, exports: factory(() => { throw new Error('宿主模块不可用') }) } } }
new Function(code)()

// ---------------- 0. 产物形状 ----------------
console.log('\n[0] 产物形状')
const PKGNAME = JSON.parse(fs.readFileSync(path.join(SUITE, 'package.json'), 'utf8')).name
ok(loaded && loaded.id === PKGNAME, 'bundle id == ' + PKGNAME)
const T = loaded && loaded.exports && loaded.exports.__test
ok(!!T, '导出了 __test 自测入口')
ok(loaded.exports.inject === undefined, '**产物没有 exports.inject**(红线:客户端包不声明 inject)')
ok(typeof loaded.exports.apply === 'function', 'exports.apply 是函数')
const noComment = code.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
ok(!/Math\s*\.\s*random/.test(noComment), '产物(去注释后)没有 Math.random —— 布图案必须确定性')
ok(!/data:image\/(png|jpeg);base64/.test(code), '产物里没有内嵌位图 base64(画面走开屏插件的路由)')
ok(T.TOKEN_NAMES.length === 89, 'token 名单 89 个(实际 ' + T.TOKEN_NAMES.length + ')')

// ---------------- 1. 颜色工具 ----------------
console.log('\n[1] 颜色工具')
ok(T.rgb2hex(T.hex2rgb('#23132B')) === '#23132B', 'hex -> rgb -> hex 往返一致')
ok(T.hex2rgb('乱码').join(',') === '128,128,128', '非法 hex 落到中性灰而不是 NaN')
ok(T.contrast('#000000', '#FFFFFF') > 20.9 && T.contrast('#000000', '#FFFFFF') < 21.1, '黑底白字对比度 ~21')
ok(T.contrast(T.legible('#7a6f75', '#141013', 7), '#141013') >= 7, 'legible 能把灰顶到 7:1')
ok(/^#[0-9A-F]{6}$/.test(T.rgba('#112233', 0.5).replace('rgba', '')) === false && /rgba\(\d+,\d+,\d+,[\d.]+\)/.test(T.rgba('#112233', 0.5)), 'rgba() 产出合法 rgba(...)')

// ---------------- 2. 兜底调色与降级 ----------------
console.log('\n[2] 兜底与降级')
T.DIAG.warns.length = 0
const fb = T.normalizePalette(null)
ok(fb.eye.kind === 'unknown', '空调色 -> unknown 眼')
ok(fb.ink.ground === T.FALLBACK_PALETTE.ink.ground, '空调色 -> 灰底锚点')
ok(/palette-missing/.test(T.DIAG.warns.join('|')) === false, 'normalizePalette(null) 不该自己报 palette-missing(那是 paletteFor 的活)')
ok(T.tokensFor(null) && Object.keys(T.tokensFor(null)).length === 89, '兜底调色也能铺满 89 个 token')

// ---------------- 3. 每套画面:token 铺满 + 可读性数字闸门 ----------------
console.log('\n[3] 逐套画面的 token 推导')
const PALS = T.PALETTES
const ids = Object.keys(PALS).sort()
ok(ids.length >= 16, '调色表至少 16 套(实际 ' + ids.length + ') —— 加新主题不许打破这条,所以数量不写死')
// —— 新主题「永夜 · 扉间」的三条守门断言(11-14 加) ——
{
  const nt = PALS['tobirama-night']
  ok(!!nt, '新主题 tobirama-night 在合并后的调色表里')
  const mean = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String((h || '').trim())); return m ? Math.round((parseInt(m[1].slice(0, 2), 16) + parseInt(m[1].slice(2, 4), 16) + parseInt(m[1].slice(4, 6), 16)) / 3) : -1 }
  // 暗图的抽样老毛病:accent 会抽成背景色(这套的 auto 原值是 #142D4B,均值才 47)。手改成青蓝之后不许被重跑冲回去
  ok(nt && mean(nt.ink && nt.ink.accent) >= 120, '永夜强调色不是近黑(实测均值 ' + (nt ? mean(nt.ink && nt.ink.accent) : '?') + ';auto 抽样原值只有 47)')
  // 暗图药方 = 提层色 / 减厚度 / 少压暗;亮图药方相反。抄错配方的话字会糊、画面会死黑
  ok(nt && nt.card.a <= 0.62 && nt.art.dim <= 0.14, '永夜走暗图药方(a=' + (nt && nt.card.a) + ', dim=' + (nt && nt.art.dim) + '),没抄亮图那套的 0.28 压暗')
  // —— 11-14 舍人换帧后补的第一份 tuned:auto 的 accent 抽到了底色本身,强调色在 UI 里等于隐形 ——
  {
    const tn = PALS['toneri']
    ok(!!tn && tn.eye && tn.eye.kind === 'byakugan', '舍人配白眼(大筒木一族),不再掉进 unknown 画占位眼')
    ok(tn && mean(tn.ink && tn.ink.accent) >= 120, 'toneri 的 accent 已从 auto 的 #233343(均值 ' + (tn ? mean(tn.ink.accent) : '?') + ')抬到青绿荧光')
    ok(tn && tn.ink.ground !== tn.ink.accent && mean(tn.ink.ground) < mean(tn.ink.accent) - 40,
      'toneri 的 ground 与 accent 不是同一个颜色,且亮度差拉开(accent - ground >= 40)')
  }
  // —— 11-14 用户:界面底部那条 #F6F7F8 横贯白带 ——
  {
    const lumOf = (h) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '').trim())
      if (!m) return -1
      const r = parseInt(m[1].slice(0, 2), 16), g = parseInt(m[1].slice(2, 4), 16), b = parseInt(m[1].slice(4, 6), 16)
      return (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255
    }
    const tk = T.tokensFor(PALS.tobirama)
    const bse = tk && tk['--dsw-alias-bg-base']
    ok(!!bse && bse.light === bse.dark,
      '画布 token 不再让宿主按 light/dark 挑两套 —— 那条白带就是 light 槽的 ramp(0.975)≈#F6F7F8')
    ok(!!bse && lumOf(bse.light) < 0.25,
      '画布实测亮度 ' + (bse ? lumOf(bse.light).toFixed(3) : '?') + ',不是白带的 0.96(这条直接锁症状,不锁实现)')
    // token 名前缀是 alias 还是 specific 我不该猜(上一版就是这么猜错的)—— 改成名字无关的不变式:
    // 既然没有预设声明 "auto",整套表里**一条都不许残留 light !== dark**。
    const emitted = Object.keys(tk)
    ok(emitted.length >= 80, 'tokensFor 真发了整套表(实测 ' + emitted.length + ' 条) —— 防上面那条因为表空了而假通过')
    const mixed = emitted.filter((n) => tk[n].light !== tk[n].dark)
    ok(mixed.length === 0, '没有任何一条 token 还在按宿主开关分两套(残留 ' + mixed.length + (mixed[0] ? ' 例 ' + mixed[0] : '') + ')')
    const auto = T.tokensFor(Object.assign({}, PALS.tobirama, { mode: 'auto' }))
    const ab = auto && auto['--dsw-alias-bg-base']
    ok(!!ab && ab.light !== ab.dark, '逃生舱还在:预设写 "mode":"auto" 就恢复两套随宿主开关(读的是原始 mode)')
  }
  // —— 11-14 神驹斑:脑袋被截 + 球心换成官方「永恒万花筒」 ——
  {
    const mg = PALS['madara-god']
    ok(!!mg && !!mg.hero && !!mg.hero.pos, 'madara-god 有 tuned hero.pos(900x1600 竖图的 cover 取窗 auto 不看脸,只能人工定)')
    const nums = String((mg && mg.hero && mg.hero.pos) || '').match(/(\d+(?:\.\d+)?)%/g) || []
    const py = Number(String(nums[1] || '').replace('%', ''))
    ok(py > 0 && py <= 40, '取窗锚点 Y=' + py + '% (要 <=40):cover 后只剩全图 31.6% 高的一条带,49% 把带压在躯干上,头顶 23% 整颗挤出上缘')
    const mgp = T.normalizePalette(mg)
    ok(mgp.eye.kind === 'mangekyou', 'kind 由 rinnegan 改 mangekyou —— 素材自己写着「永恒万花筒」,图库没装时回退手绘要画同一枚图案')
    ok(mgp.eye.photo === 'eye.png', 'normalizePalette 没吞掉新字段 eye.photo(它是 Object.assign 透传) —— 换球心图的通用入口,不再只有苦无能换')
  }
// 滚动条极性的两条断言写在下面 SRC 那个块里 —— SRC 是块内 const,在这儿用会踩暂时性死区
}
let tuned = 0
for (const id of ids) {
  const pal = T.normalizePalette(PALS[id])
  const tk = T.tokensFor(PALS[id])
  const names = Object.keys(tk)
  const bad = names.filter((n) => !tk[n] || typeof tk[n].light !== 'string' || typeof tk[n].dark !== 'string' || !tk[n].light || !tk[n].dark)
  if (bad.length) { ok(false, id + ': 有 ' + bad.length + ' 个 token 值不全,例 ' + bad[0]); break }
  if (names.length !== 89) { ok(false, id + ': token 数 ' + names.length + ' != 89'); break }
  // 深浅两态各自的文字对比度(需求 5 的底线:画面再花,字要读得清)
  const baseD = tk['--dsw-alias-bg-base'].dark, baseL = tk['--dsw-alias-bg-base'].light
  const cd = T.contrast(tk['--dsw-alias-label-primary'].dark, baseD)
  const cl = T.contrast(tk['--dsw-alias-label-primary'].light, baseL)
  const cb = T.contrast(tk['--dsw-alias-button-primary-fill'].dark, T.onColor(tk['--dsw-alias-button-primary-fill'].dark))
  if (id === 'madara' || id === 'hinata' || id === 'minato') {
    tuned++
    ok(cd >= 7, id + ' 深色主文字 vs 画布 对比 ' + cd.toFixed(1) + ' >= 7')
    ok(cl >= 7, id + ' 浅色主文字 vs 画布 对比 ' + cl.toFixed(1) + ' >= 7')
    ok(cb >= 4.5, id + ' 主按钮底色 vs 自动字色 对比 ' + cb.toFixed(1) + ' >= 4.5')
    ok(pal.ink.ground !== T.FALLBACK_PALETTE.ink.ground, id + ' 用的是微调后的锚点,不是兜底灰')
    ok(pal.hero && /^\d\d\.jpg$/.test(String(pal.hero.file)), id + ' hero 指向 NN.jpg:' + (pal.hero && pal.hero.file))
    // 需求 5:气泡/输入框的不透明度必须明显高于"画面感"的那些面
    ok(T.alphaOf(tk['--dsw-specific-bubble'].dark) >= 0.86, id + ' 助手/用户气泡 alpha >= 0.86')
    ok(T.alphaOf(tk['--dsw-specific-input-major'].dark) >= 0.88, id + ' 输入框 alpha >= 0.88')
    // 需求 1/2:画布面一律实色(考古结论:bg-base 被 composer sticky 渐变共用,不能调透)
    ok(T.alphaOf(tk['--dsw-alias-bg-base'].dark) === 1, id + ' bg-base 是实色(不当透明白走)')
    ok(T.alphaOf(tk['--dsw-specific-sidebar-fill'].dark) === 1, id + ' sidebar-fill 是实色')
  }
}
ok(tuned === 3, '首批人工微调 3 套(实际 ' + tuned + ')')
{
  const m = T.normalizePalette(PALS.madara)
  ok(m.eye.kind === 'rinnegan', 'madara -> 轮回眼')
  ok(T.normalizePalette(PALS.hinata).eye.kind === 'byakugan', 'hinata -> 白眼')
  ok(T.normalizePalette(PALS.minato).eye.kind === 'kunai', 'minato 球心 = 飞雷神苦无(用户点名;这条以前验的是"通用查克拉眼",已作废)')
  ok(T.normalizePalette({ preset: 'nobody' }).eye.kind === 'unknown', '没点瞳术的画面 -> 降级成**看得见的占位眼**,不悄悄画只写轮眼')
  const tk = T.tokensFor(PALS.madara)
  near(T.alphaOf(tk['--dsw-specific-bubble'].dark), 0.96, 0.001, 'madara 气泡 alpha 吃 tuned 的 0.96')
}
{
  // 近单色的画面:accent 几乎无彩度时要往后退一档,而不是把黑当品牌色
  T.DIAG.warns.length = 0
  const g = T.normalizePalette({ preset: 'gray', ink: { ground: '#20201F', accent: '#151412', accent2: null, glow: null, neutral: '#333' }, eye: { kind: 'chakra' } })
  const tk = T.tokensFor(g)
  const brand = tk['--dsw-alias-brand-primary'].dark
  ok(T.satOf(brand) > 0.1, '近单色画面也能顶出有彩度的品牌色(实际 sat ' + T.satOf(brand).toFixed(2) + ')')
  ok(/accent-weak/.test(T.DIAG.warns.join('|')), '近单色会**记账**(accent-weak),不静默')
}
{
  T.DIAG.warns.length = 0
  const p = T.normalizePalette({ preset: 'x', ink: PALS.madara.ink, eye: { kind: 'sharingan3000' } })
  ok(p.eye.kind === 'unknown' && /eye-kind-unknown/.test(T.DIAG.warns.join('|')), '瞳术名写错 -> 退回 unknown 并记账')
}
ok(T.tokensFor({ preset: 'z', tokens: { '--dsw-alias-brand-primary': '#123456' } })['--dsw-alias-brand-primary'].dark === '#123456',
  'tuned.tokens 逃生舱能点名覆盖单个 token(两态同值写法)')

// ---------------- 3b. 文本框底下的字(2026-11-14 真机第二次翻车后改的算术闸门) ----------------
console.log('\n[3b] 统一文本框压在画面极值块上时,字还读不读得清')
{
  // 真机结论:神驹·斑 同一张画里既有 #FAFAFA 白底又有黑发红甲,
  // 所以"给画面盖一层整体纱"这条路本质不成立 —— 改成给文字本身加框,这里就按框算。
  // color-mix(layer2 A%, transparent) 压在不透明画面上 = mix(layer2, art, 1-A)
  const BRIGHT = '#FAFAFA', DARK = '#231312'   // 神驹·斑里真实存在的两极
  for (const id of ['madara', 'hinata', 'minato', 'madara-god']) {
    const pal = T.normalizePalette(PALS[id]), tk = T.tokensFor(PALS[id])
    const a = Math.min(pal.card.a, pal.card.b)   // 渐变里最薄的那一端才是真下限
    const effD = T.mix(tk['--dsw-alias-bg-layer-2'].dark, BRIGHT, 1 - a)
    const effL = T.mix(tk['--dsw-alias-bg-layer-2'].light, DARK, 1 - a)
    const cd = T.contrast(tk['--dsw-alias-label-primary'].dark, effD)
    const cl = T.contrast(tk['--dsw-alias-label-primary'].light, effL)
    ok(cd >= 4.5, id + ' 深色:主文字 vs (画面最亮块+card.a ' + a + ') = ' + cd.toFixed(1) + ' >= 4.5')
    ok(cl >= 4.5, id + ' 浅色:主文字 vs (画面最暗块+card.a ' + a + ') = ' + cl.toFixed(1) + ' >= 4.5')
    // 反证:没有框(直接把字压在两极块上)就是不达标,证明这两条不是恒真
    ok(T.contrast(tk['--dsw-alias-label-primary'].dark, BRIGHT) < 4.5 || T.contrast(tk['--dsw-alias-label-primary'].light, BRIGHT) < 4.5,
      id + ' 反证:同一套字没有框时至少有一态不达标')
    ok(pal.art.veil === 0, id + ' veil 确实是 0(不再靠盖画面续命)')
  }
}

// ---------------- 4. 瞳术绘制 ----------------
console.log('\n[4] 球心瞳术')
const kinds = ['sharingan', 'mangekyou', 'rinnegan', 'byakugan', 'chakra', 'sensor', 'unknown']
for (const k of kinds) {
  const s = T.eyeSvg({ preset: k, ink: PALS.madara.ink, eye: { kind: k } })
  ok(/^<svg /.test(s) && /<\/svg>$/.test(s) && s.indexOf('viewBox="0 0 100 100"') > 0, k + ': 出图是合法 svg 外壳')
  ok(!/NaN|undefined|null/.test(s), k + ': svg 里没有 NaN/undefined')
  ok(s.length > 400 && s.length < 6000, k + ': 尺寸合理(' + s.length + ' B)')
}
{
  const a = T.eyeUri(PALS.madara), b = T.eyeUri(PALS.madara)
  ok(a === b, '同一调色两次绘制**逐字节相同**(确定性;madara 那条纪律)')
  ok(a.startsWith('data:image/svg+xml,'), 'eyeUri 是 svg data URI,不是 base64 位图')
  ok(a !== T.eyeUri(PALS.hinata), '不同画面的眼睛不一样')
  ok(T.eyeUri(PALS.madara).indexOf(encodeURIComponent('#9C1B2B').toLowerCase()) >= 0 || /%23/i.test(a), '瞳术吃这套画面的红(色值进得了 URI)')
  const unk = T.eyeSvg({ ink: PALS.madara.ink, eye: { kind: 'unknown' } })
  ok(/>?<\?|text-anchor/.test(unk) && /B9B0B6/.test(unk), '未配色画的是**看得见的**灰芒占位,不是空白')
}
ok(Object.keys(T.EYE_KINDS).length >= 6, '瞳术种类表 >= 6 种')

// ---------------- 5. 画面层与落点 ----------------
console.log('\n[5] 画面层(dynCss)')
{
  const CONV = '[data-conversation-content]'
  const pal = T.normalizePalette(PALS.madara)
  const st = { art: { url: '/dsh-boot-naruto/arts/madara/04.jpg?v=abc', pos: '52% 41%', src: 'hero' }, preset: 'madara', title: '斑', list: [], manual: true, pal }
  const css = T.shellCss + T.dynCss(pal, st, CONV)
  ok(css.indexOf('url("/dsh-boot-naruto/arts/madara/04.jpg?v=abc")') > 0, 'CSS 里出现开屏插件给的 URL(不自己拼路径)')
  ok(css.indexOf('52% 41%') > 0, '画面定位吃 preset.json 的 act.pos')
  ok(/background-size:cover,cover,cover;/.test(css), '三层叠法:冲淡 + 暗罩 + 图(veil 默认已归 0)')
  const only = T.dynCss(pal, st, CONV)
  ok(only.indexOf('color-mix') < 0, 'dynCss 里**不再有整体纱**(画面不被盖住,读性交给统一文本框)')
  ok(/--bs-card-a:\d{2}%;--bs-card-b:\d{2}%;--bs-card-q:\d{2}%;/.test(only), '三个文本框厚度旋钮都注进了 :root')
  ok(T.shellCss.indexOf(T.CARD_SEL + '{') > 0, '卡片规则就打在 CARD_SEL 上:' + T.CARD_SEL.slice(0, 46) + '…')
  ok(/> div\s*$/.test(T.CARD_SEL), 'CARD_SEL 落在锚点的**子 div**(锚点 display:contents 画不出底)')
  ok(T.shellCss.indexOf('> [data-slot="conversation.chat.node"] > div') > 0, 'CSS 里是 "kind > 锚点 > div" 三层,不是裸锚点')
  ok(T.shellCss.indexOf('[data-slot="conversation.chat.node"]{') < 0, '**没有**把底色加在裸锚点上(那条视觉上是零,别再犯)')
  ok(/:not\(\[data-chat-flow-kind="user"\]\)/.test(T.CARD_SEL), 'user 行走宿主实底气泡,卡片用 :not() 让开(避免框中框)')
  ok(/color-mix\(in srgb,var\(--dsw-alias-bg-layer-2\)/.test(T.shellCss), '文本框颜色吃 var() token(深浅两态自动切,不硬编码)')
  ok(/box-shadow:0 0 0 1px color-mix/.test(T.shellCss), '卡片描边 = **B 版 box-shadow 发丝边**(11-14 判定:A 版双层 background-clip 真机看不见,已作废)')
  ok(/box-shadow:0 0 0 1px rgba\(255,255,255,\.20\)/.test(T.shellCss), '发丝边有一条**不含 color-mix 的保底**(引擎不认 color-mix 也画得出边)')
  ok(/::before\{content:"";position:absolute;left:-1px;[^}]*opacity:0/.test(T.shellCss), '品牌色细脊的几何只画一次,默认隐藏')
  ok(T.shellCss.indexOf(T.KIND_SEL.assistant + '::before{opacity:1}') > 0, '助手正文点亮细脊(整条逗号列表后面挂 ::before)')
  ok(T.shellCss.indexOf(T.KIND_SEL.quiet + '::before{opacity:.28}') >= 0,
    '判定②(11-14):次要行**也**点亮细脊,但只给 .28 —— 看不见的设计等于没有,而它必须比正文淡')
  ok(T.shellCss.indexOf(T.KIND_SEL.assistant + '::before{opacity:1}') >= 0, '正文脊仍是 opacity:1(层级没被 quiet 那条抹平)')
  ok(/0 14px 34px -14px/.test(T.shellCss) && /0 18px 42px -16px/.test(T.shellCss), '两级投影:基础 + 助手更深一档(层次靠阴影,不靠堆边框)')
  ok(/:hover\{box-shadow:0 1px 2px rgba\(0,0,0,\.26\),0 20px 46px/.test(T.shellCss), '助手卡片 hover 只是阴影收一点(没有把整块文字弹走)')
  ok(T.KIND_SEL.quiet.indexOf('[data-chat-flow-kind="tool-call"] > ') === 0, '次要行(工具调用等)走更薄的 quiet 档')
  ok(/--bs-card-a:var/.test('x') === false && /var\(--bs-card-a,\s*94%\)/.test(T.shellCss), 'shellCss 吃 --bs-card-a 旋钮(滑块才有得可拧)')
  ok(css.indexOf('display:none') > 0, '命中会话区落点时,**不再挂浮层**(旧主题糊字的根因)')
  ok(/data-chat-flow-kind="assistant-step"\] > \[data-slot="conversation\.chat\.node"\] > div/.test(T.shellCss), '助手正文有专门的 CSS 规则(三层形状,产物里它没 token 可吃)')
  const a0 = T.normalizePalette({ preset: 'x', ink: pal.ink, eye: { kind: 'rinnegan' }, art: { opacity: 1, dim: 0.2 } })
  const css1 = T.dynCss(a0, st, CONV)
  ok(/rgba\(\d+,\d+,\d+,0\)/.test(css1), 'art.opacity=1 时冲淡层 alpha 归 0(全见原图)')
  const css2 = T.dynCss(pal, { preset: 'madara', list: [], pal, art: null, why: 'no-boot-api' }, CONV)
  ok(/-bg\{display:block;opacity:1;filter:none/.test(css2) && /linear-gradient\(160deg/.test(css2), '取不到画面时画**可看见的灰底**,不留隐形')
  const css3 = T.dynCss(pal, st, CONV)
  ok(css3 === T.dynCss(pal, st, CONV), '同一状态两次出样式逐字节相同(确定性)')
}
// ---------------- 5b. 面板里的字(2026-11-14 真机点名:选图/滑块/按钮看不清) ----------------
console.log('\n[5b] 面板文字必须**算**出来,不是靠 opacity 蒙')
{
  for (const id of ['madara', 'madara-god', 'hinata', 'minato', 'sasuke']) {
    const pal = T.normalizePalette(PALS[id])
    const css = T.dynCss(pal, { art: null, preset: id, list: [], pal }, null)
    const m = css.match(/#dsh-bs-panel\{background:([^;]+);--bs-fg:(#[0-9A-Fa-f]{6});--bs-fg-dim:(#[0-9A-Fa-f]{6});/)
    ok(!!m, id + ' 面板底 + 主字 + 次要字三个值都算出来了')
    if (m) {
      // rgba() 产物是**数字分量**不是 hex,所以这里两种写法都要能吃(否则这条闸门自己就是个哑炮)
      const bgRaw = m[1]
      const hx = bgRaw.match(/#[0-9A-Fa-f]{6}/)
      const bg = hx ? hx[0] : '#' + bgRaw.match(/\(([^)]*)\)/)[1].split(',').slice(0, 3)
        .map((s) => Number(s.trim()).toString(16).padStart(2, '0')).join('')
      const c1 = T.contrast(m[2], bg), c2 = T.contrast(m[3], bg)
      ok(c1 >= 4.5, id + ' 主文字 vs 面板底 = ' + c1.toFixed(2) + ' >= 4.5')
      ok(c2 >= 4.5, id + ' 次要文字 vs 面板底 = ' + c2.toFixed(2) + ' >= 4.5(以前是 opacity:.72,现在必须真达标)')
    }
    ok(/--bs-btn-bg:/.test(css) && /--bs-btn-bd:/.test(css), id + ' 按钮的底色/描边也算好(不是写死 rgba(255,255,255,.07))')
  }
  ok(!/\.hd\{[^}]*opacity:\.7/.test(T.shellCss) && !/\.foot\{[^}]*opacity:\.7/.test(T.shellCss) && !/\.tune \.t\{[^}]*opacity:\.6/.test(T.shellCss),
    'shellCss 里**没有**再用 opacity 降级来代替颜色(那是"看不清"的直接来源)')
  ok((T.shellCss.match(/var\(--bs-fg(-dim)?,/g) || []).length >= 6, '面板至少 6 处文字吃算出来的颜色变量')
  ok(/\.cell \.lab\{[^}]*text-shadow:0 1px 3px rgba\(0,0,0,\.95/.test(T.shellCss.replace(/\n/g, '')) || T.shellCss.indexOf('text-shadow:0 1px 3px rgba(0,0,0,.95)') > 0,
    '缩略图上的名字自带描边兜底(图是用户自己的画,那里没法靠面板色)')
}
// ---------------- 5c. 瞳纹(佐助 = 六芒星;写轮眼的红不许被抽色接管) ----------------
console.log('\n[5c] 瞳纹形状与瞳红')
{
  const sas = T.normalizePalette(PALS.sasuke)
  ok(sas.eye.kind === 'mangekyou6', 'sasuke tuned 点名 mangekyou6(六芒星),不是鼬那种三刃风车')
  const svg = T.eyeSvg(sas)
  const np = (svg.match(/<polygon/g) || []).length
  ok(np === 2, '六芒星 = 两个交叠正三角(实测 polygon ' + np + ' 个)')
  ok(svg.indexOf('M50 20 C') < 0, '佐助这只眼里没有风车刃残留')
  const hRed = T.hueOf(T.eyeColors(sas).red)
  ok(hRed <= 45 || hRed >= 335, '佐助瞳红色相 ' + hRed.toFixed(0) + '° 在红 family(画面 accent 是 232° 蓝紫,抽色一接管就画成蓝轮眼)')
  for (const id of Object.keys(PALS)) {
    const p = T.normalizePalette(PALS[id])
    if (['sharingan', 'mangekyou', 'mangekyou6'].indexOf(p.eye.kind) < 0) continue
    const hh = T.hueOf(T.eyeColors(p).red)
    ok(hh <= 45 || hh >= 335, id + '(' + p.eye.kind + ') 瞳红在红 family:' + hh.toFixed(0) + '°')
  }
  ok(T.EYE_KINDS.mangekyou6 === '万花筒·六芒星', 'kind 有中文标签(悬浮球 title/面板用)')
  ok(svg.length < 6000, '一只眼仍是几 KB 文本:' + svg.length + ' B(没走内嵌位图那条路)')
  const angles = (svg.match(/rotate\(/g) || []).length
  ok(angles === 0, '六芒星靠三角坐标画,不需要 rotate(确定性另证):' + angles + ' 次')
  // ---- 用户点名的球心,一张表钉死(球心 = 人物设定,不该由抽色或默认值决定) ----
  const EYE_SPEC = {
    danzo: 'sharingan', kakashi: 'mangekyouPin', itachi: 'mangekyou', sasuke: 'mangekyou6',
    minato: 'kunai', tobirama: 'kunai', konan: 'paper',
    hanabi: 'byakugan', 'hinata-last': 'byakugan', hinata: 'byakugan',
    madara: 'rinnegan',
    // madara-god 11-14 由 rinnegan 改 mangekyou:官方素材自己写着「…狂永恒万花筒」,
    // 图案是红盘 + 黑辐条 + 三勾玉(不是轮回眼的同心圆),回退手绘必须画同一枚。
    'madara-god': 'mangekyou',
    // 11-15 兄弟之战:auto 的 eye.kind 一直是空的(-> unknown,球心只能画兜底眼),
    // 用户给的素材是佐助的六芒样式,按 sasuke 同一支持 mangekyou6,回退手绘才与照片同一枚。
    brothers: 'mangekyou6',
  }
  for (const id of Object.keys(EYE_SPEC)) {
    const p = T.normalizePalette(PALS[id])
    ok(p.eye.kind === EYE_SPEC[id], id + ' 球心 = ' + EYE_SPEC[id] + '(实际 ' + p.eye.kind + ')')
    ok(!!T.EYE_KINDS[p.eye.kind], id + ' 的 kind 在 EYE_KINDS 里有标签(不会悄悄退化成"未配色")')
    const s = T.eyeSvg(p)
    ok(s.length > 400 && s.length < 9000, id + ' 眼图 ' + s.length + ' B(仍是文本,没走内嵌位图)')
    ok(s === T.eyeSvg(p), id + ' 眼图逐字节可复现')
  }
  // —— 11-15 用户点名三套换官方球心图:照片只住图库,手绘必须留着当回退 ——
  for (const id of ['brothers', 'kakashi', 'danzo']) {
    const p = T.normalizePalette(PALS[id])
    ok(p.eye.photo === 'eye.png', id + ' 球心走 eye.photo(图进图库与私有包,代码包 0 图片)')
    const svg = T.eyeSvg(p)
    ok(svg.length > 400 && svg.indexOf('<svg') === 0, id + ' 的手绘回退 SVG 还在(' + svg.length + ' B) —— 只装代码包的人不能看到空球')
  }
  ok(PALS.kakashi.eye.red === '#A81622', 'kakashi 的 eye.red 没被"加 photo"这次编辑顺手弄丢(它是防止瞳红被 accent 抽成橙色的那一步)')
  ok(PALS.danzo.eye.red === '#C21F26', 'danzo 的 eye.red 同样还在')
  ok(PALS.brothers.hero && PALS.brothers.hero.file === '03.jpg', 'brothers 新建的 tuned 只补了 eye,hero 仍从 auto 继承(deepMerge 不该把没写的键清空)')
  ok(T.eyeSvg(T.normalizePalette(PALS.minato)).indexOf('飛雷神') >= 0, '水门的苦无带「飛雷神」术式札(那是这把刀的身份)')
  ok(T.eyeSvg(T.normalizePalette(PALS.tobirama)).indexOf('飛雷神') >= 0, '扉间同一件器物(飞雷神苦无)')
  {
    const dan = T.eyeSvg(T.normalizePalette(PALS.danzo))
    ok((dan.match(/rotate\(/g) || []).length === 3, '团藏 = 三勾玉(实测 rotate 3 次;他臂上排的就是三勾玉,不是万花筒)')
    const pin = T.eyeSvg(T.normalizePalette(PALS.kakashi))
    const ita = T.eyeSvg(T.normalizePalette(PALS.itachi))
    ok(pin !== ita, '卡卡西和鼬的万花筒**不是同一张图**(用户点名要区分)')
    ok(pin.indexOf('M50 19 L') >= 0, '卡卡西那只:直边扫掠刃 bladeStraight')
    ok(ita.indexOf('M50 20 C') >= 0, '鼬那只:钝三角弯刃 blade')
    ok(pin.indexOf('r="13.5"') >= 0, '卡卡西那只带瞳环')
    const pap = T.eyeSvg(T.normalizePalette(PALS.konan))
    ok((pap.match(/<polygon[^>]*stroke=/g) || []).length === 4, '纸蝶四翅 = 4 片**带描边**的多边形(实测 ' + (pap.match(/<polygon[^>]*stroke=/g) || []).length + ';总 polygon 是 5,第 5 片是不描边的身体)')
    ok(pap.indexOf('rotate(-8 50 50)') >= 0 && (pap.match(/<line/g) || []).length >= 2, '纸蝶:歪 8° + 折痕线(折纸味靠硬边,不靠渐变)')
    ok(pap.indexOf('Q42 25') >= 0, '纸蝶有触角(没触角就是一坨白三角)')
    // 停转守卫:源码级断言(不去驱动假 DOM 的整条 render 链)。**11-16 扩到三类覆盖**:
    // 苦无/纸蝶(器物不该甩飞刀)+ **eye.photo(照片转起来就是"歪" —— 用户点名的团藏与兄弟之战)**。
    // 按"是不是照片"划界而不是按种类:卡卡西/神驹斑图案旋转对称,转了看不出问题,那是巧合不是设计。
    // 断言只钉语义(kunai / paper / photo 三个条件都在),**不钉我那行注释的措辞**(这条踩过两次)。
    ok(/classList\.toggle\("no-spin".*kunai.*paper.*!!pal\.eye\.photo/.test(code),
      '器物类与**照片类**球心都有停转守卫 —— 手绘纹章照转,-spin 转的是 ball>img,照片一转就歪')
  }
}
{
  // ART_TARGET 拿不到时的兜底路径:走浮层 + saturate(dynCss 的第三个参数专为这条断言存在)
  const pal = T.normalizePalette(PALS.hinata)
  const st = { art: { url: '/a/b.jpg', pos: 'center' }, preset: 'hinata', list: [], pal }
  const css = T.dynCss(pal, st, null)
  ok(/filter:saturate/.test(css) && /-bg\{display:block/.test(css), '落点缺失 -> 退回固定浮层 + saturate 旋钮仍生效')
  ok(T.dynCss(pal, st, '[data-conversation-content]') !== css, '有落点 / 没落点产出的是两套不同规则')
}
{
  // —— 11-14 用户判定的三条守卫:描边走 B 版 / 配饰存在且能关 / tuned 降厚落在窗口内 ——
  // 自己读产物,不蹭上面那些块的局部变量(它们各有作用域,蹭一次就 ReferenceError)
  const fsM = await import("node:fs")
  const { fileURLToPath } = await import("node:url")
  const SRC = fsM.readFileSync(fileURLToPath(new URL("../lib/client.js", import.meta.url)), "utf8")
  ok(!/background-clip:padding-box,border-box/.test(SRC),
    '产物里**不再有** A 版双层 background-clip 描边(真机上基本看不见,已作废)')
  ok(/box-shadow:0 0 0 1px color-mix\(in srgb,var\(--bs-brand/.test(SRC) && /box-shadow:0 0 0 1px rgba\(255,255,255,\.20\)/.test(SRC),
    'B 版发丝边两条都在:品牌色那条 + **不含 color-mix 的保底**那条(引擎不认 color-mix 也画得出边)')
  // —— 11-19 配饰档位重做:无 / 土遁 / 火遁 / 雷遁 / 水遁 / 风遁;五遁是资源包位图,代码 0 素材 ——
  // 全部按**语义**判(档位表存在、指向什么文件、旧档不残留、旧存档降级),不钉坐标像素,免得下次调参又假失败。
  ok(/DECO_MODES\[k\]/.test(SRC) && /el\.decoBtns = \{\}/.test(SRC) && /DECO_LABELS = \[\["none", "无"\]/.test(SRC),
    '面板上真有配饰那排按钮(含「无」档),六档顺序按用户 11-19 给的字面 —— 用户关得掉')
  ok(/doton: \{ file: "frame-doton\.png"/.test(SRC) && /futon: \{ file: "frame-futon\.png"/.test(SRC),
    '五遁档各自指向 frame-&lt;遁&gt;.png(文件名 = 资源包 arts/ui/ 里的真名,大小写不敏感)')
  ok(!/"leaf"|"windmill"|"shuriken"|"zetsu"|"both"/.test(SRC),
    '旧四档的字面值在产物里一个都不剩(按钮表 + 档位表 + SVG 表都算;注释里的裸词不算,所以正则带引号)')
  ok(/background-image:var\(--bs-frame-src,none\)/.test(SRC) && /background-size:100% 100%/.test(SRC) && !/border-image-source/.test(SRC),
    '底框是**丙方案整图缩放**(::after 上 background-image + background-size:100% 100%);旧九宫 border-image 必须彻底不在')
  ok(!/background-image:var\(--bs-deco-a/.test(SRC),
    '更早那版 --bs-deco-a/-b 两层 background-image 也不许残留(它和丙用同一个属性,回来就会互相顶掉)')
  ok(/none: \{ file: null \}/.test(SRC),
    '「配饰:无」真的既不画底框也不内缩(file=null;没有 file 就解析不出 URL,内缩那条路整个不进)')
  // 11-20:内缩从硬编码 26/36 px 改成按比例(当时按环带几何)。
  // 11-21:底框换成"整张装饰层"(deco 模式),几何常量也跟着换 —— 但**仍然不钉死数字**:
  // 把产品源码里的 FRAME_INSET / FRAME_ASPECT 解析出来再算期望值,调参不用改自测。
  // ⚠ 挂在全局上:行为断言那几块在别的块作用域里,需要同一个期望值。
  GEO = (() => {
    const m = SRC.match(/const FRAME_INSET = \{ x: ([\d.]+), y: ([\d.]+) \};/)
    const ma = SRC.match(/const FRAME_ASPECT = ([\d.]+) \/ ([\d.]+);/)
    if (!m || !ma) return null
    const ix = parseFloat(m[1]), iy = parseFloat(m[2])
    const aspect = parseFloat(ma[1]) / parseFloat(ma[2])
    // 产品里的算式:ex = 卡宽 x INSET.x ; ey = 卡宽 x ASPECT x INSET.y(纵向也以卡宽为尺子,见源码注释)
    return { ix, iy, aspect, insX: Math.round(420 * ix), insY: Math.round(420 * aspect * iy) }
  })()
  {
    const geo = GEO
    ok(!!geo && geo.insY >= 20 && geo.insY <= 80,
      '纵向内缩是**按卡宽折算的合理值**(底图 720x456 等比拉伸 ⇒ 纵向不能直接吃卡高比例)。实际 ' + (geo ? JSON.stringify(geo) : '源码里解析不出 FRAME_INSET/FRAME_ASPECT'))
    ok(!!geo && geo.ix > 0.05 && geo.ix < 0.30 && geo.iy > 0.05 && geo.iy < 0.40,
      '两个内缩比例都在"躲开角素、又不至于把正文挤没"的区间里(0.05~0.30 / 0.05~0.40)。实际 ' + (geo ? geo.ix + '/' + geo.iy : '解析失败'))
    ok(/FRAME_INSET/.test(SRC) && /FRAME_ASPECT/.test(SRC) && !/in: 26/.test(SRC),
      '硬编码的 `in: 26` 已彻底不存在(档位表里只剩 file;留着旧字段迟早有人以为它还在生效)')
  }
  ok(/":root\[data-bs-frame\] " \+ CARD_SEL/.test(SRC) && /root\.removeAttribute\("data-bs-frame"\)/.test(SRC) && /root\.setAttribute\("data-bs-frame", mode\)/.test(SRC),
    '文字内缩被 data-bs-frame 门控,且**每轮先摘再按需挂** —— 没激活底框、或量不到基线时那条 padding 规则一个像素都不生效(用户的硬要求:其他效果不变)')
  ok(/getComputedStyle\(node\)/.test(SRC) && /paddingTop/.test(SRC) && /--bs-frame-pl/.test(SRC),
    '内缩用的是**实测的宿主 padding 基线**,不是拍脑袋的数;量不到就只画框不内缩(frame-pad-skipped)')
  // —— 分离性(11-20 补):丙方案把底框做成独立 ::after 层,而"拖滑块只改文字底"这句话要成立,
  //    必须两条规则**互不吃对方的变量**。将来谁把底框并回背景列表(或给 ::after 挂上 opacity),
  //    画面看起来"只是淡了一点",实际是用户硬要求的"其他效果不变"被破 —— 这里拦住。
  // ⚠ 第一版我拿花括号去切 **JS 源码 SRC**,结果切出 `{",` 三个字符的空块,"不含另一变量"当然成立
  //    = 装饰性断言。产物 CSS 在源码里是许多字符串片段拼的,**必须切装配后的 shellCss**;两块都要求非空。
  {
    const css = String(T.shellCss)
    const ruleOf = (re) => {
      const m = re.exec(css)
      if (!m) return null
      const s = css.lastIndexOf('}', m.index) + 1
      const e = css.indexOf('}', m.index)
      return e > s ? css.slice(s, e + 1) : null
    }
    const fRule = ruleOf(/--bs-frame-src,\s*none/)
    const aRule = ruleOf(/var\(--bs-card-a,\s*94%/)
    ok(!!fRule && fRule.length > 40 && !/--bs-card-[abq]\b|opacity:var\(/.test(fRule),
      '底框那条 CSS 规则里**不出现任何滑块旋钮**(拖滑块只改文字底,框一档都不跟着淡)。实际 ' + (fRule ? fRule.length + ' 字符:' + fRule.slice(0, 72) : '根本没解析出这条规则'))
    ok(!!aRule && aRule.length > 40 && !/--bs-frame-src/.test(aRule),
      '文字底那条 CSS 规则也不吃底框变量 —— 两个旋钮各管一层,不存在"改一个连坐另一个"。实际 ' + (aRule ? aRule.length + ' 字符:' + aRule.slice(0, 72) : '根本没解析出这条规则'))
  }
  ok(/return DECO_MODES\[v\] \? v : "none"/.test(SRC),
    '老 localStorage 里的旧档位存档一律降级成「无」:改档位不许让老浏览器崩,也不许画出半只旧纹样')
  // —— 验收通道本身也得有闸:不然哪天探针列被删了,"刷新后看日志"这条验收就悄悄失效 ——
  ok(/deco: curMode, frame: curFile/.test(SRC) && /b: BUILD_STAMP/.test(SRC) && /const BUILD_STAMP = "b\d{4}"/.test(SRC),
    '探针带 deco/frame 两列、构建戳**只有一个来源**(BUILD_STAMP 常量)且是 b+4 位')
  ok(/inx: lastFrameInset \? lastFrameInset\.x : -1/.test(SRC) && /deco: k, frame: uri \? 1 : 0, b: BUILD_STAMP/.test(SRC),
    '点配饰按钮**立刻**打一条带 deco/frame/inx/iny/cw 的记录(交接单里「deco=<遁> frame=1 至今没有」就是因为这条路径原先一行日志都不打)')
  ok(/STATE\.st && STATE\.st\.ui/.test(SRC) && /String\(f\.name\)\.toLowerCase\(\) === file/.test(SRC),
    '底框 URL 只从清单 st.ui 的 files[].url 查,且按**小写名**匹配(好友投放时大小写随意都对得上)')
  ok(!/\/dsh-boot-naruto\/arts\/ui\//.test(SRC),
    '产物里**没有**硬编码的 /dsh-boot-naruto/arts/ui/ 路径:底框只准从清单取 URL(两个插件不许绑死)')
  ok(/const UI_ID = "ui"/.test(SRC) && /all\.filter\(\(p\) => p\.id !== UI_ID\)/.test(SRC),
    'arts/ui/ 是共享素材目录不是主题:它被摘出 list(不进选单、不算"共 N 套"),只留 st.ui 给配饰查 URL')
  // 盯**调用**而不是提法:产物里有两处注释写着"禁 Math.random",按 /Math\.random/ 会自己抓自己
  ok(!/Math\.random\(/.test(SRC), '产物里没有 Math.random **调用**(纹样坐标写死,同一张卡每次渲染必须长一样)')
  const dir = fileURLToPath(new URL("../palettes/tuned/", import.meta.url))
  const files = fsM.readdirSync(dir).filter((x) => x.endsWith(".json"))
  const over = []
  for (const f of files) {
    const c = (JSON.parse(fsM.readFileSync(dir + f, "utf8")) || {}).card
    if (c && !(c.a >= 0.5 && c.a <= 0.74 && c.b >= 0.5 && c.b <= 0.74 && c.quiet >= 0.4 && c.quiet <= 0.62)) over.push(f.replace(/\.json$/, "") + "(" + c.a + "/" + c.b + "/" + c.quiet + ")")
  }
  ok(files.length >= 12, 'tuned 至少 12 套(实测 ' + files.length + ')')
  // 上界 0.74 不是随手给的:madara / minato 亮部占大头,自测那道 4.5 对比门顶住了降厚,
  // 这两套被抬到 0.72/0.70;其余十套都在 0.55–0.65。**没有任何一套回到 0.9x** 才是这条的真意思。
  ok(over.length === 0, 'tuned 的 card.a/b 落在 0.5–0.74、quiet 落在 0.4–0.62(降厚后);越界:' + (over.join(", ") || "无"))
  // —— 11-14 用户报「右侧回顾会话历史那个滑块…不是没了,而是很不明显」——
  // 病根:静止态滑块原本只有 12%/18% 透明度,而它背后是开机画面(同列里月影到亮弧差 6 档亮度)。
  ok(/sb1: rgba\(sbPol, dark \? 0\.26 : 0\.30\), sb2: rgba\(sbPol, dark \? 0\.34 : 0\.38\)/.test(SRC),
    '滚动条静止态滑块抬到 0.26–0.38(不再用"跟画面和谐"的 12%/18%)')
  ok(/::-webkit-scrollbar-track\{background:rgba\(128,128,128,\.26\)\}/.test(SRC) && /::-webkit-scrollbar-track\{background:color-mix/.test(SRC),
    '滚动条补了**轨道底块**(先把画面压成已知均匀底),且有一条不含 color-mix 的保底')
  ok(!/::-webkit-scrollbar\{width/.test(SRC), '没去改滚动条**宽度**(改宽度会推全站 layout,这条是刹车)')
  // 极性:凡 `scrollbar-width:thin` 的地方 Chromium 忽略伪元素 -> 没有轨道底,滑块直接压画面,
  // 这时候只看主题开关 `dark` 会选错边(浅色主题 + 永夜那种黑画 = 黑压黑)。必须按画面亮度兜一层。
  ok(/rgba\(sbPol,/.test(SRC) && SRC.indexOf('sbLum(ink.ground) < 0.20') >= 0,
    '滑块极性按**画面亮度**选(sbPol / 阈值 0.20),不再只看主题模式 —— 永夜 ground 亮度实测 0.074')
  ok(!/sb1: rgba\(dark \? "#FFFFFF" : "#000000"/.test(SRC), '旧那版"只看主题模式"的极性写法已经不存在(防止被改回去)')
  // —— 11-14 用户截图:宽表格的后几列逃出卡片、压在开机画上糊掉 ——
  ok(/table\{display:block;max-width:100%;overflow-x:auto\}/.test(SRC), '宽表格变成**卡片内部的横向滚动容器**,不再溢出到画上')
  ok(/code\{overflow-wrap:anywhere/.test(SRC) && /pre\{max-width:100%;overflow-x:auto\}/.test(SRC),
    '长行内代码允许断行 + pre 自己滚,两个撑宽源都堵上')
  ok(!/table-layout:fixed/.test(SRC), '没有用 table-layout:fixed(那会把 ✅ 状态列和长路径列拉成等宽,更难看)')
  // —— 11-14 用户:手绘苦无「不太还原」,球心改用官方图(核实:金柄 / 空心环首 / 黑字直书 三处我都画错了) ——
  // 11-14 神驹斑换球心图时,这条被参数化成 `want`(默认仍 kunai.png)—— 机制没变,所以改字面匹配而不是放宽。
  ok(SRC.indexOf('replace(/[^/]*$/, want)') >= 0 && SRC.indexOf('"kunai.png"') >= 0 && SRC.indexOf('pal.eye.photo') >= 0,
    '苦无球心走**同源 URL**(拿当前画面 URL 换掉文件名),不拼绝对路径、也不复制 ARTS_ROUTE 常量;文件名来自 eye.photo,缺省回 kunai.png')
  ok('/dsh-boot-naruto/arts/madara/04.jpg?v=s3'.replace(/[^/]*$/, 'kunai.png') === '/dsh-boot-naruto/arts/madara/kunai.png',
    '换文件名这一步会把 ?v= 查询串一起吃掉(留着的版本是 04.jpg 的,安在 kunai.png 身上就是错发 immutable)')
  ok(/DIAG\.ballPhoto = "fallback"/.test(SRC) && /onerror/.test(SRC),
    '图库不在时 onerror 回退手绘 SVG,并用 DIAG.ballPhoto 记账(真机核对 photo / drawn / fallback)')
  ok(/eyeUri\(pal\)/.test(SRC), '手绘 SVG 那条路**还留着** —— 只装代码包的人靠它,不许删')
  ok(!/data:image\/png;base64/.test(SRC), '苦无图没有烘成 base64 进代码(图片不进 git / 不进插件市场)')
  // —— 11-14 用户:球"读起来像贴了个图的圆",要质感 / 3D ——
  ok(SRC.indexOf("-ball::after{") >= 0 && SRC.slice(SRC.indexOf("-ball::after{"), SRC.indexOf("-ball::after{") + 260).indexOf("content:") >= 0,
    '球体质感层走伪元素:60-boot 的 background 简写会把 background-image 重置成 none,同特异度比顺序太脆')
  // 原来这条把坐标**字面**钉死成 66%/70%,11-18 用户批准"右下那片黑洗淡"(74%/78%、alpha .46→.26)后它 FAIL。
  // 断言的意图是"暗部只能在 4–5 点那一侧、不许拿去右侧打光",与具体坐标无关 ⇒ 改判语义,而不是回退代码。
  ok(SRC.indexOf("radial-gradient(circle at 30% 24%") >= 0
    && (() => { const m = SRC.match(/radial-gradient\(circle at (\d+)% (\d+)%,rgba\(0,0,0,\.(\d+)\)/); return !!m && +m[1] > 50 && +m[2] > 50 && +m[3] <= 30; })()
    && SRC.indexOf("66% 70%") < 0,
    '光位定死:主高光 10–11 点(30%/24%)、暗部仍在 4–5 点(x>50% 且 y>50%)且 alpha ≤.30(11-18 由 .46 洗到 .26) —— 不许挪去右侧打光')
  ok(SRC.indexOf("-ball:hover::after") >= 0 && SRC.indexOf("-ball.dragging::after") >= 0,
    '质感层跟着 hover / dragging 一起变(否则互动时那层和主体脱节,像浮在上面的贴纸)')
}

// ---------------- 6. v5 契约集成 ----------------
console.log('\n[6] v5 契约集成')
const mkItem = (id, n) => ({
  id, title: '题-' + id, ok: true, version: 'v' + id,
  // 真宿主的 presetEntry 会在**条目顶层**放一个 url(index.js:228 `ROUTE + '/arts/' + id + '/preset.json?v='`);
  // 少了这个字段,套件"从宿主给的 URL 推 arts 前缀"那条兜底逻辑就永远测不到(11-19 就是这么假绿过一次)。
  url: '/dsh-boot-naruto/arts/' + id + '/preset.json?v=v' + id,
  files: [{ name: 'preset.json', version: 'p' }, ...Array.from({ length: n }, (_, i) => ({ name: ('0' + (i + 1)).slice(-2) + '.jpg', version: 's' + i, url: '/dsh-boot-naruto/arts/' + id + '/' + ('0' + (i + 1)).slice(-2) + '.jpg?v=s' + i }))],
})
// arts/ui/ 在真清单里就是**一个普通条目**(共享素材目录,不是主题)。
// ⚠ 它的确切形状是**实测出来的,不是设想出来的**:目录里没有 preset.json ⇒
//   `presetEntry` 在 index.js:221-222 就 `ok:false / error:'缺 preset.json' / files:[] / url:''` 返回,
//   那段"扫目录填 files"的代码在它**后面**。上一版这里手写了 5 条带 url 的 files,于是
//   `frameUrl` 走得通、自测全绿,而真机上永远 frame=0 —— 假清单把 bug 完整掩护住了。
const UI_ITEM = { id: 'ui', title: 'ui', open: 'none', acts: 0, bytes: 0, mtime: 0, ok: false, error: '缺 preset.json', version: '', url: '', files: [] }
const LIST = [mkItem('madara', 4), mkItem('hinata', 6), mkItem('minato', 5), mkItem('itachi', 4), UI_ITEM]
let selected = 'madara', manual = true, calls = [], rejectNext = null
const FAKE_API = {
  version: 5,
  panel: { open() {}, close() {}, isOpen: () => false },
  manifest: () => Promise.resolve(rejectNext === 'manifest' ? Promise.reject(new Error('x')) : { presets: LIST, selected, manual }),
  thumbUrl: (p) => (p && p.id ? '/dsh-boot-naruto/arts/' + p.id + '/01.jpg?v=s0' : ''),
  usePreset: (id, playNow) => { calls.push([id, !!playNow]); if (rejectNext === 'use') return Promise.resolve({ ok: false, err: 'gate 403' }); return Promise.resolve({ ok: true, selected: id }) },
}
win.__dshBootNaruto = FAKE_API
// 让落点选择器在假 DOM 里命中:给 body 挂一个有尺寸的 [data-conversation-content]
const conv = mkNode('div'); conv.dataset.conversationContent = ''; conv._r = { left: 260, top: 0, width: 1200, height: 900 }
doc.body.appendChild(conv)
// 三条**真实形状**的消息行(逐字抄自 app.asar:ui-chat:1757-1779 + renderer:1099-1103):
//   flowItem[data-chat-flow-kind]  >  SlotOutlet 锚点[data-slot] 且 display:contents  >  内容根 div
// 中间那个锚点**不生成盒子** —— 上一版把底色加在它身上,于是"命中了却什么都没画出来"。
function mkRow(kind) {
  const row = mkNode('div'); row.dataset.chatFlowKind = kind
  const anchor = mkNode('div'); anchor.dataset.slot = 'conversation.chat.node'; anchor._display = 'contents'
  const body = mkNode('div'); body._text = '正文-'.repeat(3)
  // 11-20:文字内缩改成**按比例**(环带内侧 / 720 x 1.15),所以产品会量卡片宽度。
  // 替身必须给一个真实尺寸 —— 给 0 会让内缩永远走"量不到宽度"的降级分支,自测就测不到真逻辑
  // (与上一版"缺 removeAttribute"同类的坑:夹具不全 == 假绿)。
  body._r = { left: 260, top: 0, width: 420, height: 120 }
  anchor.appendChild(body); row.appendChild(anchor); conv.appendChild(row)
  return body
}
const CARD_BODIES = ['assistant-step', 'user', 'tool-call'].map(mkRow)

const tick = (ms) => new Promise((r) => setTimeout(r, ms))
const overrideCalls = []
loaded.exports.apply({ inject: (deps, cb) => { ok(Array.isArray(deps) && deps[0] === 'theme', 'apply 里 inject(["theme"])'); cb({ theme: { overrideTokens: (src, tk) => { overrideCalls.push([src, Object.keys(tk).length]) } } }) } })

;(async () => {
  await tick(60)
  console.log('\n[7] 挂载后')
  const ball = doc.getElementById('dsh-bs-ball')
  ok(!!ball, '悬浮球挂上了')
  ok(ball && ball.children[0] && /^data:image\/svg/.test(ball.children[0].src), '球心是程序画的 svg 眼')
  const cells = () => { const g = doc.querySelector('.grid'); return g ? g.children : [] }
  ok(cells().length === LIST.length, '面板格数 = 清单 ' + LIST.length + ' 项里去掉 ui(素材目录)再加自动那格(实际 ' + cells().length + ')')
  ok(overrideCalls.length > 0 && overrideCalls[overrideCalls.length - 1][1] === 89, 'token 覆盖铺满 89 个')
  const st = T.STATE.st
  ok(st.preset === 'madara' && st.art && st.art.src === 'hero', '默认选中 madara,且用的是 tuned 点名的 hero 图(' + (st.art && st.art.file) + ')')
  ok(st.art && st.art.url.indexOf('/04.jpg?') > 0, 'hero 04.jpg 而不是清单第一张 01.jpg')
  ok(T.DIAG.surface === '[data-conversation-content]', '画面落点命中会话区容器(实际 ' + T.DIAG.surface + ')')
  ok(T.DIAG.cardCount === 2, '卡片命中 2 个(3 条消息里 user 被 :not() 让给宿主实底气泡)(实际 ' + T.DIAG.cardCount + ')')
  ok(T.DIAG.cardBoxy === 2, '命中的 2 个**都是真盒子** —— "画得出来"的凭据,不是"选得出来"')
  ok(!/card-target-missing|card-no-box/.test(T.DIAG.warns.join('|')), '命中且成盒 -> 不该报警')
  {
    // 反证:锚点也命中 3 个,但它们全是 display:contents ⇒ 底色加上去等于没加。
    // 上一版的 139 条断言全绿就是这么漏掉的,所以这里把那个坑做成**会失败**的断言。
    const anchors = doc.querySelectorAll('[data-slot="conversation.chat.node"]')
    ok(anchors.length === 3, '锚点命中 3 个 —— 证明上版不是"选择器写错",是"落点不生成盒子"')
    ok(anchors.every((a) => getComputedStyle(a).display === 'contents'), '锚点全是 contents(宿主原话:purely addressable surface)')
    const save = T.SURFACES.card
    T.SURFACES.card = '[data-slot="conversation.chat.node"]'
    T.DIAG.warns.length = 0
    ok(T.probeCards() === 0, '落点退回锚点 -> 真盒子 0(闸门真能抓到那次 bug,不是恒真)')
    ok(/card-no-box/.test(T.DIAG.warns.join('|')), '落点是 contents 锚点 -> 喊 card-no-box')
    ok(T.chipText(T.STATE.st).indexOf('文本框未生效') >= 0, '说明条上看得见的"文本框未生效"')
    T.SURFACES.card = save
    ok(T.probeCards() === 2, '改回来又是 2 个真盒子(可逆)')
    ok(/> div\s*$/.test(save), '定稿选择器打在锚点的**子 div**上')
    ok(/:not\(/.test(save), '定稿选择器用 :not() 排掉 user/steering')
  }
  // ---- 滑块:界面上的调参入口(不是控制台) ----
  const ranges = doc.querySelectorAll('input').filter((i) => i.type === 'range')
  ok(ranges.length === 3, '面板里有 3 根真滑块(图被 gitignore 之后这是唯一调参口)(实际 ' + ranges.length + ')')
  ok(String(T.el.sliders.a.inp.value) === String(T.el.curCard.a), '滑块初值 = tuned/存储档')
  ok(doc.querySelectorAll('textarea').length === 1, '带一个只读 JSON 框:调完直接拷回 tuned 文件')
  T.el.sliders.a.inp.value = '77'; T.el.sliders.a.inp.dispatch('input')
  ok(doc.documentElement.style.getPropertyValue('--bs-card-a') === '77%', '拖滑块 -> 立刻内联写 <html> 变量(不整页重算)')
  ok(T.el.curCard.a === 77 && /"quiet":/.test(T.cardJson()), 'JSON 片段实时跟着变')
  // 拖到一半时来一次后台 render(60/300/1200ms 三拍),**不许**把手上的值弹回 tuned 档
  T.applyCardVars(T.normalizePalette(PALS.madara))
  ok(T.el.curCard.a === 77, '防抖未落盘 -> 后台 render 不能把拖到一半的 77% 弹回 tuned(真 bug,自测抓到过一次)')
  ok(doc.documentElement.style.getPropertyValue('--bs-card-a') === '77%', '内联变量也没被弹回')
  await new Promise((r) => setTimeout(r, 600))
  {
    const m = JSON.parse(win.localStorage.getItem('dsh-bs-card') || '{}')
    ok(m[T.cardKey()] && m[T.cardKey()].a === 77, '防抖之后**按这张画面**存进 localStorage(键 ' + T.cardKey() + ')')
    const tunedA = Math.round(T.normalizePalette(T.PALETTES[T.cardKey()] || {}).card.a * 100)
    T.resetCard()
    ok(T.el.curCard.a === tunedA || !T.PALETTES[T.cardKey()], '复位 -> 回到该图 tuned 的 ' + tunedA + '%(实际 ' + T.el.curCard.a + ')')
    const m2 = JSON.parse(win.localStorage.getItem('dsh-bs-card') || '{}')
    ok(!m2[T.cardKey()], '复位同时删掉了这图的存储档(不留幽灵覆盖)')
  }
  ok(!T.DIAG.warns.some((w) => /palette-missing/.test(w)), '这 4 套里选中的没有 palette-missing')
  // ---- 配饰底框(丙):**行为**断言,不是源码正则 ----
  // 为什么必须做成行为:上面那批正则只证明"字串在产物里",而 11-19 这两次真缺陷(环落在透明留白里、
  // 门控属性把样式带歪)都是"字串对、运行时不成立"。这里点一次按钮,量的是 <html> 上真实写出来的值。
  {
    const R = doc.documentElement
    T.el.decoBtns.katon.dispatch('click')
    ok(R.getAttribute('data-bs-frame') === 'katon', '点火遁 -> 门控属性挂上(data-bs-frame=katon)')
    ok(/arts\/ui\/frame-katon\.png/.test(R.style.getPropertyValue('--bs-frame-src')),
      '底框 URL 确实来自清单 st.ui 的 files[].url(代码里 0 素材,靠注入而不是硬编码路径)')
    ok(R.style.getPropertyValue('--bs-frame-pt') === (14 + GEO.insY) + 'px' && R.style.getPropertyValue('--bs-frame-pl') === (16 + GEO.insX) + 'px',
      '文字内缩 = 实测基线 14/16 + **按比例**算出的 ' + GEO.insX + '/' + GEO.insY + 'px(环带内侧 x1.15,卡宽 420;'
      + '加在宿主那份 padding 上,不是我们拍的绝对值)。实际 ' + R.style.getPropertyValue('--bs-frame-pt') + ' / ' + R.style.getPropertyValue('--bs-frame-pl'))
    T.el.decoBtns.none.dispatch('click')
    ok(R.getAttribute('data-bs-frame') === null,
      '点「无」-> 门控属性摘掉,那条 padding 规则一个像素都不匹配("其他效果不变"是行为层面的保证,不是口头保证)')
    ok(R.style.getPropertyValue('--bs-frame-src') === 'none', '「无」时 src 写回 none(整条 ::after 因为 background-image:none 而不画任何东西)')
    T.el.decoBtns.doton.dispatch('click')
    ok(R.getAttribute('data-bs-frame') === 'doton', '换档是整体替换不是叠加(土遁也能挂上,且 src 换成了 doton 那张)')
    ok(/frame-doton\.png/.test(R.style.getPropertyValue('--bs-frame-src')), 'src 跟着换档,不会停在上一张')
    T.el.decoBtns.none.dispatch('click')
  }
  // ---- 底框 URL 的两条来源:清单优先、拼路径兜底(真宿主今天只有第二条走得通) ----
  {
    const R = doc.documentElement
    const st = T.STATE.st
    // 1) 真宿主形状(ui 存在但 files 空)⇒ 必须从宿主自己给的某个 arts URL 里切前缀
    T.el.decoBtns.none.dispatch('click')
    T.el.decoBtns.katon.dispatch('click')
    ok(R.style.getPropertyValue('--bs-frame-src') === 'url("/dsh-boot-naruto/arts/ui/frame-katon.png")',
      '清单没给 files 时**推导前缀拼路径**(真宿主就是这形状;只信清单则底框永远 frame=0 —— 本轮抓到的真 bug)。实际 ' + R.style.getPropertyValue('--bs-frame-src'))
    ok(R.getAttribute('data-bs-frame') === 'katon' && R.style.getPropertyValue('--bs-frame-pt') === (14 + GEO.insY) + 'px',
      '走兜底 URL 也一样要内缩:内缩跟的是"有没有底框",不是"URL 从哪来"。实际 ' + R.style.getPropertyValue('--bs-frame-pt'))
    // 2) 未来宿主若给共享目录登记了素材 ⇒ 必须优先用清单里那条带 ?v= 的
    st.ui = { id: 'ui', ok: true, url: '/dsh-boot-naruto/arts/ui/preset.json?v=u1', files: [{ name: 'frame-katon.png', version: 'u1', url: '/dsh-boot-naruto/arts/ui/frame-katon.png?v=u1' }] }
    T.el.decoBtns.none.dispatch('click')
    T.el.decoBtns.katon.dispatch('click')
    ok(R.style.getPropertyValue('--bs-frame-src') === 'url("/dsh-boot-naruto/arts/ui/frame-katon.png?v=u1")',
      '清单里有 files 就用清单的(带 ?v=,缓存语义更好),拼路径只当降级。实际 ' + R.style.getPropertyValue('--bs-frame-src'))
    // 3) **目录不在**(st.ui = null)但前缀明明推得出来 ⇒ 也不许拼:这是"没放资源包的机器"的形状
    st.ui = null
    T.el.decoBtns.none.dispatch('click')
    T.el.decoBtns.katon.dispatch('click')
    ok(R.style.getPropertyValue('--bs-frame-src') === 'none' && R.getAttribute('data-bs-frame') === null,
      'arts/ui/ 目录不在(ui 条目为 null)-> 退化成「无」且**不挂门控属性**:否则背景图 404 是静默的,文字会白内缩看不见框')
    // 4) 目录在、但清单里一个 /arts/ URL 都推不出来 ⇒ 同样老实退化,绝不凭空拼宿主路由
    st.ui = UI_ITEM
    const savedUrls = st.list.map((p) => p.url)
    st.list.forEach((p) => { p.url = '' })
    T.el.decoBtns.none.dispatch('click')
    T.el.decoBtns.katon.dispatch('click')
    ok(R.style.getPropertyValue('--bs-frame-src') === 'none' && R.getAttribute('data-bs-frame') === null,
      '无前缀可推 -> src=none 且不挂门控属性(宁可不画,也不拼一个宿主没发的路径)')
    st.list.forEach((p, i) => { p.url = savedUrls[i] })
    st.ui = UI_ITEM
    T.el.decoBtns.none.dispatch('click')
  }
  // ---- 真宿主快照集成 ----
  // 为什么需要这一段:上面那些用例喂的是**我们手写的**清单,而 11-19 那个"底框在真机永远 frame=0"的
  // bug 恰恰是"手写信条"掩护出来的 —— 假清单里给 ui 写了 files,真宿主(index.js:221-222)根本不给。
  // 所以直接吃一份**从运行中的宿主抓下来的 presets.json**,让真数据当守门犬。
  // 重抓(两步都要做,少做第二步就把本机绝对路径写进可开源包了):
  //   1) Invoke-WebRequest http://127.0.0.1:19387/dsh-boot-naruto/presets.json -OutFile tools\fixtures\presets-live.json
  //   2) **删掉顶层 dir / log 两个字段**(它们是 C:\Users\<你>\... ),详见同目录 FIXTURE-README.md
  {
    const fixPath = path.join(SUITE, 'tools', 'fixtures', 'presets-live.json')
    if (!fs.existsSync(fixPath)) {
      ok(false, '缺夹具 ' + fixPath + '(按上面那条命令从运行中的宿主重抓;不许手写伪造一份"看起来对"的)')
    } else {
      const LIVE = JSON.parse(fs.readFileSync(fixPath, 'utf8'))
      const st2 = T.stateFromManifest(FAKE_API, LIVE)
      ok(LIVE.presets.some((p) => p.id === 'ui' && p.ok === false && (!p.files || p.files.length === 0)),
        '夹具本身必须保持真宿主的丑样子:ui = ok:false 且 files 空(有人把它"修好看"了这段保护就废了)')
      ok(st2.list.length === LIVE.presets.length - 1,
        '真清单 ' + LIVE.presets.length + ' 条 -> 去掉 ui 素材目录 = 选单 ' + st2.list.length + ' 条(共 N 套不含它)')
      const saved2 = T.STATE.st
      T.STATE.st = st2
      T.el.decoBtns.none.dispatch('click')
      T.el.decoBtns.katon.dispatch('click')
      ok(doc.documentElement.style.getPropertyValue('--bs-frame-src') === 'url("/dsh-boot-naruto/arts/ui/frame-katon.png")',
        '吃**真清单**也解析得出底框 URL(前缀从宿主自己给的 /arts/…/preset.json?v= 切出来)。实际 ' + doc.documentElement.style.getPropertyValue('--bs-frame-src'))
      ok(doc.documentElement.getAttribute('data-bs-frame') === 'katon' && doc.documentElement.style.getPropertyValue('--bs-frame-pt') === (14 + GEO.insY) + 'px',
        '真清单下门控属性与文字内缩一样生效(内缩不依赖 URL 来源)。实际 ' + doc.documentElement.style.getPropertyValue('--bs-frame-pt'))
      T.el.decoBtns.none.dispatch('click')
      // 真数据里 tobirama-night 的 files 混着 kunai.png —— 主题画面不许挑到它
      const tn = st2.list.find((p) => p.id === 'tobirama-night')
      ok(!!tn && tn.files.some((f) => f.name === 'kunai.png'), '夹具里确实带着 kunai.png 这种非幕图(这条不成立说明快照被换过)')
      const art = T.artOf(FAKE_API, tn)
      const dumped = JSON.stringify(art)
      ok(art && /\/arts\/tobirama-night\/0\d\.jpg\?v=/.test(dumped) && !/kunai\.png/.test(dumped),
        'artOf 在真清单下挑的是 NN.jpg、**不会被 kunai.png 顶掉**。实际 ' + dumped.slice(0, 170))
      T.STATE.st = saved2
    }
  }

  // 点球 -> 开面板 -> 点第三格 -> usePreset 带对 id(先按下再抬起,才是"一次点击")
  ball.dispatch('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 })
  ball.dispatch('pointerup', { pointerId: 1, clientX: 100, clientY: 100 })
  await tick(40)
  const panel = doc.getElementById('dsh-bs-panel')
  ok(panel && panel.classList.contains('open'), '点一下(没拖动)= 开面板')
  const target = cells().find((c) => c.textContent.indexOf('题-hinata') === 0)
  ok(!!target, '面板里找得到 hinata 那格')
  target.dispatch('click')
  await tick(80)
  ok(calls.some((c) => c[0] === 'hinata' && c[1] === false), '点格子调了 usePreset("hinata", false)')
  ok(T.STATE.st.preset === 'hinata' || T.STATE.st.why === 'selection-not-applied', '切完要么主题跟过去了,要么如实报"没写进去"')

  // 契约没给 selected -> 自动那格标当前
  selected = 'madara'; manual = false; calls = []
  cells().length // noop
  ;(win.__dshBootSuite || {}).refresh && win.__dshBootSuite.refresh()
  await tick(60)
  ok(cells()[0].classList.contains('sel'), 'manual=false 时「自动」那格吃金框')

  // 空清单
  const keep = LIST.slice()
  LIST.length = 0
  win.__dshBootSuite.refresh(); await tick(60)
  ok(T.STATE.st.why === 'empty-manifest', '空清单 -> why=empty-manifest(而不是假装成功)')
  ok(cells().length === 1, '空清单时面板只剩自动那一格')
  const chip = doc.getElementById('dsh-bs-chip')
  ok(chip && chip.style.display === 'block' && chip.textContent.length > 4, '降级提示**摆在明面上**(chip: ' + (chip && chip.textContent) + ')')
  LIST.push(...keep)

  // 没有开屏插件:把等待窗口调到 60ms,验它**到点必报**,而不是永远等下去
  T.setApiWait(60)
  delete win.__dshBootNaruto
  T.DIAG.warns.length = 0
  win.__dshBootSuite.refresh(); await tick(400)
  ok(T.DIAG.warns.join('|').indexOf('boot-api-missing') >= 0, '拿不到契约 -> 到点记账 boot-api-missing')
  ok(T.STATE.st.why === 'no-boot-api', '拿不到契约 -> why 停在 no-boot-api,不假装成功')

  console.log('\n' + (fails.length ? 'FAIL ' + fails.length + ' / ' + total : '全部通过'))
  if (fails.length) { console.log('---- 失败项 ----'); fails.forEach((f) => console.log(' - ' + f)) }
  console.log('断言 ' + total + ',FAIL ' + fails.length + (fails.length ? '' : ',全绿'))
  process.exit(fails.length ? 1 : 0)
})()
