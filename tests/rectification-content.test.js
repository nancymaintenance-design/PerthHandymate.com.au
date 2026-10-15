const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const hm = 'services/handyman-interiors-appliance-repairs/handymen/index.html';

// Catches a deep diagnostic answer returning inside a task-selection card.
test('handyman cards separate concise selection from detailed safe-scope advice', () => {
  const h = read(hm), grid = h.match(/<div class="handyman-task-grid">([\s\S]*?)<\/div>/)[1];
  assert.equal([...grid.matchAll(/<article /g)].length, 10);
  assert.doesNotMatch(grid, /<h4>/);
  for (const id of ['pet-flaps-and-panel-type', 'surface-cleaning-and-material-risk', 'older-residents-and-support-rails']) {
    assert.ok(h.includes(`id="${id}"`));
    assert.ok(!grid.includes(`id="${id}"`));
  }
  assert.match(h, /toughened-glass|toughened glass/i);
  assert.match(h, /must not be pressure cleaned/);
  assert.match(h, /towel rail is not a substitute/);
});
// Catches the old compact writer silently deleting later substantive anchors.
test('handyman canonical writer preserves current decisions and is idempotent', () => {
  const current = read(hm), render = require('../tools/compact-handyman-page');
  const after = render(current);
  assert.equal(after, current);
  assert.equal(render(after), after);
});

// Catches repeating the same photos/assessment invitation inside service decision prose.
test('service decision prose collects generic preparation invitations into related reading', () => {
  const h=read('services/doors-windows-glass-screens/window-repairs/index.html');
  assert.ok(!h.includes('<p>For related preparation, read '));
  assert.ok(h.includes('/guides/prepare-before-home-repair-quote/'));
  assert.match(h, /broken|loose|unsuitable glass/i);
});
// Catches unrelated job selection depending on a suburb's array position.
test('region location selection is independent of repair type and retains query prefill', () => {
  const { areas } = require('../tools/render-regions');
  for (const a of areas) {
    const h = read(`areas/${a.slug}/index.html`);
    assert.match(h, /id="choose-your-suburb"/);
    for (const suburb of a.suburbs) assert.ok(h.includes(`contact/?suburb=${encodeURIComponent(suburb)}`), suburb);
    const choices = h.match(/<section[^>]+id="suburb-repair-links"[\s\S]*?<\/section>/)[0];
    for (const route of ['door-repairs', 'window-repairs', 'cabinet-wardrobe-repairs', 'gutter-services', 'plasterers', 'fly-screens']) assert.ok(choices.includes('/' + route + '/'), a.slug + route);
  }
});
// Catches an expanding unrelated FAQ catalogue replacing the seasonal checklist.
test('seasonal guide keeps rainwater exterior and indoor checklist with a small seasonal FAQ', () => {
  const h = read('guides/seasonal-home-maintenance-australia/index.html');
  for (const id of ['rainwater-checks', 'exterior-checks', 'indoor-checks', 'seasonal-checklist']) assert.ok(h.includes(`id="${id}"`), id);
  const faq = [...h.matchAll(/<details\b/g)];
  assert.ok(faq.length <= 6 && faq.length >= 3, faq.length + ' FAQs');
  assert.match(h, /ground.level|safe ground/);
  assert.match(h, /asbestos|unidentified older material/);
});
// Catches deletion, reordering or image reduction in the thirteen home groups.
test('home jump links bypass all thirteen preserved full-size alternating cases', () => {
  const h = read('index.html');
  const before = execFileSync('git', ['show', '3d05ecdd3aed27bcf5533082a5a308d4323fd140:index.html'], { cwd: root, encoding: 'utf8' });
  const groups = source => source.match(/<div class="project-feature-list">([\s\S]*?)<\/section>/)[0];
  assert.equal(groups(h), groups(before));
  assert.equal([...groups(h).matchAll(/class="support-feature(?: |")/g)].length, 13);
  const nav = h.match(/<nav class="quick-paths"[\s\S]*?<\/nav>/)[0];
  for (const id of ['repair-quote-process', 'repair-planning-guides', 'contact-team']) {
    assert.ok(nav.includes(`href="#${id}"`)); assert.ok(h.includes(`id="${id}"`));
  }
  assert.equal([...h.matchAll(/id="repair-planning-guides"/g)].length, 1);
});

// Catches sending a repair-first home choice to an installation-first owner.
test('home door repair choice opens the existing repair service', () => {
  const h=read('index.html');
  assert.match(h, /href="\.\/services\/doors-windows-glass-screens\/door-repairs\/">Door repairs<\/a>/);
  assert.ok(!/href="[^\"]*door-installation\/">Door repairs/.test(h));
});

// Catches a current writer reintroducing removed content or duplicating owner sections.
test('current content writers converge without changing protected routes or term ownership', () => {
  const {renderGuide,guides}=require('../tools/render-guide-library');
  const {renderRegion,areas}=require('../tools/render-regions');
  const {consolidateService,consolidateHome,consolidateDirectory}=require('../tools/consolidate-content');
  for(const [file,render] of [['index.html',consolidateHome],['services/index.html',h=>consolidateDirectory(consolidateService(h))],...guides.map(g=>[`guides/${g.slug}/index.html`,h=>renderGuide(h,g.slug)]),...areas.map(a=>[`areas/${a.slug}/index.html`,h=>renderRegion(h,a)])]){
    const current=read(file);assert.equal(render(current),current,file);assert.equal(render(render(current)),current,file+' second pass');
    const ids=[...current.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,file+' duplicated owner');
  }
  const before=execFileSync('git',['show','3d05ecdd3aed27bcf5533082a5a308d4323fd140:docs/seo/content-round2/term-routing.json'],{cwd:root});
  // Git stores LF while this Windows checkout uses CRLF. Compare the unchanged
  // tracked content without generating a huge Buffer diff for line endings.
  assert.equal(read('docs/seo/content-round2/term-routing.json').replace(/\r\n/g,'\n'),before.toString('utf8'));
  assert.equal([...read('sitemap.xml').matchAll(/<loc>/g)].length,126);
});
