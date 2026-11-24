#!/usr/bin/env node
// dsh-boot-gallery / tools/install.mjs
//
// 把开屏插件（宿主侧）装进某个 DSH profile。
//
// 为什么要有这个脚本：
//   2026-11-22 在干净 clone 里实测发现，**宿主侧此前根本没有安装脚本** ——
//   我本机那份是手工 `Copy-Item` 进去的。别人拿到仓库只能看见
//   `dsh-boot-suites/gallery/tools/install.mjs`（页面侧那份），
//   于是"装完发现只装了一半，开机动画还是旧的/没有"。
//
//   宿主侧必须单独装，因为它跑在 host 进程里（管 `/dsh-boot-gallery/*` 路由与素材目录读盘），
//   页面侧那份是 client bundle。两者是**两个包**，见仓库根 README。
//
// 它做什么：
//   1. 校验源（BOM 会让宿主静默跳过 `dsh.client`，这是装机失败最常见的一条）
//   2. 备份 profile 的 cordis.patch.yml
//   3. 把 package.json / lib/ 复制进 <profile>/node_modules/dsh-boot-gallery/
//   4. 确保 patch 里有 `- id: dsh-boot-gallery` 的 insert 条目（没有就追加）
//   5. 逐文件核摘要（拷一半的包会让宿主静默不加载）
//
// 用法：
//   node tools/install.mjs --profile desktop
//   node tools/install.mjs --profile desktop --dry
//   node tools/install.mjs --both

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PKGROOT = path.resolve(HERE, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(PKGROOT, 'package.json'), 'utf8'))
const NAME = pkg.name

// —— Node 版本闸门 ——
// 为什么要有：README 写的是「Node ≥ 20」，但那只是一句话；
// `package.json` 的 engines 字段只有 npm 会看，而用户跑的是
// `node tools/install.mjs` —— 完全绕过 npm。于是用 Node 18 的人不会收到
// 任何警告，而是撞上一个莫名其妙的语法/API 报错，然后来问「你这不是能装吗」。
// 这里在**动手改 profile 之前**先拦一次，把话说清楚。
const MIN_NODE = 20
const nodeMajor = Number((process.versions.node || '0').split('.')[0])
if (!Number.isFinite(nodeMajor) || nodeMajor < MIN_NODE) {
  console.error('')
  console.error('!! 这个安装脚本需要 Node.js >= ' + MIN_NODE + '，当前是 ' + process.version)
  console.error('   先升级 Node，再重跑这条命令：')
  console.error('     macOS   brew install node')
  console.error('     Windows winget install OpenJS.NodeJS.LTS   或用官方 installer')
  console.error('   检查   node -v   (应显示 v20 或更高)')
  console.error('')
  process.exit(1)
}

let profile = null
const _pi = process.argv.indexOf('--profile')
if (_pi >= 0 && process.argv[_pi + 1]) profile = process.argv[_pi + 1]
for (const a of process.argv) { const m = /^--profile=(.+)$/.exec(a); if (m) profile = m[1] }
const both = process.argv.includes('--both')
const dry = process.argv.includes('--dry')
if (!profile && !both) { console.error('必须给 --profile web|desktop，或 --both（不默认，防静默装错边）'); process.exit(1) }

const targets = both ? ['web', 'desktop'] : [profile]
for (const p of targets) if (p !== 'web' && p !== 'desktop') { console.error('未知 profile: ' + p); process.exit(1) }

const HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const FILES = ['package.json', 'lib/index.js', 'lib/client.js', 'cordis.patch.yml', 'README.md']
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12)

console.log('=== dsh-boot-gallery 安装（宿主侧 / 开屏插件）===\n')

// —— 1. 源自审
for (const rel of FILES) {
  const p = path.join(PKGROOT, ...rel.split('/'))
  if (!fs.existsSync(p)) { console.error('!! 源缺 ' + rel); process.exit(1) }
  const buf = fs.readFileSync(p)
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    console.error('!! ' + rel + ' 带 BOM，宿主会静默不加载这个插件'); process.exit(1)
  }
  if (rel.endsWith('.json')) {
    try { JSON.parse(buf.toString('utf8')) } catch (e) { console.error('!! ' + rel + ' 不是合法 JSON: ' + e.message); process.exit(1) }
  }
  console.log('  src ' + rel.padEnd(22) + (buf.length / 1024).toFixed(1).padStart(8) + ' KB  ' + sha(buf))
}

