const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/service-catalog.json'), 'utf8'));
const priceGuidePath = path.join(root, 'data/service-price-guides.json');
const cjkCharacters = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/u;

test('customer price modules keep research citations in data rather than displaying outside contractor links', () => {
  const pricing = JSON.parse(fs.readFileSync(priceGuidePath, 'utf8'));
  for (const service of catalog.canonicalServices) {
    const guide = pricing.entries.find(entry => entry.slug === service.slug);
    const page = fs.readFileSync(path.join(root, service.url, 'index.html'), 'utf8');
    const markup = page.match(/<section class="section muted"><div class="shell price-guide"[\s\S]*?<\/section>/)?.[0] || '';
    assert.doesNotMatch(markup, /price-guide-sources|Background references|Published sources|href="https?:/i, service.slug);
    assert.ok(Array.isArray(guide.sources), `${service.slug} retains research citations in data`);
  }
});

test('confirmed Ellis price ranges preserve amounts and lead to an on-site written quote', () => {
  const pricing = JSON.parse(fs.readFileSync(priceGuidePath, 'utf8'));
  assert.equal(pricing.priceOwnership, 'Ellis Services Group');
  assert.equal(pricing.businessConfirmation.confirmedDate, '2026-10-07');
  for (const service of catalog.canonicalServices) {
    const guide = pricing.entries.find(entry => entry.slug === service.slug);
    const page = fs.readFileSync(path.join(root, service.url, 'index.html'), 'utf8');
    const markup = page.match(/<section class="section muted"><div class="shell price-guide"[\s\S]*?<\/section>/)?.[0] || '';
    assert.doesNotMatch(markup, /Third-party published|Reference price|market-reference|not a fixed Ellis price|not a Perth quote/i, service.slug);
    assert.match(markup, /written quote.*on-site assessment/i, service.slug);
    if (guide.rangeAud) {
      assert.equal(guide.status, 'company-price-range');
      assert.ok(markup.includes('Ellis Services Group service price range'), service.slug);
      assert.ok(markup.includes(guide.rangeAud), service.slug);
    }
  }
});

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
    assert.ok(['company-price-range', 'quote-required'].includes(entry.status), `${entry.slug} status`);
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

test('company price ranges retain their factual background provenance', () => {
  const priceGuides = JSON.parse(fs.readFileSync(priceGuidePath, 'utf8'));
  const bySlug = new Map(priceGuides.entries.map((entry) => [entry.slug, entry]));
  const upholstery = bySlug.get('upholstery-repair');
  assert.equal(upholstery.status, 'quote-required');
  assert.equal(upholstery.rangeAud, null);
  assert.ok(upholstery.sources.every((source) => !source.url.includes('homestars.com')));
  for (const slug of ['electricians', 'plasterers', 'plumbers']) {
    assert.equal(bySlug.get(slug).status, 'company-price-range', `${slug} is a confirmed Ellis price range`);
    assert.ok(bySlug.get(slug).sources.some(source => /Australia/.test(source.locality)), `${slug} preserves background provenance`);
  }
});

test('the price-guide compiler preserves the reviewed in-repository source data', () => {
  const before = fs.readFileSync(priceGuidePath, 'utf8');
  const result = spawnSync(process.execPath, [path.join(root, 'tools/m012-price-guides.js')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.readFileSync(priceGuidePath, 'utf8'), before);
});

test('every service detail page presents company price ranges while retaining research citations in data', () => {
  const priceGuides = JSON.parse(fs.readFileSync(priceGuidePath, 'utf8'));
  const bySlug = new Map(priceGuides.entries.map((entry) => [entry.slug, entry]));
  for (const service of catalog.canonicalServices) {
    const guide = bySlug.get(service.slug);
    assert.doesNotMatch(guide.unit, /\b(?:may|might|could|not a Perth quote)\b/i, `${service.slug} price unit uses direct wording`);
    const page = fs.readFileSync(path.join(root, service.url, 'index.html'), 'utf8');
    const priceGuide = page.match(/<section class="section muted"><div class="shell price-guide"[\s\S]*?<\/section>/)?.[0] || '';
    assert.ok(priceGuide.includes(`data-price-guide-status="${guide.status}"`), `${service.slug} status module`);
    assert.doesNotMatch(priceGuide, /price-guide-date|Company price range confirmed|Third-party published|Published sources|price-guide-sources/, `${service.slug} omits source and date display`);
    assert.ok(priceGuide.includes(guide.rangeAud ? '<h2>Service price range</h2>' : '<h2>Project price</h2>'), `${service.slug} accurate price heading`);
    assert.ok(!priceGuide.includes('not Ellis') && !priceGuide.includes('not a Perth quote'), `${service.slug} avoids negative pricing claims`);
    assert.doesNotMatch(priceGuide.replace(/<[^>]*>/g, ' '), /\b(?:may|might|could|perhaps|possibly|approximately|roughly|indicative)\b/i, `${service.slug} avoids vague price wording`);
    assert.ok(!priceGuide.includes('price-guide-notes') && !priceGuide.includes('price-guide-disclaimer'), `${service.slug} keeps pricing copy concise`);
    assert.match(page, /data-preserve-search href="[^"]*contact\/\?service=/, `${service.slug} retains Contact CTA`);
    if(service.slug==='handymen')assert.ok(page.indexOf('price-guide')<page.indexOf('service-questions')&&page.indexOf('service-questions')<page.indexOf('city-service-band'),'compact handyman page explains price before booking FAQ');
    else assert.ok(page.indexOf('service-questions') < page.indexOf('price-guide') && page.indexOf('price-guide') < page.indexOf('city-service-band'), `${service.slug} price reference follows service questions`);
    assert.ok(!page.includes('"@type":"Offer"') && !page.includes('"@type":"Product"'), `${service.slug} has no price structured data`);
    if (guide.status === 'company-price-range') {
      assert.ok(priceGuide.includes('Ellis Services Group service price range'), `${service.slug} company price context`);
      assert.ok(priceGuide.includes(guide.rangeAud), `${service.slug} local range`);
    } else {
      assert.ok(priceGuide.includes('Request your project price'), `${service.slug} direct next step`);
      assert.ok(!priceGuide.includes('A$'), `${service.slug} no invented range`);
    }
    if (guide.scope) assert.ok(priceGuide.includes(guide.scope), `${service.slug} price scope`);
    for (const source of guide.sources) {
      assert.ok(!priceGuide.includes(`href="${source.url.replaceAll('&', '&amp;')}"`), `${service.slug} keeps the research source off the customer price module`);
    }
  }
});

test('narrow price bands state the applicable scope on the service page', () => {
  const pricing = JSON.parse(fs.readFileSync(priceGuidePath, 'utf8'));
  for (const slug of ['asbestos-removal', 'carports-and-garages', 'gutter-services', 'pest-control', 'roofing', 'rubbish-removal']) {
    const guide = pricing.entries.find((entry) => entry.slug === slug);
    assert.ok(guide.scope, `${slug} has a scope boundary`);
    const service = catalog.canonicalServices.find((entry) => entry.slug === slug);
    const page = fs.readFileSync(path.join(root, service.url, 'index.html'), 'utf8');
    assert.ok(page.includes(guide.scope), `${slug} publishes the scope boundary`);
  }
});
