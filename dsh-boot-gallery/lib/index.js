// dsh-boot-gallery · 宿主半边
// 两件事:
//   1) 把 ~/\.dsh\boot-naruto\clips\ 里的 mp4 列出来并正确地把字节送出去。
//      没有这个目录 / 目录为空 → clips.json 返回空数组,浏览器侧回落(绝不报错)。
//   2) 「预设」素材:~/\.dsh\boot-naruto\arts\<preset>\{preset.json, *.jpg}
//      presets.json 出清单,/arts 前缀把 preset.json 与图片按字节送出去。
//      一个预设只用一个素材文件夹的图;清单为空 → 浏览器侧回落内置 9 幕。
//
// 从 NativeDog1/dsh-boot-animation 抄下来的四条硬规矩,改这里之前先读(新加的 /arts 也照这四条办):
//   1) prefix 路由**不带尾斜杠**。宿主的匹配式是 pathname !== prefix && !pathname.startsWith(prefix + '/')
//   2) 失败响应一律 no-store(否则"坏过一次的路由修好了还继续 404"会被启发式缓存钉住)
//   3) 媒体成功响应**禁止** no-store(会让每次重播重下整段 → 加载期一片黑);用 no-cache + ETag
//   4) ?v= 只有在等于"正在被服务的这一段自己的 version"时才给 immutable,version 只有一处定义
import { appendFileSync, closeSync, createReadStream, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { mkdtempSync, lstatSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, extname, join } from 'node:path'

export const name = 'dsh-boot-gallery'

const ROUTE = '/dsh-boot-gallery'
const CLIP_EXT = new Set(['.mp4', '.m4v', '.webm', '.mov', '.m4a', '.mkv'])
const MIME = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4a': 'audio/mp4',
  '.mkv': 'video/x-matroska',
}

// —— 预设(arts)素材:一个预设 = 一个文件夹 = 一套主题分镜 ——
// 白名单只放位图;preset.json 是唯一放行的非位图文件名(浏览器半边要读它当分镜表)。
const ART_MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
const PRESET_FILE = 'preset.json'
const MAX_PRESET_ACTS = 8   // 单预设最多几幕;再多也不列出去,防止有人塞 50 张把浏览器拖死
const PRESET_SCHEMA = 1

function homeDir() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'boot-naruto')
}
function clipsDir() { return join(homeDir(), 'clips') }
function artsDir() { return join(homeDir(), 'arts') }
function framesDir() { return join(homeDir(), 'frames') }
function selectionPath() { return join(homeDir(), 'selection.json') }

// —— 选择文件:只放设置,不放媒体路径;损坏就自愈,读取永不抛 ——
function readSelection() {
  const fallback = { version: 1, selectedClip: null, fit: 'cover', preset: null }
  try {
    const raw = readFileSync(selectionPath(), 'utf8')
    const j = JSON.parse(raw)
    if (!j || typeof j !== 'object' || Array.isArray(j)) return fallback
    const sel = typeof j.selectedClip === 'string' && safeName(j.selectedClip) ? j.selectedClip : null
    // preset 只在**清单里真的有这个目录**时才生效,所以这里只校验名字形状
    const psel = typeof j.preset === 'string' && safeSeg(j.preset.toLowerCase()) ? j.preset.toLowerCase() : null
    return { version: 1, selectedClip: sel, fit: j.fit === 'contain' ? 'contain' : 'cover', preset: psel }
  } catch { return fallback }
}
function writeSelection(patch) {
  const cur = readSelection()
  const next = { ...cur, ...patch }
  const dir = homeDir()
  try { mkdirSync(dir, { recursive: true }) } catch {}
  // mkdtemp + rename:半途崩溃不会留下半截 JSON
  try {
    const tmp = mkdtempSync(join(dir, '.tmp-'))
    const f = join(tmp, 'selection.json')
    writeFileSync(f, JSON.stringify(next, null, 2), 'utf8')
    renameSync(f, selectionPath())
    rmSync(tmp, { recursive: true, force: true })
  } catch (e) {
    try { writeFileSync(selectionPath(), JSON.stringify(next, null, 2), 'utf8') } catch {}
  }
  return next
}

function safeName(name_) {
  return typeof name_ === 'string' && /^[A-Za-z0-9_.\u4e00-\u9fa5-]+$/.test(name_) && !name_.includes('..') && name_.length <= 120
}

