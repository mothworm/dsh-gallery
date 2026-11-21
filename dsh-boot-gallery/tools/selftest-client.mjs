import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import os from 'node:os'

// 客户端 bundle 的离线冒烟测试:假 DOM + 假 window,加载真实产物 lib/client.js。
// 目的有三:① 断言产物里 **没有** exports.inject(有就可能把整个 GUI 拖到打不开)
//          ② 证明 apply() 不抛、分镜真的一个个上屏、退场把节点摘干净
//          ③ 证明 Esc / 点击 跳过可用
// 跑: node tools/selftest-client.mjs
const HERE = path.dirname(fileURLToPath(import.meta.url))
const PKGROOT = path.resolve(HERE, '..')
const BUNDLE = path.join(PKGROOT, 'lib', 'client.js')
const code = fs.readFileSync(BUNDLE, 'utf8')
const fail = []
const ok = (cond, msg) => { console.log((cond ? '  ok   ' : '  FAIL ') + msg); if (!cond) fail.push(msg) }
// —— 11-19 加的一道闸:这份自测读的是**包内副本**,而包内副本历史上和工作区/装机副本漂移过
//    (漂得最狠那次包里根本没有 lib\client.js,自测直接 ENOENT;还有一次它拿 28KB 的旧 index.js
//    跑出"全绿",而部署中的是 33KB 那份)。所以第一件事是比哈希:不一致就 FAIL,
//    绝不拿旧副本的绿灯当作部署代码的绿灯。11-19 起这份自测**就住在代码树里**,
//    所以比的对象换成了**部署中的那一份** = %USERPROFILE%\.dsh\profiles\desktop\node_modules\dsh-boot-gallery\lib\\
{
  const cr = await import('node:crypto')
  const wsA = path.join(os.homedir(), '.dsh', 'profiles', process.env.DSH_PROFILE || 'desktop', 'node_modules', 'dsh-boot-gallery', 'lib', 'client.js')
  const hash = (f) => (fs.existsSync(f) ? cr.createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0, 12) : null)
  const ha = hash(BUNDLE), hb = hash(wsA)
  if (hb === null) console.log('  note 没找到装机副本 ' + wsA + ' —— 跳过同源校验,这份自测只测源码本体')
  else ok(!!ha && ha === hb, '源码与装机副本同哈希: ' + String(ha) + ' vs ' + String(hb) + ' (不同就说明部署的不是这份代码,先别信这份自测)')
}

function makeNode(tag) {
  const n = {
    tagName: tag,
    children: [],
    parent: null,
    style: {
      _v: {},
      setProperty(k, v) { this._v[k] = v },
      removeProperty(k) { delete this._v[k] },
    },
    dataset: {},
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)) },
      remove(...c) { c.forEach((x) => this._s.delete(x)) },
      contains(c) { return this._s.has(c) },
      get value() { return [...this._s].join(' ') },
    },
    _listeners: {},
    listeners(ev) { return this._listeners[ev] || [] },
    addEventListener(ev, cb) { (this._listeners[ev] = this._listeners[ev] || []).push(cb) },
    removeEventListener(ev, cb) { const a = this._listeners[ev] || []; const i = a.indexOf(cb); if (i >= 0) a.splice(i, 1) },
    appendChild(c) { c.parent = n; n.children.push(c); return c },
    setAttribute(k, v) { n[k] = v },
    getAttribute(k) { return n[k] },
    remove() { if (n.parent) { const i = n.parent.children.indexOf(n); if (i >= 0) n.parent.children.splice(i, 1); n.parent = null } },
    click() { n.listeners('click').forEach((f) => f({ preventDefault() {} })) },
    get className() { return n._class || '' },
    set className(v) { n._class = v; n.classList._s = new Set(String(v).split(/\s+/).filter(Boolean)) },
    textContent: '',
  }
  return n
}
function all(n, acc = []) { acc.push(n); for (const c of n.children) all(c, acc); return acc }

function makeEnv() {
  const head = makeNode('head'); const body = makeNode('body')
  const doc = {
    head, body,
    createElement: makeNode,
    createElementNS: (ns, t) => makeNode(t),
    getElementById: (id) => [...all(body), ...all(head)].find((x) => x.id === id) || null,
    querySelector: () => null,
    _listeners: {},
    addEventListener(ev, cb) { (this._listeners[ev] = this._listeners[ev] || []).push(cb) },
    removeEventListener(ev, cb) { const a = this._listeners[ev] || []; const i = a.indexOf(cb); if (i >= 0) a.splice(i, 1) },
    dispatch(ev, e) { (this._listeners[ev] || []).slice().forEach((f) => f(e)) },
  }
  let storeErr = 0
  const sess = {
    _m: new Map(),
    getItem(k) { return this._m.has(k) ? this._m.get(k) : null },
    setItem(k, v) { this._m.set(k, String(v)) },
    removeItem(k) { this._m.delete(k) },
  }
  const win = {
    document: doc,
    sessionStorage: sess,
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    removeEventListener() {},
    requestFullscreen: undefined,
  }
  globalThis.document = doc
  globalThis.window = win
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0)
  return { doc, win, sess, storeErr }
}

const env = makeEnv()
let loaded = null
globalThis.window.__ModuleLoader__ = { load: ({ id, factory }) => { loaded = { id, exports: factory(() => { throw new Error('no host modules needed') }) } } }
new Function(code)()

ok(loaded !== null, 'bundle 通过 window.__ModuleLoader__.load 注册(实际 id=' + (loaded && loaded.id) + ')')
ok(loaded && loaded.id === 'dsh-boot-gallery', 'bundle id == 包名')
ok(loaded && loaded.exports.inject === undefined, '**产物没有 exports.inject**(有 = 宿主缺服务时整个 GUI 起不来)')
ok(typeof loaded.exports.apply === 'function', '导出 apply()')

