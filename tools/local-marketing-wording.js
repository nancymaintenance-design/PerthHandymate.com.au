'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
const decode = s => s.replaceAll('&amp;', '&');
const escape = s => s.replaceAll('&', '&amp;');
const explicit = {
  'How Our Perth Handyman Team Works': 'How Our Handyman Team Works',
  'Perth Handyman Service Areas': 'Find Local Handyman Service Areas',
  'Perth Handyman Repair & Maintenance Projects': 'Home Repair & Maintenance Projects',
  'Perth Home Maintenance Guides & Advice': 'Home Maintenance Guides & Advice',
  'Handyman Quotes in Perth: Home Repair Scope & Costs': 'Handyman Quotes: Home Repair Scope & Costs',
  'Perth Handyman & Home Repair Planning Guides': 'Handyman & Home Repair Planning Guides',
  'Property Maintenance in Perth: Organise Your Repair List': 'Property Maintenance: Organise Your Repair List',
  'Handyman Near You in Perth: Describe the Repair & Location': 'Looking for Home Repair Help Near Me?',
  'Local Handyman Services & Home Maintenance in Perth': 'Local Handyman Services & Home Maintenance',
  'How Our Perth Local Team Handles a Job': 'How Our Local Team Handles a Job',
  'Perth Handyman Service Request Process': 'Handyman Service Request Process',
  'Contact Ellis for Handyman Services in Perth': 'Contact Ellis About Your Home Repairs',
  'Handyman Quotes in Perth: Repair Scope & Costs': 'Handyman Quotes: Repair Scope & Costs',
  'Perth Handyman Quote & Repair Planning Guides': 'Handyman Quote & Repair Planning Guides',
};
function heading(value, file) {
  if (explicit[value]) return explicit[value];
  if (!file.startsWith('services/')) return value;
  return value.replaceAll('Talk to Our Perth Service Team', 'Talk to Our Local Service Team')
    .replaceAll('Book Our Perth Handyman Team', 'Book Our Local Handyman Team')
    .replaceAll('Perth Service Scope & Licensed Trade Requirements', 'Service Scope & Licensed Trade Requirements')
    .replace(/\s+in Perth(?=\s*(?:[:—&]|$))/, '')
    .replace(/\s+Perth(?=: Repair Planning Guides)/, '')
    .replaceAll('Perth Home Repair Services: Choose the Surface or Fitting', 'Home Repair Services: Choose the Surface or Fitting');
}
const replacements = [
  ['Explore common local handyman services in Perth, or search in your own words', 'Explore common home repair services, or search in your own words'],
  ['Browse Perth service areas and choose the service you need.', 'Browse the nine regions and choose the repair service you need.'],
  ['Ellis’s Perth team assesses home repairs and maintenance', 'Our local team assesses home repairs and maintenance'],
];
function adaptString(value, file) {
  for (const [before, after] of replacements) value = value.replaceAll(before, after);
  return value.replace(/(<h2[^>]*>)([^<]+)(<\/h2>)/g, (_, a, text, b) => a + escape(heading(decode(text), file)) + b);
}
function apply() {
  const policyFile = path.join(root, 'data/heading-keyword-policy.json');
  const policy = JSON.parse(fs.readFileSync(policyFile, 'utf8'));
  const datesFile = path.join(root, 'data/content-modifications.json');
  const dates = JSON.parse(fs.readFileSync(datesFile, 'utf8'));
  const files = [...walk(path.join(root, 'services')), ...walk(path.join(root, 'areas')), ...['index.html', 'about/index.html', 'contact/index.html', 'faq/index.html'].map(f => path.join(root, f))];
  const evidence = [];
  const { areas } = require('./render-regions');
  const catalog = require('../data/service-catalog.json').canonicalServices;
  for (const file of files) {
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const before = fs.readFileSync(file, 'utf8');
    let after = adaptString(before, relative);
    const service = catalog.find(s => relative === s.url.replace(/^\//, '') + 'index.html');
    if (service) after = after.replace(/(<section class="section shell city-service-band">)([\s\S]*?)(<\/section>)/, (_, a, body, b) => {
      const firstHref = body.match(/href="([^"]*contact\/\?[^\"]+)"/)?.[1];
      if (!firstHref) return a + body + b;
      const additions = areas.slice(7).filter(area => !body.includes(escape(area.name))).map(area => {
        const [route, search] = firstHref.split('?');
        const params = new URLSearchParams(search.replaceAll('&amp;', '&'));
        params.set('suburb', area.name);
        return `<a href="${route}?${params}">${escape(area.name)}</a>`;
      }).join('');
      if (body.includes('<div class="chip-list">')) body = body.replace(/(<div class="chip-list">[\s\S]*?)(<\/div>)/, '$1' + additions + '$2');
      else body += additions;
      return a + body + b;
    });
    const entry = policy.pages[relative];
    if (entry) {
      for (const key of Object.keys(entry.headings)) entry.headings[key] = heading(entry.headings[key], relative);
      for (const m of before.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)) {
        const old = decode(m[1]), next = heading(old, relative);
        if (old !== next) entry.headings[old] = next;
      }
    }
    if (after !== before) {
      evidence.push({ file: relative, beforePerth: (before.match(/Perth/g) || []).length, afterPerth: (after.match(/Perth/g) || []).length, headings: [...before.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map(m => [decode(m[1]), heading(decode(m[1]), relative)]).filter(([a, b]) => a !== b) });
      fs.writeFileSync(file, after);
    }
    if (after !== before || relative.startsWith('areas/')) dates.routes['/' + relative.replace(/index\.html$/, '')] = { date: '2026-10-14', reason: 'Confirmed nine-region repair discovery, named-suburb context or secondary marketing wording revised locally.', source: 'Approved Task 2 brief; tools/render-regions.js; tools/local-marketing-wording.js' };
  }
  fs.writeFileSync(policyFile, JSON.stringify(policy, null, 2) + '\n');
  fs.writeFileSync(datesFile, JSON.stringify(dates, null, 2) + '\n');
  // Refresh only quoted evidence after an editorial change; authoritative term routing is untouched.
  const coverageFile = path.join(root, 'docs/seo/content-expansion-2026-10-12/coverage.json');
  const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  for (const row of coverage.records) for (const key of ['bodyEvidence', 'decisionEvidence', 'scenarioEvidence']) {
    if (!row[key]?.excerpt) continue;
    for (const [before, after] of replacements) row[key].excerpt = row[key].excerpt.replaceAll(before, after);
  }
  coverage.analyzedAt = '2026-10-14';
  const header = Object.entries(coverage).filter(([key]) => key !== 'records').map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`).join('\n');
  fs.writeFileSync(coverageFile, '{\n' + header + '\n  "records": [\n' + coverage.records.map(row => '    ' + JSON.stringify(row)).join(',\n') + '\n  ]\n}\n');
  const evidenceFile = path.join(root, '.superpowers/sdd/approved-execution/task-2-wording-coverage.json');
  if (evidence.length) fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2) + '\n');
  console.log(`Reviewed ${files.length} non-guide marketing pages; changed ${evidence.length}.`);
}
if (require.main === module) apply();
module.exports = { adaptString, heading };
