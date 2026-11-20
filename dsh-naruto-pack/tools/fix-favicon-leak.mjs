import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

// FAVICON-LEAK 修复：把主题 apply() 里「找不到 icon 标签就 appendChild 新建一个」
// 换成 itachi 已验证的「先找自己的 id，再退回 querySelector，最后才建并打 id」。
//
// 为什么要修：宿主页面本来可能没有 <link rel*=icon>。旧写法每次 apply() 都新建一个
// 无 id 的 <link> 追加进 head，于是**重复 apply 会累积**（假 DOM 实测：二次 apply 后
// link 节点数 = 2）。apply() 会被热应用反复调用（改 cordis.patch.yml 触发 watchUserPatches），
// 所以这不是「多一个标签」的审美问题，是泄漏。
// 参照实现：themes/itachi-theme/lib/client.js 的 dsh-theme-itachi-favicon 那段，照它的路子改。
//
// 用法: node tools/fix-favicon-leak.mjs            # 默认 dry-run，只报告
//       node tools/fix-favicon-leak.mjs --apply    # 落盘（先写 .bak-favicon-<时间戳>）
// 幂等：对同一文件重复跑，第二次报「已是修好的样子，跳过」，不产生新备份。
// 硬性边界：只改工作区内的文件。任何 C:\Users\<用户名>\.dsh\ 下的装机副本一律拒改（只读）。
const APPLY = process.argv.includes('--apply')
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
const WS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const FORBIDDEN = path.join(os.homedir(), '.dsh')

const NAMES = ['sally', 'pastry', 'goku', 'gaara', 'izuna', 'madara', 'konan', 'brothers', 'itachi']

// 模板用 __PACKAGE_ID__ 占位符，展开后即 dsh-theme-<名>-favicon，天然一支一个 id
const targets = [{
  f: path.join(WS, 'dsh-themes-collection', 'skill', 'templates', 'client.js'),
  id: '__PACKAGE_ID__-favicon',
}]
for (const n of NAMES) {
  const theme = path.join(WS, 'dsh-themes-collection', 'themes', n + '-theme')
  targets.push({ f: path.join(theme, 'lib', 'client.js'), id: 'dsh-theme-' + n + '-favicon' })
  const tpl = path.join(theme, 'build', 'client.template.js')
  if (fs.existsSync(tpl)) targets.push({ f: tpl, id: 'dsh-theme-' + n + '-favicon' })
}

// --- 待替换的旧块（逐行匹配，缩进与 URI 变量名都从原文捕获，不硬编码）---
const OLD_HEAD = /^([ \t]*)const link = document\.querySelector\(\s*"link\[rel='icon'\], link\[rel='shortcut icon'\]"\s*\);\s*$/
const OLD_SHAPE = [
  /^([ \t]*)if \(link\) link\.href = ([A-Za-z_$][\w$]*);\s*$/,
  /^([ \t]*)else \{\s*$/,
  /^([ \t]*)const created = document\.createElement\("link"\);\s*$/,
  /^([ \t]*)created\.rel = "icon";\s*$/,
  /^([ \t]*)created\.href = ([A-Za-z_$][\w$]*);\s*$/,
  /^([ \t]*)document\.head\.appendChild\(created\);\s*$/,
  /^([ \t]*)\}\s*$/,
]
// --- 已修好的标志（幂等判据）---
function alreadyFixed(src, id) {
  const esc = id.replace(/\$/g, '\\$')
  const byId = new RegExp('let link = document\\.getElementById\\(\\s*"' + esc + '"').test(src)
  const tagged = new RegExp('link\\.id = "' + esc + '"').test(src)
  return byId && tagged
}

function buildBlock(ind, unit, id, uriVar) {
  const i1 = ind + unit, i2 = ind + unit + unit
  return [
    ind + '// favicon 只建一次并打上自己的 id：主题反复 apply 不会堆出多个 <link rel=icon>',
    ind + '//（只认 querySelector 的旧写法在宿主没有现成 icon 标签时，每次 apply 都会新建一个追加进 head，热应用会累积）',
    ind + 'let link = document.getElementById("' + id + '");',
    ind + "if (!link) link = document.querySelector(\"link[rel='icon'], link[rel='shortcut icon']\");",
    ind + 'if (!link) {',
    i1 + 'link = document.createElement("link");',
    i1 + 'link.rel = "icon";',
    i1 + 'link.id = "' + id + '";',
    i1 + 'document.head.appendChild(link);',
    ind + '}',
    ind + 'link.href = ' + uriVar + ';',
  ]
}

