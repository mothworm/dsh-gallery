// dsh-boot-suite-gallery / tools/build-client.mjs
//
// parts/*.part.js  +  data/*.json  +  palettes/{auto,tuned}  ->  lib/client.js
//
// 为什么要有这一步而不是直接改 lib/client.js:madara 那份 2.6 MB 的产物是"手改产物"长大的,
// 里面三行 base64 各 30 万字符,任何一次改动都要在巨型文件里挪。本套件一张图都不内嵌
// (画面由开屏插件的路由给),所以源码本来可以很小 —— 保持小的办法就是:**源码与产物分开**。
//
// 跑: node tools/build-client.mjs [--strict]
//   --strict  有任何 WARN 就 exit 1(装机前用它把质量门立起来)
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SUITE = dirname(HERE)
const STRICT = process.argv.includes('--strict')
const ARTS = resolve(SUITE, '..', '..', 'dsh-gallery-pack', 'arts2')

const warns = []
const warn = (m) => { warns.push(m); console.log('WARN  ' + m) }
const die = (m) => { console.error('FAIL  ' + m); process.exit(1) }

const readJson = (p, fb) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, '')) : fb)
const pkg = readJson(join(SUITE, 'package.json'), null)
if (!pkg || typeof pkg.name !== 'string') die('package.json 读不到或缺 name')

// —— 1. token 名单 ——
const tokDoc = readJson(join(SUITE, 'data', 'tokens.json'), null)
if (!tokDoc || !Array.isArray(tokDoc.tokens) || !tokDoc.tokens.length) die('data/tokens.json 缺失,先跑 tools/extract-tokens.mjs')
const TOKENS = tokDoc.tokens

// —— 2. 画面落点表 ——
const SURFACES = readJson(join(SUITE, 'data', 'surfaces.json'), null)
if (!SURFACES) die('data/surfaces.json 缺失')

// —— 3. 调色:auto 打底 + tuned 覆盖,深度合并 ——
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
function deepMerge(a, b) {
  const out = Object.assign({}, a)
  for (const k of Object.keys(b || {})) {
    if (k.startsWith('_')) continue
    out[k] = isObj(b[k]) && isObj(a && a[k]) ? deepMerge(a[k], b[k]) : b[k]
  }
  return out
}
const HEX = /^#[0-9a-fA-F]{6}$/
const autoDir = join(SUITE, 'palettes', 'auto')
const tunedDir = join(SUITE, 'palettes', 'tuned')
const ids = new Set()
if (existsSync(autoDir)) for (const f of readdirSync(autoDir)) if (f.endsWith('.auto.json')) ids.add(f.replace(/\.auto\.json$/, ''))
if (existsSync(tunedDir)) for (const f of readdirSync(tunedDir)) if (f.endsWith('.json')) ids.add(f.replace(/\.json$/, ''))
// 2026-11-21:调色不再必填。角色专属的 17 套随主题素材一起移出仓库,
// 现在"主题"是从资源包导入的,导入时未必带 palette —— 缺了就走 normalizePalette(null) 的默认配色
// (20-color.part.js 的 paletteFor 里已经处理:有就吃、没有就报 palette-missing 并兜底)。
// ⇒ 这里**不再 die**,只是打一行提示,让"零调色"也能出包。
if (!ids.size) console.log('palettes: 0 套(未内置任何调色,主题配色走运行时默认值)')

