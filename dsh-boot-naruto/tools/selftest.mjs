import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { Writable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'

// 宿主半边的离线自测:import 真实产物 + 假 webServer + 逐字复刻宿主前缀匹配规则。
// 跑: node tools/selftest.mjs   (DSH_HOME 指到**系统临时目录**,绝不在本仓库里造 01.jpg / *.mp4 —— 代码包的 0 素材纪律包含自测产物)
const HERE = path.dirname(fileURLToPath(import.meta.url))
const PKGROOT = path.resolve(HERE, '..')
const HOME = path.join(os.tmpdir(), 'dsh-boot-naruto-selftest-home')
fs.rmSync(HOME, { recursive: true, force: true })
fs.mkdirSync(path.join(HOME, 'boot-naruto', 'clips'), { recursive: true })
process.env.DSH_HOME = HOME

const mod = await import(pathToFileURL(path.join(PKGROOT, 'lib', 'index.js')).href)
const fail = []
const ok = (cond, msg) => { console.log((cond ? '  ok   ' : '  FAIL ') + msg); if (!cond) fail.push(msg) }
// —— 11-19 加的一道闸:这份自测读的是**包内副本**,而包内副本历史上和工作区/装机副本漂移过
//    (漂得最狠那次包里根本没有 lib\client.js,自测直接 ENOENT;还有一次它拿 28KB 的旧 index.js
//    跑出"全绿",而部署中的是 33KB 那份)。所以第一件事是比哈希:不一致就 FAIL,
//    绝不拿旧副本的绿灯当作部署代码的绿灯。11-19 起这份自测**就住在代码树里**,
//    所以比的对象换成了**部署中的那一份** = %USERPROFILE%\.dsh\profiles\desktop\node_modules\dsh-boot-naruto\lib\\
{
  const cr = await import('node:crypto')
  const wsA = path.join(os.homedir(), '.dsh', 'profiles', process.env.DSH_PROFILE || 'desktop', 'node_modules', 'dsh-boot-naruto', 'lib', 'index.js')
  const hash = (f) => (fs.existsSync(f) ? cr.createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0, 12) : null)
  const ha = hash(path.join(PKGROOT, 'lib', 'index.js')), hb = hash(wsA)
  if (hb === null) console.log('  note 没找到装机副本 ' + wsA + ' —— 跳过同源校验,这份自测只测源码本体')
  else ok(!!ha && ha === hb, '源码与装机副本同哈希: ' + String(ha) + ' vs ' + String(hb) + ' (不同就说明部署的不是这份代码,先别信这份自测)')
}

ok(mod.name === 'dsh-boot-naruto', 'export name = dsh-boot-naruto (实际 ' + mod.name + ')')
ok(typeof mod.apply === 'function', 'export apply(ctx)')
ok(!('inject' in mod), '宿主半边没有静态 export inject')

// —— 假 ctx ——
const routes = []
function mkRes() {
  const chunks = []
  const r = new Writable({ write(c, e, cb) { chunks.push(Buffer.from(c)); cb() } })
  r.statusCode = 0; r.headers = {}
  r.writeHead = (code, h) => { r.statusCode = code; r.headers = { ...(r.headers || {}), ...(h || {}) }; return r }
  const origEnd = r.end.bind(r)
  r.end = (b) => { if (b && chunks.length < 600) chunks.push(Buffer.from(b)); r.finished = true; if (r._done) r._done(); else r._pending = true; return origEnd() }
  r.body = () => Buffer.concat(chunks)
  r.wait = () => new Promise((res) => { r.finished ? res() : (r._done = res) })
  return r
}
function req(url, opts = {}) {
  const u = new URL('http://x' + url)
  return { method: opts.method || 'GET', url, headers: { ...(opts.headers || {}) }, on: (ev, cb) => { if (ev === 'data') cb(opts.body || ''); if (ev === 'end') setTimeout(cb, 0) } }
}
const effects = []
const ctx = {
  webServer: {
    register: (def) => { routes.push(def); return () => { const i = routes.indexOf(def); if (i >= 0) routes.splice(i, 1) } },
  },
  effect: (fn, name) => { effects.push(name); try { fn() } catch (e) { effects.push('THROW ' + e.message) } },
};
// 忠实复刻 cordis 的 ctx 代理:**读到没 inject 的服务名就直接抛**。宿主 dsh-host-webserver
// 的 createServer 把「handler 抛出且响应头未发」统一答成 **400 + 空体**,所以 2026-11-11 那次
// 插件里写 `ctx.connection`(它只 inject 了 webServer)把每一条 POST 都打成了 400(空体),
// 而老 mock 是个普通属性、根本不会抛,这条坑就测不出来。可选依赖的正解是 ctx.get(name)。
const connStore = { val: undefined }
Object.defineProperty(ctx, 'connection', {
  configurable: true,
  get() { throw new Error('cannot get property "connection" without inject') },
  set(v) { connStore.val = v },
})
ctx.get = (name) => (name === 'connection' ? connStore.val : undefined)
const root = { inject: (deps, cb) => { cb(ctx) } }
mod.apply(root)

