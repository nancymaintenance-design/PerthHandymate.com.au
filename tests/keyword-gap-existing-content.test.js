const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { extractPage } = require('../tools/content-seo-inventory');
const { auditPage, resolveLocalLink } = require('../tools/content-round2-acceptance');
const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'docs/seo/keyword-gap-round-2026-10-12');
const read = route => fs.readFileSync(path.join(root, route === '/' ? 'index.html' : route.slice(1).split('#')[0] + 'index.html'), 'utf8');
const load = name => JSON.parse(fs.readFileSync(path.join(docs, name), 'utf8'));
const hm = '/services/handyman-interiors-appliance-repairs/handymen/';
// Each fixture names an independent task distinction that would be lost if these sections
// became generic keyword paragraphs. Copy can evolve without matching exact sentences.
const contracts = [
  [hm, 'sliding-door-repairs', [/hinge/i, /latch/i, /install/i]],
  [hm, 'shelf-installation', [/load/i, /wall/i, /fixing/i]],
  [hm, 'clothesline-repairs', [/restring|rethread/i, /frame/i, /supply|supplied/i, /removal/i]],
  [hm, 'pet-door-installation', [/dog/i, /cat/i, /timber/i, /mesh/i, /glaz|glass/i]],
  [hm, 'cabinet-repairs', [/hinge/i, /fixing/i, /wardrobe/i, /mirror/i]],
  [hm, 'grab-rail-installation', [/support/i, /placement/i, /NDIS/i, /guarantee/i]],
  [hm, 'pressure-cleaning', [/patio/i, /paving/i, /roof/i, /asbestos/i]],
  [hm, 'strata-maintenance', [/common.property/i, /authoris/i, /tenant|occupant/i]],
  [hm, 'vacate-repairs', [/approv/i, /cleaning/i, /handover/i, /bond/i]],
  ['/services/doors-windows-glass-screens/door-installation/', 'door-installation-scope', [/measur/i, /supply|supplied/i, /removal/i, /repair/i]],
  ['/services/handyman-interiors-appliance-repairs/tiling/', 'shower-regrouting', [/loose tiles/i, /substrate/i, /water/i]],
  ['/services/handyman-interiors-appliance-repairs/tiling/', 'shower-resealing', [/silicone/i, /remov/i, /membrane/i]],
  ['/services/handyman-interiors-appliance-repairs/waterproofing/', 'leaking-shower-assessment', [/silicone/i, /grout/i, /plumbing/i, /membrane/i]],
  ['/services/doors-windows-glass-screens/fly-screens/', 'flyscreen-replacement-options', [/mesh/i, /frame/i, /whole|complete/i, /security/i]],
  ['/services/handyman-interiors-appliance-repairs/plasterers/', 'gyprock-repair-scope', [/Gyprock/i, /support/i, /paint/i]],
  ['/services/handyman-interiors-appliance-repairs/plasterers/', 'ceiling-assessment', [/sagging/i, /leak/i, /patch/i]],
  ['/guides/prepare-before-home-repair-quote/', 'handyman-cost-booking', [/hourly/i, /half.day/i, /full.day/i, /materials/i, /agreed/i]],
  ['/services/doors-windows-glass-screens/shower-screens/', 'shower-screen-repair-options', [/hinge|roller/i, /seal/i, /glass/i]],
  ['/services/roofing-gutters-exterior/pavers/', 'paving-repair-assessment', [/settlement/i, /loose/i, /drainage/i, /match/i]],
  ['/services/roofing-gutters-exterior/roofing/', 'roof-leak-assessment', [/weather/i, /ground/i, /access/i]],
  ['/services/electrical-plumbing-gas-air-conditioning/air-conditioning/', 'aircon-repair-assessment', [/model/i, /symptom/i, /parts/i, /replacement/i]],
  ['/services/handyman-interiors-appliance-repairs/dishwasher-repair/', 'dishwasher-fault-routing', [/drain/i, /plumbing/i, /electrical/i]],
  ['/services/handyman-interiors-appliance-repairs/oven-repair/', 'oven-fault-assessment', [/heat/i, /fan/i, /seal/i, /model/i]],
  ['/services/handyman-interiors-appliance-repairs/carpet-repair/', 'carpet-repair-options', [/patch/i, /seam|join/i, /stretch/i, /new carpet/i]],
  ['/services/planning-inspection-compliance/building-inspectors/', 'inspection-report-scope', [/report/i, /accessible/i, /certification/i]],
  ['/services/planning-inspection-compliance/structural-engineers/', 'engineering-deliverables', [/assessment/i, /design/i, /construction/i]],
  ['/services/outdoor-structures-fencing-pools/timber-fencing/', 'fence-repair-owner', [/repair/i, /new fence/i, /project/i]],
  ['/services/outdoor-structures-fencing-pools/fence-builders/', 'new-fence-owner', [/new fence/i, /repair/i, /project/i]],
  ['/services/outdoor-structures-fencing-pools/fencing-contractors/', 'fencing-project-owner', [/project/i, /repair/i, /new fence/i]],
  ['/services/cleaning-removals-pest-hazard/pest-control/', 'pest-treatment-scope', [/identify|identification/i, /treatment/i, /follow.up/i, /confirm/i]],
  ['/services/gardens-landscaping/lawn-mowing/', 'mowing-visit-scope', [/one.off|single/i, /recurring|regular/i, /long grass/i, /clippings/i]],
];

