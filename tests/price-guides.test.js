const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/service-catalog.json'), 'utf8'));
const priceGuidePath = path.join(root, 'data/service-price-guides.json');
const cjkCharacters = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/u;
const mixedRows = {
  'air-conditioning': [['A$600-12,000', 'Installation project'], ['A$600-1,500', 'Split-installation labour']],
  'blinds-and-curtains': [['A$75-125', 'Labour only per window'], ['A$140-290', 'Roller blind supply and installation per window']],
  'cabinet-makers': [['A$50-75', 'Labour per hour'], ['A$100-600+', 'Per cabinet']],
  electricians: [['A$80-130', 'Service fee'], ['A$80-100', 'Labour per hour; materials extra unless included']],
  handymen: [['A$52-145', 'Labour per hour'], ['A$210-590', 'Half-day booking'], ['A$400-945', 'Full-day booking']],
  'house-painters': [['A$25–$65', 'Exterior painting per m²'], ['A$3,500–$15,000', 'Typical full exterior']],
  plasterers: [['A$15-90', 'Per m² depending on plaster type'], ['A$50', 'Perth plasterboard installation average per hour']],
  plumbers: [['A$80-200', 'Labour per hour'], ['A$60-250', 'Call-out'], ['A$150-350', 'Emergency WA call-out'], ['A$180-320', 'Emergency WA labour per hour']],
  'shower-screens': [['A$250-700', 'Screen supply'], ['A$45-65', 'Installation per hour; additional to supply']],
  'window-installation': [['A$40-50', 'Installation labour per hour'], ['A$100-1,250', 'Selected window supply per m²']],
};
function priceRows(markup) {
  return [...markup.matchAll(/<p class="price-guide-range"><strong>([^<]+)<\/strong><span>([^<]+)<\/span><\/p>/g)].map(m => [m[1].replaceAll('&amp;', '&'), m[2].replaceAll('&amp;', '&')]);
}
function assertRange(markup, guide) {
  if (mixedRows[guide.slug]) assert.deepEqual(priceRows(markup), mixedRows[guide.slug], guide.slug + ': independent price bases');
  else assert.ok(markup.includes(guide.rangeAud), guide.slug);
}

test('mixed hourly, item, area and booking prices are separate labelled rows without invented inclusion policies', () => {
  for (const [slug, rows] of Object.entries(mixedRows)) {
    const service = catalog.canonicalServices.find(s => s.slug === slug);
    const page = fs.readFileSync(path.join(root, service.url, 'index.html'), 'utf8');
    const markup = page.match(/<div class="shell price-guide"[\s\S]*?<\/div>/)[0];
    assert.deepEqual(priceRows(markup), rows, slug);
    assert.match(markup, /Ask us to confirm the applicable price basis and any fees or inclusions in your written quote\./, slug);
    assert.doesNotMatch(markup, /GST included|no call-out|free travel|materials included/i, slug);
  }
});

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
      assertRange(markup, guide);
    }
  }
});

function publicFrontstageFiles() {
  const {sourceFiles}=require('../scripts/lib/locales');
  const scripts=['assets/js','data'].flatMap(directory=>fs.readdirSync(path.join(root,directory),{recursive:true,withFileTypes:true})
    .filter(entry=>entry.isFile()&&entry.name.endsWith('.js')).map(entry=>path.join(entry.parentPath,entry.name)));
  return [...sourceFiles(root).map(file=>path.join(root,file)),...scripts];
}

test('English public content stays English while explicit locale UI and Chinese runtime strings remain isolated', () => {
  const files = publicFrontstageFiles();
  assert.ok(files.some((file) => file.endsWith('index.html')), 'public HTML inventory');
  assert.ok(files.some((file) => /[\\/]assets[\\/]js[\\/]site\.js$/.test(file)), 'public JavaScript inventory');
  for (const file of files) {
    const relative=path.relative(root,file).replaceAll('\\','/');
    let content=fs.readFileSync(file,'utf8');
    if(file.endsWith('.html')){
      assert.match(content,/<html lang="en-AU">/,relative);
      assert.doesNotMatch(content,/<script[^>]+src="[^"]*zh-messages\.js"/,relative+': Chinese messages are not loaded by English pages');
      content=content.replace(/<a\b[^>]*data-language-switch[^>]*>[\s\S]*?<\/a>/g,'');
    }else if(relative==='assets/js/locales.js'){
      // The locale runtime is shared, so prove its English branch returns the
      // original label and leaves English service search terms untouched.
      const vm=require('node:vm'),listeners={},catalog=[{service:'Door repairs',route:'/services/doors/door-repairs/',terms:['door']}];
      const document={documentElement:{lang:'en-AU'},addEventListener:(event,fn)=>listeners[event]=fn,querySelectorAll:()=>[]};
      const window={ELLIS_ZH_MESSAGES:{'Door repairs':'修门'},ELLIS_SEARCH_CATALOG:catalog};
      vm.runInNewContext(content,{window,document});
      assert.equal(window.EllisLocale.chinese(),false);
      assert.equal(window.EllisLocale.t('Door repairs'),'Door repairs');
      listeners.DOMContentLoaded();assert.deepEqual(catalog[0].terms,['door']);
      continue;
    }else if(relative==='assets/js/site.js'){
      // Only the Chinese arm of an explicit locale conditional may contain CJK.
      content=content.replace(/(?:typeof window !== 'undefined' && )?window\.EllisLocale\?\.chinese\(\)\s*\?\s*`[^`]*`\s*:/g,'false ? `` :');
      const site=require('../assets/js/site');
      assert.equal(site.buildContactPrefill('?q=Door+repair').message,'Service request: Door repair');
    }
    assert.doesNotMatch(content,cjkCharacters,relative);
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
  const before = fs.readFileSync(priceGuidePath);
  const result = spawnSync(process.execPath, [path.join(root, 'tools/m012-price-guides.js')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(fs.readFileSync(priceGuidePath), before);
  const first = catalog.canonicalServices.map(service => fs.readFileSync(path.join(root, service.url, 'index.html')));
  const again = spawnSync(process.execPath, [path.join(root, 'tools/m012-price-guides.js')], { encoding: 'utf8' });
  assert.equal(again.status, 0, again.stderr || again.stdout);
  for (const [index, service] of catalog.canonicalServices.entries()) assert.deepEqual(fs.readFileSync(path.join(root, service.url, 'index.html')), first[index], service.slug + ': repeated rendering is stable');
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
      assertRange(priceGuide, guide);
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
