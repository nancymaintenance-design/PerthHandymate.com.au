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
test('every service H1 names the Perth market rather than only a generic action', () => {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
  for (const file of walk(path.join(root, 'services'))) {
    const html = fs.readFileSync(file, 'utf8');
    assert.match(text(html.match(/<h1[^>]*>(.*?)<\/h1>/)[1]), /Perth/, file);
  }
});
test('all twelve guide title/H1 pairs identify the local repair or maintenance subject', () => {
  for (const folder of fs.readdirSync(path.join(root, 'guides'), { withFileTypes: true }).filter(e => e.isDirectory())) {
    const html = read(`guides/${folder.name}/index.html`);
    for (const tag of ['title', 'h1']) assert.match(text(html.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`))[1]), /Perth/i, folder.name + ': ' + tag);
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