// 宿主的 prefix 匹配式(逐字复刻):pathname !== prefix && !pathname.startsWith(prefix + '/')
function find(pathname) {
  for (const r of routes) {
    if (r.kind === 'exact' && r.path === pathname) return r
    if (r.kind !== 'exact' && (pathname === r.path || pathname.startsWith(r.path + '/'))) return r
  }
  return null
}
async function hit(url, opts) {
  const res = mkRes()
  const r = find(url.split('?')[0])
  if (!r) return { statusCode: 0, body: () => Buffer.from('NO ROUTE'), headers: {} }
  r.handler(req(url, opts), res)
  await new Promise((j) => setTimeout(j, 40))
  await res.wait()
  return res
}

ok(effects.length >= 3 && !effects.some((e) => String(e).startsWith('THROW')), '路由注册无抛错: ' + JSON.stringify(effects))
ok(routes.every((r) => !r.path.endsWith('/')), '所有路由 path 不带尾斜杠')

// 1) 空目录
let res = await hit('/dsh-boot-naruto/clips.json')
let j = JSON.parse(res.body().toString())
ok(res.statusCode === 200 && j.clips.length === 0, '空 clips 目录 -> clips.json 200 + 空数组')
ok(res.headers['Cache-Control'] === 'no-store', 'clips.json 用 no-store')
console.log('     dir = ' + j.dir)

// 2) 塞一个假 mp4
// 故意做成"尾部索引"(mdat 在 moov 之前):真实世界里这种片子 <video> 会先黑几秒
const fake = Buffer.concat([Buffer.from('\x00\x00\x00\x18ftypmp42'), Buffer.from('\x00\x00\x08\x00mdat'), Buffer.alloc(2032, 7), Buffer.from('\x00\x00\x00\x08moov')])
fs.writeFileSync(path.join(HOME, 'boot-naruto', 'clips', 'naruto-intro.mp4'), fake)
fs.writeFileSync(path.join(HOME, 'boot-naruto', 'clips', 'notes.txt'), '忽略非视频')
res = await hit('/dsh-boot-naruto/clips.json')
j = JSON.parse(res.body().toString())
ok(j.clips.length === 1 && j.clips[0].name === 'naruto-intro.mp4', '只列视频扩展名 (实际 ' + j.clips.map((c) => c.name) + ')')
ok(j.selected === 'naruto-intro.mp4', '未选时回落最新一段')
const clip = j.clips[0]
ok(clip.url.includes('?v='), 'url 自带 ?v=<version>')

// 3) 媒体:无 Range 全量
res = await hit(clip.url)
ok(res.statusCode === 200 && res.body().length === fake.length, '全量 200 且字节数一致 (' + res.body().length + ')')
ok(res.headers['Content-Type'] === 'video/mp4', 'content-type = video/mp4')
ok(res.headers['Cache-Control'] === 'public, max-age=31536000, immutable', '?v= 对上该段 version -> immutable(实际 ' + res.headers['Cache-Control'] + ')')
ok(String(res.headers['ETag']).startsWith('"raw-s'), 'ETag 形状 ' + res.headers['ETag'])
res = await hit(clip.url.split('?')[0])
ok(res.statusCode === 200 && res.headers['Cache-Control'] === 'no-cache', '不带 ?v= -> no-cache(实际 ' + res.headers['Cache-Control'] + ')')
res = await hit(clip.url.split('?')[0] + '?v= WRONG')
ok(res.headers['Cache-Control'] === 'no-cache', '?v= 对不上 -> no-cache')
const etag = res.headers['ETag']
res = await hit(clip.url, { headers: { 'if-none-match': etag } })
ok(res.statusCode === 304, 'If-None-Match 命中 -> 304')


// 4) Range
res = await hit(clip.url, { headers: { range: 'bytes=8-15' } })
ok(res.statusCode === 206 && res.body().length === 8, 'Range 8-15 -> 206 + 8 字节')
const cr = res.headers['content-range'] || res.headers['Content-Range']
ok(cr === 'bytes 8-15/' + fake.length, 'content-range ' + cr)

res = await hit(clip.url, { headers: { range: 'bytes=99999-' } })
ok(res.statusCode === 416, '越界 Range -> 416')
res = await hit(clip.url, { headers: { range: 'bytes=-8' } })
ok(res.statusCode === 206 && res.body().length === 8, '后缀式 Range -> 206 + 8 字节')