for (const prof of targets) {
  const PDIR = path.join(HOME, 'profiles', prof)
  const DEST = path.join(PDIR, 'node_modules', NAME)
  const PATCH = path.join(PDIR, 'cordis.patch.yml')
  console.log('\n=== profile = ' + prof + ' ===')
  console.log((dry ? '[dry] ' : '      ') + '目标 ' + DEST)

  if (!fs.existsSync(PDIR)) {
    console.error('!! profile 目录不存在: ' + PDIR)
    console.error('   先启动一次 DSH 桌面版，它会创建 profile')
    process.exit(1)
  }

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  if (fs.existsSync(PATCH)) {
    console.log((dry ? '[dry] ' : '      ') + '备份 cordis.patch.yml (' + fs.statSync(PATCH).size + ' B)')
    if (!dry) fs.copyFileSync(PATCH, PATCH + '.bak-boot-' + stamp)
  } else {
    console.log((dry ? '[dry] ' : '      ') + 'cordis.patch.yml 不存在（将新建）')
  }

  if (!dry) {
    fs.rmSync(DEST, { recursive: true, force: true })
    for (const rel of FILES) {
      const to = path.join(DEST, ...rel.split('/'))
      fs.mkdirSync(path.dirname(to), { recursive: true })
      fs.copyFileSync(path.join(PKGROOT, ...rel.split('/')), to)
    }
    // 核摘要：拷一半的包会被宿主静默跳过，不报错
    for (const rel of FILES) {
      const a = sha(fs.readFileSync(path.join(PKGROOT, ...rel.split('/'))))
      const b = sha(fs.readFileSync(path.join(DEST, ...rel.split('/'))))
      if (a !== b) { console.error('!! 装机副本 ' + rel + ' 摘要不一致（' + a + ' vs ' + b + '）'); process.exit(1) }
    }
    console.log('      复制 ' + FILES.length + ' 个文件并核摘要 ✓')

    // —— patch 里确保有这个插件
    // 用字符串判重而不是解析 YAML：profile 的 patch 里混着大量别的插件，
    // 解析失败会把整个文件写坏（历史事故）。只在"完全没有这一行"时追加。
    const cur = fs.existsSync(PATCH) ? fs.readFileSync(PATCH, 'utf8') : ''
    // ⚠ 正则要容忍**缩进**：insert 块里 id 前面有 4 个空格（`    - id: xxx`）。
    //   第一版写的是 `^-\s+id:`，要求 `-` 在行首，于是永远匹配不到 ⇒ 每次装都追加一条重复。
    //   实测同一条装两遍后 patch 里出现两个相同 id。
    const hasId = new RegExp('^[ \\t]*-[ \\t]+id:[ \\t]*' + NAME + '[ \\t]*$', 'm').test(cur)
    if (hasId) {
      console.log('      cordis.patch.yml 里已有 ' + NAME + ' 条目，不动')
    } else {
      const block = '\n- insert:\n    - id: ' + NAME + "\n      name: '" + NAME + "'\n"
      fs.appendFileSync(PATCH, block, 'utf8')
      console.log('      已追加 insert 条目（' + cur.length + ' B -> ' + fs.statSync(PATCH).size + ' B）')
    }
  }
}

console.log('\n装完了。下一步：')
console.log('  1. **重启 DSH 桌面版** —— 宿主侧代码没有热重载，改 lib/ 必须重启')
console.log('  2. 启动时应该能看到开屏动画；进桌面后点悬浮球能换主题')
console.log('  3. 想加自己的主题：把主题目录放进 ' + path.join(HOME, 'boot-naruto', 'arts') + '，刷新页面即可')
console.log('  4. 排查：看 ' + path.join(HOME, 'boot-naruto', 'boot.log'))