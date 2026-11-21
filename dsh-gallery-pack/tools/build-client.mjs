import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 由 src/client.src.js + assets/*.jpg 生成 lib/client.js
// 为什么一定要"生成"而不是直接改 lib/client.js:图片是 base64,几百 KB 起步,
// 走模型上下文既不经济也容易截断;所有校验都在这个脚本里做完。
const HERE = path.dirname(fileURLToPath(import.meta.url))
const PKG = path.resolve(HERE, '..', 'dsh-boot-gallery')
const SRC = path.join(PKG, 'src', 'client.src.js')
const ASSETS = path.join(PKG, 'assets')
const OUT = path.join(PKG, 'lib', 'client.js')

const manifest = JSON.parse(fs.readFileSync(path.join(ASSETS, 'manifest.json'), 'utf8'))
let code = fs.readFileSync(SRC, 'utf8')

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
let inlined = 0
for (const m of manifest) {
  const ext = path.extname(m.file).toLowerCase()
  const buf = fs.readFileSync(path.join(ASSETS, m.file))
  const uri = 'data:' + (MIME[ext] || 'application/octet-stream') + ';base64,' + buf.toString('base64')
  const token = '__URI_' + m.id + '__'
  if (!code.includes(token)) { console.error('!! 模板里没有 ' + token + '(分镜表与 manifest 对不上)'); process.exit(1) }
  code = code.split(token).join(uri)
  inlined++
}

const problems = []
if (code.includes('__URI_')) problems.push('仍有未替换的 __URI_ 占位符')
if (/(^|[^.\w])exports\.inject\s*=/.test(code)) problems.push('产物里出现了静态 exports.inject(会触发宿主 web boot 致命检查)')
// 硬红线,和上一条同级:宿主浏览器侧的加载器对任何未激活条目是直接 throw 的,
// 写成 `const inject = [...]` 一样会把整个 GUI 打死。注入只能走现有的 apply 导出。
if (/(^|[^.\w])const\s+inject\s*=/.test(code)) problems.push('产物里出现了静态 const inject = (同上,致命)')
if (!/(^|[^.\w])exports\.apply\s*=\s*apply/.test(code)) problems.push('产物没有 exports.apply 导出(注入必须走这条路)')
// 内置兜底必须还在:预设只是"优先播",9 幕兜底一条都不许被删
const tlStart = code.indexOf('const TIMELINE = [')
if (tlStart < 0) problems.push('找不到内置兜底 TIMELINE(预设的降级路径靠它)')
else {
  const tlBlock = code.slice(tlStart, code.indexOf('];', tlStart) > 0 ? code.indexOf('];', tlStart) : code.length)
  const builtinActs = (tlBlock.match(/kind:\s*"/g) || []).length
  if (builtinActs !== 9) problems.push('内置兜底不是 9 幕了(实际 ' + builtinActs + ')')
  const builtinUris = (tlBlock.match(/data:image\/jpeg;base64,/g) || []).length
  if (builtinUris !== manifest.length) problems.push('内置兜底里内嵌的 JPEG 数是 ' + builtinUris + ',和 manifest 的 ' + manifest.length + ' 张对不上(兜底素材被删过?)')
  console.log('内置兜底:' + builtinActs + ' 幕 / ' + builtinUris + ' 张内嵌 JPEG 直读')
}
if (!/MAX_PRESET_ACTS\s*=\s*8/.test(code)) problems.push('预设幕数硬顶不是 8')
if (!/PRESET_SCHEMA\s*=\s*1/.test(code)) problems.push('预设 schema 常量不是 1(必须和宿主/契约一致)')
if (!code.includes('id: "dsh-boot-gallery"')) problems.push('bundle id 与包名不一致')
if (!/HANDOFF\s*=\s*(\d+)/.test(code)) problems.push('找不到 HANDOFF 常量')
const handoff = Number((code.match(/HANDOFF\s*=\s*(\d+)/) || [])[1])
const exitMs = Number((code.match(/EXIT\s*=\s*(\d+)/) || [])[1])
if (!(handoff > exitMs)) problems.push('退场时序不变量违背:HANDOFF(' + handoff + ') 必须 > EXIT(' + exitMs + ')')
// CSS 是一段一段字符串 join 出来的:数一下逗号,漏一个就会把两行粘成一行非法声明
const cssBlock = code.slice(code.indexOf('const CSS = ['), code.indexOf('].join("\\n")') > 0 ? code.indexOf('].join') : code.length)
const cssLines = (cssBlock.match(/^\s*"/gm) || []).length
const cssCommas = (cssBlock.match(/",\s*$/gm) || []).length
if (cssLines !== cssCommas) problems.push('CSS 数组少逗号:行数 ' + cssLines + ' / 带尾逗号 ' + cssCommas)
try { new Function(code) } catch (e) { problems.push('语法检查失败: ' + e.message) }

fs.writeFileSync(OUT, code, 'utf8')
console.log('lib/client.js = ' + (fs.statSync(OUT).size / 1048576).toFixed(2) + ' MB,内嵌 ' + inlined + ' 张图,CSS 行 ' + cssLines + '/' + cssCommas + ',HANDOFF/EXIT=' + handoff + '/' + exitMs)
if (problems.length) { console.error('校验未通过:\n - ' + problems.join('\n - ')); process.exit(1) }
console.log('校验全部通过')