// 5) 404 必须 no-store
res = await hit('/dsh-boot-naruto/media/nope.mp4')
ok(res.statusCode === 404 && res.headers['Cache-Control'] === 'no-store', '缺文件 404 + no-store')
res = await hit('/dsh-boot-naruto/media/..%2Fevil.mp4')
ok(res.statusCode === 400 || res.statusCode === 404, '路径穿越被拒(实际 ' + res.statusCode + ')')

// 6) 选择写盘 + 自愈
res = await hit('/dsh-boot-naruto/clips.json', { method: 'POST', body: JSON.stringify({ selectedClip: 'naruto-intro.mp4', fit: 'contain' }) })
ok(res.statusCode === 200 && JSON.parse(res.body().toString()).fit === 'contain', 'POST 选择 -> fit=contain 落盘')
ok(fs.existsSync(path.join(HOME, 'boot-naruto', 'selection.json')), 'selection.json 存在')
fs.writeFileSync(path.join(HOME, 'boot-naruto', 'selection.json'), '{ 坏 JSON')
res = await hit('/dsh-boot-naruto/clips.json')
j = JSON.parse(res.body().toString())
ok(j.clips.length === 1, '选择文件损坏 -> 不抛错,照常出片库')
res = await hit('/dsh-boot-naruto/clips.json', { method: 'POST', body: JSON.stringify({ selectedClip: '../../../etc/passwd' }) })
ok(JSON.parse(res.body().toString()).selectedClip === null, '路径形状的选择被拒(实际 ' + JSON.parse(res.body().toString()).selectedClip + ')')

// 7) status.json
res = await hit('/dsh-boot-naruto/status.json')
ok(res.statusCode === 200, 'status.json 200')
console.log('     ' + res.body().toString())

// ============================================================
// 8) 预设(preset)半边:presets.json 清单 + /arts 素材路由
//    素材在临时目录 .test-home\boot-naruto\arts\ 里现造,绝不碰真的 ~/.dsh
// ============================================================
const ARTS = path.join(HOME, 'boot-naruto', 'arts')
const JPEFG = Buffer.from('\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x02\x00\x00\x01\x00\x01\x00\x00', 'binary')
const fakeJpg = (n) => Buffer.concat([JPEFG, Buffer.alloc(n, 0x7f), Buffer.from('\xff\xd9', 'binary')])
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8')

fs.mkdirSync(path.join(ARTS, 'konan'), { recursive: true })
writeJson(path.join(ARTS, 'konan', 'preset.json'), {
  schema: 1, id: 'konan', title: '晓·小南', open: 'akatsuki-cloud',
  acts: [
    { file: '01.jpg', dur: 1250, pos: '62% 22%', z0: 1.16, z: 1.05, kb: ['4% 5%', '-4% -4%'], pupil: '50% 24%', flash: false },
    { file: '02.jpg', dur: 900, pos: '50% 40%', z0: 1.1, z: 1.02, kb: ['0% 0%', '2% -2%'] },
  ],
  title: '晓 · 小南', sub: 'AKATSUKI · DSH 开屏动画',
})
fs.writeFileSync(path.join(ARTS, 'konan', '01.jpg'), fakeJpg(3000))
fs.writeFileSync(path.join(ARTS, 'konan', '02.jpg'), fakeJpg(1500))
fs.writeFileSync(path.join(ARTS, 'konan', 'notes.txt'), '不该被服务的非图片')
fs.writeFileSync(path.join(ARTS, 'konan', 'evil.exe'), 'MZ不该被服务的可执行')

res = await hit('/dsh-boot-naruto/presets.json')
let pj = JSON.parse(res.body().toString())
ok(res.statusCode === 200 && Array.isArray(pj.presets), 'presets.json 200 + presets 数组')
ok(res.headers['Cache-Control'] === 'no-store', 'presets.json 用 no-store(清单不许缓存,不然换素材还播旧的)')
const konan = pj.presets.find((p) => p.id === 'konan')
ok(!!konan && konan.ok === true, '清单里有 konan 且判定可播')
// ⚠️ 契约样例里 title 出现了两次(顶层 + 片尾),JSON.parse 是**后一个赢**,所以清单里是 '晓 · 小南'
ok(konan && konan.title === '晓 · 小南', '清单 title 取 preset.json 的(重复键按 JSON 语义后者赢,实际 ' + (konan && konan.title) + ')')
ok(konan && konan.acts === 2, '清单 acts = 可用幕数(实际 ' + (konan && konan.acts) + ')')
ok(konan && konan.bytes >= 4500 && konan.bytes < 100000, '清单 bytes 是真实字节和(实际 ' + (konan && konan.bytes) + ')')
ok(konan && typeof konan.mtime === 'number' && konan.mtime > 0, '清单 mtime 是毫秒时间戳')
ok(konan && konan.url === '/dsh-boot-naruto/arts/konan/preset.json?v=' + konan.version, '清单 url 自带 ?v=<preset.json 自己的 version>')
ok(konan && konan.files.length === 2 && konan.files.every((f) => /^s[0-9a-f]+t[0-9a-f]+$/.test(f.version)), '清单 files[] 每个都带自己的 version')
ok(pj.selected === 'konan' && pj.usable === 1, '无选择时 selected 回落清单第一个可播的')

