// dsh-boot-suite-naruto / tools/install.mjs
//
// 从 dsh-naruto-pack/tools/install.mjs 改写而来,**保留了它踩出来的四道闸**:
//   1) 动配置层之前先按时间戳备份 cordis.patch.yml 与 profile/package.json
//      (2026-11-08 本机出过"重启卡 loading 插件 -> 用户点禁用第三方 -> patch.yml 从 6423B 被重写成 828B,
//       连带丢 28 个模型定义与主题 insert",备份是那次留下的规矩)
//   2) --profile 解析绝不退回 'web' 默认值(旧写法 `--profile desktop` 会**静默装进 web**)
//   3) 追加 insert 条目幂等,且**校验配置层字节数只增不减**,变小立刻提示还原
//   4) dry-run 打印"源大小 -> 现装大小",别让人把旧字节数读成新的
// 原版留在原处不动,别的会话还在用。
//
// 用法: node tools/install.mjs --profile desktop [--dry] [--both]
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PKGROOT = path.resolve(HERE, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(PKGROOT, 'package.json'), 'utf8'))
const NAME = pkg.name

let profile = null
const _pi = process.argv.indexOf('--profile')
if (_pi >= 0 && process.argv[_pi + 1]) profile = process.argv[_pi + 1]
for (const a of process.argv) { const m = /^--profile=(.+)$/.exec(a); if (m) profile = m[1] }
const both = process.argv.includes('--both')
if (!profile && !both) { console.error('必须给 --profile web|desktop,或 --both(绝不默认,防静默装错边)'); process.exit(1) }
const targets = both ? ['web', 'desktop'] : [profile]
for (const p of targets) if (p !== 'web' && p !== 'desktop') { console.error('未知 profile: ' + p); process.exit(1) }
const dry = process.argv.includes('--dry')
const HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const FILES = ['package.json', 'lib/index.js', 'lib/client.js']
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12)

// 源文件先自审一遍:BOM 会让宿主静默跳过 dsh.client(装机失败最常见的一条)
for (const rel of FILES) {
  const p = path.join(PKGROOT, ...rel.split('/'))
  if (!fs.existsSync(p)) { console.error('!! 源缺 ' + rel + ' —— 先跑 node tools/build-client.mjs'); process.exit(1) }
  const buf = fs.readFileSync(p)
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) { console.error('!! ' + rel + ' 带 BOM,宿主会静默不加载'); process.exit(1) }
  if (rel.endsWith('.json')) { try { JSON.parse(buf.toString('utf8')) } catch (e) { console.error('!! ' + rel + ' 不是合法 JSON: ' + e.message); process.exit(1) } }
  console.log('  src ' + rel.padEnd(14) + (buf.length / 1024).toFixed(1).padStart(8) + ' KB  ' + sha(buf))
}

for (const prof of targets) {
  const PDIR = path.join(HOME, 'profiles', prof)
  const DEST = path.join(PDIR, 'node_modules', NAME)
  const PATCH = path.join(PDIR, 'cordis.patch.yml')
  console.log('\n=== profile = ' + prof + ' ===')
  if (!fs.existsSync(PDIR)) { console.error('profile 目录不存在: ' + PDIR); process.exit(1) }
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const say = (s) => console.log((dry ? '[dry] ' : '      ') + s)

  if (fs.existsSync(PATCH)) { say('备份 ' + PATCH + ' (' + fs.statSync(PATCH).size + ' B) -> .bak-suite-' + stamp); if (!dry) fs.copyFileSync(PATCH, PATCH + '.bak-suite-' + stamp) }
  else say('!! 没有 cordis.patch.yml(将新建)')
  const pj = path.join(PDIR, 'package.json')
  if (fs.existsSync(pj)) { say('备份 ' + pj + ' -> .bak-suite-' + stamp); if (!dry) fs.copyFileSync(pj, pj + '.bak-suite-' + stamp) }

  const before = fs.existsSync(PATCH) ? fs.statSync(PATCH).size : 0
  say('复制 ' + PKGROOT + ' -> ' + DEST)
  if (!dry) {
    fs.rmSync(DEST, { recursive: true, force: true })
    for (const rel of FILES) {
      const from = path.join(PKGROOT, ...rel.split('/'))
      const to = path.join(DEST, ...rel.split('/'))
      fs.mkdirSync(path.dirname(to), { recursive: true })
      fs.copyFileSync(from, to)
    }
    for (const rel of FILES) {
      const a = sha(fs.readFileSync(path.join(PKGROOT, ...rel.split('/'))))
      const b = sha(fs.readFileSync(path.join(DEST, ...rel.split('/'))))
      if (a !== b) { console.error('!! 装机副本 ' + rel + ' 与源摘要不一致(' + a + ' vs ' + b + ')'); process.exit(1) }
    }
    console.log('      三件源文件摘要 == 三份装机副本摘要 ✓')
  }
  for (const rel of FILES) {
    const real = path.join(PKGROOT, ...rel.split('/'))
    const p = path.join(DEST, ...rel.split('/'))
    const srcSize = fs.statSync(real).size
    const dstSize = fs.existsSync(p) ? fs.statSync(p).size : 0
    say('  ' + rel.padEnd(14) + (srcSize / 1024).toFixed(1) + ' KB' + (dry ? ' -> 现装 ' + (dstSize / 1024).toFixed(1) + ' KB' : ''))
  }

  const block = "\n- insert:\n    - id: " + NAME + "\n      name: '" + NAME + "'\n"
  let text = fs.existsSync(PATCH) ? fs.readFileSync(PATCH, 'utf8') : ''
  if (text.includes('id: ' + NAME)) say('cordis.patch.yml 已有 ' + NAME + ' 条目,跳过')
  else { if (!dry) fs.writeFileSync(PATCH, text.replace(/\s*$/, '') + block, 'utf8'); say('已追加 insert: ' + NAME) }
  if (!dry) {
    const after = fs.statSync(PATCH).size
    if (after < before) { console.error('!! 配置层变小了(' + before + ' -> ' + after + '),立刻用刚才的 .bak-suite-' + stamp + ' 还原!'); process.exit(1) }
    console.log('      配置层 ' + before + ' B -> ' + after + ' B(只增不减 ✓)')
  }
}

console.log('\n下一步:')
console.log('  1. 新 bundle 要生效,得改 patch 里的 insert —— 按本机经验 watchUserPatches 会热挂载,**先试硬刷新 Ctrl+Shift+R**')
console.log('  2. 刷新后控制台敲 window.__dshBootSuite.diag() —— surface 应该是 [data-conversation-content]')
console.log('  3. diag().warns 里有 boot-api-missing 就是开屏插件没先起来;有 art-target-missing 就是画面退回浮层(要改 data/surfaces.json)')
console.log('  4. 真需要重启的话:**先问用户**,他可能正挂着 SSH 隧道')
