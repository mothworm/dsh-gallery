import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

// 把 dsh-boot-gallery 装进某个 profile,并且**先把配置层备份干净**再动。
// 用法: node tools/install.mjs --profile web [--dry]
//   --dry 只打印将要发生什么,不落盘
// 为什么默认不碰 desktop:本机 2026-11-08 09:1x 出过一次"重启卡在 loading 插件",
//   当时用户点「禁用第三方插件」之后应用把 cordis.patch.yml 从 6423B 重写成 828B,
//   连带丢了 28 个模型定义与主题 insert。所以这里:备份 -> 追加 -> 校验字节数只增不减。
const HERE = path.dirname(fileURLToPath(import.meta.url))
const PKGROOT = path.resolve(HERE, '..', 'dsh-boot-gallery')
const pkg = JSON.parse(fs.readFileSync(path.join(PKGROOT, 'package.json'), 'utf8'))
const NAME = pkg.name
// ⚠️ 解析踩过一次坑,别再改回去:旧写法是
//   (process.argv.find((a) => a.startsWith('--profile')) || '--profile=web').split(/[= ]/)[1] || 'web'
//   用 `--profile desktop`(两个 argv)时 find 返回的是 '--profile' **本身**,split 后 [1] 是 undefined,
//   于是**静默装进 web profile** —— 用户点名 desktop 却拿到 web,还以为装好了(2026-11-08 实测发生)。
let profile = 'web'
const _pi = process.argv.indexOf('--profile')
if (_pi >= 0 && process.argv[_pi + 1]) profile = process.argv[_pi + 1]
for (const a of process.argv) { const m = /^--profile=(.+)$/.exec(a); if (m) profile = m[1] }
if (profile !== 'web' && profile !== 'desktop') { console.error('未知 --profile: ' + profile + '(只支持 web / desktop)'); process.exit(1) }
console.log('目标 profile = ' + profile)
const dry = process.argv.includes('--dry')
const HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const PDIR = path.join(HOME, 'profiles', profile)
const DEST = path.join(PDIR, 'node_modules', NAME)
const PATCH = path.join(PDIR, 'cordis.patch.yml')

const say = (s) => console.log((dry ? '[dry] ' : '      ') + s)
if (!fs.existsSync(PDIR)) { console.error('profile 目录不存在: ' + PDIR); process.exit(1) }
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)

// 1) 备份配置层(只备份,不覆盖已有备份)
if (fs.existsSync(PATCH)) {
  const bak = PATCH + '.bak-naruto-' + stamp
  say('备份 ' + PATCH + ' (' + fs.statSync(PATCH).size + ' B) -> ' + bak)
  if (!dry) fs.copyFileSync(PATCH, bak)
} else say('!! 没有 cordis.patch.yml(将新建)')
const pj = path.join(PDIR, 'package.json')
if (fs.existsSync(pj)) {
  say('备份 ' + pj + ' -> ' + pj + '.bak-naruto-' + stamp)
  if (!dry) fs.copyFileSync(pj, pj + '.bak-naruto-' + stamp)
}

// 2) 复制包
const before = fs.existsSync(PATCH) ? fs.statSync(PATCH).size : 0
say('复制 ' + PKGROOT + ' -> ' + DEST)
if (!dry) {
  fs.rmSync(DEST, { recursive: true, force: true })
  // 只带运行需要的东西:src/ 与 assets/ 是构建输入,不进包(base64 已经在 client.js 里)
  for (const rel of ['package.json', 'cordis.patch.yml', 'README.md', 'lib/index.js', 'lib/client.js']) {
    const from = path.join(PKGROOT, ...rel.split('/'))
    if (!fs.existsSync(from)) { console.error('!! 缺 ' + rel); process.exit(1) }
    const to = path.join(DEST, ...rel.split('/'))
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(from, to)
  }
}
for (const f of ['package.json', 'lib/index.js', 'lib/client.js']) {
  const p = path.join(DEST, f)
  const real = path.join(PKGROOT, f)
  // 报**源**的大小。以前的写法优先取 DEST 的大小,于是 dry-run 打印的是"现在装着的旧字节数",
  // 看的人(包括我)会误读成"要装的就是这个大小" —— 2026-11-09 就是这样差点把 11.7 KB 的旧
  // index.js 当成新版的。dry 模式把两边都打出来,差别一眼看得见。
  const srcSize = fs.statSync(real).size
  const dstSize = fs.existsSync(p) ? fs.statSync(p).size : 0
  say('  ' + f + ' = ' + (srcSize / 1024).toFixed(1) + ' KB' + (dry ? ' -> 现装 ' + (dstSize / 1024).toFixed(1) + ' KB' : ''))
}
if (!dry && (!fs.existsSync(path.join(DEST, 'lib', 'client.js')) || !fs.existsSync(path.join(DEST, 'lib', 'index.js')))) {
  console.error('!! 装机副本缺 lib 文件'); process.exit(1)
}

// 3) 追加 insert 条目(幂等:已存在就不再加)
const block = "\n- insert:\n    - id: " + NAME + "\n      name: '" + NAME + "'\n"
let text = fs.existsSync(PATCH) ? fs.readFileSync(PATCH, 'utf8') : ''
if (text.includes('id: ' + NAME)) say('cordis.patch.yml 已有 ' + NAME + ' 条目,跳过')
else {
  if (!dry) fs.writeFileSync(PATCH, text.replace(/\s*$/, '') + block, 'utf8')
  say('已追加 insert: ' + NAME)
}
if (!dry) {
  const after = fs.statSync(PATCH).size
  if (after < before) { console.error('!! 配置层变小了(' + before + ' -> ' + after + ')，立刻用备份还原!'); process.exit(1) }
  console.log('配置层 ' + before + ' B -> ' + after + ' B (只增不减 ✓)')
}
console.log('\n下一步(必须做一次):')
console.log('  1. 重启 ' + (profile === 'web' ? 'dsh web' : 'DeepSeek Harness.exe') + ' —— bundle 层是启动时装配的')
console.log('  2. 硬刷新 Ctrl+Shift+R(客户端 bundle 是 immutable,普通 F5 不够)')
console.log('  3. 想看第 2 次:Ctrl+Alt+B 强制重播;想放自己的片:把 mp4 丢进 ' + path.join(HOME, 'boot-naruto', 'clips') + ' (需 faststart)')
console.log('  4. 排查:' + (profile === 'web' ? 'http://127.0.0.1:3080' : '本机 web 端口') + '/' + NAME + '/status.json')