// 9) /arts 素材:200 + 正确 MIME + 缓存头三条不变量
let ares = await hit('/dsh-boot-naruto/arts/konan/01.jpg')
ok(ares.statusCode === 200 && ares.body().length === fs.statSync(path.join(ARTS, 'konan', '01.jpg')).size, '/arts 全量 200 且字节一致(' + ares.body().length + ')')
ok(ares.headers['Content-Type'] === 'image/jpeg', '/arts .jpg -> image/jpeg')
ok(ares.headers['Cache-Control'] === 'no-cache', '/arts 不带 ?v= -> no-cache(成功响应绝不 no-store)')
ok(String(ares.headers['ETag']).startsWith('"raw-s'), '/arts ETag 形状 ' + ares.headers['ETag'])
const v01 = konan.files.find((f) => f.name === '01.jpg').version
ares = await hit('/dsh-boot-naruto/arts/konan/01.jpg?v=' + v01)
ok(ares.headers['Cache-Control'] === 'public, max-age=31536000, immutable', '?v= 对上**这个文件自己**的 version -> immutable')
ares = await hit('/dsh-boot-naruto/arts/konan/01.jpg?v=' + konan.files.find((f) => f.name === '02.jpg').version)
ok(ares.headers['Cache-Control'] === 'no-cache', '拿 02 的 version 冒充 01 -> 不给 immutable(版本必须一一对应)')
ares = await hit('/dsh-boot-naruto/arts/konan/01.jpg?v=NOPE')
ok(ares.headers['Cache-Control'] === 'no-cache', '?v= 对不上 -> no-cache')
const aEtag = ares.headers['ETag']
ares = await hit('/dsh-boot-naruto/arts/konan/01.jpg?v=' + v01, { headers: { 'if-none-match': aEtag } })
ok(ares.statusCode === 304, '/arts If-None-Match 命中 -> 304')

// 10) Range -> 206 / 416(和 /media 同一套)
ares = await hit('/dsh-boot-naruto/arts/konan/01.jpg', { headers: { range: 'bytes=8-15' } })
ok(ares.statusCode === 206 && ares.body().length === 8, '/arts Range 8-15 -> 206 + 8 字节')
ok((ares.headers['content-range'] || ares.headers['Content-Range']) === 'bytes 8-15/' + fs.statSync(path.join(ARTS, 'konan', '01.jpg')).size, '/arts content-range = ' + (ares.headers['content-range'] || ares.headers['Content-Range']))
ares = await hit('/dsh-boot-naruto/arts/konan/01.jpg', { headers: { range: 'bytes=99999-' } })
ok(ares.statusCode === 416, '/arts 越界 Range -> 416')
ares = await hit('/dsh-boot-naruto/arts/konan/01.jpg', { headers: { range: 'bytes=-8' } })
ok(ares.statusCode === 206 && ares.body().length === 8, '/arts 后缀式 Range -> 206 + 8 字节')
ares = await hit('/dsh-boot-naruto/arts/konan/01.jpg', { headers: { range: 'garbage' } })
ok(ares.statusCode === 416, '/arts 非法 Range 语法 -> 416')

// 11) preset.json 本身也能取(浏览器半边要拿它当分镜表)
ares = await hit('/dsh-boot-naruto/arts/konan/preset.json?v=' + konan.version)
ok(ares.statusCode === 200 && ares.headers['Content-Type'].startsWith('application/json'), '/arts 放行 preset.json -> application/json')
ok(JSON.parse(ares.body().toString()).schema === 1, '取回的 preset.json 内容正确')

// 12) 白名单之外一律 404,而且失败必须 no-store
ares = await hit('/dsh-boot-naruto/arts/konan/notes.txt')
ok(ares.statusCode === 404 && ares.headers['Cache-Control'] === 'no-store', '非白名单 .txt -> 404 + no-store')
ares = await hit('/dsh-boot-naruto/arts/konan/evil.exe')
ok(ares.statusCode === 404, '.exe -> 404')
ares = await hit('/dsh-boot-naruto/arts/konan/other.json')
ok(ares.statusCode === 404, 'preset.json 之外的 .json -> 404(只放行那一个名字)')
ares = await hit('/dsh-boot-naruto/arts/nosuch/01.jpg')
ok(ares.statusCode === 404 && ares.headers['Cache-Control'] === 'no-store', '不存在的预设 -> 404 + no-store')
ares = await hit('/dsh-boot-naruto/arts/konan/99.jpg')
ok(ares.statusCode === 404, '预设里不存在的文件 -> 404')

