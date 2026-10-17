const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { inventorySite, extractPage } = require('../tools/content-seo-inventory');
const { auditPage, resolveLocalLink } = require('../tools/content-round2-acceptance');
const root = path.resolve(__dirname, '..');
const origin = 'https://www.perthhandymate.com.au';
const routes = [
  ['/services/doors-windows-glass-screens/sliding-door-repairs/', 'sliding door repairs', 'Doors, windows, glass & screens'],
  ['/services/property-maintenance/', 'property maintenance', 'Handyman, interiors & appliance repairs'],
  ['/services/handyman-interiors-appliance-repairs/furniture-assembly/', 'flat pack assembly', 'Handyman, interiors & appliance repairs'],
  ['/services/handyman-interiors-appliance-repairs/tv-wall-mounting/', 'tv wall mounting', 'Handyman, interiors & appliance repairs'],
];
const read = route => { const file = path.join(root, route === '/' ? 'index.html' : route.slice(1) + (route.endsWith('/') ? 'index.html' : '')); return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null; };
const reportsParent = path.resolve(root, '../reports/content-gap-local-2026-10-12');

function createIndexPolicyFixture(t, parent) {
  fs.mkdirSync(parent, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(parent, 'task-1-index-policy-'));
  t.after(() => {
    assert.equal(path.dirname(temporary), path.resolve(parent), 'cleanup stays inside the fixture reports parent');
    fs.rmSync(temporary, { recursive: true, force: true });
  });
  return temporary;
}

test('four focused service destinations have contextual discovery, useful FAQs and scoped contact prefill', () => {
  const pages = inventorySite(root);
  for (const [route, query, category] of routes) {
    assert.ok(pages.some(p => p.path === route), `${route}: missing indexed route`);
    const html = read(route);
    const page = extractPage(html, route);
    assert.deepEqual(auditPage(html, route).issues, [], route);
    const usefulStructure=route==='/services/property-maintenance/'?['maintenance-plans','included-services','work-process','charging-standards','aftercare','contact-team'].every(id=>html.includes(`id="${id}"`)):page.faqCount>=3;
    assert.ok(page.title && /<meta name="description" content="[^"]+"/.test(html) && usefulStructure, `${route}: title, description and focused service information`);
    assert.ok(new Set(pages.filter(p => p.path !== route && p.contextualInternalLinks.some(link => link.path === route)).map(p => p.path)).size >= 3, `${route}: fewer than three contextual inbound pages`);
    assert.ok(page.contextualInternalLinks.some(link => link.path.startsWith('/guides/')), `${route}: supporting advice`);
    const contacts = [...html.matchAll(/href="([^"]*contact\/\?[^"]*)"/g)].map(m => new URL(m[1].replaceAll('&amp;', '&'), origin + route));
    assert.ok(contacts.some(url => url.searchParams.get('service') === category && url.searchParams.get('q')), `${route}: usable service and job prefill`);
    assert.doesNotMatch(page.mainText, /A\$\d|guaranteed|NDIS registered|washing.machine repairs|gas heater servicing|reticulation repairs/i);
  }
});

test('search resolves focused tasks to supplements while retaining the original 67 priced service records', () => {
  global.window = global;
  delete require.cache[require.resolve('../data/search-catalog.js')];
  require('../data/search-catalog.js');
  const api = require('../assets/js/site.js');
  const catalog = require('../data/service-catalog.json');
  assert.equal(catalog.canonicalServices.length, 67);
  for (const [route, query, category] of routes) {
    const found = api.resolveServiceSearch(query, '6000');
    assert.equal('/' + found.route, route, query);
    assert.equal(found.service, category, query);
    const prefill = api.buildContactPrefill(`?service=${encodeURIComponent(found.service)}&q=${encodeURIComponent(query)}&postcode=6000`);
    assert.equal(prefill.location, '6000');
    assert.ok(prefill.message.includes(query));
  }
});

