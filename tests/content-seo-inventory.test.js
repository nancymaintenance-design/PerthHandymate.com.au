const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseKeywordMap, validateKeywordSnapshot, extractPage, inventorySite, mapOwners, mapKeywordTerms, keywordMatrix } = require('../tools/content-seo-inventory');
const root = path.resolve(__dirname, '..');
const fixture = `| O01 | Home repairs | /candidate/ | entry | 1 | P1 | small repairs | merge synonyms | confirm scope |
### O01 — Home repairs
#### Core terms
- \`small repairs perth\` — research translation
  - ID: HM0001; theme: H01 Repairs; intent: service; priority: P1; AU monthly estimate: 0; Semrush KD: 0; audience: owners`;

test('keyword parser preserves owner/category, metadata, zero estimates and unknown blanks', () => {
  const parsed = parseKeywordMap(fixture);
  assert.equal(parsed.owners[0].candidatePath, '/candidate/');
  assert.deepEqual(parsed.terms[0], { id: 'HM0001', owner: 'O01', category: 'Core terms', term: 'small repairs perth', theme: 'H01 Repairs', intent: 'service', priority: 'P1', audience: 'owners', auMonthlyEstimate: 0, semrushKD: 0 });
  const unknown = parseKeywordMap(fixture.replace('; AU monthly estimate: 0; Semrush KD: 0', ''));
  assert.equal(unknown.terms[0].auMonthlyEstimate, null);
  assert.equal(unknown.terms[0].semrushKD, null);
});

test('keyword parser rejects missing IDs, categories, owners and malformed records', () => {
  assert.throws(() => parseKeywordMap(fixture.replace('ID: HM0001; ', '')), /ID/);
  assert.throws(() => parseKeywordMap(fixture.replace('#### Core terms\n', '')), /category/i);
  assert.throws(() => parseKeywordMap(fixture.replace('### O01 — Home repairs\n', '')), /owner/i);
  assert.throws(() => parseKeywordMap(fixture.replace('small repairs perth`', 'small repairs perth')), /malformed/i);
  assert.throws(() => parseKeywordMap(fixture.replace('theme: H01 Repairs; ', '')), /theme/);
});

test('keyword parser rejects duplicate IDs instead of silently losing records', () => {
  assert.throws(() => parseKeywordMap(fixture + '\n- `other repairs`\n  - ID: HM0001; theme: H01 Repairs; intent: service; priority: P1; audience: owners'), /duplicate.*HM0001/i);
});

test('HTML inventory extracts main intent, hierarchy, FAQ, contextual links and evidence only', () => {
  const html = `<title>Repair &amp; quote</title><link href="https://www.perthhandymate.com.au/services/example/" rel="canonical"><header><h2>Global navigation</h2><a href="/guides/outside/">Outside</a></header><main><nav><a href="/services/">Breadcrumb</a></nav><h1>Repair &amp; care</h1><p>Assess the damaged hinge on site. Written quote follows.</p><h3>Check support</h3><a href="../../guides/hinges/">Hinge advice</a><a href="https://www.perthhandymate.com.au/projects/hinge/">Repair example</a><a href="/contact/?q=hinge">Book assessment</a><a href="#top">Top</a><a href="https://example.com/">External</a><img src="/original.jpg" alt="Hinge repair"><details><summary>Can it be repaired?</summary><p>We check the support first.</p></details><script>ignored words</script><script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Can it be repaired?"}]}</script></main><footer>Footer words</footer>`;
  const page = extractPage(html, '/services/example/');
  assert.equal(page.title, 'Repair & quote');
  assert.deepEqual(page.h1, ['Repair & care']);
  assert.deepEqual(page.headings.map(x => x.level), [1, 3]);
  assert.ok(page.findings.some(x => x.includes('Heading level jumps')));
  assert.equal(page.faqCount, 1);
  assert.equal(page.structuredFaqCount, 1);
  assert.deepEqual(page.contextualInternalLinks.map(x => x.path), ['/guides/hinges/', '/projects/hinge/']);
  assert.equal(page.conversion.contactLinks, 1);
  assert.equal(page.evidence.images.length, 1);
  assert.equal(page.evidence.projectLinks, 1);
  assert.ok(!page.mainText.includes('Footer words'));
  assert.ok(!page.mainText.includes('ignored words'));
  assert.ok(!page.mainText.includes('Breadcrumb'));
  assert.equal(page.mainWordCount, 30);
});

test('missing main and mismatched FAQ surface actionable findings; legal intent stays separate', () => {
  const empty = extractPage('<title>Privacy</title>', '/privacy/');
  assert.equal(empty.type, 'privacy');
  assert.ok(empty.findings.includes('Missing main content element.'));
  assert.ok(!empty.findings.some(x => /expand|handyman/i.test(x)));
  const faq = extractPage('<main><h1>Help</h1><details><summary>Question?</summary><p>Answer.</p></details></main>', '/faq/');
  assert.ok(faq.findings.some(x => /FAQ count/.test(x)));
});

test('durable research snapshot has exactly 527 distinct records and 31 owners without attachment access', () => {
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'docs/seo/content-round2/keyword-source.json'), 'utf8'));
  validateKeywordSnapshot(snapshot, { terms: 527, owners: 31 });
  assert.equal(new Set(snapshot.terms.map(x => x.term)).size, 527);
  const broken = structuredClone(snapshot);
  broken.terms.pop();
  assert.throws(() => validateKeywordSnapshot(broken, { terms: 527, owners: 31 }), /527/);
  broken.terms.push({ ...broken.terms[0], id: 'HM0527', owner: 'O99' });
  assert.throws(() => validateKeywordSnapshot(broken, { terms: 527, owners: 31 }), /owner/i);
});