// 13) 目录穿越:必须 400/404,绝不能把 clips 或任意文件送出去
const attacks = [
  '/dsh-boot-naruto/arts/konan/..%2f..%2fclips%2fnaruto-intro.mp4',
  '/dsh-boot-naruto/arts/konan/..%5c..%5cselection.json',
  '/dsh-boot-naruto/arts/konan/..\\evil.jpg',
  '/dsh-boot-naruto/arts/..%2fclips/naruto-intro.mp4',
  '/dsh-boot-naruto/arts/..%2f..%2f..%2fwindows/win.ini',
  '/dsh-boot-naruto/arts/konan/%2fetc%2fpasswd.jpg',
  '/dsh-boot-naruto/arts/konan/C:%5cwindows%5csystem32%5cdrivers%5cetc.jpg',
  '/dsh-boot-naruto/arts/konan/....//....//x.jpg',
  '/dsh-boot-naruto/arts/konan/%2e%2e%2f%2e%2e%2fboot.log',
  '/dsh-boot-naruto/arts/konan/.%2e/.%2e/secret.jpg',
  '/dsh-boot-naruto/arts/konan%2f..%2fkonan/01.jpg',
  '/dsh-boot-naruto/arts/konan/01.jpg.jpg/02.jpg',
  '/dsh-boot-naruto/arts/konan/01.jpg/../../x',
]
let bad = []
for (const u of attacks) {
  const r2 = await hit(u)
  const ok400 = r2.statusCode === 400 || r2.statusCode === 404 || r2.statusCode === 0
  if (!ok400) bad.push(u + ' -> ' + r2.statusCode)
  if (r2.statusCode !== 0 && r2.statusCode >= 200 && r2.statusCode < 300) bad.push(u + ' 送出了内容!')
}
ok(bad.length === 0, attacks.length + ' 条目录穿越/绝对路径形状全被拒(失败: ' + JSON.stringify(bad) + ')')
// 反向证明:大小写不敏感的**合法**请求还是要能通(Windows 文件系统本来就大小写不敏感)
ares = await hit('/dsh-boot-naruto/arts/KONAN/01.jpg')
ok(ares.statusCode === 200, 'arts 的 id 查找大小写不敏感(磁盘上叫 konan,KONAN 也服务)')
ares = await hit('/dsh-boot-naruto/arts/konan/nosuch%2ejpg')
ok(ares.statusCode === 404, '编码过的不存在文件 -> 404')
ares = await hit('/dsh-boot-naruto/arts/konan/%zz.jpg')
ok(ares.statusCode === 400, '坏百分号编码 -> 400 而不是抛错')
ares = await hit('/dsh-boot-naruto/arts/konan')
ok(ares.statusCode === 400 || ares.statusCode === 404, '只到 /arts/<预设> 不带文件名 -> 400/404(实际 ' + ares.statusCode + ')')
ares = await hit('/dsh-boot-naruto/arts')
ok(ares.statusCode === 404, '只到 /arts -> 404')

// 14) schema≠1 / 坏 JSON / 空 acts / 超长:都不许崩,且不许被判定"可播"
fs.mkdirSync(path.join(ARTS, 'bad1'), { recursive: true })
writeJson(path.join(ARTS, 'bad1', 'preset.json'), { schema: 2, id: 'bad1', acts: [{ file: '01.jpg' }] })
fs.writeFileSync(path.join(ARTS, 'bad1', '01.jpg'), fakeJpg(10))
fs.mkdirSync(path.join(ARTS, 'bad2'), { recursive: true })
fs.writeFileSync(path.join(ARTS, 'bad2', 'preset.json'), '{ 坏 JSON 不许抛', 'utf8')
fs.mkdirSync(path.join(ARTS, 'bad3'), { recursive: true })
writeJson(path.join(ARTS, 'bad3', 'preset.json'), { schema: 1, id: 'bad3', acts: [] })
fs.mkdirSync(path.join(ARTS, 'huge'), { recursive: true })
writeJson(path.join(ARTS, 'huge', 'preset.json'), { schema: 1, id: 'huge', acts: Array.from({ length: 50 }, (_, i) => ({ file: 'a' + i + '.jpg' })) })
for (let i = 0; i < 50; i++) fs.writeFileSync(path.join(ARTS, 'huge', 'a' + i + '.jpg'), fakeJpg(8))
fs.mkdirSync(path.join(ARTS, 'Bad_Case'), { recursive: true })
fs.mkdirSync(path.join(ARTS, 'has space'), { recursive: true })
fs.mkdirSync(path.join(ARTS, '..dots'), { recursive: true })

