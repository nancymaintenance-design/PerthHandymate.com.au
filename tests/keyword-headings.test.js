const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const text = html => html.replace(/<[^>]*>/g, '').replaceAll('&amp;', '&');
test('guide hub prominent headings identify Perth handyman and repair intent', () => {
  const html = read('guides/index.html');
  assert.match(text(html.match(/<title>(.*?)<\/title>/)[1]), /Perth Handyman.*Home Maintenance Guides/);
  assert.match(text(html.match(/<h1[^>]*>(.*?)<\/h1>/)[1]), /Perth Handyman.*Home Maintenance Guides/);
  const first = text(html.match(/<h2[^>]*>(.*?)<\/h2>/)[1]);
  assert.equal(first, 'Repair Faults & Fixings');
  assert.match(html, /aria-label="Guide categories"/);
});
test('service categories match their selection cards and detail H1s retain the Perth market', () => {
  const vm=require('node:vm'),sandbox={window:{}};vm.runInNewContext(read('data/content.js'),sandbox);
  const policy=JSON.parse(read('data/heading-keyword-policy.json'));
  const categories=new Map(sandbox.window.ELLIS_CONTENT.services.map(category=>[category.slug,policy.pages[`services/${category.slug}/index.html`]?.h1||category.title]));
  assert.equal(categories.size,9,'nine comparable service categories');
  const hub=read('services/index.html');
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
  for (const file of walk(path.join(root, 'services'))) {
    const html = fs.readFileSync(file, 'utf8');
    const relative=path.relative(path.join(root,'services'),file).replaceAll('\\','/');
    const heading=text(html.match(/<h1[^>]*>(.*?)<\/h1>/)[1]);
    const category=relative.match(/^([^/]+)\/index\.html$/)?.[1];
    if(categories.has(category)){
      assert.equal(heading,categories.get(category),file+' category heading matches its selection label');
      const card=[...hub.matchAll(/<h3><a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a><\/h3>/g)].find(match=>new URL(match[1],'https://www.perthhandymate.com.au/services/').pathname==='/services/'+category+'/');
      assert.ok(card,file+' category is discoverable from service hub');
      assert.equal(text(card[2]),heading,file+' hub and category use the same name');
    }else assert.match(heading, /Perth/, file);
  }
});
test('all twelve guide H1s match scenario-led cards without repeated city names', () => {
  for (const folder of fs.readdirSync(path.join(root, 'guides'), { withFileTypes: true }).filter(e => e.isDirectory())) {
    const html = read(`guides/${folder.name}/index.html`);
    const guide=require('../data/guide-library').guides.find(g=>g.slug===folder.name);
    const h1=text(html.match(/<h1[^>]*>(.*?)<\/h1>/)[1]);
    assert.equal(h1,guide.title);assert.doesNotMatch(h1,/Perth/i);
    assert.match(text(html.match(/<title>(.*?)<\/title>/)[1]),/repair|maintenance|handyman|quote/i);
  }
});
test('key service headings retain the keyword-map repair objects and actions', () => {
  for (const [slug, expected] of [
    ['furniture-assembly', /Flat Pack.*Furniture Assembly.*Perth/],
    ['plasterers', /Gyprock.*Wall.*Ceiling Repairs.*Perth/],
    ['cabinet-wardrobe-repairs', /Cabinet.*Drawer.*Wardrobe Repairs.*Perth/],
    ['shelving-mirror-picture-hanging', /Shelf Installation.*Mirror.*Picture Hanging.*Perth/],
  ]) {
    const html = read(`services/handyman-interiors-appliance-repairs/${slug}/index.html`);
    assert.match(text(html.match(/<h1[^>]*>(.*?)<\/h1>/)[1]), expected, slug);
  }
});
test('heading update synchronizes article identity without changing prices, scope or destinations', () => {
  const { transform } = require('../scripts/apply-heading-keywords');
  const entry = { beforeH1: 'Old repair guide', title: 'Perth Repair Guide | Ellis', h1: 'Perth Repair Guide', headings: { 'Generic advice': 'Drawer Runner Replacement: Repair Advice' } };
  const html = '<title>Old</title><script type="application/ld+json">{"@type":"Article","headline":"Old repair guide","publisher":{"name":"Ellis Services Group","@id":"stable"}}</script><main><h1>Old repair guide</h1><h2>Generic advice</h2><p>Scope and $100 estimate remain unchanged.</p><a href="/services/">Services</a></main>';
  const out = transform(html, entry);
  assert.match(out, /"headline":"Perth Repair Guide"/);
  assert.match(out, /"publisher":\{"name":"Ellis Services Group","@id":"stable"\}/);
  assert.ok(out.includes('<p>Scope and $100 estimate remain unchanged.</p><a href="/services/">Services</a>'));
  assert.match(out, /<h2>Drawer Runner Replacement: Repair Advice<\/h2>/);
  assert.equal(transform(out, entry), out);
});
