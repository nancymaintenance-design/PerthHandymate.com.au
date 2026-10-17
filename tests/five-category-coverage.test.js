const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const original = require('../docs/seo/content-round2/term-routing.json');
const toolPath = path.join(root, 'tools/five-category-coverage.js');
const coveragePath = path.join(root, 'docs/seo/content-expansion-2026-10-12/coverage.json');
const read = route => {
  const file = path.join(root, route === '/' ? 'index.html' : route.slice(1) + 'index.html');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
};
function validator() {
  assert.ok(fs.existsSync(toolPath), 'fragment-scoped visible evidence validator must exist');
  return require(toolPath).validateCoverage;
}
const fixture = `<html><head><script type="application/ld+json">{"text":"Schema-only invisible statement about support."}</script></head><body><main>
<h1>Shelf repairs</h1><section id="support"><h2>Wall support</h2><p>Shelf support depends on the wall, brackets and intended storage.</p></section>
<section id="other"><p>Paint matching is agreed separately after wall preparation.</p></section>
<section id="hidden" hidden><p>Invisible secret support statement about the shelf.</p></section>
<section id="questions"><details><summary>Why does a shelf sag?</summary><p>A loose bracket or unsuitable wall support needs assessment.</p></details><details><summary>Will paint match?</summary><p>Matching depends on finish and age.</p></details></section>
</main></body></html>`;
const reference = [{ id: 'HM0197', term: 'Why is my floating shelf sagging?', owner: 'O12', category: '问题科普词' }];
const validRow = () => ({ ...reference[0], currentPath: '/services/shelves/', status: 'covered',
  bodyEvidence: { path: '/services/shelves/', fragment: 'support', excerpt: 'Shelf support depends on the wall, brackets and intended storage.' },
  faqEvidence: { path: '/services/shelves/', fragment: 'questions', question: 'Why does a shelf sag?', answerExcerpt: 'A loose bracket or unsuitable wall support needs assessment.' } });

