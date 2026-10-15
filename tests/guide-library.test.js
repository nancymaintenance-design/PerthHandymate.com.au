const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const slugs = fs.readdirSync(path.join(root, 'guides')).filter(s => fs.existsSync(path.join(root, 'guides', s, 'index.html')));
const plain = s => s.replace(/<[^>]+>/g, ' ').replaceAll('&amp;', '&').replace(/\s+/g, ' ').trim();
const { execFileSync } = require('node:child_process');
// Break caught: a closing paragraph directs readers below even though the linked FAQs precede it.
test('all twelve canonical conclusions refer to existing FAQ questions without a false direction', () => {
  const { guides, articleBody } = require('../tools/render-guide-library');
  assert.equal(guides.length, 12);
  for (const g of guides) {
    const { body } = articleBody(g);
    const conclusion = body.match(/<section class="guide-conclusion"[\s\S]*?<\/section>/)[0];
    assert.ok(body.indexOf('id="assessment-questions"') < body.indexOf('class="guide-conclusion"'), g.slug);
    assert.doesNotMatch(plain(conclusion), /questions below/i, g.slug);
    assert.match(plain(conclusion), /FAQ questions|questions in this guide/i, g.slug);
    assert.match(conclusion, /href="#assessment-questions"/);
  }
});
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
    'cupboard-hinges-drawer-runners-repair-guide': /off.*hinge/i,
    'sticking-doors-windows-repair-guide': /carpet|rain|dragging/i,
    'wall-patching-paint-touch-ups-guide': /handle|hole|visible patch/i,
    'shower-silicone-grout-waterproofing-guide': /leak.*silicone|silicone.*leak/i,
    'how-to-find-the-right-home-repairer': /small home repairs/i,
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
    assert.match(plain(intro), /fault|repair|check|damage/i, slug + ': observed problem');
    assert.match(plain(close), /scope|assessment|repair|check/i, slug + ': actionable recap');
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
// Catches lost safety decisions or official evidence, without freezing redundant paragraphs.
test('guides retain specific repair decisions, relevant owners and official evidence', () => {
  const { guides } = require('../data/guide-library');
  const decisions = {
    'cupboard-hinges-drawer-runners-repair-guide': [/panel/i, /runner/i, /hinge/i],
    'sticking-doors-windows-repair-guide': [/roller/i, /glass/i, /rain/i],
    'wall-patching-paint-touch-ups-guide': [/moisture/i, /paint/i, /backing/i],
    'shower-silicone-grout-waterproofing-guide': [/membrane/i, /silicone/i, /plumbing/i],
    'how-to-find-the-right-home-repairer': [/regulated/i, /scope/i],
    'when-home-maintenance-needs-a-licensed-trade': [/asbestos/i, /licen[cs]/i, /structural/i],
    'prepare-before-home-repair-quote': [/materials/i, /labour/i, /approval/i],
    'photos-and-clear-scope-for-home-repairs': [/optional/i, /concealed/i, /wall/i],
    'home-repair-priorities': [/hazard/i, /water/i, /cosmetic/i],
    'seasonal-home-maintenance-australia': [/rainwater/i, /exterior/i, /indoor/i, /ground.level/i],
    'property-manager-maintenance-coordination': [/approval/i, /access/i, /handover/i],
    'understanding-service-areas-and-postcode-checks': [/suburb/i, /appointment/i, /permission/i]
  };
  for (const g of guides) {
    const before = execFileSync('git', ['show', `831598f:guides/${g.slug}/index.html`], { cwd: root, encoding: 'utf8' });
    const current = read(`guides/${g.slug}/index.html`);
    for (const pattern of decisions[g.slug]) assert.match(plain(current), pattern, g.slug);
    assert.ok(current.includes(`/services/${g.service[0]}/`), g.slug + ': service owner');
    for (const [, url] of before.matchAll(/href="(https:\/\/(?:www\.)?(?:wa\.gov\.au|worksafe\.wa\.gov\.au|ndis\.gov\.au|pilkington\.com)[^"]+)"/g)) assert.ok(current.includes(url), g.slug + ': retained official evidence');
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