let r3
let threw = null
try { r3 = await hit('/dsh-boot-naruto/presets.json') } catch (e) { threw = e }
ok(!threw && r3.statusCode === 200, '坏素材(非法 schema/坏 JSON/空 acts/50 幕/怪目录名)都不让 presets.json 崩')
pj = JSON.parse(r3.body().toString())
const ids = pj.presets.map((p) => p.id)
const byId = (x) => pj.presets.find((p) => p.id === x) || null
ok(ids.includes('bad1') && byId('bad1').ok === false && /schema/.test(byId('bad1').error), 'schema≠1 进清单但判不可播,并写明原因(error=' + byId('bad1').error + ')')
ok(byId('bad2').ok === false && /JSON/.test(byId('bad2').error), '坏 JSON 不崩,原因写在 error 里(' + byId('bad2').error + ')')
ok(byId('bad3').ok === false, 'acts 为空 -> 判不可播')
ok(byId('bad1').acts === 0 && byId('bad2').acts === 0, '不可播的预设 acts=0,客户端 pickPreset 会把它滤掉')
ok(!ids.includes('has space') && !ids.includes('..dots'), '怪名字目录(空格/点)根本不进清单')
ok(!ids.includes('bad_case') || byId('bad_case').ok === false, '只有空目录/坏素材的 Bad_Case 不会被当成可播')
ok(ids.includes('konan') && ids.includes('huge'), '好预设与 huge 都在清单里(实际 ' + ids.join(',') + ')')
const huge = byId('huge')
ok(huge.acts === 8, '单预设最多 8 幕(清单里 50 幕被截到 ' + huge.acts + ')')
ok(pj.usable === 2 && pj.maxActs === 8, 'usable 只对可播的计数(实际 ' + pj.usable + '),maxActs 契约随清单下发')
ok(pj.selected === 'huge' || pj.selected === 'konan', '无选择时 selected 落在第一个**可播**预设(实际 ' + pj.selected + ')')
ok(pj.presets.filter((p) => p.ok).length === pj.usable && pj.presets.filter((p) => p.ok)[0].ok === true, '可播的排在清单前面(排序不变量)')

// 15) POST 选预设 -> 写进 selection.json 的 preset 字段
res = await hit('/dsh-boot-naruto/presets.json', { method: 'POST', body: JSON.stringify({ preset: 'huge' }) })
let sel = JSON.parse(res.body().toString())
ok(res.statusCode === 200 && sel.ok === true && sel.preset === 'huge', 'POST preset -> 落盘并回显(实际 ' + sel.preset + ')')
ok(JSON.parse(fs.readFileSync(path.join(HOME, 'boot-naruto', 'selection.json'), 'utf8')).preset === 'huge', 'selection.json 里真的有 preset 字段')
res = await hit('/dsh-boot-naruto/presets.json')
pj = JSON.parse(res.body().toString())
ok(pj.selected === 'huge', 'GET 清单时 selected 跟着选择走(实际 ' + pj.selected + ')')
res = await hit('/dsh-boot-naruto/presets.json', { method: 'POST', body: JSON.stringify({ preset: '../../../etc/passwd' }) })
ok(JSON.parse(res.body().toString()).preset === null, '穿越形状的 preset 被拒(实际 ' + JSON.stringify(res.body().toString()) + ')')
res = await hit('/dsh-boot-naruto/presets.json', { method: 'POST', body: JSON.stringify({ preset: 'Bad_Case' }) })
ok(JSON.parse(res.body().toString()).preset === 'bad_case', '大写 preset 被**规范化成小写**再落盘(契约的 id 只许 [a-z0-9_-],实际 ' + JSON.parse(res.body().toString()).preset + ')')
res = await hit('/dsh-boot-naruto/presets.json', { method: 'POST', body: JSON.stringify({ preset: 'has space' }) })
ok(JSON.parse(res.body().toString()).preset === null, '带空格/非法字符的 preset 被拒')
res = await hit('/dsh-boot-naruto/presets.json', { method: 'POST', body: JSON.stringify({ preset: 'konan/01' }) })
ok(JSON.parse(res.body().toString()).preset === null, '带斜杠的 preset 被拒')
res = await hit('/dsh-boot-naruto/presets.json', { method: 'POST', body: '{ 坏 JSON' })
ok(res.statusCode === 200 && JSON.parse(res.body().toString()).ok === true, 'POST 坏 JSON 不崩(选择保持原样)')

