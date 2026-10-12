// Read-only evidence checks. Editorial relevance still requires a human semantic review.
const { extractPage } = require('./content-seo-inventory');
const { text } = require('./content-round2-acceptance');
const voidTags = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))?.slice(1).find(x => x !== undefined) || '';
}
function tree(html) {
  const root = { tag: 'root', children: [] }, stack = [root];
  // Raw script contents are data and cannot introduce apparent body elements.
  const source = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  for (const match of source.matchAll(/<\/?([\w:-]+)\b[^>]*>|[^<]+/g)) {
    const token = match[0];
    if (!token.startsWith('<')) { stack.at(-1).children.push(token); continue; }
    const tag = match[1].toLowerCase();
    if (token.startsWith('</')) {
      const index = stack.findLastIndex(node => node.tag === tag);
      if (index > 0) stack.length = index;
      continue;
    }
    const node = { tag, id: attribute(token, 'id'), children: [], parent: stack.at(-1),
      hidden: /\s(?:hidden|inert)(?:\s|=|>)/i.test(token) || attribute(token, 'aria-hidden') === 'true' || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attribute(token, 'style')) };
    stack.at(-1).children.push(node);
    if (!voidTags.has(tag) && !token.endsWith('/>')) stack.push(node);
  }
  return root;
}
function descendants(node, predicate) {
  if (!node || typeof node === 'string' || node.hidden) return [];
  return [...(predicate(node) ? [node] : []), ...node.children.flatMap(child => descendants(child, predicate))];
}
function visibleText(node, omitDetails = false) {
  if (typeof node === 'string') return node;
  if (!node || node.hidden || ['head', 'script', 'style', 'template', 'svg', 'nav'].includes(node.tag) || (omitDetails && node.tag === 'details')) return '';
  return node.children.map(child => visibleText(child, omitDetails)).join(' ');
}
function hasAncestor(node, tag) { for (let p = node; p; p = p.parent) if (p.tag === tag) return true; return false; }
function validateCoverage(rows, original, read) {
  const issues = [], cache = new Map();
  if (!Array.isArray(rows) || rows.length !== original.length) issues.push('Coverage record count differs from original');
  if (!Array.isArray(rows)) return issues;
  const ids = new Set();
  const load = route => {
    if (!cache.has(route)) {
      const html = read(route);
      cache.set(route, html ? { root: tree(html), page: extractPage(html, route) } : null);
    }
    return cache.get(route);
  };
  const locate = (row, evidence, kind) => {
    if (!evidence || !evidence.path || !evidence.fragment) { issues.push(`${row.id}: missing ${kind} evidence/fragment`); return null; }
    const page = load(evidence.path);
    if (!page) { issues.push(`${row.id}: missing ${kind} page`); return null; }
    const main = descendants(page.root, node => node.tag === 'main')[0];
    const matches = descendants(main, node => node.id === evidence.fragment.replace(/^#/, ''));
    if (matches.length !== 1) { issues.push(`${row.id}: missing/ambiguous visible ${kind} fragment ${evidence.fragment}`); return null; }
    return matches[0];
  };
  for (const [index, row] of rows.entries()) {
    if (ids.has(row.id)) issues.push(`${row.id}: duplicate ID`);
    ids.add(row.id);
    for (const field of ['id', 'term', 'owner', 'category']) if (row[field] !== original[index]?.[field]) issues.push(`${row.id}: original ${field}/order changed`);
    if (!['covered', 'boundary'].includes(row.status)) issues.push(`${row.id}: invalid status`);
    if (!row.currentPath || !load(row.currentPath)) issues.push(`${row.id}: missing current owner page`);
    if (row.status === 'boundary' && !row.boundaryReason) issues.push(`${row.id}: missing boundary reason`);
    const body = locate(row, row.bodyEvidence, 'body');
    if (body) {
      const excerpt = text(row.bodyEvidence.excerpt || '');
      const prose = descendants(body, node => ['p', 'li'].includes(node.tag) && !hasAncestor(node, 'details')).map(node => text(visibleText(node, true))).join(' ');
      if (excerpt.length < 25 || !text(prose).includes(excerpt)) issues.push(`${row.id}: body excerpt absent from stated fragment prose outside FAQ`);
    }
    if (row.category === '问题科普词') {
      if (!row.bodyEvidence?.path?.startsWith('/services/')) issues.push(`${row.id}: educational body must be service prose`);
      const faq = locate(row, row.faqEvidence, 'FAQ');
      if (faq) {
        const match = descendants(faq, node => node.tag === 'details').filter(item => {
          const summary = item.children.find(child => child?.tag === 'summary');
          return summary && text(visibleText(summary)) === text(row.faqEvidence.question || '');
        });
        const answer = match.length === 1 ? text(match[0].children.filter(child => child?.tag !== 'summary').map(child => visibleText(child)).join(' ')) : '';
        if (!row.faqEvidence.answerExcerpt || !answer.includes(text(row.faqEvidence.answerExcerpt))) issues.push(`${row.id}: FAQ question/answer not in same visible details item`);
      }
    }
    for (const [category, field] of [['意向提问词', 'decisionEvidence'], ['场景使用词', 'scenarioEvidence']]) if (row.category === category) {
      const node = locate(row, row[field], field);
      if (node && (!row[field].excerpt || !text(visibleText(node)).includes(text(row[field].excerpt)))) issues.push(`${row.id}: ${field} excerpt absent from fragment`);
    }
  }
  return issues;
}
module.exports = { validateCoverage };
if (require.main === module) {
  const fs = require('node:fs'), path = require('node:path'), root = path.resolve(__dirname, '..');
  const rows = require('../docs/seo/content-expansion-2026-10-12/coverage.json').records;
  const issues = validateCoverage(rows, require('../docs/seo/content-round2/term-routing.json'), route => {
    const file = path.join(root, route === '/' ? 'index.html' : route.slice(1) + 'index.html');
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  });
  console.log(JSON.stringify({ records: rows.length, educational: rows.filter(row => row.category === '问题科普词').length, issues }, null, 2));
  if (issues.length) process.exitCode = 1;
}