test('current acceptance covers all 127 pages and preserves every original term destination and fragment', () => {
  const pages = inventorySite(root);
  assert.equal(pages.length, 127);
  assert.equal(new Set(pages.map(p => p.title)).size, 127, 'unique page titles');
  const descriptions = pages.map(p => read(p.path).match(/<meta name="description" content="([^"]+)"/)?.[1]);
  assert.ok(descriptions.every(Boolean));
  assert.equal(new Set(descriptions).size, 127, 'unique descriptions');
  const issues = [];
  for (const page of pages) {
    const html = read(page.path);
    issues.push(...auditPage(html, page.path).issues.map(x => `${page.path}: ${x}`));
    for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
      const issue = resolveLocalLink(match[1], page.path, read);
      if (issue) issues.push(`${page.path}: ${issue}`);
    }
  }
  const terms = require('../docs/seo/content-round2/term-routing.json');
  assert.equal(terms.length, 527);
  assert.equal(new Set(terms.map(t => t.id)).size, 527);
  for (const term of terms) assert.equal(resolveLocalLink(term.primaryPath, '/', read), null, term.id);
  assert.deepEqual(issues, []);
});

test('indexing fixture creates a missing reports parent and cleans only its own directory', async t => {
  fs.mkdirSync(reportsParent, { recursive: true });
  const ownedRoot = fs.mkdtempSync(path.join(reportsParent, 'task-1-reports-fixture-regression-'));
  t.after(() => {
    assert.equal(path.dirname(ownedRoot), reportsParent);
    fs.rmSync(ownedRoot, { recursive: true, force: true });
  });
  const missingParent = path.join(ownedRoot, 'fresh-clone', 'reports');
  assert.equal(fs.existsSync(missingParent), false);
  let temporary;
  await t.test('use the reports fixture', child => {
    temporary = createIndexPolicyFixture(child, missingParent);
    assert.equal(fs.existsSync(temporary), true);
    fs.writeFileSync(path.join(missingParent, 'keep.txt'), 'unrelated sibling');
  });
  assert.equal(typeof temporary, 'string', 'fixture creation succeeds for a missing parent');
  assert.equal(fs.existsSync(temporary), false, 'test completion removes its fixture');
  assert.equal(fs.readFileSync(path.join(missingParent, 'keep.txt'), 'utf8'), 'unrelated sibling');
});

test('indexing rebuild preserves the four supplemental routes in sitemap and search without changing priced services', t => {
  const temporary = createIndexPolicyFixture(t, reportsParent);
  fs.mkdirSync(path.join(temporary, 'scripts'));
  fs.copyFileSync(path.join(root, 'scripts/apply-indexing-policy.js'), path.join(temporary, 'scripts/apply-indexing-policy.js'));
  for (const directory of ['services', 'data']) fs.cpSync(path.join(root, directory), path.join(temporary, directory), { recursive: true });
  fs.copyFileSync(path.join(root, 'index.html'), path.join(temporary, 'index.html'));
  const before = fs.readFileSync(path.join(temporary, 'data/service-catalog.json'), 'utf8');
  execFileSync(process.execPath, [path.join(temporary, 'scripts/apply-indexing-policy.js')]);
  const sitemap = fs.readFileSync(path.join(temporary, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
  assert.equal(urls.length, 126);
  for (const [route] of routes) assert.ok(urls.includes(route), route);
  const search = fs.readFileSync(path.join(temporary, 'data/search-catalog.js'), 'utf8');
  const entries = JSON.parse(search.slice('window.ELLIS_SEARCH_CATALOG='.length).trim().replace(/;$/, ''));
  assert.equal(entries.length, 75);
  for (const [route] of routes) assert.ok(entries.some(item => '/' + item.route === route), route);
  assert.equal(fs.readFileSync(path.join(temporary, 'data/service-catalog.json'), 'utf8'), before);
});