const problems = []
let changed = 0, skipped = 0
const report = []
for (const t of targets) {
  const tag = path.relative(WS, t.f)
  if (path.resolve(t.f).startsWith(FORBIDDEN + path.sep) || /(^|\\|\/)\.dsh($|\\|\/)/i.test(t.f)) {
    problems.push('目标越界（禁止写 .dsh）：' + t.f); continue
  }
  if (!fs.existsSync(t.f)) { console.log('  跳过(不存在) ' + tag); continue }
  const before = fs.readFileSync(t.f, 'utf8')

  if (alreadyFixed(before, t.id)) {
    console.log('  skip ' + tag + '  —— 已是修好的样子（id=' + t.id + '），跳过')
    skipped++
    continue
  }

  const lines = before.split('\n')
  let hit = -1, uriVar = null, ind = null
  const headLines = lines.map((l, i) => OLD_HEAD.test(l) ? i : -1).filter(i => i >= 0)
  for (const i of headLines) {
    const head = OLD_HEAD.exec(lines[i])
    let uri = null, ok = true
    for (let k = 0; k < OLD_SHAPE.length; k++) {
      const mm = OLD_SHAPE[k].exec(lines[i + 1 + k])
      if (!mm) { ok = false; break }
      if (k === 0) uri = mm[2]
      else if (k === 4 && mm[2] !== uri) { ok = false; break }
    }
    if (!ok || !uri) continue
    hit = i; ind = head[1]; uriVar = uri; break
  }
  if (hit < 0) {
    if (/document\.querySelector\(\s*"link\[rel='icon'/.test(before))
      problems.push(tag + '：有 favicon 段但形状不是已知的旧块，脚本不敢猜 —— 需人工看')
    else console.log('  skip ' + tag + '  —— 没有 favicon 段')
    skipped++
    continue
  }
  if (lines.filter((l, i) => OLD_HEAD.test(l)).length !== 1)
    problems.push(tag + '：旧块出现多于 1 次，只替换第一处不安全')

  const unit = ind.includes('\t') ? '\t' : '  '
  const out = lines.slice(0, hit)
    .concat(buildBlock(ind, unit, t.id, uriVar))
    .concat(lines.slice(hit + 1 + OLD_SHAPE.length))
  const after = out.join('\n')

  const fileIssues = []
  if (!alreadyFixed(after, t.id)) fileIssues.push('替换后自检没通过（找不到 getElementById+link.id 配对）')
  if (new RegExp('const link = document\\.querySelector\\(\\s*"link\\[rel=', '').test(after)) fileIssues.push('替换后旧块仍在')
  if (/const created = document\.createElement\("link"\)/.test(after)) fileIssues.push('替换后还有 created 变量（旧块残留）')
  if (Buffer.byteLength(after, 'utf8') < Buffer.byteLength(before, 'utf8'))
    fileIssues.push('字节数减少了 ' + (Buffer.byteLength(before, 'utf8') - Buffer.byteLength(after, 'utf8')) + ' B（本修只应增加），拒绝落盘')
  if ((after.match(/document\.head\.appendChild\(link\)/g) || []).length !== 1)
    fileIssues.push('appendChild(link) 应恰好 1 处')
  // 语法闸门：build/client.template.js 里 @@KONAN_IMAGES@@ 这类占位符是**裸放在数组位置**的
  // （见 build-client.py 的 rows() 替换），原文本身就过不了 new Function——itachi 那版同样过不了。
  // 所以先把 @@X@@ 变成合法标识符 PLACEHOLDER_X 再解析：落在字符串里是无害的（仍在引号内），
  // 落在表达式位置则变成一个正常标识符。模板的最终把关靠重建后的 lib/client.js（见 --apply 后提示）。
  const neutral = after.replace(/@@([A-Za-z_0-9]+)@@/g, 'PLACEHOLDER_$1')
  try { new Function(neutral) } catch (e) { fileIssues.push('语法检查失败(已中和 @@占位符@@ 后): ' + e.message) }

  if (fileIssues.length) { console.log('  FAIL ' + tag + '\n        ' + fileIssues.join('\n        ')); problems.push(tag); continue }
  const delta = Buffer.byteLength(after, 'utf8') - Buffer.byteLength(before, 'utf8')
  console.log('  ok   ' + tag + '  (' + Buffer.byteLength(before, 'utf8') + ' → ' + Buffer.byteLength(after, 'utf8') + ' B, +' + delta + ' B, id=' + t.id + ', href源=' + uriVar + ')')
  if (APPLY) {
    fs.writeFileSync(t.f + '.bak-favicon-' + stamp, before, 'utf8')
    fs.writeFileSync(t.f, after, 'utf8')
  }
  report.push({ tag, before: Buffer.byteLength(before, 'utf8'), after: Buffer.byteLength(after, 'utf8') })
  changed++
}
console.log('\n' + (APPLY ? '已改写 ' : '[dry] 将改写 ') + changed + ' 个，跳过 ' + skipped + ' 个，共 ' + targets.length + ' 个目标'
  + (APPLY ? '，备份后缀 .bak-favicon-' + stamp : '（未落盘）'))
if (report.length) {
  console.log('\n字节变化汇总:')
  for (const r of report) console.log('  ' + r.tag + ': ' + r.before + ' → ' + r.after + ' (+' + (r.after - r.before) + ')')
}
if (problems.length) { console.error('\n未通过的文件: ' + problems.join(', ')); process.exit(1) }
if (!APPLY) console.log('\n确认无误后加 --apply 落盘。装机副本（.dsh 下）本脚本按边界拒绝改写。')

// ---------------- --prove：二次/三次 apply 断言（自带假 DOM，判据模型 M2）----------------
// 为什么脚本要自带这套假 DOM：这道修复的**唯一有效证据**就是"反复 apply 后 <link> 只有 1 个"，
// 而各主题 build/smoke.mjs 的 getElementById 只搜 body（favicon 在 head 里），
// 用它跑双 apply 会**假失败** —— 修好的代码也会报 2。这里 getElementById 搜 head+body。
// 模型 M2 = querySelector 恒 null（宿主没有 icon 标签）+ getElementById 全搜：
// 这正是"每次 apply 多插一个"能发生的那个前提，所以它是判据；旧代码在这里必须报 1,2,3。
if (process.argv.includes('--prove')) {
  console.log('\n=== --prove：连跑 apply() ×3，断言 head 里 <link> 数恒为 1 ===')
  class E {
    constructor(t) { this.tagName = String(t).toUpperCase(); this.children = []; this.style = {}; this.dataset = {}; this._h = {}; this._c = new Set(); this.id = ''; this.rel = ''; this.href = ''; this.src = ''; this.alt = ''; this.title = ''; this.type = ''; this._x = '' }
    get classList() { const s = this._c; return { add: c => s.add(c), remove: c => s.delete(c), contains: c => s.has(c), toggle: (c, f) => f ? s.add(c) : s.delete(c) } }
    set className(v) { String(v).split(/\s+/).filter(Boolean).forEach(c => this._c.add(c)) }
    get className() { return Array.from(this._c).join(' ') }
    set textContent(v) { this._x = v } get textContent() { return this._x }
    set innerHTML(v) { this._i = v; this.children = [] } get innerHTML() { return this._i || '' }
    appendChild(c) { this.children.push(c); c.p = this; return c }
    append(...c) { c.forEach(x => this.appendChild(x)) }
    removeChild(c) { this.children = this.children.filter(x => x !== c); c.p = null; return c }
    remove() { if (this.p) this.p.removeChild(this) }
    insertBefore(c, r) { const i = this.children.indexOf(r); this.children.splice(i < 0 ? this.children.length : i, 0, c); c.p = this; return c }
    addEventListener(t, cb) { (this._h[t] = this._h[t] || []).push(cb) }
    removeEventListener() {}
    dispatch(t, e = {}) { (this._h[t] || []).forEach(cb => cb({ preventDefault() {}, stopPropagation() {}, target: this, ...e })) }
    getBoundingClientRect() { return { left: 20, right: 100, top: 800, bottom: 880, width: 80, height: 80 } }
    setAttribute(k, v) { this[k] = v } getAttribute(k) { return this[k] === undefined ? null : String(this[k]) }
    hasAttribute(k) { return this[k] !== undefined && this[k] !== '' }
    focus() {} blur() {} click() { this.dispatch('click') } closest() { return null } matches() { return false }
    walk() { let o = [this]; for (const c of this.children) if (c instanceof E) o = o.concat(c.walk()); return o }
    querySelectorAll(sel) { const want = String(sel).split(',').map(s => s.trim().replace(/^\./, '')).filter(Boolean); return this.walk().slice(1).filter(c => want.some(w => c._c.has(w) || c.id === w)) }
    querySelector(s) { const r = this.querySelectorAll(s); return r.length ? r[0] : null }
  }
  const head = new E('head'), body = new E('body'), html = new E('html')
  html.appendChild(head); html.appendChild(body)
  const all = () => html.walk()
  const win = {
    innerWidth: 1600, innerHeight: 900, devicePixelRatio: 1,
    querySelector() { return null }, querySelectorAll() { return [] },
    head, body, documentElement: html, title: '',
    createElement: t => new E(t),
    createTextNode: t => { const e = new E('#text'); e._x = t; return e },
    getElementById: id => all().find(e => e.id === id) || null,   // ← head 也搜，这是关键
    addEventListener() {}, removeEventListener() {}, visibilityState: 'visible',
  }
  Object.assign(win, {
    document: win, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    localStorage: { _d: {}, getItem(k) { return this._d[k] === undefined ? null : this._d[k] }, setItem(k, v) { this._d[k] = String(v) }, removeItem(k) { delete this._d[k] } },
    fetch: () => Promise.reject(new Error('smoke 不发网络')), getComputedStyle: () => ({ getPropertyValue: () => '' }),
    __ModuleLoader__: { load(m) { win.__mod = m } },
  })
  globalThis.window = win; globalThis.document = win
  globalThis.localStorage = win.localStorage; globalThis.fetch = win.fetch
  globalThis.matchMedia = win.matchMedia; globalThis.requestAnimationFrame = win.requestAnimationFrame
  globalThis.getComputedStyle = win.getComputedStyle
  const prove = (f, n) => {
    // 每支主题都要**清干净**再跑，否则上一支的 link 会让计数失真
    head.children = []; body.children = []; html.children = [head, body]; head.p = body.p = html
    win.__mod = null
    const src = fs.readFileSync(f, 'utf8')
    new Function('window', 'document', src)(win, win)
    const mod = win.__mod.factory(() => { throw new Error('require 不该被调用') })
    const ctx = { inject(d, cb) { cb({ effect: fn => fn(), theme: { overrideTokens: () => {} } }) } }
    const seq = []
    for (let i = 0; i < 3; i++) {
      try { mod.apply(ctx) } catch (e) { return 'apply#' + (i + 1) + ' threw: ' + e.message }
      seq.push(head.children.filter(c => c.tagName === 'LINK').length)
    }
    return seq.join(',') + '  (id=' + head.children.filter(c => c.tagName === 'LINK').map(l => l.id).join() + ')'
  }
  let bad = 0
  for (const t of targets) {
    if (!fs.existsSync(t.f)) continue
    if (/build[\\/]client\.template\.js$/.test(t.f)) {
      // 模板里 @@KONAN_IMAGES@@ 这类占位符是裸放在表达式位置的，**跑不起来**（连 new Function 都过不去）。
      // 它们的证明方式是重建：build-client.py 从模板生成 lib/client.js，而 lib/client.js 在这套假 DOM 里被证明。
      console.log('[SKIP] ' + path.relative(WS, t.f).padEnd(66) + ' 模板不可执行，由重建后的 lib/client.js 证明')
      continue
    }
    const n = path.basename(path.dirname(path.dirname(t.f)))
    const r = prove(t.f, n)
    const good = r.startsWith('1,1,1')
    if (!good) bad++
    console.log((good ? '[PASS] ' : '[FAIL] ') + path.relative(WS, t.f).padEnd(66) + ' ' + r)
  }
  console.log('\n--prove 结论: ' + (bad ? bad + ' 处未通过' : '全部通过（每支都是 1,1,1）'))
  process.exit(bad ? 1 : 0)
}