test('actual inventory covers 113 sitemap routes and 404, with every commercial owner on an existing URL', () => {
  const pages = inventorySite(root);
  assert.equal(pages.length, 114);
  assert.equal(new Set(pages.map(x => x.path)).size, 114);
  assert.equal(pages.filter(x => x.type === 'service-detail').length, 67);
  assert.equal(pages.filter(x => x.type === 'guide').length, 12);
  assert.ok(pages.some(x => x.path === '/404.html' && x.type === 'not-found'));
  assert.ok(!pages.some(x => /google.*\.html/.test(x.path)));
  const mapping = mapOwners(root);
  assert.equal(mapping.length, 31);
  for (const owner of mapping) assert.ok(pages.some(page => page.path === owner.primaryPath), owner.owner);
});

test('mixed research owners route plumbing, electricity and security by task rather than blanket cluster URL', () => {
  const routes = new Map(mapKeywordTerms(root).map(term => [term.id, term]));
  const plumbing = '/services/electrical-plumbing-gas-air-conditioning/plumbers/';
  const electrical = '/services/electrical-plumbing-gas-air-conditioning/electricians/';
  for (const id of ['HM0452', 'HM0455', 'HM0459']) {
    assert.equal(routes.get(id).primaryPath, plumbing, id);
    assert.equal(routes.get(id).owner, 'O30', 'research owner label preserved');
  }
  for (const id of ['HM0453', 'HM0456', 'HM0460', 'HM0176']) assert.equal(routes.get(id).primaryPath, electrical, id);
  for (const id of ['HM0462', 'HM0461', 'HM0523']) assert.equal(routes.get(id).primaryPath, '/guides/when-home-maintenance-needs-a-licensed-trade/', id);
});

test('flooring, gardening, safety and informational terms use existing intent-appropriate destinations', () => {
  const routes = new Map(mapKeywordTerms(root).map(term => [term.id, term]));
  for (const id of ['HM0276', 'HM0277', 'HM0278', 'HM0279', 'HM0282', 'HM0285', 'HM0286']) {
    assert.equal(routes.get(id).primaryPath, '/services/handyman-interiors-appliance-repairs/handymen/#minor-floor-repairs', id);
    assert.equal(routes.get(id).owner, 'O19');
  }
  assert.equal(routes.get('HM0265').primaryPath, '/services/handyman-interiors-appliance-repairs/tiling/');
  assert.equal(routes.get('HM0354').primaryPath, '/services/gardens-landscaping/garden-clean-up/');
  assert.equal(routes.get('HM0358').primaryPath, '/services/gardens-landscaping/gardeners/');
  assert.equal(routes.get('HM0363').primaryPath, '/services/gardens-landscaping/tree-arborists/');
  assert.equal(routes.get('HM0004').primaryPath, '/guides/how-to-find-the-right-home-repairer/');
  assert.equal(routes.get('HM0011').primaryPath, '/guides/when-home-maintenance-needs-a-licensed-trade/');
  assert.equal(routes.get('HM0450').primaryPath, '/guides/prepare-before-home-repair-quote/');
  assert.equal(routes.get('HM0287').primaryPath, '/services/outdoor-structures-fencing-pools/timber-fencing/');
  assert.equal(routes.get('HM0308').primaryPath, '/services/outdoor-structures-fencing-pools/pool-fence-installers/');
});

test('all 527 term routes are unique by ID, resolve existing pages/anchors and drive the durable matrix', () => {
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'docs/seo/content-round2/keyword-source.json'), 'utf8'));
  const routes = mapKeywordTerms(root);
  assert.equal(routes.length, 527);
  assert.equal(new Set(routes.map(term => term.id)).size, 527);
  for (const term of routes) {
    assert.ok(term.routingReason, term.id);
    assert.equal(term.owner, snapshot.terms.find(item => item.id === term.id).owner);
    const url = new URL(term.primaryPath, 'https://www.perthhandymate.com.au');
    const file = path.join(root, url.pathname === '/' ? 'index.html' : url.pathname.slice(1) + 'index.html');
    assert.ok(fs.existsSync(file), `${term.id}: ${term.primaryPath}`);
    if (url.hash) assert.ok(fs.readFileSync(file, 'utf8').includes(`id="${url.hash.slice(1)}"`), term.id);
  }
  const matrix = keywordMatrix(snapshot, mapOwners(root), routes);
  const savedMatrix = fs.readFileSync(path.join(root, 'docs/seo/content-round2/keyword-page-matrix.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(savedMatrix, matrix, 'saved matrix matches generator, including contiguous Markdown table rows');
  const rows = matrix.split('\n').filter(line => /^\| HM\d{4} \|/.test(line));
  assert.equal(rows.length, 527);
  for (const term of routes) assert.ok(rows.find(row => row.startsWith(`| ${term.id} |`)).includes(`| ${term.primaryPath} |`), term.id);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'docs/seo/content-round2/term-routing.json'), 'utf8')), routes, 'durable routing metadata agrees with generator');
  const savedRows = fs.readFileSync(path.join(root, 'docs/seo/content-round2/keyword-page-matrix.md'), 'utf8').split('\n').filter(line => /^\| HM\d{4} \|/.test(line));
  assert.equal(savedRows.length, 527);
  for (const term of routes) assert.ok(savedRows.find(row => row.startsWith(`| ${term.id} |`)).includes(`| ${term.primaryPath} |`), `saved ${term.id}`);
});
