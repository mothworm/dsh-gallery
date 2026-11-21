// check-arts.mjs —— arts/ 契约校验器(只读,不改任何东西)
// 用法: node check-arts.mjs [arts目录]      默认 ../arts
// 断言(全部来自任务书给的契约,一个都不放宽):
//   schema===1;acts 数 3–6;每个 act.file 在同目录下真实存在且是 JPEG;
//   dur ∈ [600,1600];z0/z ∈ [1.00,1.25];kb = 两个合法百分比对;pupil 格式合法;
//   open ∈ {"akatsuki-cloud","none"};字段集合不许自创;pos 格式/区间;长边 ≤1600。
// 退出码:0 全绿,1 有失败。
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.argv[2] || path.join(HERE, "..", "arts"));

const TOP = new Set(["schema", "id", "title", "open", "acts", "sub"]);
const ACTK = new Set(["file", "dur", "pos", "z0", "z", "kb", "pupil", "flash"]);
const OPENS = new Set(["akatsuki-cloud", "none"]);
const PCT_PAIR = /^-?\d+(\.\d+)?% -?\d+(\.\d+)?%$/;
const KB_TOK = /^-?\d+(\.\d+)?%$/;
const FILE_RE = /^\d{2}\.jpg$/;

let fail = 0, warn = 0;
const bad = (id, msg) => { console.log("  ✗ " + id + ": " + msg); fail++; };
const wrn = (id, msg) => { console.log("  · " + id + ": " + msg); warn++; };