loaded.exports.apply({})
const wait0 = (ms) => new Promise((r) => setTimeout(r, ms))
await wait0(700) // apply 里刻意延后 300ms 上屏,等首帧壳画完
ok(all(env.doc.body).some((n) => n.classList.contains('nbn-root')), 'apply 约 0.7s 后 body 里出现 .nbn-root 浮层')
ok(all(env.doc.head).some((n) => n.id === 'dsh-boot-gallery-style'), '样式已注入 head')
ok(env.win.__dshBootGallery && env.win.__dshBootGallery.timeline.length === 9, '分镜 9 幕(实际 ' + env.win.__dshBootGallery.timeline.length + ')')
const style = all(env.doc.head).find((n) => n.id === 'dsh-boot-gallery-style')
ok(/data:;base64|data:image\/jpeg;base64/.test(style.textContent) === false && style.textContent.includes('2147483000'), 'CSS 里有浮层 z-index')
ok(/prefers-reduced-motion/.test(style.textContent), 'CSS 带减少动态效果开关')

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
await wait(1400)
const stage = all(env.doc.body).find((n) => n.classList.contains('nbn-stage'))
const layers = stage ? stage.children.filter((c) => c.classList.contains('nbn-layer')) : []
ok(layers.length >= 2, '1.4s 时已上屏 ' + layers.length + ' 层(交叉溶解会保留前一层)')
// 11-19 改判法:内置 9 幕早就**不再内嵌 data URI**(部署产物实测 `data:image` 0 次、`/frames/` 2 次、
// 超过 20000 字符的 base64 串 0 个)。但断言的**意图必须保住**:素材只能来自本插件自己的路由,绝不外连。
ok(layers.some((l) => all(l).some((x) => x.tagName === 'img' && /\/dsh-boot-gallery\/(frames|arts)\//.test(String(x.src)))), '内置分镜图片只走本插件路由(不依赖外网素材)')
ok(all(env.doc.body).some((n) => n.classList.contains('bgl-skip')), '跳过提示已出现')

// Esc 跳过
env.doc.dispatch('keydown', { key: 'Escape', preventDefault() {} })
await wait(1200)
ok(!all(env.doc.body).some((n) => n.classList.contains('nbn-root')), 'Esc 之后浮层已卸载(退场 HANDOFF 内)')

// 启动作用域:同一次启动第二次 apply 不应再播
env.win.__dshBootGallery = null
const before = all(env.doc.body).length
// 重新 import 一份(模拟同标签页里再次加载),sessionStorage 已经记过账
loaded = null
new Function(code)()
loaded.exports.apply({})
await wait(900)
ok(!all(env.doc.body).some((n) => n.classList.contains('nbn-root')), 'sessionStorage 记过账之后不再重播(一次启动只播一次)')
ok(env.sess._m.has('dsh-boot-gallery:boot'), '启动标记键名 = dsh-boot-gallery:boot')

// 强制重播(调试键)
env.doc.dispatch('keydown', { key: 'B', ctrlKey: true, altKey: true, shiftKey: false, preventDefault() {} })
await wait(700)
ok(all(env.doc.body).some((n) => n.classList.contains('nbn-root')), 'Ctrl+Alt+B 可强制重播')
all(env.doc.body).filter((n) => n.classList.contains('nbn-root')).forEach((n) => n.click())
await wait(900)
ok(!all(env.doc.body).some((n) => n.classList.contains('nbn-root')), '点画面也能跳过并卸载干净')

// =====================================================================
// 预设(preset)这一段:每个场景都换一份**全新的假 DOM + 全新的假 fetch**,
// 然后重新 new Function(code) 装一份全新的 bundle(闭包里的 bootPlayedInMemory 也就归零了)。
// 最关键的一条是下面第一组:arts/presets 无论怎么坏,**必须照播内置 9 幕**。
// =====================================================================
const PRESETS_URL = '/dsh-boot-gallery/presets.json'
function mkPresetManifest(extra) {
  const base = {
    plugin: 'dsh-boot-gallery', dir: 'X:/arts', exists: true, selected: 'konan',
    // manual 这个键 2026-11-09 才加进真响应(前端靠它决定「自动」格画不画金框),
    // mock 里缺它就等于**永远在测"用户从没手动选过"那半边**。两边都要有形状。
    manual: true,
    count: 1, usable: 1, maxActs: 8,
    presets: [{
      id: 'konan', title: '晓 · 小南', open: 'akatsuki-cloud', acts: 2, bytes: 5000, mtime: 1,
      ok: true, error: '', version: 'sAAA', url: '/dsh-boot-gallery/arts/konan/preset.json?v=sAAA',
      files: [
        { name: 'preset.json', bytes: 200, version: 'sAAA', url: '' },
        { name: '01.jpg', bytes: 3000, version: 'sBBB', url: '' },
        { name: '02.jpg', bytes: 1500, version: 'sCCC', url: '' },
      ],
    }],
  }
  return Object.assign({}, base, extra || {})
}
const GOOD_DOC = {
  schema: 1, id: 'konan', title: '晓 · 小南', sub: 'AKATSUKI · DSH 开屏动画', open: 'akatsuki-cloud',
  acts: [
    { file: '01.jpg', dur: 240, pos: '62% 22%', z0: 1.16, z: 1.05, kb: ['4% 5%', '-4% -4%'], pupil: '50% 24%', flash: false },
    { file: '02.jpg', dur: 260, pos: '50% 40%', z0: 1.1, z: 1.02, kb: ['0% 0%', '2% -2%'] },
  ],
}

let prev = null
// 状态码/失败形状 → 响应对象。
// ⚠️ **text() 必须有**:客户端 2026-11-10 起会读响应体来分辨"我的门禁拒的(有文字 unauthorized/
// forbidden)"和"宿主在 handler 之前答掉的(空体)"。mock 不给 text,这条新逻辑就等于没被测过。
function reply(v) {
  if (typeof v === 'number') {
    return { ok: v >= 200 && v < 300, status: v, json: () => Promise.reject(new Error('http ' + v)), text: () => Promise.resolve('') }
  }
  if (v && typeof v === 'object' && typeof v.http === 'number') {
    const body = String(v.body == null ? '' : v.body)
    return { ok: false, status: v.http, json: () => Promise.reject(new Error('http ' + v.http)), text: () => Promise.resolve(body) }
  }
  return { ok: true, status: 200, json: () => Promise.resolve(v), text: () => Promise.resolve(JSON.stringify(v)) }
}
async function scen(opts) {
  // 上一场的实例还有一堆 act 定时器没烧完;不先 skip 掉,它们会把图层 append 进**这一场**的假 DOM。
  // skip() → finish() → clearTimers() 一次把那一套掐干净(顺带复验退场路径)。
  if (prev && prev.api) { try { prev.api.skip() } catch (e) {} await wait(700) }
  const e = makeEnv()
  const log = { fetches: [], reports: [], images: [], errors: [] }
  const routes = opts.routes || {}
  e.win.Image = function () { const self = this; Object.defineProperty(self, 'src', { set(v) { log.images.push(v) }, get() { return '' } }) }
  globalThis.fetch = (url, o) => {
    const u = String(url).split('?')[0]
    log.fetches.push({ url: String(url), path: u, method: (o && o.method) || 'GET', body: o && o.body })
    if (u === '/dsh-boot-gallery/report') { try { log.reports.push(JSON.parse(o.body)) } catch (x) { log.errors.push('report 体不是 JSON') } return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) }) }
    if (u === '/dsh-boot-gallery/clips.json') {
      // opts.clips:数组 = 目录里有这些片子(11-19 之前**根本没有这条路**,所以 clip 语义一条用例都写不出来);
      // false = 目录空;不给 = 404(老宿主 / 没建 clips 目录)。三种都得能喂,不然"逐帧不变"是句空话。
      if (Array.isArray(opts.clips)) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ clips: opts.clips, selected: opts.clipSelected || null }) })
      }
      if (opts.clips === false) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ clips: [], selected: null }) })
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('no clips')) })
    }
    const hit = routes[u]
    if (hit === 'throw') throw new Error('模拟网络炸了')
    if (hit === 404 || hit === undefined) return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('404')) })
    if (hit === 'badjson') return Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new Error('JSON 坏')) })
    // POST 可以单独指定回应形状,用来验面板上「没写进去:http N …」那行到底写了什么。
    if (String((o && o.method) || 'GET') === 'POST' && opts.postReply !== undefined) return Promise.resolve(reply(opts.postReply))
    // 路由值是**数字**就按 HTTP 状态码处理,是 {http,body} 按"带响应体的失败"处理,对象才当 200 的响应体。
    // 洞(2026-11-09 踩过):以前只特判 404,所以我新加的 401 用例被当成"200 + 响应体是数字 401",
    // 客户端拿到非对象 JSON、report.why 是空的 —— 一个**测试环境造成的假失败**,不是插件的问题。
    return Promise.resolve(reply(hit))
  }
  loaded = null
  // report() 里会读 location.protocol;假环境没有 location 它就在自己的 try 里静默炸掉,
  // 于是 report 断言全成空 —— 这是**测试环境**的坑,不是插件的坑,补上才验得到诊断链。
  globalThis.location = { protocol: 'http:', hostname: '127.0.0.1', port: '3080', href: 'http://127.0.0.1:3080/' }
  // 假 DOM 是新建的,加载器也得跟着新建一份(否则 bundle 找不到 __ModuleLoader__)
  e.win.__ModuleLoader__ = { load: ({ id, factory }) => { loaded = { id, exports: factory(() => { throw new Error('no host modules needed') }) } } }
  new Function(code)()
  loaded.exports.apply({})
  await wait(opts.wait || 1200)
  const api = e.win.__dshBootGallery
  // 2026-11-10 起动画收尾**不再自动弹**选单,所以要验面板就得主动调 api.panel.open()。
  // 连调两次是故意的:自动弹 + 手动开 + 每次 finish() 都可能再叫一次,而那一刻 panelEl 还是 null,
  // 唯一的守卫在 fetch 回调里(`if (panelEl || !m) return`)——并发两次才测得到它挡不挡得住堆叠。
  if (opts.openPanel) {
    try { api.panel.open(); api.panel.open(); } catch (x) { log.errors.push('panel.open 抛错: ' + x) }
    await wait(opts.openWait || 300)
  }
  prev = { api }
  const stage = all(e.doc.body).find((n) => n.classList.contains('nbn-stage'))
  const layers = stage ? stage.children.filter((c) => c.classList.contains('nbn-layer')) : []
  // 2026-11-09:选单面板也往 body 里塞 <img class="nbp-th">(src 是 /arts/<预设>/NN.jpg,不是 data URI)。
  // 一开始我只在两条断言里改成 filmImgs,结果第三条([预设] kb/z0 落到 CSS 变量)照样被面板的
  // 缩略图顶掉 —— 它拿到的是缩略图,style._v 当然是空 {}。打地鼠没用,所以把语义一次性钉死:
  // **imgs = 上屏的胶片图**(所有老断言要的就是这个),面板图单独走 nbpThumbs,不许再混。
  const allImgs = all(e.doc.body).filter((n) => n.tagName === 'img')
  // 播视频那条路唯一的实物凭据就是舞台上的 <video>(playVideo 里 el("nbn-video","video") + src=pick.url)
  const videos = all(e.doc.body).filter((n) => n.tagName === 'video')
  const nbpThumbs = allImgs.filter((n) => n.classList.contains('nbp-th'))
  const imgs = allImgs.filter((n) => !n.classList.contains('nbp-th'))
  const filmImgs = imgs
  const panel = all(e.doc.body).find((n) => n.classList.contains('nbp-wrap'))
  const panels = all(e.doc.body).filter((n) => n.classList.contains('nbp-wrap'))
  const cards = panel ? panel.children.filter((c) => c.classList.contains('nbp-card')) : []
  // 「自动」那格的图位是 <span class="nbp-th nbp-auto-th"> 占位块,**不是** <img>,
  // 所以它永远进不了 nbpThumbs。上一版拿 cards 与 nbpThumbs 直接对数,把自己判成 FAIL
  // (卡片 2 / 缩略图 1)。分开数才是这件事的真实形状。
  const autoCards = panel ? panel.children.filter((c) => c.classList.contains('nbp-auto')) : []
  return { e, api, log, layers, videos, imgs, allImgs, filmImgs, nbpThumbs, panelUp: !!panel, panelCount: panels.length, cards, autoCards, rootUp: all(e.doc.body).some((n) => n.classList.contains('nbn-root')) }
}