// —— 预设(arts)的名字净化,比 safeName **更严**:只许 [a-z0-9_-],不允许任何点号 ——
// safeName 放得过中文和点,那是给"片名"用的;预设 id 与素材文件名要参与 join 拼路径,
// 所以这里一律先净化、再**映射到 readdirSync 返回的磁盘真名**:join() 里出现的
// 永远是磁盘上已经存在的名字,绝不是用户输入。大小写不敏感(Windows 文件系统如此)。
function safeSeg(s) {
  return typeof s === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(s) && !s.includes('..')
}
function safeArtFile(s) {
  if (typeof s !== 'string' || s.length > 120 || s.includes('..') || s.includes('/')) return false
  if (s === PRESET_FILE) return true
  const base = s.slice(0, s.length - extname(s).length)
  return /^[a-z0-9][a-z0-9._-]{0,99}$/.test(base) && !!ART_MIME[extname(s).toLowerCase()]
}
function readdirNames(dir) { try { return readdirSync(dir) } catch { return [] } }
// 请求名 → 磁盘真名(找不到就 null,于是后面的 join 根本不会发生)
function pickReal(names, want) {
  const w = String(want).toLowerCase()
  for (const n of names) if (String(n).toLowerCase() === w) return n
  return null
}

function versionOf(st) {
  return 's' + st.size.toString(16) + 't' + Math.round(st.mtimeMs).toString(16)
}

// —— 尾部索引检测:moov 必须排在 mdat 前面,否则 <video> 要先把字节下完(或 Range 到尾巴)
//    才拿得到元数据,首帧前就是几秒纯黑。窗口取 64KiB 而不是 1KiB:真实片源在 moov 之前
//    常夹着一个 ~20KiB 的 uuid box。教训抄自 lxj5820/dsh-boot-animation 的 readFaststart。
function probeFaststart(file, size, ext) {
  if (ext !== '.mp4' && ext !== '.m4v' && ext !== '.mov') return null
  let fd
  try {
    fd = openSync(file, 'r')
    const buf = Buffer.alloc(Math.min(65536, size))
    const got = readSync(fd, buf, 0, buf.length, 0)
    const head = buf.subarray(0, got)
    const moov = head.indexOf('moov')
    const mdat = head.indexOf('mdat')
    if (moov < 0) return mdat >= 0 ? false : null
    if (mdat >= 0 && mdat < moov) return false
    return true
  } catch { return null } finally { if (fd !== undefined) { try { closeSync(fd) } catch {} } }
}

// 桌面版没有控制台、用户开不了 devtools:只写 console.log 的诊断对用户等于不存在。
// 所以把关键决策落到临时文件。带长度上限(那个库自己踩过:trace 无上限一直涨)。
// ⚠️ 主落点**不要**放 os.tmpdir():本机「一键清理工具」会扫 Temp 里 dsh-* 的历史文件并搬进 _dsh-trash,
//    13:10 写下的 trace 到 17:5x 就不见了 —— 诊断链会被清理动作静默掐断。所以主落点放插件自己的家目录,
//    tmpdir 只当**兜底**,并且兜底文件名不带 dsh- 前缀(避开上面那个扫描规则)。
const TRACE = join(homeDir(), 'boot.log')
// 主路径写不进去时的第二落点。⚠️ 名字**故意不带 dsh- 前缀**:工作区那个「一键清理工具」会扫
// Temp 里的 `dsh-*` 历史文件并搬进 _dsh-trash,诊断链会被清理动作静默掐断(上面那段注释就是为这个)。
const TRACE_FALLBACK = join(tmpdir(), 'boot-naruto-trace.log')
// 2026-11-09 的教训:原来这里是 `catch {}`,写失败完全静默 —— 于是"boot.log 没新行"被我误读成
// "代码没跑",白白损失两小时取证。失败原因必须留在进程内存里,并且**能从 HTTP 响应里读到**。
let lastTraceErr = null    // 最近一次写 trace 的失败原因(null = 从没失败过)
let tracePathUsed = null   // 最近一次成功写入的目标路径
function trace(line) {
  const ts = new Date().toISOString() + '  ' + line + '\n'
  let err = null
  for (const p of [TRACE, TRACE_FALLBACK]) {
    try {
      mkdirSync(dirname(p), { recursive: true })
      if (existsSync(p) && statSync(p).size > 200000) writeFileSync(p, '', 'utf8')
      appendFileSync(p, ts, 'utf8')
      tracePathUsed = p
      lastTraceErr = err   // 主落点坏了、兜底接住 → 这里留的是主落点的失败原因;两处都写进了才是 null
      return true
    } catch (e) {
      const one = String((e && e.code) || (e && e.name) || 'ERR') + ': ' +
        String((e && e.message) || e).slice(0, 140) + ' @' + p
      err = err ? err + ' | ' + one : one
    }
  }
  lastTraceErr = err
  return false
}
// 家目录换成 ~ 再念出去:这条 GET 不带鉴权 cookie 也能读(见下面 sendJson 里 dir 字段的注释),
// 不该把 C:\Users\<用户名>\... 整条念给本机任意进程。
function redactHome(p) {
  const s = String(p)
  const h = homedir()
  return h && s.indexOf(h) === 0 ? '~' + s.slice(h.length) : s
}
// 诊断搬进**响应体**:日志是可失败的旁路,HTTP 响应体失败不了。
// 做法就是"把要记的这行当真写一次,然后把写的结果随响应吐回去"——自检与实际写入是同一次动作,
// 不会出现"自检说能写、实际那行没落进去"的两张皮。
function traceStatus(line) {
  const okWrite = trace(line)
  return {
    ok: okWrite,
    // **成功时也要带**:主落点坏了、兜底接住的那一刻,要看的正是"主落点为什么坏"。
    // 只在失败时才报 err 会把这件事重新藏起来(2026-11-10 自测就是这么打出来的)。
    err: lastTraceErr,
    degraded: okWrite && lastTraceErr !== null,
    path: redactHome(TRACE),
    fallback: redactHome(TRACE_FALLBACK),
    via: tracePathUsed ? redactHome(tracePathUsed) : null,
    dshHomeSet: !!process.env.DSH_HOME,
  }
}

