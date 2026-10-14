const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const slugs = fs.readdirSync(path.join(root, 'guides')).filter(s => fs.existsSync(path.join(root, 'guides', s, 'index.html')));
const plain = s => s.replace(/<[^>]+>/g, ' ').replaceAll('&amp;', '&').replace(/\s+/g, ' ').trim();
const { execFileSync } = require('node:child_process');
// Catches missing/duplicated destinations and category navigation pointing nowhere.
test('guide categories expose each of the twelve articles once through real fragment links', () => {
  const html = read('guides/index.html');
  const nav = html.match(/<nav[^>]*aria-label="Guide categories"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav, 'category navigation is missing');
  const anchors = [...nav.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
  assert.equal(anchors.length, 5); assert.equal(new Set(anchors).size, 5);
  for (const id of anchors) assert.ok(html.includes(`id="${id}"`));
  const cards = [...html.matchAll(/<article class="guide-card"[^>]*>([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length, 12);
  for (const slug of slugs) assert.equal(cards.filter(m => m[1].includes(`/guides/${slug}/`)).length, 1, slug);
});
// Catches a regenerated short title/opening, missing conclusion, or detached FAQ links.
test('each article retains scenario, educational opening and closing with navigable sections', () => {
  const scenarios = {
    'cupboard-hinges-drawer-runners-repair-guide': /fallen|pulled|won.t close/i,
    'sticking-doors-windows-repair-guide': /carpet|rain|dragging/i,
    'wall-patching-paint-touch-ups-guide': /handle|hole|visible patch/i,
    'shower-silicone-grout-waterproofing-guide': /leak.*silicone|silicone.*leak/i,
    'how-to-find-the-right-home-repairer': /hinges.*shelves.*wall/i,
    'when-home-maintenance-needs-a-licensed-trade': /cabinet.*leak|leak.*cabinet/i,
    'prepare-before-home-repair-quote': /moving.*furniture|furniture.*moving/i,
    'photos-and-clear-scope-for-home-repairs': /curtain.*pulled|pulled.*curtain/i,
    'home-repair-priorities': /open home|photography/i,
    'seasonal-home-maintenance-australia': /rain|overflow/i,
    'property-manager-maintenance-coordination': /inspection|vacate/i,
    'understanding-service-areas-and-postcode-checks': /unit|apartment/i
  };
  for (const slug of slugs) {
    const html = read(`guides/${slug}/index.html`);
    assert.match(plain(html.match(/<h1[^>]*>(.*?)<\/h1>/s)[1]), scenarios[slug], slug);
    const intro = html.match(/<div class="guide-introduction">([\s\S]*?)<\/div>/)?.[1];
    const close = html.match(/<section[^>]*class="guide-conclusion"[^>]*>([\s\S]*?)<\/section>/)?.[1];
    assert.ok(intro && close, slug + ': opening and conclusion');
    assert.ok(plain(intro).split(' ').length >= 65, slug + ': substantial problem framing');
    assert.ok(plain(close).split(' ').length >= 65, slug + ': substantive recap');
    assert.match(close, /href="#assessment-questions"/); assert.match(close, /href="[^"]*services\//);
    assert.match(html, /aria-label="In this guide"/);
    assert.match(html, /Updated 2026-10-14/);
  }
});
test('canonical renderer and legacy editorial adapter restore an altered guide and repeat without drift', () => {
  const { editHtml, plans } = require('../tools/nonservice-content-round2');
  for (const file of ['guides/index.html', ...slugs.map(s => `guides/${s}/index.html`)]) {
    const current = read(file);
    const damaged = current.replace(/<h1[^>]*>.*?<\/h1>/s, '<h1>Old generator title</h1>').replace(/<main[^>]*>[\s\S]*?<\/main>/, '<main><h1>Old generator title</h1><p>Old generator body</p></main>');
    const out = editHtml(damaged, plans[file]);
    assert.equal(out, current, file + ': restore full maintained content');
    assert.equal(editHtml(out, plans[file]), out, file + ': idempotence');
  }
});
// Catches dropped useful advice/answers during a layout rewrite, beyond word count.
test('all previously approved guide body paragraphs and FAQs survive the library reorganization', () => {
  const { guides } = require('../data/guide-library');
  for (const g of guides) {
    const before = execFileSync('git', ['show', `831598f:guides/${g.slug}/index.html`], { cwd: root, encoding: 'utf8' });
    const priorMain = before.match(/<div class="article-shell article-body">([\s\S]*?)<\/main>/)[1];
    const current = plain(read(`guides/${g.slug}/index.html`).match(/<main[^>]*>([\s\S]*?)<\/main>/)[1]);
    for (const m of priorMain.matchAll(/<(p|summary)\b[^>]*>(.*?)<\/\1>/gs)) {
      const expected = plain(m[2]).replace('This guide helps you describe a fault and plan an assessment.', 'This guide helps you describe a fault and plan an on-site assessment.');
      assert.ok(current.includes(expected), `${g.slug}: lost ${expected.slice(0, 90)}`);
    }
  }
});
test('current guide inventories and heading policy converge on the canonical scenario identity', () => {
  const vm = require('node:vm'), sandbox = { window: {} };
  vm.runInNewContext(read('data/content.js'), sandbox);
  const repair = JSON.parse(read('data/keyword-content-round.json'));
  const policy = JSON.parse(read('data/heading-keyword-policy.json'));
  const { transform } = require('../scripts/apply-heading-keywords');
  const { guides } = require('../data/guide-library');
  for (const g of guides) {
    const inventory = [...sandbox.window.ELLIS_CONTENT.guides, ...repair.guides].filter(item => item.slug === g.slug);
    assert.equal(inventory.length, 1);
    assert.equal(inventory[0].title, g.title); assert.equal(inventory[0].editorialSource, 'data/guide-library.js');
    const file = `guides/${g.slug}/index.html`, html = read(file);
    assert.equal(policy.pages[file].h1, g.title);
    assert.equal(transform(html, policy.pages[file]), html, file + ': heading application drift');
  }
});