// 只带客户端真用得着的字段进产物:evidence/top6/scores 是给人看的,进去白占几十 KB
const KEEP = ['preset', 'title', 'hero', 'ink', 'eye', 'glass', 'art', 'card', 'mode', 'tokens', 'flags']
const PALETTES = {}
for (const id of [...ids].sort()) {
  const auto = readJson(join(autoDir, id + '.auto.json'), {})
  const tuned = readJson(join(tunedDir, id + '.json'), null)
  if (tuned && tuned.ink) for (const k of Object.keys(tuned.ink)) {
    if (tuned.ink[k] !== null && !HEX.test(String(tuned.ink[k]))) die('tuned/' + id + '.json 的 ink.' + k + ' 不是 #RRGGBB: ' + tuned.ink[k])
  }
  const m = deepMerge(auto, tuned || {})
  m.preset = m.preset || id
  const slim = {}
  for (const k of KEEP) if (m[k] !== undefined) slim[k] = m[k]
  if (!isObj(slim.ink)) slim.ink = {}
  for (const k of ['ground', 'accent', 'accent2', 'glow', 'neutral']) {
    if (!HEX.test(String(slim.ink[k]))) { if (slim.ink[k] != null) warn(id + ': ink.' + k + ' 非法(' + slim.ink[k] + '),留给运行时兜底'); delete slim.ink[k] }
  }
  if (slim.hero && slim.hero.file && existsSync(join(ARTS, id))) {
    if (!existsSync(join(ARTS, id, slim.hero.file))) warn(id + ': hero.file 指向不存在的图 ' + slim.hero.file)
  }
  if (!isObj(slim.eye)) slim.eye = { kind: 'unknown' }
  PALETTES[id] = slim
}

// —— 4. 拼 parts ——
const partsDir = join(SUITE, 'parts')
const partFiles = readdirSync(partsDir).filter((f) => f.endsWith('.part.js')).sort()
if (!partFiles.length) die('parts/ 下没有 *.part.js')
const body = partFiles.map((f) => readFileSync(join(partsDir, f), 'utf8').replace(/\s*$/, '')).join('\n\n')

const code = [
  'window.__ModuleLoader__.load({',
  '\tid: ' + JSON.stringify(pkg.name) + ',',
  '\tfactory: (require) => {',
  '\t\tvar module = { exports: {} };',
  '\t\tvar exports = module.exports;',
  '\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
  '\t\t// 由 tools/build-client.mjs 从 parts/ 拼接生成 —— **别直接改这个文件**,改 parts/*.part.js',
  '\t\t// 源 parts: ' + partFiles.join(' + '),
  '',
  body.split('\n').map((l) => (l.length ? '\t\t' + l : l)).join('\n'),
  '\t},',
  '});',
  '',
].join('\n')
  .replace('/*__PALETTES__*/ null', JSON.stringify(PALETTES))
  .replace('/*__TOKENS__*/ null', JSON.stringify(TOKENS))
  .replace('/*__SURFACES__*/ null', JSON.stringify(SURFACES))
  .replace(/"__PACKAGE_ID__"/g, JSON.stringify(pkg.name))

// —— 5. 出闸门 ——
for (const ph of ['__PALETTES__', '__TOKENS__', '__SURFACES__', '__PACKAGE_ID__']) {
  if (code.includes(ph)) die('占位符没被替换干净: ' + ph)
}
try { new Function(code) } catch (e) { die('语法不过: ' + e.message) }   // 解析级自检;执行级在 selftest

mkdirSync(join(SUITE, 'lib'), { recursive: true })
writeFileSync(join(SUITE, 'lib', 'client.js'), code, 'utf8')

const idsTuned = [...ids].filter((id) => existsSync(join(tunedDir, id + '.json')))
console.log('built lib/client.js  ' + Buffer.byteLength(code) + ' B  (' + Math.round(process.memoryUsage().rss / 1048576) + ' MB rss)')
console.log('palettes: ' + ids.size + ' 套(其中人工微调 ' + idsTuned.length + ' 套:' + (idsTuned.join(', ') || '无') + ')')
console.log('tokens: ' + TOKENS.length + '   surfaces.conversation: ' + (SURFACES.conversation || []).length +
  '   surfaces.card: ' + (SURFACES.card || '(没配!)') +
  '   cardKinds: ' + Object.keys(SURFACES.cardKinds || {}).map((k) => k + '=' + (SURFACES.cardKinds[k] || []).length).join(' '))
if (!SURFACES.card) warn('surfaces.card 没配 —— 文本框会退化成兜底选择器')
const needTune = Object.keys(PALETTES).filter((k) => PALETTES[k].flags && PALETTES[k].flags.needs_tuning && !idsTuned.includes(k))
if (needTune.length) console.log('待人工配色(自动层自己报了缺陷): ' + needTune.join(', '))
if (warns.length) console.log('WARN x ' + warns.length)
process.exit(STRICT && warns.length ? 1 : 0)