function listClips() {
  const dir = clipsDir()
  let names = []
  try { names = readdirSync(dir) } catch { return [] }
  const out = []
  for (const n of names) {
    const ext = extname(n).toLowerCase()
    if (!CLIP_EXT.has(ext)) continue
    let st
    try { st = statSync(join(dir, n)) } catch { continue }
    if (!st.isFile() || st.size <= 0) continue
    const v = versionOf(st)
    out.push({
      name: n,
      bytes: st.size,
      mtime: Math.round(st.mtimeMs),
      contentType: MIME[ext] || 'application/octet-stream',
      version: v,
      faststart: probeFaststart(join(dir, n), st.size, ext),
      url: ROUTE + '/media/' + encodeURIComponent(n) + '?v=' + v,
    })
  }
  out.sort((a, b) => b.mtime - a.mtime)
  return out
}

// —— 预设清单:一个预设 = ARTS\<preset>\ 一个文件夹,里面 preset.json + 这个主题自己的图 ——
// 宿主只做"能不能播"的粗筛(schema/acts/文件在不在),逐字段的类型校验与默认值在浏览器半边做,
// 因为那边才是把数据喂给 CSS 变量的人(素材由另一个并行代理生成,不能假定它干净)。
function presetEntry(id, dirReal) {
  const dir = join(artsDir(), dirReal)
  const names = readdirNames(dir)
  const e = {
    id, title: id, open: 'none', acts: 0, bytes: 0, mtime: 0,
    ok: false, error: '', version: '', url: '', files: [],
  }
  const manReal = pickReal(names, PRESET_FILE)
  if (!manReal) { e.error = '缺 preset.json'; return e }
  const manFull = join(dir, manReal)
  let ms
  try { ms = statSync(manFull) } catch { e.error = 'preset.json 不可读'; return e }
  if (!ms.isFile() || ms.size <= 0) { e.error = 'preset.json 不是普通文件'; return e }
  e.version = versionOf(ms)
  e.url = ROUTE + '/arts/' + id + '/' + PRESET_FILE + '?v=' + e.version
  e.mtime = Math.round(ms.mtimeMs)
  e.bytes = ms.size
  let doc = null
  try { doc = JSON.parse(readFileSync(manFull, 'utf8').replace(/^\uFEFF/, '')) } catch { e.error = 'preset.json 不是合法 JSON'; return e }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) { e.error = 'preset.json 不是对象'; return e }
  // schema 是契约的第一道闸:不等于 1 就当坏数据(浏览器半边还会再查一次)
  if (doc.schema !== PRESET_SCHEMA) { e.error = 'schema 不匹配(实际 ' + String(doc.schema) + ',契约要 ' + PRESET_SCHEMA + ')'; return e }
  if (typeof doc.title === 'string' && doc.title.trim()) e.title = doc.title.trim().slice(0, 80)
  // open 的默认值必须和浏览器侧同一条规则:只有写 "none" 才没有开场云
  e.open = doc.open === 'none' ? 'none' : 'akatsuki-cloud'
  if (!Array.isArray(doc.acts)) { e.error = 'acts 不是数组'; return e }

  // 登记目录里所有白名单位图,供客户端按 act.file 查 ?v=(只有 v 对上才发 immutable)
  for (const n of names) {
    const lower = String(n).toLowerCase()
    if (lower === PRESET_FILE || !safeArtFile(lower)) continue
    let st2
    try { st2 = statSync(join(dir, n)) } catch { continue }
    if (!st2.isFile() || st2.size <= 0) continue
    e.files.push({ name: lower, bytes: st2.size, version: versionOf(st2), url: ROUTE + '/arts/' + id + '/' + lower + '?v=' + versionOf(st2) })
    e.bytes += st2.size
    e.mtime = Math.max(e.mtime, Math.round(st2.mtimeMs))
  }
  let n2 = 0
  for (const a of doc.acts) {
    if (n2 >= MAX_PRESET_ACTS) break
    if (!a || typeof a !== 'object') continue
    const f = typeof a.file === 'string' ? a.file.toLowerCase() : ''
    if (!f || f === PRESET_FILE || !safeArtFile(f)) continue
    if (!e.files.some((x) => x.name === f)) continue
    n2++
  }
  if (!n2) { e.error = '没有可用幕(acts 为空,或图片不在白名单/不在目录里)'; return e }
  e.acts = n2
  e.ok = true
  return e
}

