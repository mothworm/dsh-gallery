// dsh-boot-suite-gallery / tools/extract-tokens.mjs
//
// 把宿主的 --dsw-* token **名字清单**抽成 data/tokens.json。
//
// 为什么从已有主题里抽、而不是从 app.asar 抽:
//   名字清单是宿主的公开契约,任何一份完整主题都必然把它抄全(89 个,少一个都会被
//   madara-theme 的自测抓住)。真正权威的来源是 app.asar 里的
//   @deepseek-ai/dsh-client-ui-theme/lib/styles/design-platform.css —— 那条路要解析归档,
//   留给 tools/verify-tokens.mjs(待写)做交叉核对。**这里只取名字,一个值都不取**,
//   避免新套件在语义上绑回旧主题。
//
// 跑法: node tools/extract-tokens.mjs [源文件路径]
//   不给路径时默认取**本机 profile 里那份 madara 主题**;这个工具是开发期的抽名器,
//   不参与发货,也没有任何闸门读它的 provenance。
//   ⚠ 默认路径**不许写死用户名** —— 本仓库要进版本库,`C:\Users\<某个用户名>\...` 那种字面量
//   会把作者的本机账号念给每一个拿到代码的人(11-19 那次夹具脱敏就是同一条规矩)。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SUITE = dirname(HERE)
const SRC = resolve(process.argv[2] || join(homedir(),
  '.dsh', 'profiles', process.env.DSH_PROFILE || 'desktop',
  'node_modules', 'dsh-theme-madara', 'lib', 'client.js'))
// provenance 里只留**相对形状**:node_modules 之前的部分(盘符 + 用户名 + profile)一律折掉,
// 分隔符统一成 `/`,这样同一份 JSON 在 mac / linux 上重跑也不会因为盘符产生无意义 diff。
// 传进来的路径**不一定**在 node_modules 下面(命令行可给任意路径),所以那条路也要折:
// 一律退化成 `<abs>/<最后三段>`,否则一次手滑就把作者的主目录念出去。
const shape = (p) => {
  const s = p.replace(/\\/g, '/')
  const i = s.lastIndexOf('/node_modules/')
  if (i >= 0) return '<node_modules>' + s.slice(i + '/node_modules'.length)
  return '<abs>/' + s.split('/').slice(-3).join('/')
}
const OUT = join(SUITE, 'data', 'tokens.json')

const raw = readFileSync(SRC, 'utf8')
const names = []
const seen = new Set()
for (const m of raw.matchAll(/--dsw-(?:alias|specific)-[a-z0-9-]+/g)) {
  if (!seen.has(m[0])) { seen.add(m[0]); names.push(m[0]) }
}
names.sort()
if (!names.length) {
  console.error('FAIL no --dsw-* token found in ' + SRC)
  process.exit(1)
}

const doc = {
  _note: '宿主 token 名字清单。值一律由 src/client.src.js 的 tokensOf() 从每套画面的调色推导,不来自任何已有主题。',
  count: names.length,
  provenance: {
    name_source: shape(SRC),
    name_source_sha256_12: createHash('sha256').update(raw).digest('hex').slice(0, 12),
    extracted_at: new Date().toISOString(),
    authoritative_source: 'app.asar :: @deepseek-ai/dsh-client-ui-theme/lib/styles/design-platform.css (未交叉核对)',
  },
  tokens: names,
}
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n', 'utf8')
console.log('tokens: ' + names.length + '  ->  data/tokens.json')
console.log('alias=' + names.filter((n) => n.includes('-alias-')).length +
  '  specific=' + names.filter((n) => n.includes('-specific-')).length)
