// 这份自测的**权威版本已经搬到代码树**: dsh-boot-naruto\tools\selftest.mjs
// 为什么搬:代码包要能开源,而"别人能不能改"取决于拿到代码的人能不能自测 ——
// 原来它住在这个私有包里,代码树里根本没有 tools\,README 却让读者去跑一个不存在的文件。
// 这里保留两件事:① 先验**包内代码副本**与代码树同哈希(私有包里带着一份 dsh-boot-naruto\lib\ 副本,
//    历史上漂过);② 转发去跑权威自测,退出码原样带回。
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PACK = path.resolve(HERE, '..')
const CODE = path.resolve(PACK, '..', 'dsh-boot-naruto')
const h = (f) => (fs.existsSync(f) ? createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 12) : null)
let bad = 0
// 连 README.md 一起比:朋友的 agent 读的是包内那份说明,它比代码更容易被忘记同步。
const COPIES = ['README.md', 'package.json', 'cordis.patch.yml', 'lib/client.js', 'lib/index.js']
for (const rel of COPIES) {
  const a = h(path.join(PACK, 'dsh-boot-naruto', rel))
  const b = h(path.join(CODE, rel))
  const same = !!a && a === b
  if (!same) bad++
  console.log((same ? '  ok   ' : '  FAIL ') + '包内副本 vs 代码树 ' + rel + ': ' + String(a) + ' vs ' + String(b))
}
const canon = path.join(CODE, 'tools', 'selftest.mjs')
console.log('  -> 转发跑权威自测 ' + canon)
const r = spawnSync(process.execPath, [canon], { stdio: 'inherit' })
process.exit(r.status === null || bad ? 1 : r.status)
