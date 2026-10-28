#!/usr/bin/env node
/* =========================================================
   scripts/check-site.mjs — 上传 GitHub Pages 前自检
   ---------------------------------------------------------
   用法：node scripts/check-site.mjs

   检查内容：
   1. 入口文件、.nojekyll、viewport 是否齐全
   2. holidays.config.js 里列的背景图是否都存在（区分大小写）
   3. 每张背景图的 1280 / 2560 变体是否存在（缺了只会退回原图，不算错误）
   4. 有没有写死根路径（/xxx）导致项目页 404
   5. 单个文件是否超过 GitHub 的 100MB 限制、仓库是否过大
   6. 是否存在只差大小写的重名文件（GitHub Pages 在 Linux 上区分大小写，
      本地 macOS 可能看不出问题）

   有「✗」时退出码为 1，可以直接挂在提交前的检查里。
   ========================================================= */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VARIANTS = ['1280', '2560'];
const MB_LIMIT_GITHUB = 100;
const MB_WARN = 50;
const SITE_WARN = 1024; // GitHub Pages 站点建议 1GB 以内

let problems = 0;
let warnings = 0;
const ok = (m) => console.log('  ✓ ' + m);
const warn = (m) => { warnings++; console.log('  ! ' + m); };
const bad = (m) => { problems++; console.log('  ✗ ' + m); };

const rel = (p) => path.relative(root, p) || '.';
const exists = (p) => fs.existsSync(p);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === '.preview' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

console.log('\n检查目录：' + root + '\n');

/* ---------- 1. 关键文件 ---------- */
console.log('【入口与 GitHub Pages】');
const indexPath = path.join(root, 'index.html');
if (!exists(indexPath)) bad('缺少 index.html（GitHub Pages 的默认入口）');
else {
  const html = fs.readFileSync(indexPath, 'utf8');
  const hasViewport = /<meta\s+name="viewport"[^>]*width=device-width/i.test(html);
  const hasConfig = /<script[^>]+src="\.?\/?holidays\.config\.js"/.test(html);
  const hasNoJekyll = exists(path.join(root, '.nojekyll'));

  if (hasViewport) ok('viewport 已声明，支持手机自适应');
  else bad('index.html 缺少 viewport meta，手机上会按桌面宽度缩放');

  if (hasConfig) ok('已按相对路径引入 holidays.config.js（项目页 / 自定义域名都能用）');
  else warn('没有找到 holidays.config.js 的 <script src>，页面会只用内置数据');

  if (hasNoJekyll) ok('存在 .nojekyll，GitHub Pages 不会跑 Jekyll 处理');
  else bad('缺少 .nojekyll：GitHub Pages 会走 Jekyll，可能导致部分文件不被发布');
}

/* ---------- 2. 根路径 / 外链 ---------- */
const htmlText = exists(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
const rootAbs = [...htmlText.matchAll(/(?:src|href)="(\/[^/][^"]*)"/g)].map((m) => m[1]);
if (rootAbs.length) bad('存在写死根路径的引用：' + rootAbs.join(', ') + '（项目页会 404）');
else ok('没有写死根路径的 src/href');

/* ---------- 3. 配置里的背景图 ---------- */
console.log('\n【背景图】');
const cfgPath = path.join(root, 'holidays.config.js');
let cfg = {};
if (!exists(cfgPath)) {
  warn('没有 holidays.config.js，将使用内置默认背景名');
} else {
  try {
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(cfgPath, 'utf8'), sandbox, { filename: 'holidays.config.js' });
    cfg = sandbox.window.HOLIDAY_CONFIG || {};
    ok('holidays.config.js 语法正确，可以被浏览器直接加载');
  } catch (e) {
    bad('holidays.config.js 解析失败：' + e.message);
  }
}

const names = Array.isArray(cfg.backgrounds) ? cfg.backgrounds.map((n) => String(n).trim()) : [];
const dir = 'backgrounds';
if (!names.length) {
  warn('backgrounds 名单为空，页面会尝试 bg-1.jpg … bg-6.jpg');
} else {
  let missing = 0, noVariant = 0, mismatch = 0;
  for (const name of names) {
    const base = name.replace(/^backgrounds\//, '');
    const original = path.join(root, dir, base);
    if (!exists(original)) { bad('背景图不存在：' + path.join(dir, base)); missing++; continue; }

    // 大小写是否和磁盘完全一致（macOS 默认不区分大小写，容易漏）
    const disk = fs.readdirSync(path.dirname(original)).find((f) => f.toLowerCase() === path.basename(original).toLowerCase());
    if (disk && disk !== path.basename(original)) {
      bad('大小写不一致：配置写的是 ' + base + '，磁盘上是 ' + disk + '（GitHub 上会 404）');
      mismatch++;
    }

    const lack = VARIANTS.filter((v) => !exists(path.join(root, dir, v, base)));
    if (lack.length) { warn('缺少 ' + lack.join('/') + ' 变体：' + base + '（会自动退回原图）'); noVariant++; }
  }
  if (!missing && !mismatch) ok(names.length + ' 张背景图全部存在，文件名大小写一致');
  if (!noVariant) ok('1280 / 2560 两档变体齐全（手机只下 ~100–300KB）');
}

/* ---------- 4. 体积 ---------- */
console.log('\n【体积】');
const files = walk(root);
let total = 0;
const big = [];
for (const f of files) {
  const size = fs.statSync(f).size;
  total += size;
  if (size > MB_LIMIT_GITHUB * 1024 * 1024) bad('超过 GitHub 单文件 100MB 限制：' + rel(f));
  else if (size > MB_WARN * 1024 * 1024) big.push(rel(f) + '（' + (size / 1048576).toFixed(1) + 'MB）');
}
if (big.length) warn('单个文件偏大，建议压缩：' + big.join('、'));

const mb = total / 1048576;
if (mb > SITE_WARN) bad('仓库合计 ' + mb.toFixed(1) + 'MB，超过 GitHub Pages 建议的 1GB');
else if (mb > 500) warn('仓库合计 ' + mb.toFixed(1) + 'MB，上传和克隆会比较慢');
else ok('仓库合计 ' + mb.toFixed(1) + 'MB（' + files.length + ' 个文件），在 GitHub Pages 限制内');

/* ---------- 5. 只差大小写的重名 ---------- */
const lower = new Map();
for (const f of files) {
  const key = rel(f).toLowerCase();
  if (lower.has(key)) bad('只差大小写的重名文件：' + lower.get(key) + ' / ' + rel(f));
  else lower.set(key, rel(f));
}

/* ---------- 结论 ---------- */
console.log('');
if (problems) {
  console.log('结论：有 ' + problems + ' 个必须先修的问题' + (warnings ? '，' + warnings + ' 个提醒' : '') + '。\n');
  process.exit(1);
}
console.log('结论：可以上传到 GitHub Pages' + (warnings ? '（有 ' + warnings + ' 个非阻塞提醒）' : '') + '。\n');
