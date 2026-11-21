#!/usr/bin/env node
// dsh-boot-suite-gallery / tools/install-arts.mjs
//
// 把**随插件走的自有素材**(我们自画的风景图)装进宿主读素材的地方。
//
// 为什么单独一个脚本、不并进 install.mjs:
//   ① 两者语义不同 —— install.mjs 装的是"代码",这个装的是"素材",卸载/回滚时想各自独立;
//   ② 体积差两个数量级(代码 150 KB,风景 14.6 MB),并进去会让每次改代码都重拷一遍素材;
//   ③ 素材是**可选的**:只想要代码包的人(插件市场)不该被迫下载十几 MB 的图。
//
// 素材来源:`dsh-gallery-pack/arts-scenery/`(由 tools/pack-scenery.py 生成)。
// 去向:   `<DSH_HOME>/boot-naruto/arts/` —— 宿主 `listPresets()` 每次请求都重扫这里,
//         所以装完**刷新页面即可见**,不用重启宿主。

import { existsSync, readdirSync, mkdirSync, copyFileSync, statSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
// HERE = <repo>/dsh-boot-suites/gallery/tools -> 上跳三级才是仓库根
// (第一版只跳了两级,算出来的源路径是 <repo>/dsh-boot-suites/dsh-gallery-pack/…,报"缺素材源")
const REPO = path.resolve(HERE, '..', '..', '..')
// 素材源优先取**插件包里自带的那份**(arts-builtin)。
//
// 2026-11-22 改:用户要求「git/插件里只带夜潮/暖秋/清寒这几个咱们画的不需要申请版权的主题」。
// 那三套就不该只躺在 dsh-gallery-pack(被 .gitignore 挡着、也不随插件分发),
// 而应该**跟着插件走**:装完插件就已经能用,不需要另外下载素材包。
// dsh-gallery-pack/arts-scenery 保留作**生成产物**(由 pack-scenery.py 产出),这里退成兜底。
const PKG_ARTS = path.join(HERE, '..', 'arts-builtin')
const PACK_ARTS = path.join(REPO, 'dsh-gallery-pack', 'arts-scenery')
const SRC = existsSync(PKG_ARTS) && readdirSync(PKG_ARTS).length ? PKG_ARTS : PACK_ARTS
const HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const DEST = path.join(HOME, 'boot-naruto', 'arts')
const dry = process.argv.includes('--dry')
const force = process.argv.includes('--force')
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 12)

if (!existsSync(SRC)) {
  console.error('!! 缺素材源 ' + SRC)
  console.error('   先跑: python dsh-gallery-pack/tools/pack-scenery.py --apply')
  process.exit(1)
}

// 一套主题 = 一个目录,里面必须有 preset.json
const themes = readdirSync(SRC).filter((n) => {
  const d = path.join(SRC, n)
  return statSync(d).isDirectory() && existsSync(path.join(d, 'preset.json'))
})
if (!themes.length) {
  console.error('!! ' + SRC + ' 里没有任何带 preset.json 的主题目录')
  process.exit(1)
}

console.log('== 风景主题安装 ==')
console.log('  源   ' + SRC)
console.log('  目标 ' + DEST)
console.log('  ' + (dry ? '试跑(不写盘)' : force ? '**真安装 + 覆盖**' : '真安装(已存在则跳过)'))
let n = 0, skipped = 0, bytes = 0
for (const t of themes) {
  const src = path.join(SRC, t)
  const dst = path.join(DEST, t)
  const files = readdirSync(src).filter((f) => statSync(path.join(src, f)).isFile())
  const size = files.reduce((a, f) => a + statSync(path.join(src, f)).size, 0)
  if (existsSync(dst) && !force) {
    console.log('  ' + t.padEnd(16) + '已存在,跳过(--force 覆盖)')
    skipped++
    continue
  }
  if (!dry) {
    if (existsSync(dst)) rmSync(dst, { recursive: true, force: true })
    mkdirSync(dst, { recursive: true })
    for (const f of files) copyFileSync(path.join(src, f), path.join(dst, f))
    // 装机后核一遍摘要:拷一半的素材会让面板出现"坏:…"格子,而且是静默的
    for (const f of files) {
      if (sha(path.join(src, f)) !== sha(path.join(dst, f))) {
        console.error('!! ' + t + '/' + f + ' 复制后摘要不符')
        process.exit(1)
      }
    }
  }
  console.log('  ' + t.padEnd(16) + files.length + ' 文件  ' + (size / 1048576).toFixed(1) + ' MB  ok')
  n++
  bytes += size
}
console.log('\n装好 ' + n + ' 套,跳过 ' + skipped + ' 套,共 ' + (bytes / 1048576).toFixed(1) + ' MB')
if (!dry) {
  console.log('刷新页面即可见(宿主每次请求都重扫 arts/);要重启的只有开屏插件本身的代码改动。')
}