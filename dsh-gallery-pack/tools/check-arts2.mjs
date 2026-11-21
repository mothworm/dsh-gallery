#!/usr/bin/env node
// check-arts2.mjs —— arts2 开屏预设自检(只读,不改任何文件)
// 用法: node dsh-gallery-pack/tools/check-arts2.mjs [arts2目录]
// 退出码 0 = 全过;1 = 有 FAIL。逐套打印幕数/总时长/字节,并强制:
//   schema 数字 1 / 3~6 幕 / file 都在同目录真实存在 / dur 600~1600 / z,z0 1.0~1.25
//   kb = 两个合法百分比对 / pupil 格式 / open 只允许 akatsuki-cloud|none
//   目录名正则 + preset.json 的 id 必须等于目录名
//   **preset.json 原文里 "title" 与 "sub" 各只许出现一次**(踩过重复 title 被 JSON.parse 后覆盖的坑)
//   每张 JPEG 必须是 SOF2 progressive —— 用 JPEG marker 走链判定,不用 /9j/4AAQ 前缀糊弄(baseline 也匹配那个前缀)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || 'dsh-gallery-pack/arts2';
const PID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const PIMG_RE = /\.(jpe?g|png|webp)$/i;
const PPCT_RE = /^-?\d+(\.\d+)?% -?\d+(\.\d+)?%$/;
const PTOK_RE = /^-?\d+(\.\d+)?(%|px|vw|vh|em|rem)$/;
const MAX_ACTS = 8;                     // 宿主 presetTimeline 的截断上限
const SOF_PROGRESSIVE = new Set([0xc2, 0xc5, 0xc6, 0xc7]);
const SOF_BASELINE = new Set([0xc0, 0xc1, 0xc3, 0xc9, 0xca, 0xcc, 0xcd, 0xce, 0xcf]);
const STANDALONE = new Set([0x01, 0xd8, 0xd9, 0x00]);

let fails = 0, warns = 0;
const bad = (m) => { fails++; console.log('  FAIL ' + m); };
const ok = (m) => console.log('  ok   ' + m);

// 走 JPEG marker 链:返回编码类型 + SOF 里的真实宽高(不用 /9j/4AAQ 前缀猜,baseline 也匹配那个前缀)
function jpegScan(buf) {
  const out = { kind: 'unknown', w: 0, h: 0 };
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) { out.kind = 'not-jpeg'; return out; }
  let i = 2;
  let prog = false, base = false;
  while (i + 1 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    let m = buf[i + 1];
    while (m === 0xff && i + 2 < buf.length) { i++; m = buf[i + 1]; }
    if (STANDALONE.has(m)) { i += 2; continue; }
    if (m === 0xd9 || m === 0xda) break;
    const len = (buf[i + 2] << 8) | buf[i + 3];
    if (SOF_PROGRESSIVE.has(m)) prog = true;
    else if (SOF_BASELINE.has(m)) base = true;
    if (SOF_PROGRESSIVE.has(m) || SOF_BASELINE.has(m)) {
      out.h = (buf[i + 5] << 8) | buf[i + 6];
      out.w = (buf[i + 7] << 8) | buf[i + 8];
    }
    i += 2 + Math.max(2, len);
  }
  out.kind = prog ? 'progressive' : (base ? 'baseline' : 'unknown');
  return out;
}

// 任务书 (a) 的三张标定幕:kb/pos/z/dur 一个字都不许改,所以它们的漏边只能记 WARN 交人工复核。
// key = "预设/文件名"。这里只放**标定值本身**越界的两条,新增条目必须写清理由。
const CALIB_WARN = {
  'konan/01.jpg': '标定幕 66:任务书给定 kb[1]="-4% -4%"、z=1.05。900x1600 竖图 cover 到 16:9 时 X 轴零余量,'
    + '出口帧屏幕位移 = 1.05*4% = 4.2% 盒宽 > 允许的 (z-1)/2/1.05 = 2.38% ⇒ 1600 宽基准约 27px 的一条边不被图像盖住'
    + '(在幕尾最后几十毫秒,且下一幕叠化会盖住一半)。值不许改 ⇒ 报 WARN,需在浏览器实测这道缝是否可见。',
};
// ⇒ 屏幕位移 = z*|k|/100 个盒边长;该轴上图像覆盖 = z/f0 个盒边长(f0 = cover 在 z=1 时的可见分数)
// ⇒ 允许 |z*|k|/100| <= (z/f0 - 1)/2
function leakCheck(a, w, h, tag, nm) {
  if (!w || !h) return;
  const VA = 16 / 9, ai = w / h;
  const f0 = { y: Math.min(1, ai / VA), x: Math.min(1, VA / ai) };
  const z = { 0: a.z0, 1: a.z };
  a.kb.forEach((s, j) => {
    const [kx, ky] = String(s).replace(/%/g, '').split(/\s+/).map(Number);
    [['x', kx], ['y', ky]].forEach(([ax, k]) => {
      const allow = (z[j] / f0[ax] - 1) / 2 * 100 / z[j];
      if (Math.abs(k) > allow + 0.0001) {
        const msg = tag + ' kb[' + j + '] 的 ' + ax + '=' + k + '% 在 z=' + z[j] + ' 会漏边(该轴上限 ±' + allow.toFixed(2) + '%,图 ' + w + 'x' + h + ')';
        const key = nm + '/' + a.file;
        if (CALIB_WARN[key]) { warns++; console.log('  WARN ' + msg + '\n        └ 标定值豁免:' + CALIB_WARN[key]); }
        else bad(msg);
      }
    });
  });
}