function listPresets() {
  const dir = artsDir()
  const out = []
  for (const n of readdirNames(dir)) {
    const lower = String(n).toLowerCase()
    // 目录名不合规(含分隔符/点/非 [a-z0-9_-])一律跳过,绝不参与拼路径
    if (!safeSeg(lower)) continue
    let st
    try { st = statSync(join(dir, n)) } catch { continue }
    if (!st.isDirectory()) continue
    out.push(presetEntry(lower, n))
  }
  // 能播的排前面,同类按 mtime 新→旧(客户端"无选择就用清单第一个")
  out.sort((a, b) => (a.ok === b.ok ? b.mtime - a.mtime : a.ok ? -1 : 1))
  return out
}

function send(res, code, headers, body) {
  const h = { 'Cache-Control': 'no-store', ...headers }
  res.writeHead(code, h)
  if (body !== undefined) res.end(body)
  else res.end()
}
function sendJson(res, code, obj) { send(res, code, { 'Content-Type': 'application/json; charset=utf-8' }, JSON.stringify(obj)) }

function serveMedia(req, res, pathname) {
  const raw = decodeURIComponent(pathname.slice(ROUTE.length + '/media/'.length))
  if (!safeName(raw)) return send(res, 400, {}, 'bad clip name')
  const full = join(clipsDir(), raw)
  let st
  try { st = statSync(full) } catch { return send(res, 404, {}, 'no such clip') }
  if (!st.isFile()) return send(res, 404, {}, 'not a file')

  const v = versionOf(st)
  const etag = '"raw-' + v + '"'
  const q = (req.url || '').split('?')[1] || ''
  const imm = new URLSearchParams(q).get('v') === v
  const cc = imm ? 'public, max-age=31536000, immutable' : 'no-cache'
  const inm = req.headers['if-none-match']
  if (inm && inm.split(',').map((s) => s.trim()).some((s) => s === etag || s === 'W/' + etag || s === '*')) {
    return send(res, 304, { ETag: etag, 'Cache-Control': cc })
  }

  const range = req.headers.range
  const type = MIME[extname(raw).toLowerCase()] || 'application/octet-stream'
  if (!range) {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': String(st.size), 'Accept-Ranges': 'bytes', ETag: etag, 'Cache-Control': cc })
    return createReadStream(full).pipe(res)
  }
  const m = /^bytes=(\d*)-(\d*)$/.exec(range)
  if (!m) {
    return send(res, 416, { 'Content-Range': 'bytes */' + st.size, 'Accept-Ranges': 'bytes' }, '')
  }
  let start = m[1] === '' ? null : Number(m[1])
  let end = m[2] === '' ? null : Number(m[2])
  if (start === null) { start = Math.max(0, st.size - (end || 0)); end = st.size - 1 }
  else if (end === null) end = st.size - 1
  if (start >= st.size || end >= st.size || start > end) {
    return send(res, 416, { 'Content-Range': 'bytes */' + st.size, 'Accept-Ranges': 'bytes' }, '')
  }
  res.writeHead(206, {
    'Content-Type': type,
    'Content-Range': 'bytes ' + start + '-' + end + '/' + st.size,
    'Content-Length': String(end - start + 1),
    'Accept-Ranges': 'bytes',
    ETag: etag,
    'Cache-Control': cc,
  })
  createReadStream(full, { start, end }).pipe(res)
}

