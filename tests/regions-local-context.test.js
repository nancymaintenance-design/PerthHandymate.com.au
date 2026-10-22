const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/content.js'), 'utf8'), sandbox);
const areas = sandbox.window.ELLIS_CONTENT.serviceAreas;
const site = require('../assets/js/site');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// Breaks caught: lost original routes, omitted new regions, non-crawlable service discovery.
test('nine confirmed regions have distinct static repair content and named-suburb service links', () => {
  assert.equal(areas.length, 9);
  const hub = read('areas/index.html');
  const bodies = new Set();
  for (const area of areas) {
    assert.ok(hub.includes(`href="${area.slug}/"`), area.slug);
    const html = read(`areas/${area.slug}/index.html`);
    assert.ok(html.includes(`href="https://www.perthhandymate.com.au/areas/${area.slug}/"`));
    const cards = html.match(/<section[^>]+id="suburb-repair-links"[\s\S]*?<\/section>/)?.[0];
    assert.ok(cards, `${area.slug}: static repair cards`);
    for (const suburb of area.suburbs) {
      assert.ok(html.includes(`contact/?suburb=${encodeURIComponent(suburb)}`), `${area.slug}: ${suburb}`);
      assert.ok(html.includes(`>${suburb.replaceAll('&', '&amp;')}</a>`));
    }
    bodies.add(html.match(/id="local-property-guidance"[\s\S]*?<\/section>/)[0]);
    assert.equal([...cards.matchAll(/<article>/g)].length, 6, 'same real repair choices, independent of suburb count');
  }
  assert.equal(bodies.size, 9);
  for (const slug of ['western-suburbs-swanbourne', 'perth-hills-mundaring-kalamunda']) assert.ok(areas.some(a => a.slug === slug));
});

// Breaks caught: unvalidated URL content reaching local banner or unknown location claiming coverage.
test('service locality context accepts confirmed names only and keeps the actual service topic', () => {
  const list = JSON.parse(JSON.stringify(areas));
  assert.deepEqual(site.resolveLocalContext('?suburb=East+Perth', 'Door Installation in Perth', list), { locality: 'East Perth', topic: 'Door Installation', heading: 'Door Installation in East Perth' });
  assert.equal(site.resolveLocalContext('?suburb=Unknown', 'Door Installation in Perth', list), null);
  assert.equal(site.resolveLocalContext('?suburb=%3Cimg+src=x+onerror=alert(1)%3E', 'Door Installation in Perth', list), null);
  assert.equal(site.resolveLocalContext('?suburb=East+Perth%00', 'Door Installation in Perth', list), null);
  assert.equal(site.resolveLocalContext('', 'Door Installation in Perth', list), null);
});

// Breaks caught: generated service boilerplate overwhelming the actual repair heading.
test('service secondary headings retain repair topics without repeated city suffixes', () => {
  const html = read('services/doors-windows-glass-screens/window-repairs/index.html');
  assert.match(html, /<h1>Timber Window &amp; Window Frame Repairs in Perth<\/h1>/);
  assert.match(html, /<h2>Window Repairs: Common Questions<\/h2>/);
  assert.match(html, /<h2>Speak with our local team<\/h2>/);
  assert.doesNotMatch(html, /<h2>Window Repairs in Perth: Common Questions<\/h2>/);
});