test('existing service answers distinguish the accepted tasks and give practical preparation', () => {
  for (const [route, id, patterns] of contracts) {
    const html = read(route);
    const section = html.match(new RegExp('<(article|section)\\b[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)<\\/\\1>'))?.[2];
    assert.ok(section, `${route}#${id}: no focused answer`);
    const page = extractPage(`<main>${section}</main>`, route);
    // Selection cards now lead to the detailed owner; the decision must be available
    // there, not repeated inside each comparable summary.
    let decision=page.mainText;
    if(route===hm && /handyman-task-grid/.test(html) && ['sliding-door-repairs','shelf-installation','clothesline-repairs','pet-door-installation','cabinet-repairs','grab-rail-installation','pressure-cleaning'].includes(id)){
      for(const [,href] of section.matchAll(/href="([^"]+)"/g)){
        const target=new URL(href,'https://www.perthhandymate.com.au'+route),owner=read(target.pathname);
        decision+=' '+extractPage(owner,target.pathname).mainText;
      }
    }
    for (const pattern of patterns) assert.match(decision, pattern, `${route}#${id}: missing task distinction`);
    assert.match(decision, /tell|share|provide|confirm|bring/i, `${id}: preparation or approval`);
    assert.ok(page.contextualInternalLinks.length || page.conversion.contactLinks || /href="#[^"]+"/.test(section), `${id}: no contextual next step`);
    assert.deepEqual(auditPage(html, route).issues, [], route);
  }
});

test('current action coverage accounts for all 49 decisions without promoting unconfirmed services', () => {
  const coverage = load('action-coverage.json');
  assert.equal(coverage.actions.length, 49);
  assert.equal(new Set(coverage.actions.map(a => a.id)).size, 49);
  const totals = coverage.actions.reduce((acc, a) => (acc[a.priority] = (acc[a.priority] || 0) + 1, acc), {});
  assert.deepEqual(totals, { P1: 7, P2: 32, '保留': 7, P3: 3 });
  for (const action of coverage.actions) {
    assert.ok(action.rationale && action.evidence && action.status, action.id);
    if (action.priority === 'P3') {
      assert.equal(action.status, 'unconfirmed-not-advertised');
      assert.equal(action.currentOwner, null);
      continue;
    }
    assert.equal(resolveLocalLink(action.currentOwner, '/', read), null, action.id);
    if (action.priority === 'P2') {
      assert.ok(action.evidence.some(e => e.anchor && read(e.path).includes(`id="${e.anchor}"`)), action.id);
      const e=action.evidence[0];
      const section=read(e.path).match(new RegExp('<(article|section)\\b[^>]*id="'+e.anchor+'"[^>]*>([\\s\\S]*?)<\\/\\1>'))[2];
      assert.equal(e.observedText,extractPage(`<main>${section}</main>`,e.path).mainText,action.id+': evidence must describe the final visible answer');
    }
  }
  const services = require('../data/service-catalog.json').canonicalServices;
  for (const service of services) assert.doesNotMatch(extractPage(read('/' + service.url), '/' + service.url).mainText, /reticulation repairs|washing machine repairs|gas heater servicing/i);
});

test('all 67 catalogue pages and four supplements have explicit current intent owners while historical terms stay intact', () => {
  const ownership = load('intent-ownership.json');
  const catalog = require('../data/service-catalog.json').canonicalServices;
  assert.equal(ownership.canonicalServices.length, 67);
  assert.equal(ownership.supplementalServices.length, 4);
  assert.deepEqual(ownership.canonicalServices.map(o => o.path).sort(), catalog.map(s => '/' + s.url).sort());
  const all = [...ownership.canonicalServices, ...ownership.supplementalServices];
  assert.equal(new Set(all.map(o => o.path)).size, 71);
  assert.equal(new Set(all.map(o => o.primaryIntent)).size, 71, 'distinct service intents');
  for (const owner of all) {
    assert.ok(owner.primaryQuery && owner.primaryIntent && owner.scope && owner.taskSeeds.length >= 2 && owner.researchStatus, owner.path);
    assert.equal(resolveLocalLink(owner.path, '/', read), null, owner.path);
  }
  const old = JSON.parse(execFileSync('git', ['show', 'cdd814d7f93bf224142276076a5d03a803ce9c53:docs/seo/content-round2/term-routing.json'], {cwd: root, encoding:'utf8'}));
  const current = require('../docs/seo/content-round2/term-routing.json');
  assert.equal(current.length, 527);
  assert.deepEqual(current, old, 'all IDs, fields, paths and fragments retained');
  const terms = load('historical-term-current-owners.json');
  assert.equal(terms.length, 527);
  assert.deepEqual(terms.map(t => [t.id, t.historicalPath]), old.map(t => [t.id, t.primaryPath]));
  for (const term of terms) assert.equal(resolveLocalLink(term.currentPath, '/', read), null, term.id);
  const owner = id => terms.find(t => t.id === id).currentPath;
  assert.equal(owner('HM0045'), '/services/doors-windows-glass-screens/sliding-door-repairs/');
  assert.equal(owner('HM0188'), hm + '#shelf-installation');
  assert.equal(owner('HM0397'), hm + '#strata-maintenance');
  assert.equal(owner('HM0108'), '/services/handyman-interiors-appliance-repairs/plasterers/', 'wall damage after TV removal remains plaster repair');
  assert.equal(owner('HM0460'), '/services/electrical-plumbing-gas-air-conditioning/electricians/', 'new power point remains electrical work');
  assert.equal(owner('HM0054'), '/guides/sticking-doors-windows-repair-guide/', 'informational fault question retains its guide');
});