const dirs = fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory())
  .map((d) => d.name).sort();
console.log('check-arts2: ' + path.resolve(ROOT) + ' —— ' + dirs.length + ' 个预设目录');
if (dirs.length !== 16) console.log('  WARN 目录数 = ' + dirs.length + ',任务书要求 16 套');

const rows = [];
for (const name of dirs) {
  const dir = path.join(ROOT, name);
  const pf = path.join(dir, 'preset.json');
  console.log('\n[' + name + ']');
  if (!PID_RE.test(name)) bad('目录名不匹配 ' + PID_RE);
  if (!fs.existsSync(pf)) { bad('缺 preset.json'); continue; }
  const raw = fs.readFileSync(pf, 'utf8');
  // —— 原文级别的重复键检查(JSON.parse 是 last-wins,查不出来) ——
  const nTitle = (raw.match(/"title"\s*:/g) || []).length;
  const nSub = (raw.match(/"sub"\s*:/g) || []).length;
  if (nTitle !== 1) bad('"title" 在原文出现 ' + nTitle + ' 次(必须恰好 1 次)');
  if (nSub !== 1) bad('"sub" 在原文出现 ' + nSub + ' 次(必须恰好 1 次)');
  let doc;
  try { doc = JSON.parse(raw); } catch (e) { bad('JSON 解析失败: ' + e.message); continue; }
  if (doc.schema !== 1 || typeof doc.schema !== 'number') bad('schema 必须是数字 1,实际 ' + JSON.stringify(doc.schema));
  if (doc.id !== name) bad('id="' + doc.id + '" ≠ 目录名 "' + name + '"');
  if (typeof doc.title !== 'string' || !doc.title.trim()) bad('title 缺失/空');
  if (typeof doc.sub !== 'string' || !doc.sub.trim()) bad('sub 缺失/空');
  if (!(doc.open === 'akatsuki-cloud' || doc.open === 'none')) bad('open="' + doc.open + '" 只允许 akatsuki-cloud|none');
  if (!Array.isArray(doc.acts)) { bad('acts 不是数组'); continue; }
  if (doc.acts.length < 3 || doc.acts.length > 6) bad('幕数 ' + doc.acts.length + ' 不在 3~6(宿主上限 ' + MAX_ACTS + ')');
  if (doc.acts.length > MAX_ACTS) bad('幕数超过宿主上限 ' + MAX_ACTS + ',会被静默截断');
  let tot = 0, bytes = 0, miss = 0;
  doc.acts.forEach((a, i) => {
    const tag = 'act' + (i + 1) + '(' + a.file + ')';
    let dim = { kind: 'unknown', w: 0, h: 0 };
    if (typeof a.file !== 'string' || !PIMG_RE.test(a.file)) { bad(tag + ' file 不是 .jpg/.png/.webp'); miss++; return; }
    const fp = path.join(dir, a.file);
    if (!fs.existsSync(fp)) { bad(tag + ' 文件不存在'); miss++; }
    else {
      const st = fs.statSync(fp);
      bytes += st.size;
      if (st.size < 3000) bad(tag + ' 只有 ' + st.size + 'B,像坏图');
      if (/\.(jpe?g)$/i.test(a.file)) {
        dim = jpegScan(st.size > 400000 ? fs.readFileSync(fp) : fs.readFileSync(fp));
        if (dim.kind !== 'progressive') bad(tag + ' JPEG 编码 = ' + dim.kind + '(要求 SOF2 progressive:quality 80 + progressive=True)');
        const longEdge = Math.max(dim.w, dim.h);
        if (longEdge > 1600) bad(tag + ' 长边 ' + longEdge + ' > 1600');
        if (dim.w < 300 || dim.h < 300) bad(tag + ' 尺寸 ' + dim.w + 'x' + dim.h + ' 过小');
      }
    }
    if (!/^\d\d\.jpg$/.test(a.file)) bad(tag + ' 文件名不是顺序 NN.jpg');
    if (typeof a.dur !== 'number' || !(a.dur >= 600 && a.dur <= 1600)) bad(tag + ' dur=' + a.dur + ' 不在 600~1600');
    else tot += a.dur;
    for (const k of ['z0', 'z']) {
      if (typeof a[k] !== 'number' || !(a[k] >= 1.0 && a[k] <= 1.25)) bad(tag + ' ' + k + '=' + a[k] + ' 不在 1.0~1.25(宿主合法域 0.2~4)');
    }
    if (!Array.isArray(a.kb) || a.kb.length !== 2) bad(tag + ' kb 必须是两个百分比对');
    else {
      a.kb.forEach((s, j) => {
        if (typeof s !== 'string' || !PPCT_RE.test(s)) bad(tag + ' kb[' + j + ']=' + JSON.stringify(s) + ' 不是 "-4% -4%" 这种百分比对');
      });
      leakCheck(a, dim.w, dim.h, tag, name);
    }
    if (a.pupil !== undefined && !(typeof a.pupil === 'string' && PPCT_RE.test(a.pupil))) bad(tag + ' pupil=' + JSON.stringify(a.pupil) + ' 不是百分比对');
    if (a.flash !== undefined && typeof a.flash !== 'boolean') bad(tag + ' flash 必须是布尔');
  });
  // —— 运镜铁律:第 i 幕的出场向量与第 i+1 幕的入场向量必须同号(0 视为中性) ——
  const pvec = (s) => String(s).replace(/%/g, '').split(/\s+/).map(Number);
  let breaks = [];
  for (let i = 0; i + 1 < doc.acts.length; i++) {
    const A = doc.acts[i], B = doc.acts[i + 1];
    if (!Array.isArray(A.kb) || !Array.isArray(B.kb) || A.kb.length !== 2 || B.kb.length !== 2) continue;
    const pe = pvec(A.kb[1]), ce = pvec(B.kb[0]);
    if (pe[0] * ce[0] < 0 || pe[1] * ce[1] < 0) breaks.push('act' + (i + 1) + '→' + (i + 2) + ': ' + A.kb[1] + ' ↛ ' + B.kb[0]);
  }
  if (breaks.length) bad('运镜方向断裂(铁律) ' + breaks.join(' | '));
  else ok('运镜连续:上一幕出场=下一幕入场(共 ' + (doc.acts.length - 1) + ' 个接缝) '
    + doc.acts.map((a) => a.kb[1]).join(' → '));
  const nFlash = doc.acts.filter((a) => a.flash === true).length;
  if (nFlash > 1) console.log('  warn 有 ' + nFlash + ' 幕 flash=true(全片只该白爆一次)');
  if (miss) bad(miss + ' 个幕的图片缺失');
  if (!(tot >= 3500 && tot <= 6500)) bad('总时长 ' + tot + 'ms 不在 3500~6500(宿主还会为 akatsuki-cloud 前置 300ms 晓云)');
  const on = tot + (doc.open === 'none' ? 0 : 300);
  rows.push({ name, acts: doc.acts.length, tot, on, bytes, files: doc.acts.map((a) => a.file).join(','),
              ids: doc.acts.map((a) => a.file).length, pupil: doc.acts.filter((a) => a.pupil).length,
              flash: nFlash, open: doc.open, title: doc.title, sub: doc.sub });
  console.log('  ok   ' + doc.acts.length + ' 幕 / Σdur=' + tot + 'ms / 上屏 ' + on + 'ms'
    + (doc.open === 'akatsuki-cloud' ? '(含晓云 300ms)' : '(无晓云)')
    + ' / 图 ' + (bytes / 1024).toFixed(0) + 'KB / pupil×' + rows[rows.length - 1].pupil + ' / flash×' + nFlash);
}

console.log('\n================ 汇总 ================');
console.log('预设            幕  Σdur   上屏    图片KB  open            title');
for (const r of rows) {
  console.log(r.name.padEnd(15) + String(r.acts).padStart(2) + ' '
    + (r.tot + 'ms').padStart(7) + ' ' + (r.on + 'ms').padStart(7) + ' '
    + String(Math.round(r.bytes / 1024)).padStart(7) + '  ' + r.open.padEnd(15) + ' ' + r.title);
}
const all = rows.reduce((s, r) => s + r.bytes, 0);
console.log('16 套合计: ' + rows.length + ' 套 / ' + rows.reduce((s, r) => s + r.acts, 0) + ' 幕 / '
  + rows.reduce((s, r) => s + r.tot, 0) + 'ms 纯幕时长 / 图片 ' + (all / 1048576).toFixed(1) + ' MB');
warns += 0;
console.log('\n' + (fails ? '结果: ' + fails + ' 项 FAIL' : '结果: 全部检查通过(' + rows.length + ' 套)'));
process.exit(fails ? 1 : 0);
