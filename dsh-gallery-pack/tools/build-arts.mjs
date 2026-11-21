// build-arts.mjs —— 把 dsh-gallery-pack/arts/ 铺到宿主侧 <HOME>/boot-naruto/arts/
//
// 默认 **dry-run**:只算差异、只打印,一个字节都不写。必须显式 --apply 才落盘。
// 逐文件比 SHA256:相同则 skip;不同则先把旧文件备份到 <目标>/../arts.bak-<时间戳>/ 再覆盖;
// 目标里没有的就新增。删掉目标里多余的预设?不 —— 本工具**永不删除**任何东西,
// 多余文件只在报告里列出来,由人决定(素材是用户的, agent 无权清盘)。
//
// 用法:
//   node build-arts.mjs                       # dry-run,看要动了什么
//   node build-arts.mjs --profile=desktop     # 目标 HOME 用 profiles/desktop 那套(见下)
//   node build-arts.mjs --apply               # 真复制
//   node build-arts.mjs --only=konan,itachi --apply
//   node build-arts.mjs --home=D:\\tmp-fake   # 指定 HOME(自测用,不写真机)
//
// HOME 解析顺序(与 install.mjs 一致):--home > 环境变量 DSH_HOME > ~/.dsh。
// 素材落点是 <HOME>/boot-naruto/arts(宿主 /dsh-boot-gallery/arts 路由的读盘根),
// 不是 <HOME>/profiles/<p>/ —— profile 目录只放配置与插件,素材是全局共享的。
// --profile 只影响一件事:如果 <HOME>/profiles/<profile>/boot-naruto/arts 存在,会在报告里提示它,
// 免得两边都有素材时看走眼。
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import url from "node:url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const SRC = path.resolve(path.join(HERE, "..", "arts"));
const arg = (n, d) => {
  const a = process.argv.find((s) => s.startsWith("--" + n + "="));
  return a ? a.split("=").slice(1).join("=") : d;
};
const has = (n) => process.argv.includes("--" + n);
const APPLY = has("apply");
const HOME = arg("home", process.env.DSH_HOME || path.join(os.homedir(), ".dsh"));
const DEST = path.join(HOME, "boot-naruto", "arts");
const ONLY = arg("only", "").split(",").map((s) => s.trim()).filter(Boolean);
const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const BAK = path.join(HOME, "boot-naruto", "arts.bak-" + STAMP);

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const short = (h) => h.slice(0, 12);

if (!fs.existsSync(SRC)) { console.error("✗ 源目录不存在: " + SRC); process.exit(2); }
const presets = fs.readdirSync(SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(SRC, d.name, "preset.json")))
  .map((d) => d.name)
  .filter((n) => !ONLY.length || ONLY.includes(n))
  .sort();

console.log("源:   " + SRC);
console.log("目标: " + DEST);
console.log("模式: " + (APPLY ? "APPLY(会写盘)" : "DRY-RUN(不写任何文件)") + (ONLY.length ? "  只处理 " + ONLY.join(",") : ""));
if (!APPLY && path.basename(path.resolve(HOME)) === ".dsh" && HOME.startsWith(os.homedir()))
  console.log("提示: 真机 HOME 在 " + HOME + " —— dry-run 不会碰它。");

const stat = { same: 0, add: 0, upd: 0, miss: 0, err: 0 };
const extra = [];
for (const p of presets) {
  const sdir = path.join(SRC, p);
  const ddir = path.join(DEST, p);
  const files = fs.readdirSync(sdir).filter((f) => f !== "measure.json" && f !== "_build-report.json");
  const want = {};
  for (const f of files) {
    const fp = path.join(sdir, f);
    const st = fs.statSync(fp);
    if (!st.isFile()) continue;
    want[f] = { hash: short(sha(fs.readFileSync(fp))), size: st.size };
  }
  const dexists = fs.existsSync(ddir);
  const line = [];
  for (const [f, w] of Object.entries(want)) {
    const dp = path.join(ddir, f);
    if (!fs.existsSync(dp)) { stat.add++; line.push("+ " + f); if (APPLY) copy(sdir, ddir, f); continue; }
    const a = fs.readFileSync(dp);
    if (short(sha(a)) === w.hash) { stat.same++; continue; }
    stat.upd++; line.push("~ " + f);
    if (APPLY) {
      fs.mkdirSync(BAK, { recursive: true });
      const bto = path.join(BAK, p);
      fs.mkdirSync(bto, { recursive: true });
      fs.copyFileSync(dp, path.join(bto, f));
      copy(sdir, ddir, f);
    }
  }
  if (dexists) for (const f of fs.readdirSync(ddir)) if (!want[f]) extra.push(p + "/" + f);
  if (!dexists) stat.miss++;
  console.log("  " + (p + "            ").slice(0, 14) + (dexists ? "" : "[新建] ") +
    Object.keys(want).length + " 个文件  " + (line.length ? line.join(" ") : "全部一致"));
}
function copy(sdir, ddir, f) {
  try {
    fs.mkdirSync(ddir, { recursive: true });
    fs.copyFileSync(path.join(sdir, f), path.join(ddir, f));
  } catch (e) { stat.err++; console.log("  ✗ 复制失败 " + f + ": " + e.message); }
}
console.log("\n新增 " + stat.add + " / 覆盖 " + stat.upd + " / 已一致 " + stat.same +
  " / 目标缺整个预设 " + stat.miss + " / 失败 " + stat.err);
if (extra.length) console.log("目标里多出来的文件(本工具不删,自己看一眼): " + extra.join(", "));
if (!APPLY) {
  console.log("\nDRY-RUN:没有写任何东西。要真铺请加 --apply" +
    (stat.upd ? ";有 " + stat.upd + " 个文件会被覆盖,覆盖前会备份到 " + BAK : ";没有需要覆盖的旧文件,不会产生备份"));
} else if (stat.upd) console.log("旧文件备份在: " + BAK);
const alt = path.join(HOME, "profiles", arg("profile", "desktop"), "boot-naruto", "arts");
if (fs.existsSync(alt)) console.log("⚠ 另外还有一份素材在 " + alt + " —— 确认宿主读的是哪一棵再动手。");
process.exit(stat.err ? 1 : 0);
