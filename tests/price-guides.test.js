const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/service-catalog.json'), 'utf8'));
const priceGuidePath = path.join(root, 'data/service-price-guides.json');
const cjkCharacters = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/u;

function publicFrontstageFiles() {
  const files = fs.readdirSync(root, { recursive: true, withFileTypes: true });
  return files
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .filter((file) => file.endsWith('.html') || /[\\/](?:assets[\\/]js|data)[\\/].+\.js$/.test(file));
}

test('public HTML and browser-loaded JavaScript contain no CJK characters', () => {
  const files = publicFrontstageFiles();
  assert.ok(files.some((file) => file.endsWith('index.html')), 'public HTML inventory');
  assert.ok(files.some((file) => /[\\/]assets[\\/]js[\\/]site\.js$/.test(file)), 'public JavaScript inventory');
  for (const file of files) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), cjkCharacters, path.relative(root, file));
  }
});

test('price research normalises all 67 canonical services into a governed public guide', () => {
  assert.ok(fs.existsSync(priceGuidePath), 'missing data/service-price-guides.json');
  const priceGuides = JSON.parse(fs.readFileSync(priceGuidePath, 'utf8'));
  assert.equal(priceGuides.entries.length, 67);
  assert.deepEqual(
    new Set(priceGuides.entries.map((entry) => entry.slug)),
    new Set(catalog.canonicalServices.map((service) => service.slug)),
  );
  for (const entry of priceGuides.entries) {
    assert.ok(['indicative-local', 'indicative-national', 'quote-required'].includes(entry.status), `${entry.slug} status`);
    assert.ok(['low', 'medium', 'high', 'none'].includes(entry.confidence), `${entry.slug} confidence`);
    assert.equal(typeof entry.unit, 'string', `${entry.slug} unit`);
    assert.equal(typeof entry.notes, 'string', `${entry.slug} notes`);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(entry.checkedDate), `${entry.slug} checked date`);
    assert.ok(Array.isArray(entry.sources), `${entry.slug} sources`);
    for (const source of entry.sources) {
      assert.match(source.url, /^https:\/\//, `${entry.slug} source url`);
      for (const key of ['title', 'date', 'locality', 'evidence']) assert.equal(typeof source[key], 'string', `${entry.slug} source ${key}`);
    }
    if (entry.status === 'quote-required') assert.equal(entry.rangeAud, null, `${entry.slug} does not invent a range`);
    else assert.match(entry.rangeAud, /^A\$/, `${entry.slug} Australian dollar range`);
  }
});

test('every service detail page renders its matching price guide without public source links', () => {
  const priceGuides = JSON.parse(fs.readFileSync(priceGuidePath, 'utf8'));
  const bySlug = new Map(priceGuides.entries.map((entry) => [entry.slug, entry]));
  const disclaimer = 'Prices shown are Ellis official guide prices. Contact Ellis for a tailored consultation.';
  const retiredDisclaimer = '以上价格为 Ellis 官方指导价，详情请联系 Ellis 进行咨询。';
  for (const service of catalog.canonicalServices) {
    const guide = bySlug.get(service.slug);
    const page = fs.readFileSync(path.join(root, service.url, 'index.html'), 'utf8');
    const priceGuide = page.match(/<section class="section muted"><div class="shell price-guide"[\s\S]*?<\/div><\/section>(?=<section class="section muted"><div class="shell"><p class="eyebrow">What to tell us<\/p>)/)?.[0] || '';
    assert.ok(page.includes(`data-price-guide-status="${guide.status}"`), `${service.slug} status module`);
    assert.ok(page.includes(disclaimer), `${service.slug} English price disclaimer`);
    assert.ok(!page.includes(retiredDisclaimer), `${service.slug} omits retired Chinese disclaimer`);
    assert.match(page, /data-preserve-search href="[^"]*contact\/index\.html\?service=/, `${service.slug} retains Contact CTA`);
    assert.ok(priceGuide, `${service.slug} price guide module`);
    assert.ok(!priceGuide.includes('<h3>Sources</h3>'), `${service.slug} omits Sources heading`);
    assert.ok(!priceGuide.includes('price-guide-sources'), `${service.slug} omits source list`);
    assert.ok(!priceGuide.includes('Source:'), `${service.slug} omits source labels`);
    assert.ok(!page.includes('"@type":"Offer"') && !page.includes('"@type":"Product"'), `${service.slug} has no price structured data`);
    if (guide.status === 'indicative-local') {
      assert.ok(page.includes('Indicative Perth cost guide'), `${service.slug} local heading`);
      assert.ok(page.includes(guide.rangeAud), `${service.slug} local range`);
    } else if (guide.status === 'indicative-national') {
      assert.ok(page.includes('Australian price reference — not a Perth quote'), `${service.slug} national warning`);
      assert.ok(page.includes(guide.rangeAud), `${service.slug} national range`);
    } else {
      assert.ok(page.includes('Site-specific quote required'), `${service.slug} quote-required heading`);
      assert.ok(!page.includes('A$undefined'), `${service.slug} no invented range`);
    }
    for (const source of guide.sources) {
      assert.ok(!priceGuide.includes(`href="${source.url}"`), `${service.slug} omits external source link`);
    }
  }
});