// A) 安全网:presets.json / preset.json / arts 全 404 → 照播内置 9 幕
let s = await scen({ routes: { [PRESETS_URL]: 404 } })
ok(s.rootUp, '[404 兜底] presets.json 404 仍然上屏浮层')
ok(s.api.timeline.length === 9 && s.api.active.length === 9, '[404 兜底] 回落内置,active 仍是 9 幕(实际 ' + s.api.active.length + ')')
ok(s.filmImgs.length > 0 && s.filmImgs.every((i) => /\/dsh-boot-gallery\/(frames|arts)\//.test(String(i.src))), '[404 兜底] 内置素材只走本插件路由,没去要远程素材(实际 ' + s.filmImgs.length + ' 张)')
ok(s.log.images.length === 0, '[404 兜底] 没有为远程素材建 Image 预载')
ok(s.log.reports.some((r) => r.mode === 'builtin' && r.preset === ''), '[404 兜底] report 记了 mode=builtin(实际 ' + JSON.stringify(s.log.reports[0]) + ')')
// 面板的"不许吵":清单取不到就什么都不画(不弹空框、不报错、不占点击)。
// 这条是安全阀:面板坏了不能连带动画,更不能在开机屏上留个空壳。
ok(!s.panelUp && s.cards.length === 0, '[面板] 清单 404 时**什么都不画**(panelUp=' + s.panelUp + ' / 卡片 ' + s.cards.length + ')')

// 面板的正向覆盖:以前只测"它不许闯祸",没测"它真的出来了"。清单能取到就必须有卡片,
// 而且它是**独立元素**(不挂在 .nbn-root 里),否则动画一收尾就会被一起 remove 掉。
const R_MANIFEST_404DOC = { [PRESETS_URL]: mkPresetManifest(), '/dsh-boot-gallery/arts/konan/preset.json': 404 }
s = await scen({ routes: R_MANIFEST_404DOC })
ok(s.api.active.length === 9, '[404 兜底] 清单有了但 preset.json 404 → active 仍是内置 9 幕(实际 ' + s.api.active.length + ')')
ok(s.filmImgs.every((i) => /\/dsh-boot-gallery\/(frames|arts)\//.test(String(i.src))), '[404 兜底] 回落时胶片图仍然只走本插件路由(实际 ' + s.filmImgs.length + ' 张)')
ok(!s.panelUp && s.panelCount === 0, '[面板] 动画收尾**不再自动弹**(2026-11-10 用户拍板"桌面上只留一个球";谁把 finish() 里那行 setTimeout 加回来,这条立刻红)')
// 不自动弹之后,手动入口就是唯一路径(悬浮球那个按钮调的也是它),必须验它真能开、且开两次不堆两份。
s = await scen({ routes: R_MANIFEST_404DOC, openPanel: true })
ok(s.panelUp, '[面板] api.panel.open() 能把选单叫出来')
// 只许有一份。上面故意连调两次 open():那一刻 panelEl 还是 null,
// 唯一的守卫在 fetch 回调里(`if (panelEl || !m) return`);堆叠会一次开机叠出好几排卡片。
ok(s.panelCount === 1, '[面板] 连调两次 open() 也只浮出**一份**,没堆叠(实际 ' + s.panelCount + ' 份)')
ok(s.cards.length >= 1 && s.nbpThumbs.length + s.autoCards.length === s.cards.length, '[面板] 卡片数 = 缩略图数 + 自动格数(卡片 ' + s.cards.length + ' / 缩略图 ' + s.nbpThumbs.length + ' / 自动 ' + s.autoCards.length + ')')
ok(s.autoCards.length === 1 && s.cards[0] === s.autoCards[0], '[面板] 只有 1 格「自动」且排在最前(实际 ' + s.autoCards.length + ' 格,首格是自动: ' + (s.cards[0] === s.autoCards[0]) + ')')
ok(s.nbpThumbs.every((i) => String(i.src).startsWith('/dsh-boot-gallery/arts/')), '[面板] 缩略图走同源 /arts/<预设>/<文件>,不是内嵌图(实际 ' + (s.nbpThumbs[0] || {}).src + ')')
// 这一条是补上去的:上一版只查前缀,于是 files[0]=preset.json 被当成缩略图照样绿,
// 真机上每张卡都会走 img error 分支 => 面板全是名字没有画面。前缀对不代表挑对了文件。
ok(s.nbpThumbs.every((i) => /\d\d\.jpe?g(\?|$)/i.test(String(i.src))), '[面板] 缩略图挑的是 NN.jpg 而**不是** preset.json(实际 ' + (s.nbpThumbs[0] || {}).src + ')')
// 2026-11-08 改:report 里的 why 不再是一句笼统的 'preset-unavailable',
// 而是 getJson 记下来的**真实失败原因**(http 404 / timeout / network / bad json / no fetch)。
// 这条断言因此变严了:必须正好是 http + 那个状态码,将来若退化成空串或泛化字符串就红。
{
  const w = (s.log.reports.find((r) => r.mode === 'builtin') || {}).why
  ok(w === 'http 404', `[404 兜底] report.why 记的是真实状态码(实际 ${JSON.stringify(w)},要求 "http 404")`)
}

// 将来若给这些路由加了 ctx.connection.admit(验鉴权 cookie),桌面版没有那个 cookie 的话
// 现象就是 401 → 预设静默失效。这一条把"401 必须被如实记成 http 401"钉住,
// 免得日志里只剩一句分不清是门禁还是空目录的 preset-unavailable。
s = await scen({ routes: { [PRESETS_URL]: 401 } })
ok(s.api.active.length === 9, '[401 门禁预演] 401 仍然回落内置 9 幕')
{
  const w = (s.log.reports.find((r) => r.mode === 'builtin') || {}).why
  ok(w === 'http 401', `[401 门禁预演] report.why 分得清门禁和空目录(实际 ${JSON.stringify(w)},要求 "http 401")`)
}

s = await scen({ routes: { [PRESETS_URL]: 'throw' } })
ok(s.api.active.length === 9, '[抛错兜底] fetch 同步抛错(网络层炸)→ 仍内置 9 幕')

s = await scen({ routes: { [PRESETS_URL]: 'badjson' } })
ok(s.api.active.length === 9, '[坏 JSON 兜底] presets.json 响应体坏了 → 仍内置 9 幕')

s = await scen({ routes: { [PRESETS_URL]: mkPresetManifest(), '/dsh-boot-gallery/arts/konan/preset.json': { schema: 2, id: 'konan', acts: GOOD_DOC.acts } } })
ok(s.api.active.length === 9, '[schema≠1 兜底] schema=2 当坏数据 → 内置 9 幕(实际 ' + s.api.active.length + ')')

s = await scen({ routes: { [PRESETS_URL]: mkPresetManifest(), '/dsh-boot-gallery/arts/konan/preset.json': { schema: 1, id: 'konan', acts: [] } } })
ok(s.api.active.length === 9, '[acts 空兜底] acts=[] → 内置 9 幕')

s = await scen({ routes: { [PRESETS_URL]: mkPresetManifest({ presets: [{ id: 'konan', ok: false, error: '坏', acts: 0, files: [] }] }) } })
ok(s.api.active.length === 9, '[不可播兜底] 清单里一个 ok 都没有 → 内置 9 幕')

s = await scen({ routes: { [PRESETS_URL]: mkPresetManifest({ presets: [{ id: '../evil', ok: true, acts: 2, files: [] }] }) } })
ok(s.api.active.length === 9 && !s.log.fetches.some((f) => f.path.includes('..') || f.path.includes('%2e')), '[穿越兜底] 清单里塞 id=../evil 不会被拿去拼 URL(实际抓过 ' + JSON.stringify(s.log.fetches.map((f) => f.url)) + ')')

// B) 正常路径:有预设就用预设的 acts,图片 src 走同源 /arts/<预设>/<文件>?v=<该文件的 version>
s = await scen({ routes: { [PRESETS_URL]: mkPresetManifest(), '/dsh-boot-gallery/arts/konan/preset.json': GOOD_DOC } })
ok(s.api.active.length === 3 && s.api.active[0].kind === 'cloud', '[预设] open=akatsuki-cloud → 开场是晓云 + 2 幕(实际 ' + s.api.active.length + ' 项)')
ok(s.api.active[1].src === '/dsh-boot-gallery/arts/konan/01.jpg?v=sBBB', '[预设] 幕1 的 src = /arts/konan/01.jpg?v=<01.jpg 自己的 version>(实际 ' + s.api.active[1].src + ')')
ok(s.api.active[2].src === '/dsh-boot-gallery/arts/konan/02.jpg?v=sCCC', '[预设] 幕2 的 ?v= 用的是**那个文件自己的** version(实际 ' + s.api.active[2].src + ')')
ok(s.api.timeline.length === 9, '[预设] .timeline 仍然是内置那 9 幕(兜底没被预设污染)')
ok(s.log.images.length === 2 && s.log.images[0].includes('/arts/konan/01.jpg'), '[预设] 播之前预载了 2 张远程图(实际 ' + JSON.stringify(s.log.images) + ')')
ok(s.log.reports.some((r) => r.mode === 'preset' && r.preset === 'konan' && r.acts === 2), '[预设] report = mode=preset preset=konan acts=2(实际 ' + JSON.stringify(s.log.reports) + ')')
ok(s.layers.some((l) => all(l).some((x) => x.tagName === 'img' && String(x.src).startsWith('/dsh-boot-gallery/arts/'))), '[预设] 远程图真的上了屏')
ok(s.layers.some((l) => all(l).some((x) => x.classList.contains('nbn-pupil'))), '[预设] act.pupil 生效(红瞳环上了屏)')
ok(s.layers.some((l) => all(l).some((x) => x.tagName === 'b' && x.textContent === '晓 · 小南')), '[预设] 预设级 title 落在最后一幕')
const kbImg = s.imgs.find((i) => String(i.src).includes('01.jpg'))
ok(kbImg && String(kbImg.style._v['--z0']) === '1.16' && kbImg.style._v['--k0'] === '4%' && kbImg.style._v['--k3'] === '-4%', '[预设] kb/z0 真的落到 CSS 变量上(实际 ' + JSON.stringify(kbImg && kbImg.style._v) + ')')

// C) 逐字段类型校验:非法值一律回默认,**不许用 0 顶上去**
const DIRTY = {
  schema: 1, open: 'none',
  acts: [
    { file: '01.jpg', dur: 'abc', pos: 'left', z0: -5, z: 0, kb: 'nope', pupil: 5, flash: 'yes' },
    { file: '02.jpg', dur: 0, pos: null, z0: NaN, z: Infinity, kb: ['4%'], pupil: '50%', flash: false },
    { file: 'nope.exe' }, { file: '01.jpg/../../x' }, { notfile: 1 }, null,
  ],
}
s = await scen({ routes: { [PRESETS_URL]: mkPresetManifest(), '/dsh-boot-gallery/arts/konan/preset.json': DIRTY } })
ok(s.api.active.length === 2 && s.api.active[0].kind === 'img', '[校验] open=none 没有开场云;5 个坏 act 里只留下 2 个能播的(实际 ' + s.api.active.length + ')')
ok(s.api.active.every((a) => a.kind !== 'cloud' && String(a.file).match(/^0\d\.jpg$/)), '[校验] .exe / 带斜杠的 file / 缺 file 的 act 全被丢掉')
ok(s.api.active[0].dur === 900 && s.api.active[1].dur === 900, '[校验] dur 非法(' + JSON.stringify([DIRTY.acts[0].dur, DIRTY.acts[1].dur]) + ') → 回默认 900,不是 0')
ok(s.api.active.every((a) => a.pos === '50% 50%'), '[校验] pos 非法 → 回默认 50% 50%')
ok(s.api.active.every((a) => a.z0 === 1.075 && a.z === 1), '[校验] z0/z 非法(-5/0/NaN/Infinity) → 回默认 1.075/1')
ok(s.api.active.every((a) => a.kb[0] === '0% 0%' && a.kb[1] === '0% 0%'), '[校验] kb 形状不对 → 回默认 ["0% 0%","0% 0%"](实际 ' + JSON.stringify(s.api.active[0].kb) + ')')
ok(s.api.active.every((a) => a.pupil === ''), '[校验] pupil 非法 → 空(不画红瞳环)')
ok(s.api.active.every((a) => a.flash === false), '[校验] flash 只认真 true,字符串 "yes" 不算(实测易把动画点瞎)')

// D) 幕数硬顶:50 幕只取 8
const MANY = { schema: 1, acts: Array.from({ length: 50 }, (_, i) => ({ file: '01.jpg', dur: 130 })) }
s = await scen({ routes: { [PRESETS_URL]: mkPresetManifest(), '/dsh-boot-gallery/arts/konan/preset.json': MANY } })
ok(s.api.active.filter((a) => a.kind === 'img').length === 8, '[硬顶] 50 幕被截到 8(实际 ' + s.api.active.filter((a) => a.kind === 'img').length + ')')

// E) ?v= 拿不到时宁可不带(退化成 no-cache,绝不错发 immutable)
s = await scen({
  routes: {
    [PRESETS_URL]: mkPresetManifest({ presets: [{ id: 'konan', ok: true, acts: 1, version: 'sAAA', files: [] }] }),
    '/dsh-boot-gallery/arts/konan/preset.json': { schema: 1, open: 'none', acts: [{ file: '01.jpg', dur: 200 }] },
  },
})
ok(s.api.active[0].src === '/dsh-boot-gallery/arts/konan/01.jpg', '[版本] 清单没给该文件的 version → src 不带 ?v=(实际 ' + s.api.active[0].src + ')')

// F) 公开 API:presets() / usePreset() / timeline
//    注意顺序:每开一场 scen() 都会把 globalThis.fetch 换成新一场的假路由,
//    所以"清单拿不到"这一场必须先跑完,后面 usePreset 的 POST 才会落在对的那份 log 里。
const s404 = await scen({ routes: { [PRESETS_URL]: 404 } })
const badList = await s404.api.presets()
ok(Array.isArray(badList) && badList.length === 0, '[API] 清单拿不到时 presets() 回空数组而不是 reject')
s = await scen({ routes: { [PRESETS_URL]: mkPresetManifest(), '/dsh-boot-gallery/arts/konan/preset.json': GOOD_DOC } })
const list = await s.api.presets()
ok(Array.isArray(list) && list.length === 1 && list[0].id === 'konan', '[API] presets() 返回清单数组(实际 ' + JSON.stringify(Array.isArray(list) ? list.length : list) + ')')
const r1 = await s.api.usePreset('konan')
const post = s.log.fetches.filter((f) => f.method === 'POST' && f.path === PRESETS_URL).pop()
ok(r1 && r1.ok === true, '[API] usePreset(konan) 成功回 ok(实际 ' + JSON.stringify(r1) + ')')
ok(post && JSON.parse(post.body).preset === 'konan', '[API] usePreset 真的 POST 了 {preset:"konan"}(实际 ' + (post && post.body) + ')')
const r0posts = () => s.log.fetches.filter((f) => f.method === 'POST' && f.path === PRESETS_URL).length
const postsBefore = r0posts()
const r2 = await s.api.usePreset('../evil')
ok(r2 && r2.ok === false && r2.why === 'bad-id', '[API] 穿越形状的 id 被拒:' + JSON.stringify(r2))
ok(r0posts() === postsBefore, '[API] 坏 id 不浪费一次 POST(前 ' + postsBefore + ' 次,后 ' + r0posts() + ' 次)')
// v5 给悬浮球环形面板补的两个只读接口(manifest / thumbUrl)
const mf = await s.api.manifest()
ok(mf && Array.isArray(mf.presets) && mf.presets.length === 1 && mf.selected === 'konan' && mf.manual === true, '[API] manifest() 回**整份**清单(selected/manual 都还在,金框靠它们)(实际 ' + JSON.stringify(mf && { n: mf.presets.length, selected: mf.selected, manual: mf.manual }) + ')')
ok(s.api.thumbUrl(mf.presets[0]) === '/dsh-boot-gallery/arts/konan/01.jpg?v=sBBB', '[API] thumbUrl() 挑的是 01.jpg 且带**该图自己的** version(实际 ' + s.api.thumbUrl(mf.presets[0]) + ')')
ok(s.api.thumbUrl({ id: '../evil', files: [] }) === '', '[API] thumbUrl() 对坏 id 回空串,不拼出可穿越的 URL')
const norm = s.api.normalizePreset({ schema: 1, open: 'none', acts: [{ file: '01.jpg' }] }, { id: 'konan', files: [] })
ok(Array.isArray(norm) && norm.length === 1, '[API] normalizePreset 可单独调用并返回可播数组(实际 ' + JSON.stringify(norm && norm.length) + ')')
ok(s.api.normalizePreset({ schema: 9, acts: [{ file: '01.jpg' }] }, { id: 'konan', files: [] }) === null, '[API] normalizePreset 对 schema≠1 回 null')
ok(s.api.version === 5 && typeof s.api.play === 'function' && typeof s.api.skip === 'function', '[API] play/skip/version 老接口一个没少、version 升到 5(实际 version=' + s.api.version + ')')
// 面板是加进 API 的,不是换掉的:老的三个必须还在,新的三个必须能用
ok(s.api.panel && typeof s.api.panel.open === 'function' && typeof s.api.panel.close === 'function' && typeof s.api.panel.isOpen === 'function', '[API] panel.{open,close,isOpen} 三个都暴露出来了')
// 只钉"单向包含":isOpen() 说有时 DOM 必须真有(那才是能点的东西);反过来不钉 ——
// 每个场景各自 new 一份模块,api 可能来自上一份闭包,DOM 里留着面板而 panelEl 是旧的 null,
// 那种不一致是**测试装置**的性质,不是插件的 bug。真正要钉的是"不许堆出第二个面板"。
ok(!s.api.panel.isOpen() || s.panelUp, '[API] isOpen() 为真时 DOM 里必须真有面板(不许骗人)')

// 「没写进去:http N …」这行字是**定责证据**(2026-11-10 真机报的就是 `http 400`):
// 本插件的门禁答 401 unauthorized / 403 forbidden(有文字),而宿主在 handler 之前答掉的 400 是**空体**。
// 带不带响应体正是这两者的分水岭,所以客户端现在把体一起念出来 —— 用户截一张图就够定责。
const ROUTES_OK = { [PRESETS_URL]: mkPresetManifest(), '/dsh-boot-gallery/arts/konan/preset.json': GOOD_DOC }
const sp403 = await scen({ routes: ROUTES_OK, postReply: { http: 403, body: 'forbidden' } })
const rf = await sp403.api.usePreset('konan')
ok(rf && rf.ok === false && rf.why === 'http 403 forbidden', '[面板定责] 门禁拒的 POST,why 里带得出**响应体**(实际 ' + JSON.stringify(rf && rf.why) + ')')
const sp400 = await scen({ routes: ROUTES_OK, postReply: 400 })
const rh = await sp400.api.usePreset('konan')
ok(rh && rh.ok === false && /^http 400/.test(String(rh.why)) && /\(空响应体\)$/.test(String(rh.why)), '[面板定责] 空体 400 必须被写明「(空响应体)」,好跟门禁的拒法区分开(实际 ' + JSON.stringify(rh && rh.why) + ')')

// ---------------- 11-19 新语义:预设自己点名 clip(目标 1 的核心保证) ----------------
// 用户的原话是「只有永夜·扉间用视频、其它套照旧」。这句话**必须**能被机器验证,
// 因为它的反面(有 mp4 就全局抢占)恰好是老语义,一旦有人把 VIDEO_GLOBAL 改回 true,画面会整套变掉而没人报错。
console.log('\n[8] 预设点名 clip')
const CLIP_OK = { name: 'night.mp4', url: '/dsh-boot-gallery/media/night.mp4', faststart: true }
const PRESET_DOC_URL = '/dsh-boot-gallery/arts/konan/preset.json'
const DOC_CLIP = Object.assign({}, GOOD_DOC, { clip: 'night.mp4' })
const MODES = (s) => JSON.stringify(s.log.reports.map((r) => r.mode + (r.clip ? ':' + r.clip : '')))
{
  // A) 点了名 + clips 里真有 + faststart 不是 false ⇒ 播视频,而且**只**播视频
  const sA = await scen({ routes: { [PRESETS_URL]: mkPresetManifest(), [PRESET_DOC_URL]: DOC_CLIP }, clips: [CLIP_OK] })
  const rA = sA.log.reports.find((r) => r.mode === 'video')
  ok(!!rA && rA.clip === 'night.mp4' && rA.preset === 'konan', '[clip] 点名的预设 -> mode=video 且 clip/preset 都对(实际 ' + MODES(sA) + ')')
  ok(sA.videos.length === 1 && sA.videos[0].src === CLIP_OK.url, '[clip] 真造了 <video>,src 用 clips.json 给的 URL,**不自己拼路径**(实际 ' + JSON.stringify(sA.videos.map((v) => v.src)) + ')')
  // 为什么这里"属性或属性标记任一为真"就算过:这个假 DOM 的 setAttribute 会把值直接写进**同名键**,
  // 于是真代码 `v.muted = true; v.setAttribute("muted","")` 在夹具里最终留下的是空串,而真浏览器留下 true。
  // 两种写法在浏览器里语义相同(布尔属性),所以钉"意图"而不是钉夹具的产物 —— 反过来把夹具改宽容,
  // 会连带影响这份文件里其它依赖 setAttribute 现状的断言。
  const vA = sA.videos[0]
  const setFlag = (k) => !!vA && (vA[k] === true || (typeof vA.getAttribute === 'function' && vA.getAttribute(k) != null))
  ok(vA && setFlag('muted') && setFlag('autoplay') && setFlag('playsinline'),
    '[clip] video 带 muted+autoplay+playsinline —— 缺任何一个 WebView 就不自动播或跳全屏(实际 muted=' + JSON.stringify(vA && vA.muted) +
    ' autoplay=' + JSON.stringify(vA && vA.autoplay) + ' inline=' + JSON.stringify(vA && vA.playsInline) + ')')
  ok(!sA.log.reports.some((r) => r.mode === 'preset'), '[clip] 走视频了就不许再补一条 mode=preset(两条都播 = 决策没定死)')

  // B) 点了名但目录里没有 ⇒ 单独报 clip-miss,然后**照旧播这套自己的分镜**(绝不悄悄换内容)
  const sB = await scen({ routes: { [PRESETS_URL]: mkPresetManifest(), [PRESET_DOC_URL]: DOC_CLIP }, clips: [{ name: 'other.mp4', url: '/dsh-boot-gallery/media/other.mp4', faststart: true }] })
  const rB = sB.log.reports.find((r) => r.mode === 'clip-miss')
  ok(!!rB && rB.clip === 'night.mp4' && rB.preset === 'konan', '[clip] 点名找不到 -> 单独一条 mode=clip-miss 带 clip/preset(实际 ' + MODES(sB) + ')')
  ok(sB.log.reports.some((r) => r.mode === 'preset' && r.preset === 'konan') && sB.videos.length === 0,
    '[clip] clip-miss 之后必须回到"播自己的分镜",而且不许凭空造 <video>(这是"其它效果不变"的失败分支)')

  // C) 片源在但 moov 在尾部(faststart:false) ⇒ 按不可播处理:先黑几秒不如播图
  const sC = await scen({ routes: { [PRESETS_URL]: mkPresetManifest(), [PRESET_DOC_URL]: DOC_CLIP }, clips: [Object.assign({}, CLIP_OK, { faststart: false })] })
  ok(sC.log.reports.some((r) => r.mode === 'clip-miss') && sC.videos.length === 0,
    '[clip] faststart:false 视为不可播 -> clip-miss + 回分镜(实际 ' + MODES(sC) + ')')

  // D) **主保证**:目录里有 mp4、selected 也指着它,但这一套预设**没点名** ⇒ 逐帧照旧,不许抢占
  const sD = await scen({ routes: { [PRESETS_URL]: mkPresetManifest(), [PRESET_DOC_URL]: GOOD_DOC }, clips: [CLIP_OK], clipSelected: 'night.mp4' })
  ok(!sD.log.reports.some((r) => r.mode === 'video') && sD.videos.length === 0,
    '[逐帧不变] 没点名的预设:目录里有片、selected 也指着它,仍然**不播视频**(实际 ' + MODES(sD) + ')')
  ok(sD.log.reports.some((r) => r.mode === 'preset' && r.preset === 'konan') && sD.layers.length > 0,
    '[逐帧不变] 没点名 -> 老老实实 mode=preset 且分镜图层真上屏(实际 ' + sD.layers.length + ' 层)')

  // E) 老宿主 / 没建 clips 目录(clips.json 404)而预设点了名 ⇒ 退化成播图,一声不报错
  const sE = await scen({ routes: { [PRESETS_URL]: mkPresetManifest(), [PRESET_DOC_URL]: DOC_CLIP }, clips: false })
  ok(sE.log.reports.some((r) => r.mode === 'clip-miss') && sE.log.reports.some((r) => r.mode === 'preset') && sE.videos.length === 0,
    '[兼容] clips.json 404(老宿主/无目录)时点名的那套退化成播图,不抛错(实际 ' + MODES(sE) + ')')

  // F) 开关本体:默认必须是"点名才播",老的全局语义只能显式打开;被淘汰的常量不许还活在代码里
  ok(/const VIDEO_GLOBAL = false/.test(code), '[语义开关] 产物里 VIDEO_GLOBAL 默认 false(点名才播);要回到"丢进目录就全局播"得显式改 true')
  ok(!/PRESET_OVER_VIDEO/.test(code), '[语义开关] 被淘汰的旧常量 PRESET_OVER_VIDEO 在代码里一个都不剩(文档不能和代码各说一套)')
}

// ---------------- [9] 真机夹具:逐套预设点名验(11-19 从运行中的宿主抓) ----------------
// 为什么还要这一段:上面 [8] 那批用的是**手写的** konan 假数据。"其它预设逐帧不变"这句话
// 真正的意思是"**装机上这 17 套、拿它们各自真分镜表,一套都不会被视频抢走**" —— 那得拿真数据跑。
{
  const FIX = path.join(PKGROOT, 'tools', 'fixtures', 'boot-live.json')
  if (!fs.existsSync(FIX)) {
    ok(false, '缺夹具 ' + FIX + ' —— 按 tools/fixtures/FIXTURE-README.md 从运行中的宿主重抓,不许手写一份"看起来对"的')
  } else {
    const FX = JSON.parse(fs.readFileSync(FIX, 'utf8'))
    const named = Object.keys(FX.docs).filter((id) => FX.docs[id] && FX.docs[id].clip)
    ok(FX.presets.length >= 2 && named.length === 1 && named[0] === 'tobirama-night',
      '[真机] 抓下来的可播预设里**只有 tobirama-night 点名了视频**(实际点名的:' + (named.join(',') || '无') + ')')
    const CL = { name: 'tobirama-night.mp4', bytes: 12369141, faststart: true, contentType: 'video/mp4', version: 'live', url: '/dsh-boot-gallery/media/tobirama-night.mp4?v=live' }
    let vid = 0, pres = 0, miss = 0, ran = 0
    for (const id of Object.keys(FX.docs)) {
      const item = FX.presets.find((p) => p.id === id)
      if (!item || !item.ok) continue
      ran++
      const m = Object.assign({}, FX.manifestTop, { presets: FX.presets, selected: id, manual: true })
      const routes = {}
      routes[PRESETS_URL] = m
      routes['/dsh-boot-gallery/arts/' + id + '/preset.json'] = FX.docs[id]
      const s = await scen({ routes, clips: [CL], wait: 900 })
      const rs = s.log.reports
      const hasVideo = rs.some((r) => r.mode === 'video')
      const hasMiss = rs.some((r) => r.mode === 'clip-miss')
      if (hasVideo) vid++
      if (rs.some((r) => r.mode === 'preset')) pres++
      if (hasMiss) miss++
      if (id === 'tobirama-night') {
        ok(hasVideo && rs.some((r) => r.mode === 'video' && r.clip === CL.name),
          '[真机] 永夜·扉间 点了名 -> mode=video clip=' + CL.name + '(实际 ' + JSON.stringify(rs.map((r) => r.mode)) + ')')
        ok(s.videos.length === 1 && String(s.videos[0].src).indexOf('/media/' + CL.name) >= 0,
          '[真机] 那一段真的挂到 <video> 上且 src 走 /media 路由(实际 ' + (s.videos[0] ? String(s.videos[0].src) : '没有 video 元素') + ')')
      } else if (hasVideo || hasMiss) {
        ok(false, '[真机逐帧不变] ' + id + ' 没点名却走了视频/报了 clip-miss(实际 ' + JSON.stringify(rs.map((r) => r.mode)) + ')')
      }
    }
    ok(vid === 1 && miss === 0 && ran >= 10,
      '[真机逐帧不变] ' + ran + ' 套真预设各跑一遍:上视频 ' + vid + ' 套(应为 1)、clip-miss ' + miss + ' 套(应为 0)、播图 ' + pres + ' 套')
  }
}

console.log('\n' + (fail.length ? '客户端冒烟失败 ' + fail.length + ' 项' : '客户端冒烟全绿'))
process.exit(fail.length ? 1 : 0)