test('evidence validator accepts a real body paragraph and the corresponding visible FAQ item', () => {
  assert.deepEqual(validator()([validRow()], reference, () => fixture), []);
});
test('evidence validator rejects invented, schema-only and hidden excerpts', () => {
  const validate = validator();
  for (const [fragment, excerpt] of [['support', 'An invented claim absent from the page.'], ['support', 'Schema-only invisible statement about support.'], ['hidden', 'Invisible secret support statement about the shelf.']]) {
    const row = validRow(); row.bodyEvidence = { ...row.bodyEvidence, fragment, excerpt };
    assert.ok(validate([row], reference, () => fixture).length, excerpt);
  }
});
test('educational evidence rejects missing FAQ, FAQ-as-body and an unrelated fragment', () => {
  const validate = validator();
  const missing = validRow(); delete missing.faqEvidence;
  assert.ok(validate([missing], reference, () => fixture).some(x => /FAQ/i.test(x)));
  const faqBody = validRow(); faqBody.bodyEvidence = { ...faqBody.bodyEvidence, fragment: 'questions', excerpt: faqBody.faqEvidence.answerExcerpt };
  assert.ok(validate([faqBody], reference, () => fixture).some(x => /body/i.test(x)));
  const unrelated = validRow(); unrelated.bodyEvidence.fragment = 'other';
  assert.ok(validate([unrelated], reference, () => fixture).some(x => /fragment|excerpt/i.test(x)));
  const broken = validRow(); broken.bodyEvidence.fragment = 'absent';
  assert.ok(validate([broken], reference, () => fixture).some(x => /fragment/i.test(x)));
});
test('FAQ question and answer must occur within the same details item', () => {
  const row = validRow(); row.faqEvidence.answerExcerpt = 'Matching depends on finish and age.';
  assert.ok(validator()([row], reference, () => fixture).some(x => /FAQ/i.test(x)));
});
test('coverage validator rejects dropped, reordered, duplicated or changed source records', () => {
  const validate = validator();
  assert.ok(validate([], reference, () => fixture).length);
  assert.ok(validate([validRow(), validRow()], reference, () => fixture).length);
  const changed = validRow(); changed.term = 'a different query';
  assert.ok(validate([changed], reference, () => fixture).length);
});
test('all 527 original records retain order and have fragment-scoped current visible evidence', () => {
  assert.ok(fs.existsSync(coveragePath), 'current full five-category coverage must exist');
  const rows = JSON.parse(fs.readFileSync(coveragePath, 'utf8')).records;
  assert.deepEqual(rows.map(x => x.id), original.map(x => x.id));
  assert.equal(new Set(rows.map(x => x.id)).size, 527);
  assert.deepEqual(Object.fromEntries([...new Set(rows.map(x => x.category))].map(c => [c, rows.filter(x => x.category === c).length])),
    { '核心词': 163, '意向提问词': 91, '蒸馏词': 91, '场景使用词': 91, '问题科普词': 91 });
  assert.deepEqual(validator()(rows, original, read), []);
  for (const row of rows.filter(x => x.category === '问题科普词')) {
    assert.ok(row.bodyEvidence.path.startsWith('/services/'), row.id + ' needs service-body counterpart');
    assert.ok(row.faqEvidence||row.educationalEvidence, row.id+' has an explicit FAQ or explanatory-card destination');
  }
});
test('public assessment anchors describe the topic without research record identifiers', () => {
  const { inventorySite } = require('../tools/content-seo-inventory');
  for (const page of inventorySite(root)) {
    const html = fs.readFileSync(path.join(root, page.file), 'utf8');
    assert.equal(/\bid=["'][^"']*hm\d{4}/i.test(html), false, page.path);
  }
});
// These hand-reviewed intent contracts catch topic-swapped evidence, not wording changes.
// Fragment visibility remains the validator's separate responsibility.
for (const [id, concepts] of [
  ['HM0005', [/\b(?:small|minor|ordinary)\b/i, /\brepairs?\b/i, /\b(?:scope|specialist|personnel)\b/i]],
  ['HM0008', [/\blist\b/i, /\b(?:grouped|grouping|together)\b/i, /\b(?:fault|item|task)s?\b/i]],
  ['HM0009', [/\bunit\b/i, /\b(?:permission|approval)\b/i, /\baccess\b/i]],
  ['HM0401', [/\b(?:strata|common-property)\b/i, /\bcompletion photos\b/i, /\bagreed?\b/i]],
  ['HM0447', [/\b(?:included|inclusions|itemised)\b/i, /\b(?:tasks|items)\b/i, /\bmaterials\b/i, /\b(?:writing|written)\b/i]],
  ['HM0460', [/\bTV\b/i, /\bbracket\b/i, /\b(?:outlet|power.point)\b/i, /\belectrical\b/i, /\b(?:separate|separately)\b/i]],
]) test(`${id} evidence addresses its reviewed repair intent rather than an unrelated topic`, () => {
  const row = JSON.parse(fs.readFileSync(coveragePath, 'utf8')).records.find(row => row.id === id);
  const evidence = [row.bodyEvidence, row.decisionEvidence, row.scenarioEvidence].filter(Boolean);
  for (const item of evidence) for (const concept of concepts) {
    assert.match(item.excerpt, concept, `${id} evidence needs ${concept}`);
  }
});
test('current owner pages retain unambiguous visible and structured FAQ parity', () => {
  const { auditPage } = require('../tools/content-round2-acceptance');
  const rows = JSON.parse(fs.readFileSync(coveragePath, 'utf8')).records;
  const issues = [...new Set(rows.map(x=>x.currentPath))].flatMap(route=>auditPage(read(route),route).issues.map(issue=>route+': '+issue));
  assert.deepEqual(issues, []);
});

test('current cabinet scope descriptions point maintainers to the focused repair owner', () => {
  const ownership = require('../docs/seo/content-expansion-2026-10-12/intent-ownership.json');
  const cabinetOwner = '/services/handyman-interiors-appliance-repairs/cabinet-wardrobe-repairs/';
  for (const [key, field] of [['cabinet-makers', 'primaryIntent'], ['sliding-door-repairs', 'scope']]) {
    const item = [...ownership.canonicalServices, ...ownership.supplementalServices].find(item => item.key === key);
    assert.ok(item, key);
    assert.ok(item[field].includes(cabinetOwner), `${key}: current repair destination must be actionable`);
    assert.doesNotMatch(item[field], /handymen\/#cabinet-repairs|existing cabinet-repairs module/i, key);
  }
});