// 15b) 「自动」那格走的是 {"preset":null} —— 这条路径以前一次都没被测过
res = await hit('/dsh-boot-naruto/presets.json', { method: 'POST', body: JSON.stringify({ preset: null }) })
let jn = JSON.parse(res.body().toString())
ok(res.statusCode === 200 && jn.ok === true && jn.preset === null, 'POST {"preset":null} -> 200 且回显 null(「自动」格的路径,实际 ' + JSON.stringify(jn.preset) + ')')
ok(JSON.parse(fs.readFileSync(path.join(HOME, 'boot-naruto', 'selection.json'), 'utf8')).preset === null, 'null 选择真的落盘了(不是只在响应里装个样子)')

// 15c) 诊断必须搬进**响应体**:boot.log 是一条可失败的旁路(2026-11-09 它就是静默断了两小时)
res = await hit('/dsh-boot-naruto/presets.json')
pj = JSON.parse(res.body().toString())
ok(pj.log && typeof pj.log.ok === 'boolean', 'presets.json 带 log.ok(布尔)——不再只有日志一条旁路(实际 ' + JSON.stringify(pj.log && pj.log.ok) + ')')
ok(pj.log && typeof pj.log.path === 'string' && /boot\.log$/.test(pj.log.path), 'log.path 指到 boot.log(实际 ' + (pj.log || {}).path + ')')
ok(pj.log && pj.log.ok === true, '自测环境下 log.ok 必须为真(写盘自检真的写进去了;err=' + JSON.stringify((pj.log || {}).err) + ')')
ok(pj.log && pj.log.degraded === false && pj.log.err === null, '主落点正常时 degraded=false 且 err=null(不许把上一次的旧失败一直挂着)')
ok(pj.log && pj.log.via && pj.log.dshHomeSet === true, 'log.via 说出写到了哪儿、log.dshHomeSet 说出 DSH_HOME 有没有被改写(实际 via=' + JSON.stringify((pj.log || {}).via) + ' dshHomeSet=' + JSON.stringify((pj.log || {}).dshHomeSet) + ')')

// 15d) 门禁的**拒绝分支**以前从没被测过(只测过 fail-open 放行),而"面板上那句 http xxx 是谁答的"
//      全靠这条分支的形状(401/403 + 文本)来区分。gate 在调用时才读 ctx.connection,所以现在改就生效。
ctx.connection = { admit: () => ({ rejection: 403 }) }
res = await hit('/dsh-boot-naruto/presets.json', { method: 'POST', body: JSON.stringify({ preset: 'bad_case' }) })
ok(res.statusCode === 403 && res.body().toString() === 'forbidden', 'admit 给 403 -> 面板收到 403 + 文本 forbidden(实际 ' + res.statusCode + ' / ' + JSON.stringify(res.body().toString()) + ')')
ok(JSON.parse(fs.readFileSync(path.join(HOME, 'boot-naruto', 'selection.json'), 'utf8')).preset !== 'bad_case', '被挡住的那次 POST 没有落盘(拒了还写盘 = 门禁是假的)')
{
  const logTxt = fs.readFileSync(path.join(HOME, 'boot-naruto', 'boot.log'), 'utf8')
  ok(/gate 403 挡住 POST \/presets\.json/.test(logTxt), '拒绝分支在 boot.log 里留了痕(gate 403 挡住 …)')
}
ctx.connection = { admit: () => { throw new Error('admit 自己炸了') } }
res = await hit('/dsh-boot-naruto/presets.json', { method: 'POST', body: JSON.stringify({ preset: 'konan' }) })
ok(res.statusCode === 200, 'admit 抛错 -> fail open 放行(闸门坏了不许把功能一起带走)')
ctx.connection = { admit: () => null }
res = await hit('/dsh-boot-naruto/presets.json', { method: 'POST', body: JSON.stringify({ preset: 'konan' }) })
ok(res.statusCode === 200, 'admit 回空(不拒) -> 放行')
ctx.connection = undefined   // mock 用 setter 存值,`delete` 会把整条访问器摘掉(还会顺手破掉 ctx.get),所以置空表示"宿主没给 connection"

// 清回 konan,后面的断言不受影响
await hit('/dsh-boot-naruto/presets.json', { method: 'POST', body: JSON.stringify({ preset: 'konan' }) })