// —— 预设素材:与 serveMedia **同一套不变量**(逐条照抄,一条都不许松)——
//   Range→206/416;成功 no-cache + ETag;?v= 等于"这个文件自己的 version"才 immutable;
//   失败一律 no-store(send 的默认头);类型按扩展名白名单,白名单外 404。
// 路径永远是 readdir 出来的真名拼的,请求里的名字只做"查表键"。
// —— 11-14:内置片头分镜帧的落点。为什么另开一条路由而不塞进 arts\: 契约是「一个目录 = 一个预设」,
//    塞进去就会被清单扫成一条 ok:false 的条目,悬浮球面板**故意**把它画成「坏:缺 preset.json」那一格
//    (诊断是真的生效了,不是面板坏了)。Range 这里不给:<img> 不发 Range,帧又小,少一条出错面。
function serveFrames(req, res, pathname) {
  let raw
  try { raw = decodeURIComponent(pathname.slice(ROUTE.length + '/frames/'.length)) } catch { return send(res, 400, {}, 'bad encoding') }
  if (raw.includes('/') || raw.includes('..')) return send(res, 400, {}, 'bad frame path')
  if (!safeArtFile(raw)) return send(res, 404, {}, 'file type not allowed')
  const fileReal = pickReal(readdirNames(framesDir()), raw)
  if (!fileReal) return send(res, 404, {}, 'no such frame')
  const full = join(framesDir(), fileReal)
  let st
  try { st = lstatSync(full) } catch { return send(res, 404, {}, 'no such frame') }
  if (!st.isFile()) return send(res, 404, {}, 'not a frame')
  const v = versionOf(st)
  const etag = '"raw-' + v + '"'
  const q = (req.url || '').split('?')[1] || ''
  const imm = new URLSearchParams(q).get('v') === v
  const cc = imm ? 'public, max-age=31536000, immutable' : 'no-cache'
  const inm = req.headers['if-none-match']
  if (inm && inm.split(',').map((s) => s.trim()).some((s) => s === etag || s === 'W/' + etag || s === '*')) {
    return send(res, 304, { ETag: etag, 'Cache-Control': cc })
  }
  const type = ART_MIME[extname(fileReal).toLowerCase()]
  if (!type) return send(res, 404, {}, 'file type not allowed')
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': String(st.size), 'Accept-Ranges': 'bytes', ETag: etag, 'Cache-Control': cc })
  return createReadStream(full).pipe(res)
}
function serveArt(req, res, pathname) {
  let raw
  try { raw = decodeURIComponent(pathname.slice(ROUTE.length + '/arts/'.length)) } catch { return send(res, 400, {}, 'bad encoding') }
  const segs = raw.split('/')
  if (segs.length !== 2) return send(res, 400, {}, 'bad art path')
  const wantDir = segs[0]
  const wantFile = segs[1]
  if (!safeSeg(wantDir.toLowerCase())) return send(res, 400, {}, 'bad preset name')
  // 白名单之外的扩展名(含 .mp4/.js/.html/一切隐藏文件)在这里就是 404,不给"存在性"之外的信息
  if (!safeArtFile(wantFile)) return send(res, 404, {}, 'file type not allowed')
  const dirReal = pickReal(readdirNames(artsDir()), wantDir)
  if (!dirReal) return send(res, 404, {}, 'no such preset')
  const fileReal = pickReal(readdirNames(join(artsDir(), dirReal)), wantFile)
  if (!fileReal) return send(res, 404, {}, 'no such file')
  const full = join(artsDir(), dirReal, fileReal)
  let st
  try { st = lstatSync(full) } catch { return send(res, 404, {}, 'no such file') }
  if (!st.isFile()) return send(res, 404, {}, 'not a file')

  const v = versionOf(st)
  const etag = '"raw-' + v + '"'
  const q = (req.url || '').split('?')[1] || ''
  const imm = new URLSearchParams(q).get('v') === v
  const cc = imm ? 'public, max-age=31536000, immutable' : 'no-cache'
  const inm = req.headers['if-none-match']
  if (inm && inm.split(',').map((s) => s.trim()).some((s) => s === etag || s === 'W/' + etag || s === '*')) {
    return send(res, 304, { ETag: etag, 'Cache-Control': cc })
  }

  const ext = extname(fileReal).toLowerCase()
  const type = ART_MIME[ext] || (String(fileReal).toLowerCase() === PRESET_FILE ? 'application/json; charset=utf-8' : null)
  if (!type) return send(res, 404, {}, 'file type not allowed')
  const range = req.headers.range
  if (!range) {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': String(st.size), 'Accept-Ranges': 'bytes', ETag: etag, 'Cache-Control': cc })
    return createReadStream(full).pipe(res)
  }
  const m = /^bytes=(\d*)-(\d*)$/.exec(range)
  if (!m) {
    return send(res, 416, { 'Content-Range': 'bytes */' + st.size, 'Accept-Ranges': 'bytes' }, '')
  }
  let start = m[1] === '' ? null : Number(m[1])
  let end = m[2] === '' ? null : Number(m[2])
  if (start === null) { start = Math.max(0, st.size - (end || 0)); end = st.size - 1 }
  else if (end === null) end = st.size - 1
  if (start >= st.size || end >= st.size || start > end) {
    return send(res, 416, { 'Content-Range': 'bytes */' + st.size, 'Accept-Ranges': 'bytes' }, '')
  }
  res.writeHead(206, {
    'Content-Type': type,
    'Content-Range': 'bytes ' + start + '-' + end + '/' + st.size,
    'Content-Length': String(end - start + 1),
    'Accept-Ranges': 'bytes',
    ETag: etag,
    'Cache-Control': cc,
  })
  createReadStream(full, { start, end }).pipe(res)
}

