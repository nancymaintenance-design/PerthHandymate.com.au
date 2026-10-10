// Bounded final acceptance of existing public HTML; no content generators or network writes.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { inventorySite, extractPage } = require('./content-seo-inventory');
const ORIGIN = 'https://www.perthhandymate.com.au';
function decode(s) {
  return s.replace(/&#(x[\da-f]+|\d+);/gi, (_, x) => String.fromCodePoint(x[0].toLowerCase() === 'x' ? parseInt(x.slice(1), 16) : Number(x)))
    .replace(/&(amp|quot|apos|nbsp|lt|gt|ndash|mdash|rsquo|lsquo|rdquo|ldquo);/g, (_, x) => ({ amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' }[x]));
}
function text(s) { return decode(String(s).replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim(); }
function attribute(tag, name) { return decode(tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))?.slice(1).find(x => x !== undefined) || ''); }
function auditPage(html, route) {
  const issues = [];
  const page = extractPage(html, route);
  if (!/<main\b/i.test(html)) issues.push('Missing main');
  if (page.h1.length !== 1) issues.push('Expected one H1');
  for (let i = 1; i < page.headings.length; i++) if (page.headings[i].level > page.headings[i - 1].level + 1) issues.push(`Heading level jump: ${page.headings[i].text}`);
  if (page.canonical !== ORIGIN + route) issues.push(`Incorrect canonical: ${page.canonical}`);
  if (/[\u3400-\u9fff]|\bHM\d{4}\b/.test(text(html))) issues.push('Public research/CJK leak');
  const visible = [...html.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)].map(m => ({ question: text(m[1]), answer: text(m[2]) }));
  const faqs = [];
  const scan = x => {
    if (Array.isArray(x)) return x.forEach(scan);
    if (!x || typeof x !== 'object') return;
    if ([x['@type']].flat().includes('FAQPage')) faqs.push(...(x.mainEntity || []));
    if (x['@graph']) scan(x['@graph']);
  };
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) if (attribute(m[1], 'type') === 'application/ld+json') {
    try { scan(JSON.parse(m[2])); } catch { issues.push('Malformed JSON-LD'); }
  }
  if (faqs.length) {
    if (faqs.length !== visible.length) issues.push('FAQ count differs');
    for (const item of visible) {
      const entries = faqs.filter(x => text(x.name) === item.question);
      if (entries.length !== 1) issues.push(`FAQ question missing/ambiguous: ${item.question}`);
      else if (text(entries[0].acceptedAnswer?.text || '') !== item.answer) issues.push(`FAQ answer differs: ${item.question}`);
    }
  }
  return { path: route, issues, headings: page.headings.length, visibleFaqs: visible.length, structuredFaqs: faqs.length };
}
function resolveLocalLink(href, route, read) {
  let url;
  try { url = new URL(decode(href), ORIGIN + route); } catch { return `Malformed link: ${href}`; }
  if (url.origin !== ORIGIN) return null;
  const destination = url.pathname.replace(/\/index\.html$/, '/');
  const html = read(destination);
  if (html === null || html === undefined) return `Missing destination: ${href}`;
  if (url.hash) {
    let id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch { return `Malformed fragment: ${href}`; }
    const ids = [...html.matchAll(/<[^>]+\b(?:id|name)\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi)].map(m => decode(m[1] ?? m[2]));
    if (!ids.includes(id)) return `Missing fragment: ${href}`;
  }
  return null;
}
function coverageRows(pages, markdown, changed, keepEvidence = new Map()) {
  const decisions = new Map();
  for (const line of markdown.split(/\r?\n/)) {
    const cells = line.split('|').slice(1, -1).map(x => x.trim());
    if (!cells[0]?.startsWith('/')) continue;
    if (decisions.has(cells[0])) throw new Error(`Duplicate decision: ${cells[0]}`);
    decisions.set(cells[0], cells.slice(1).join(' — '));
  }
  return pages.map(p => {
    if (!decisions.has(p.path)) throw new Error(`Missing decision: ${p.path}`);
    const decision = changed.has(p.path) ? 'Change' : 'Keep';
    if (decision === 'Keep' && !keepEvidence.has(p.path)) throw new Error(`Missing independent keep evidence: ${p.path}`);
    return { path: p.path, type: p.type, decision, editorialDecision: decisions.get(p.path), acceptanceEvidence: keepEvidence.get(p.path) || '标题/层级、既有FAQ语义、内部目的地/锚点与公开内容隔离检查通过；具体修改见编辑决定。', mainWords: p.mainWordCount };
  });
}
function fileFor(root, route) { return path.join(root, route === '/' ? 'index.html' : route.slice(1) + (route.endsWith('/') ? 'index.html' : '')); }
function run(root) {
  const pages = inventorySite(root);
  const read = route => { const file = fileFor(root, route); return fs.existsSync(file) && fs.statSync(file).isFile() ? fs.readFileSync(file, 'utf8') : null; };
  const checks = pages.map(p => auditPage(read(p.path), p.path));
  let links = 0, fragments = 0;
  for (const p of pages) for (const tag of read(p.path).matchAll(/<a\b[^>]*>/gi)) {
    const href = attribute(tag[0], 'href');
    if (!href || /^(?:mailto:|tel:|javascript:)/i.test(href)) continue;
    if (new URL(href, ORIGIN + p.path).origin !== ORIGIN) continue;
    links++;
    if (href.includes('#')) fragments++;
    const issue = resolveLocalLink(href, p.path, read);
    if (issue) checks.find(x => x.path === p.path).issues.push(issue);
  }
  const routes = JSON.parse(fs.readFileSync(path.join(root, 'docs/seo/content-round2/term-routing.json'), 'utf8'));
  if (routes.length !== 527 || new Set(routes.map(x => x.id)).size !== 527) throw new Error('Expected 527 unique authoritative routes');
  for (const term of routes) { const issue = resolveLocalLink(term.primaryPath, '/', read); if (issue) throw new Error(`${term.id}: ${issue}`); }
  const docs = path.join(root, 'docs/seo/content-round2');
  const decisions = ['service-editorial-decisions.md', 'nonservice-editorial-decisions.md'].map(f => fs.readFileSync(path.join(docs, f), 'utf8')).join('\n');
  const changedFiles = execFileSync('git', ['diff', '--name-only', '88b2ae6', 'HEAD', '--', '*.html'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/);
  const changed = new Set(pages.filter(p => changedFiles.includes(p.file)).map(p => p.path));
  const keepEvidence = new Map(Object.entries(JSON.parse(fs.readFileSync(path.join(docs, 'keep-acceptance-evidence.json'), 'utf8'))));
  const coverage = coverageRows(pages, decisions, changed, keepEvidence);
  const summary = { analyzedAt: new Date().toISOString(), pagesReviewed: pages.length, pagesChanged: changed.size, pagesKept: pages.length - changed.size, termRoutes: routes.length, localLinks: links, fragments, structuredFaqPages: checks.filter(x => x.structuredFaqs).length, structuredFaqAnswers: checks.reduce((a, x) => a + x.structuredFaqs, 0), issues: checks.flatMap(x => x.issues.map(issue => ({ path: x.path, issue }))) };
  return { summary, checks, coverage, pages };
}
function coverageMarkdown(result) {
  const esc = s => String(s).replaceAll('|', '\\|').replace(/\r?\n/g, ' ');
  return `# 第二轮逐页验收覆盖\n\n${result.summary.pagesReviewed}页逐页审阅；${result.summary.pagesChanged}页有公开HTML修改，${result.summary.pagesKept}页基于各自用途保留。字数仅记录体量，不决定分数。保留页独立证据见 keep-acceptance-evidence.json；其余编辑理由来自已评审决定，自动检查仅验证结构/目的地/文本语义。\n\n| 路径 | 类型 | 决定 | 编辑审阅 | 验收证据 | 主内容字数 |\n| --- | --- | --- | --- | --- | --- |\n` + result.coverage.map(p => `| ${p.path} | ${p.type} | ${p.decision} | ${esc(p.editorialDecision)} | ${esc(p.acceptanceEvidence)} | ${p.mainWords} |`).join('\n') + '\n';
}
module.exports = { auditPage, resolveLocalLink, coverageRows, coverageMarkdown, run, text };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const result = run(root);
  if (process.argv.includes('--artifacts')) {
    const docs = path.join(root, 'docs/seo/content-round2');
    fs.writeFileSync(path.join(docs, 'inventory-after.json'), JSON.stringify({ ...result.summary, source: 'local source HTML after approved Tasks 2 and 3', limitations: ['Editorial findings are not rankings, Google scores, measured AI visibility or external credential verification.'], pages: result.pages.map(({ mainText, ...p }) => p) }, null, 2) + '\n');
    fs.writeFileSync(path.join(docs, 'page-coverage.md'), coverageMarkdown(result));
    fs.mkdirSync(path.join(root, '.seo-cache'), { recursive: true });
    fs.writeFileSync(path.join(root, '.seo-cache/content-round2-static-acceptance.json'), JSON.stringify({ summary: result.summary, checks: result.checks }, null, 2) + '\n');
  }
  console.log(JSON.stringify(result.summary, null, 2));
  if (result.summary.issues.length) process.exitCode = 1;
}
