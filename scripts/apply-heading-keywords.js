// Explicit, reviewed keyword headings; does not generate new services or URLs.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'data/heading-keyword-policy.json'), 'utf8'));
const decode = s => s.replace(/<[^>]*>/g, '').replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const guideLabels = new Map(Object.entries(policy.pages).filter(([f, p]) => f.startsWith('guides/') && p.h1).map(([f, p]) => [p.beforeH1, p.h1]));

function transform(html, entry) {
  if (entry.title) html = html.replace(/(<title>)[\s\S]*?(<\/title>)/, (_, a, b) => a + escape(entry.title) + b);
  if (entry.h1) html = html.replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/, (_, a, b) => a + escape(entry.h1) + b);
  html = html.replace(/(<h2\b[^>]*>)([\s\S]*?)(<\/h2>)/g, (raw, a, content, b) => {
    const next = entry.headings[decode(content)];
    return next ? a + escape(next) + b : raw;
  });
  // Keep guide cards and descriptive internal links aligned with the article H1.
  html = html.replace(/(<a\b[^>]*>)([^<]*)(<\/a>)/g, (raw, a, label, b) => guideLabels.has(decode(label)) ? a + escape(guideLabels.get(decode(label))) + b : raw);
  if (entry.h1) html = html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (raw, a, json, b) => {
    const block = JSON.parse(json);
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      for (const [key, item] of Object.entries(value)) {
        if (['headline', 'name'].includes(key) && item === entry.beforeH1) value[key] = entry.h1;
        else if (item && typeof item === 'object') visit(item);
      }
    };
    visit(block);
    return a + JSON.stringify(block) + b;
  });
  return html;
}

function apply() {
  let updated = 0;
  for (const [file, entry] of Object.entries(policy.pages)) {
    const target = path.join(root, file), before = fs.readFileSync(target, 'utf8');
    const after = transform(before, entry);
    if (before !== after) { fs.writeFileSync(target, after); updated++; }
  }
  const target = path.join(root, 'data/content.js');
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(target, 'utf8'), sandbox);
  const content = sandbox.window.ELLIS_CONTENT;
  for (const guide of content.guides) {
    const entry = policy.pages[`guides/${guide.slug}/index.html`];
    if (!entry?.h1) continue;
    guide.title = entry.h1;
    guide.metaTitle = entry.title;
    for (const section of guide.sections || []) if (entry.headings[section[0]]) section[0] = entry.headings[section[0]];
  }
  const rendered = '/* Maintainable public content inventory. Edit source and regenerate pages before release. */\nwindow.ELLIS_CONTENT=' + JSON.stringify(content, null, 2) + ';\n';
  if (fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== rendered) fs.writeFileSync(target, rendered);
  const repairTarget = path.join(root, 'data/keyword-content-round.json');
  const repair = JSON.parse(fs.readFileSync(repairTarget, 'utf8'));
  for (const guide of repair.guides) {
    const entry = policy.pages[`guides/${guide.slug}/index.html`];
    if (entry?.h1) guide.title = entry.h1;
  }
  const repairText = JSON.stringify(repair, null, 2) + '\n';
  if (fs.readFileSync(repairTarget, 'utf8').replace(/\r\n/g, '\n') !== repairText) fs.writeFileSync(repairTarget, repairText);
  console.log(`Applied reviewed keyword headings: ${updated} of ${Object.keys(policy.pages).length} HTML pages updated.`);
}
if (require.main === module) apply();
module.exports = { transform };