export function apply(root) {
  // 动态注入:宿主给不出 webServer 时,本插件静默闲置,而不是把 GUI 拖死
  root.inject(['webServer'], (ctx) => {

  	// —— 写类路由的鉴权闸门(2026-11-09) ——
  	// 只挡**会改盘上状态**的 POST。GET 与素材一条都不挡:挡错 GET 的症状是预设
  	// 静默回落内置 9 幕,那比门开着难受得多(用户原话:别导致出错)。
  	// 失败姿态是 fail open:宿主没把 connection 给出来时**放行并留一条响 trace**,
  	// 因为「闸门没生效」是能发现的,「整个插件静默闲置」却要等人重启才知道。
  	let gateSaid = false
  	   	// ⚠ 拿 connection 一律走 ctx.get('connection'),**不许写 ctx.connection**(2026-11-11 定案):
   	// 本插件只 inject(['webServer']),而 cordis 的 ctx 代理读到未声明的服务名会**直接抛**
   	// `cannot get property "connection" without inject`;宿主 dsh-host-webserver/lib/index.js 的
   	// createServer 把「handler 抛出且响应头还没发」统一答成 **400 + 空体**。两道一叠,2026-11-09
   	// 加上这道门之后**每一条写路由都 400(空体)**,POST 一次也没通过,界面上只剩「没写进去:http 400」。
   	// ctx.get 拿不到就回 undefined,正好落到下面的 fail open;不 inject 是因为服务名缺了会把
   	// 整个插件拖成静默 idle(2026-10-01 那次六个工具全没的同一条坑)。
   	function connOrNull() {
   		try { return ctx.get('connection') || null } catch (e) { return null }
   	}
   	function gate(req, res, label) {
  		const conn = connOrNull()
  		if (!conn || typeof conn.admit !== 'function') {
  			if (!gateSaid) { gateSaid = true; trace('gate INERT — 宿主未提供 connection,POST 暂放行(' + label + ')') }
  			return true
  		}
  		let adm = null
  		try { adm = conn.admit(req) } catch (e) { trace('gate admit 抛错(放行): ' + String((e && e.message) || e).slice(0, 80)); return true }
  		if (adm && 'rejection' in adm) {
  			// 拒了要说得出拒在哪:这条 trace 是面板「没写进去:http 401」唯一的外部证据
  			trace('gate ' + adm.rejection + ' 挡住 ' + label + ' host=' + String((req.headers && req.headers.host) || '?'))
  			try {
  				res.writeHead(adm.rejection, { 'Content-Type': 'text/plain; charset=utf-8' })
  				res.end(adm.rejection === 401 ? 'unauthorized' : 'forbidden')
  			} catch (e) {}
  			return false
  		}
  		return true
  	}

    try { mkdirSync(clipsDir(), { recursive: true }) } catch {}
    // 预设素材目录:和 clips 一样开机建好,用户/别的代理往里丢 <preset>\preset.json + 图就能用
    try { mkdirSync(artsDir(), { recursive: true }) } catch {}

    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: ROUTE + '/clips.json',
      handler: (req, res) => {
        if (req.method === 'POST') {
        	if (!gate(req, res, 'POST /clips.json')) return
          let body = ''
          let tooBig = false
          // 上限**不能**用 req.destroy():destroy 之后 'end' 永不触发,413 分支就是死代码,
          // 客户端最后只看到一个网络错误。这条教训抄自 lxj5820/dsh-boot-animation 的注释。
          req.on('data', (c) => {
            if (tooBig) return
            body += c
            if (body.length > 8192) {
              tooBig = true
              trace('413 body too large (' + body.length + ' B)')
              send(res, 413, { 'Content-Type': 'text/plain; charset=utf-8' }, 'body too large')
            }
          })
          req.on('end', () => {
            if (tooBig) return
            let patch = {}
            try {
              const j = JSON.parse(body || '{}')
              if ('selectedClip' in j) patch.selectedClip = j.selectedClip === null ? null : (safeName(j.selectedClip) ? j.selectedClip : null)
              if (j.fit === 'contain' || j.fit === 'cover') patch.fit = j.fit
            } catch {}
            const next = writeSelection(patch)
            sendJson(res, 200, { ok: true, ...next })
          })
          return
        }
        const sel = readSelection()
        const clips = listClips()
        const chosen = sel.selectedClip && clips.find((c) => c.name === sel.selectedClip)
          ? sel.selectedClip
          : (clips[0] ? clips[0].name : null)
        sendJson(res, 200, {
          plugin: name,
          dir: 'clips',
          exists: existsSync(clipsDir()),
          selected: chosen,
          fit: sel.fit,
          clips,
        })
      },
    }), 'dsh-boot-gallery: clips.json')

    ctx.effect(() => ctx.webServer.register({
      kind: 'prefix',
      path: ROUTE + '/media',
      handler: (req, res) => {
        try {
          const pathname = (req.url || '').split('?')[0]
          if (!pathname.startsWith(ROUTE + '/media/')) return send(res, 404, {}, 'not found')
          return serveMedia(req, res, pathname)
        } catch (e) {
          return send(res, 500, {}, 'media error')
        }
      },
    }), 'dsh-boot-gallery: clip media')

    // —— 预设清单:GET 出清单,POST 写 selection.json 的 preset 字段(下次启动生效)——
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: ROUTE + '/presets.json',
      handler: (req, res) => {
        if (req.method === 'POST') {
        	if (!gate(req, res, 'POST /presets.json')) return
          let body = ''
          let tooBig = false
          // 同 clips.json:上限不能用 req.destroy(),否则 'end' 永不触发、413 分支是死代码
          req.on('data', (c) => {
            if (tooBig) return
            body += c
            if (body.length > 8192) {
              tooBig = true
              trace('413 presets body too large (' + body.length + ' B)')
              send(res, 413, { 'Content-Type': 'text/plain; charset=utf-8' }, 'body too large')
            }
          })
          req.on('end', () => {
            if (tooBig) return
            let patch = {}
            try {
              const j = JSON.parse(body || '{}')
              if ('preset' in j) {
                const p = j.preset === null ? null : (typeof j.preset === 'string' && safeSeg(j.preset.toLowerCase()) ? j.preset.toLowerCase() : null)
                patch.preset = p
              }
            } catch {}
            const next = writeSelection(patch)
            trace('select preset = ' + String(next.preset))
            sendJson(res, 200, { ok: true, ...next })
          })
          return
        }
        let presets = []
        try { presets = listPresets() } catch (e) { trace('listPresets 抛错(已吞): ' + (e && e.message)); presets = [] }
        const sel = readSelection()
        const hit = sel.preset && presets.find((p) => p.id === sel.preset && p.ok)
        const chosen = hit ? hit.id : (presets.find((p) => p.ok) ? presets.find((p) => p.ok).id : null)
        // —— cookie 取证(只读、不拦、不改任何行为)——
        // "给那两条 POST 加 admit 到底安不安全"只能靠实测回答,而唯一的实测入口就是这里:
        // 这条 GET 每次开机必被浏览器调一次,等于每次启动自动采一个样本,零额外出入流量。
        // 只记 cookie 的**键名**(鉴权那个键的名字本身就是 base64url(sha256(authority)),不是秘密),
        // 值一个都不落盘 —— 这是取证,不是日志功能。
        let logStatus = null
        try {
          const rc = String(req.headers && req.headers.cookie || '')
          const keys = rc.split(';').map((x) => x.split('=')[0].trim()).filter(Boolean).slice(0, 12)
          // 这一行既是取证、也是**写盘自检**:traceStatus 把"这次到底写没写进去"随响应带出去。
          logStatus = traceStatus('cookie-probe has=' + (keys.length ? 'y' : 'n') +
            ' n=' + keys.length +
            ' keys=[' + keys.join(',') + ']' +
            ' host=' + String((req.headers && req.headers.host) || '?') +
            ' origin=' + String((req.headers && req.headers.origin) || '-') +
            ' conn=' + (function () { const c = connOrNull(); return c && typeof c.admit === 'function' ? 'yes' : 'NO' })() +
            ' manual=' + (sel.preset ? 'y' : 'n'))
        } catch (e) {
          logStatus = { ok: false, err: 'probe 抛错: ' + String((e && e.message) || e).slice(0, 120), path: redactHome(TRACE), fallback: redactHome(TRACE_FALLBACK), via: null, dshHomeSet: !!process.env.DSH_HOME }
        }
        sendJson(res, 200, {
          plugin: name,
          // 只报目录名,不报绝对路径:这条路由不带鉴权cookie也能读(实测 200),
          // 把 C:\Users\<用户名>\... 念给本机任意进程没有任何必要
          dir: 'arts',
          exists: existsSync(artsDir()),
          // —— 诊断通道自检(2026-11-10 加):boot.log 停写那天,所有"重启成功/门禁拦没拦"的判断
          // 全建立在一条已经断掉的旁路上。响应体失败不了,所以把证据搬进来。
          log: logStatus,
          // manual: 用户显式点过没有。前端要靠它决定「自动」那格画不画金框 ——
          // selected 是**生效中**的那套(没显式选择时它填 mtime 最新的默认),两者不是一回事。
          manual: !!sel.preset,
          selected: chosen,
          count: presets.length,
          usable: presets.filter((p) => p.ok).length,
          maxActs: MAX_PRESET_ACTS,
          presets,
        })
      },
    }), 'dsh-boot-gallery: preset manifest')

    // —— 预设素材:preset.json + 图片,不变量与 /media 一致 ——
    ctx.effect(() => ctx.webServer.register({
      kind: 'prefix',
      path: ROUTE + '/arts',
      handler: (req, res) => {
        try {
          const pathname = (req.url || '').split('?')[0]
          if (!pathname.startsWith(ROUTE + '/arts/')) return send(res, 404, {}, 'not found')
          return serveArt(req, res, pathname)
        } catch (e) {
          trace('arts route error: ' + (e && e.message))
          return send(res, 500, {}, 'arts error')
        }
      },
    }), 'dsh-boot-gallery: preset arts')

    // —— 11-14:内置片头分镜帧(不属于任何预设,从 arts\ 拆出来)
    ctx.effect(() => ctx.webServer.register({
      kind: 'prefix',
      path: ROUTE + '/frames',
      handler: (req, res) => {
        try {
          const pathname = (req.url || '').split('?')[0]
          if (!pathname.startsWith(ROUTE + '/frames/')) return send(res, 404, {}, 'not found')
          return serveFrames(req, res, pathname)
        } catch (e) {
          trace('frames route error: ' + (e && e.message))
          return send(res, 500, {}, 'frames error')
        }
      },
    }), 'dsh-boot-gallery: boot frames')

    // 浏览器半边把"这次到底播了什么"POST 回来,落进临时 trace。
    // 桌面版没控制台,这是唯一能给用户看的证据(上一回卡 loading 就是缺这份证据)。
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: ROUTE + '/report',
      handler: (req, res) => {
        if (req.method !== 'POST') return send(res, 405, {}, 'POST only')
        if (!gate(req, res, 'POST /report')) return
        let body = ''
        let tooBig = false
        req.on('data', (c) => { if (tooBig) return; body += c; if (body.length > 4096) { tooBig = true; send(res, 413, {}, 'too big') } })
        req.on('end', () => {
          if (tooBig) return
          let j = null
          try { j = JSON.parse(body || '{}') } catch {}
          const flat = j && typeof j === 'object' ? Object.entries(j).filter(([k, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean').map(([k, v]) => k + '=' + v).join(' ') : ''
          trace('client ' + flat.slice(0, 300))
          send(res, 200, { 'Content-Type': 'application/json' }, '{"ok":true}')
        })
      },
    }), 'dsh-boot-gallery: client report')

    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: ROUTE + '/status.json',
      handler: (req, res) => {
        const dir = clipsDir()
        let n = 0
        try { n = readdirSync(dir).filter((f) => CLIP_EXT.has(extname(f).toLowerCase())).length } catch {}
        sendJson(res, 200, { plugin: name, clipsDir: dir, clips: n, selection: readSelection() })
      },
    }), 'dsh-boot-gallery: status')
  })
}