// 16) 现有 4 条路由的语义一条都没动(逐条复验)
res = await hit('/dsh-boot-naruto/clips.json')
j = JSON.parse(res.body().toString())
ok(res.statusCode === 200 && j.clips.length === 1 && j.selected === 'naruto-intro.mp4' && j.fit === 'cover', 'clips.json 语义未变(片库/选择/fit 都在)')
ok(!('presets' in j), 'clips.json 没有被塞进预设字段(各管各的路由)')
res = await hit('/dsh-boot-naruto/media/naruto-intro.mp4')
ok(res.statusCode === 200 && res.headers['Content-Type'] === 'video/mp4', '/media 语义未变')
res = await hit('/dsh-boot-naruto/report', { method: 'POST', body: JSON.stringify({ mode: 'preset', preset: 'konan', acts: 2 }) })
ok(res.statusCode === 200, '/report 仍能收诊断(mode=preset 这种新字段照样扁平化进 boot.log)')
res = await hit('/dsh-boot-naruto/status.json')
ok(res.statusCode === 200 && JSON.parse(res.body().toString()).clips === 1, 'status.json 语义未变')
// 11-19 改判法:原来把数量字面钉死成 6,presets/frames 两条路由是后来合法加上的(实际 7 ⇒ 假 FAIL)。
// 现在按集合判:七条一条不缺、且总数不多(多出来的一定是没登记的,照样 FAIL)。
const WANT_ROUTES = ['/dsh-boot-naruto/clips.json', '/dsh-boot-naruto/media', '/dsh-boot-naruto/presets.json',
  '/dsh-boot-naruto/arts', '/dsh-boot-naruto/frames', '/dsh-boot-naruto/report', '/dsh-boot-naruto/status.json']
ok(WANT_ROUTES.every((w) => routes.some((r) => r.path === w)) && routes.length === WANT_ROUTES.length,
  '七条路由一条不缺一条不多(实际 ' + routes.length + '):' + routes.map((r) => r.kind + ' ' + r.path).join(' | '))
ok(fs.existsSync(path.join(HOME, 'boot-naruto', 'boot.log')), 'boot.log 诊断链还在(没另开机制)')

// 17) trace 的兜底路径:主落点写不进时**不许**再像 2026-11-09 那样一声不响。
//     做法:另开一份模块实例(DSH_HOME 指到一个"被普通文件占住的目录位" ⇒ mkdir 必 ENOTDIR),
//     看它是否退回临时目录并把失败原因留在响应体的 log.err 里。模块只 import node: 内置,复制一份才花得起来。
{
  const badHome = path.join(HOME, 'boot-naruto-as-file')
  fs.writeFileSync(badHome, '这是个文件,不是目录', 'utf8')
  const prevDshHome = process.env.DSH_HOME
  process.env.DSH_HOME = badHome
  const routesB = []
  const ctxB = { webServer: { register: (def) => { routesB.push(def); return () => {} } }, effect: (fn) => { try { fn() } catch (e) { routesB.push('THROW ' + e.message) } } }
  const modB = await import(pathToFileURL(path.join(PKGROOT, 'lib', 'index.js')).href + '?case=fallback')
  modB.apply({ inject: (deps, cb) => cb(ctxB) })
  const rB = routesB.find((r) => r && r.path === '/dsh-boot-naruto/presets.json')
  ok(!!rB, '兜底用例:第二份实例的路由注册上了(实际 ' + routesB.length + ' 条)')
  const resB = mkRes()
  rB.handler(req('/dsh-boot-naruto/presets.json', { method: 'GET' }), resB)
  await new Promise((j) => setTimeout(j, 40))
  await resB.wait()
  const pjB = JSON.parse(resB.body().toString())
  ok(pjB.log && pjB.log.ok === true, '主落点写不进时兜底落点接住了(log.ok=' + JSON.stringify(pjB.log && pjB.log.ok) + ')')
  ok(pjB.log && pjB.log.degraded === true, '写进兜底要**自称降级**:degraded=true(实际 ' + JSON.stringify(pjB.log && pjB.log.degraded) + ')')
  ok(pjB.log && /ENOTDIR|EPERM|EACCES/.test(String(pjB.log.err || '')), '失败原因留在 log.err 里,不再是 catch{} 吞掉的空气(实际 ' + JSON.stringify(pjB.log && pjB.log.err) + ')')
  ok(pjB.log && pjB.log.via && pjB.log.via !== pjB.log.path, 'log.via 说的是兜底那个文件(与 log.path 不同):' + JSON.stringify(pjB.log && pjB.log.via))
  ok(pjB.log && /boot-naruto-trace\.log$/.test(String(pjB.log.fallback)), '兜底文件名不带 dsh- 前缀(免得被一键清理搬进 _dsh-trash):' + JSON.stringify(pjB.log && pjB.log.fallback))
  process.env.DSH_HOME = prevDshHome
  try { fs.rmSync(badHome, { force: true }) } catch {}
  try { fs.rmSync(path.join(os.tmpdir(), 'boot-naruto-trace.log'), { force: true }) } catch {}
}

console.log('\n' + (fail.length ? '自测失败 ' + fail.length + ' 项' : '自测全绿'))
process.exit(fail.length ? 1 : 0)
