import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

// S0:把皮肤主题客户端 bundle 里的「静态 exports.inject」换成「动态 ctx.inject」
// 为什么要换:宿主客户端加载器对没激活的条目是直接抛的 ——
//   throw new Error("web boot: N entries did not activate … pending (waiting for service: theme)")
//   (本会话在本机 app.asar byte 64055431 逐字验到)。静态 inject 一旦拿不到服务,
//   整个 GUI 起不来,而且卡的是启动流程,不是这个插件自己。
// 用法: node tools/fix-static-inject.mjs [--apply]
const APPLY = process.argv.includes('--apply')
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
const WS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DESKTOP = path.join(os.homedir(), '.dsh', 'profiles', 'desktop', 'node_modules')
const SKILL = path.join(os.homedir(), '.dsh', 'skills', 'dsh-theme-reskin', 'templates', 'client.js')

const NAMES = ['sally', 'pastry', 'goku', 'gaara', 'izuna', 'madara']
const targets = [
  path.join(WS, 'dsh-themes-collection', 'skill', 'templates', 'client.js'),
  ...NAMES.map((n) => path.join(WS, 'dsh-themes-collection', 'themes', n + '-theme', 'lib', 'client.js')),
  ...NAMES.map((n) => path.join(DESKTOP, 'dsh-theme-' + n, 'lib', 'client.js')),
  SKILL,
]

const problems = []
let changed = 0
for (const f of targets) {
  if (!fs.existsSync(f)) { console.log('  跳过(不存在) ' + f); continue }
  const before = fs.readFileSync(f, 'utf8')
  const lines = before.split('\n')
  const out = []
  let wrapped = 0, droppedInject = 0, droppedExport = 0
  for (const line of lines) {
    const m = /^(\s*)ctx\.effect\(\(\) => ctx\.theme\.overrideTokens\((.*)\);\s*$/.exec(line)
    if (m) {
      out.push(m[1] + 'ctx.inject(["theme"], (tk) => {')
      out.push(m[1] + '\ttk.effect(() => tk.theme.overrideTokens(' + m[2] + ');')
      out.push(m[1] + '});')
      wrapped++
      continue
    }
    if (/^\s*const inject = \[\s*"theme"\s*\];\s*$/.test(line)) { droppedInject++; continue }
    if (/^\s*exports\.inject = inject;\s*$/.test(line)) { droppedExport++; continue }
    out.push(line)
  }
  const after = out.join('\n')

  const fileIssues = []
  if (wrapped !== 1 || droppedInject !== 1 || droppedExport !== 1) fileIssues.push('预期 1 处 overrideTokens + 1 行 const inject + 1 行 exports.inject,实际 ' + wrapped + '/' + droppedInject + '/' + droppedExport)
  if (/\bctx\.theme\b/.test(after.split('ctx.inject(["theme"]')[1] || '')) fileIssues.push('动态注入之外仍有 ctx.theme 引用')
  if (/exports\.inject\s*=/.test(after)) fileIssues.push('产物里还有 exports.inject')
  if (!(after.match(/ctx\.inject\(\["theme"\]/g) || []).length) fileIssues.push('没生成 ctx.inject')
  try { new Function(after) } catch (e) { fileIssues.push('语法检查失败: ' + e.message) }

  const tag = path.relative(WS, f)
  if (fileIssues.length) { console.log('  FAIL ' + tag + '\n        ' + fileIssues.join('\n        ')); problems.push(tag); continue }
  const sizeB = Buffer.byteLength(before, 'utf8') - Buffer.byteLength(after, 'utf8')
  console.log('  ok   ' + tag + '  (' + (Buffer.byteLength(before, 'utf8') / 1024).toFixed(1) + ' KB,静态声明 -' + sizeB + ' B)')
  if (APPLY) {
    fs.writeFileSync(f + '.bak-s0-' + stamp, before, 'utf8')
    fs.writeFileSync(f, after, 'utf8')
  }
  changed++
}
console.log('\n' + (APPLY ? '已改写 ' : '[dry] 将改写 ') + changed + ' / ' + targets.length + ' 个文件'
  + (APPLY ? ',备份后缀 .bak-s0-' + stamp : ''))
if (problems.length) { console.error('未通过的文件: ' + problems.join(', ')); process.exit(1) }
if (!APPLY) console.log('确认无误后加 --apply 落盘(注意 .dsh 下的副本要额外批准)')