function jpegSize(buf) {
  if (buf.length < 20 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let o = 2;
  while (o + 9 < buf.length) {
    if (buf[o] !== 0xff) { o++; continue; }
    const m = buf[o + 1];
    const len = (buf[o + 2] << 8) | buf[o + 3];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
      return { h: (buf[o + 5] << 8) | buf[o + 6], w: (buf[o + 7] << 8) | buf[o + 8], progressive: m === 0xc2 };
    o += 2 + len;
  }
  return null;
}

console.log("校验目录: " + ROOT);
const dirs = fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
if (!dirs.length) { console.log("✗ 一个预设目录都没有"); process.exit(1); }
const rows = [];
for (const d of dirs) {
  const dir = path.join(ROOT, d);
  const pj = path.join(dir, "preset.json");
  if (!fs.existsSync(pj)) { wrn(d, "没有 preset.json,跳过"); continue; }
  const raw = fs.readFileSync(pj, "utf8");
  let o;
  try { o = JSON.parse(raw); } catch (e) { bad(d, "preset.json 解析失败: " + e.message); continue; }
  const id = d;
  if (o.schema !== 1) bad(id, "schema 必须等于 1,实为 " + JSON.stringify(o.schema));
  if (o.id !== id) bad(id, "id 必须等于目录名,实为 " + JSON.stringify(o.id));
  if (typeof o.title !== "string" || !o.title.trim()) bad(id, "title 必须是非空字符串");
  if (typeof o.sub !== "string" || !o.sub.trim()) bad(id, "sub 必须是非空字符串");
  if (!OPENS.has(o.open)) bad(id, "open 必须是 akatsuki-cloud / none,实为 " + JSON.stringify(o.open));
  for (const k of Object.keys(o)) if (!TOP.has(k)) bad(id, "自创字段「" + k + "」不在契约里");
  // 契约样例里 title 写了两次(前置短名 + 末尾展示名);JSON.parse 取后者,这里只数一遍并记录
  const titles = (raw.match(/"title"\s*:/g) || []).length;
  if (titles !== 2) wrn(id, "title 键出现 " + titles + " 次(契约样例是 2 次:短名 + 展示名;解析取最后一个)");
  if (!Array.isArray(o.acts)) { bad(id, "acts 不是数组"); continue; }
  if (o.acts.length < 3 || o.acts.length > 6) bad(id, "幕数必须 3–6,实为 " + o.acts.length);
  let bytes = 0, ms = 0, px = 0, py = 0;
  o.acts.forEach((a, i) => {
    const tag = id + " act" + (i + 1);
    for (const k of Object.keys(a)) if (!ACTK.has(k)) bad(tag, "自创字段「" + k + "」不在 act 契约里");
    if (!FILE_RE.test(String(a.file))) bad(tag, "file 必须是 01.jpg 这样的顺序名,实为 " + JSON.stringify(a.file));
    else if (String(a.file) !== String(i + 1).padStart(2, "0") + ".jpg") bad(tag, "file 序号不连续:期望 " + String(i + 1).padStart(2, "0") + ".jpg");
    const fp = path.join(dir, String(a.file || ""));
    if (!a.file || !fs.existsSync(fp)) { bad(tag, "文件不存在: " + fp); }
    else {
      const buf = fs.readFileSync(fp);
      bytes += buf.length;
      const s = jpegSize(buf);
      if (!s) bad(tag, "不是能解出尺寸的 JPEG: " + a.file);
      else {
        if (Math.max(s.w, s.h) > 1600) bad(tag, "长边 " + Math.max(s.w, s.h) + " > 1600");
        if (s.w < 800 && s.h < 800) wrn(tag, "短边仅 " + Math.min(s.w, s.h) + "px,16:9 全屏会糊");
        px = s.w; py = s.h;
      }
      if (buf.length > 400 * 1024) wrn(tag, "单文件 " + (buf.length / 1024).toFixed(0) + "KB > 400KB");
    }
    if (typeof a.dur !== "number" || a.dur < 600 || a.dur > 1600) bad(tag, "dur 必须 600–1600ms,实为 " + JSON.stringify(a.dur));
    else ms += a.dur;
    for (const key of ["z0", "z"])
      if (typeof a[key] !== "number" || a[key] < 1 || a[key] > 1.25) bad(tag, key + " 必须 1.0–1.25,实为 " + JSON.stringify(a[key]));
    if (!Array.isArray(a.kb) || a.kb.length !== 2) bad(tag, "kb 必须是 2 个元素");
    else a.kb.forEach((s2, j) => {
      const p2 = String(s2).trim().split(/\s+/);
      if (p2.length !== 2 || !p2.every((t) => KB_TOK.test(t))) bad(tag, "kb[" + j + "] 不是两个百分比量: " + JSON.stringify(s2));
    });
    if (a.pos === undefined) bad(tag, "pos 必填");
    else if (typeof a.pos !== "string" || !PCT_PAIR.test(a.pos.trim())) bad(tag, "pos 格式非法: " + JSON.stringify(a.pos));
    else {
      const [x, y] = a.pos.trim().split(/\s+/).map((v) => parseFloat(v));
      if (x < 25 || x > 75) bad(tag, "pos X 应落在 25–75%,实为 " + x + "%");
      if (y < 15 || y > 60) bad(tag, "pos Y 应落在 15–60%,实为 " + y + "%");
    }
    if (a.pupil !== undefined && (typeof a.pupil !== "string" || !PCT_PAIR.test(a.pupil.trim())))
      bad(tag, "pupil 格式非法: " + JSON.stringify(a.pupil));
    if (a.flash !== undefined && typeof a.flash !== "boolean") bad(tag, "flash 必须是布尔");
  });
  // 铁律:出场方向 = 下一幕入场方向(主导轴同号)
  for (let i = 0; i + 1 < o.acts.length; i++) {
    const A = o.acts[i].kb[1].trim().split(/\s+/).map(parseFloat);
    const B = o.acts[i + 1].kb[0].trim().split(/\s+/).map(parseFloat);
    const ax = Math.abs(A[0]) >= Math.abs(A[1]) ? 0 : 1;
    if (A[ax] === 0 && B[ax] === 0) wrn(id, "act" + (i + 1) + "→act" + (i + 2) + " 两段都收中心,衔接会停一拍");
    else if (A[ax] * B[ax] < 0) bad(id, "act" + (i + 1) + "→act" + (i + 2) + " 方向链反号: " + o.acts[i].kb[1] + " → " + o.acts[i + 1].kb[0]);
  }
  rows.push({ id, acts: o.acts.length, ms, open: o.open, bytes, px, py, title: o.title, sub: o.sub, pupil: o.acts.filter((a) => a.pupil).length });
}
console.log("");
console.log("预设     幕  总时长  开场            瞳幕  字节     出图尺寸    标题");
for (const r of rows)
  console.log((r.id + "        ").slice(0, 9) + String(r.acts).padStart(2) + "  " +
    (r.ms / 1000).toFixed(2) + "s  " + (r.open + "             ").slice(0, 15) + String(r.pupil).padStart(3) + "  " +
    (r.bytes / 1024).toFixed(0).padStart(6) + "KB  " + (r.px + "x" + r.py + "     ").slice(0, 11) + " " + r.title + " | " + r.sub);
const tot = rows.reduce((s, r) => s + r.ms, 0);
console.log("合计: " + rows.length + " 支预设 / " + rows.reduce((s, r) => s + r.acts, 0) + " 幕 / " +
  (rows.reduce((s, r) => s + r.bytes, 0) / 1048576).toFixed(1) + " MB;单套总时长 " +
  Math.min(...rows.map((r) => r.ms / 1000)).toFixed(2) + "–" + Math.max(...rows.map((r) => r.ms / 1000)).toFixed(2) +
  "s,均值 " + (tot / rows.length / 1000).toFixed(2) + "s");
console.log(fail ? "\n✗ 失败 " + fail + " 项(警告 " + warn + ")" : "\n✓ 全部通过(警告 " + warn + ")");
process.exit(fail ? 1 : 0);
