const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = 'services/property-maintenance/index.html';
const html = fs.readFileSync(path.join(root, file), 'utf8');
const adapter = require('../tools/compact-property-page');
const {renderChinese, translator, sourceFiles, routeOf} = require('../scripts/lib/locales');
function dictionary() {
  const result = require('../locales/zh-Hans.json');
  for (const part of fs.readdirSync(path.join(root, 'locales/parts')).filter(f=>f.endsWith('.json'))) Object.assign(result, JSON.parse(fs.readFileSync(path.join(root, 'locales/parts', part), 'utf8')));
  return {...result, ...require('../locales/editorial-overrides.json'), ...require('../locales/parts/revision-property.json')};
}
test('property flow has six destinations, one H1 and no detached FAQ schema', () => {
  const main = html.match(/<main\b[\s\S]*?<\/main>/)[0];
  assert.equal((main.match(/<section\b/g)||[]).length, 6);
  assert.equal((main.match(/<h1\b/g)||[]).length, 1);
  for (const id of ['maintenance-plans','included-services','work-process','charging-standards','aftercare','contact-team']) {
    assert.match(main, new RegExp(`href="#${id}"`));
    assert.match(main, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(html, /"@type":"FAQPage"/);
  assert.equal(adapter(html), html, 'maintained content owner is idempotent');
});
test('every property string renders in Chinese and contact routes remain usable', () => {
  const known = new Set(sourceFiles(root).map(routeOf));
  const zh = renderChinese(html, file, known, translator(dictionary()));
  assert.match(zh, /id="aftercare-title">售后与完工事项/);
  assert.match(zh, /href="tel:\+61403069685"/);
  assert.match(zh, /href="\/zh\/contact\/\?service=/);
  assert.match(zh, /href="\/assets\/css\/property-clarity.css"/);
  assert.match(zh, /任何拟议变更均与授权联系人商议/);
});
test('pricing stays quote-based and scope preserves authority and repair limits', () => {
  const main = html.match(/<main\b[\s\S]*?<\/main>/)[0];
  const pricing = main.match(/<section[^>]+id="charging-standards"[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(pricing, /A?\$\d|\b\d+\s*(?:hours?|days?|years?)\b/);
  assert.match(pricing, /written quote/);
  assert.match(main, /does not authorise repairs or extra spending/);
  assert.match(main, /Fire-rated doors require product and building requirements/);
  assert.match(main, /do not guarantee a bond refund/);
  assert.match(main, /contact the Ellis team with the property, repaired item and quote or job details/);
  for (const [, href] of main.matchAll(/href="(\/[^"?#]*)"/g)) {
    assert.ok(fs.existsSync(path.join(root, href, 'index.html')), 'internal link exists: '+href);
  }
});
