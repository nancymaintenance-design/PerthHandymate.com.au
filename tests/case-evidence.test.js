const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

// Missing headings, unrelated navigation-only links and unsupported case claims
// would break this visitor-facing evidence and onward-reading contract.
const cases = [
  ['bathroom-tile-shower-repair', 'handyman-interiors-appliance-repairs/tiling', 'shower-silicone-grout-waterproofing-guide'],
  ['decking-refinishing-maintenance', 'outdoor-structures-fencing-pools/deck-builders', 'seasonal-home-maintenance-australia'],
  ['door-lock-replacement-installation', 'doors-windows-glass-screens/door-installation', 'when-home-maintenance-needs-a-licensed-trade'],
  ['exterior-timber-window-door-repair', 'handyman-interiors-appliance-repairs/carpenters', 'sticking-doors-windows-repair-guide'],
  ['garden-clean-up', 'gardens-landscaping/garden-clean-up', 'seasonal-home-maintenance-australia'],
  ['interior-wall-repair-painting', 'roofing-gutters-exterior/house-painters', 'wall-patching-paint-touch-ups-guide'],
  ['kitchen-cabinet-hinge-repair', 'handyman-interiors-appliance-repairs/carpenters', 'cupboard-hinges-drawer-runners-repair-guide'],
  ['roof-and-gutter-maintenance', 'roofing-gutters-exterior/gutter-services', 'seasonal-home-maintenance-australia'],
  ['sliding-door-flyscreen-repair', 'doors-windows-glass-screens/fly-screens', 'seasonal-home-maintenance-australia'],
  ['timber-fence-repair', 'outdoor-structures-fencing-pools/fence-builders', 'seasonal-home-maintenance-australia'],
];

test('evidence coverage includes every existing project page', () => {
  const existing = fs.readdirSync(path.join(root, 'projects'), { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  assert.deepEqual(existing, cases.map(([slug]) => slug).sort());
});

for (const [slug, service, guide] of cases) {
  const file = path.join(root, 'projects', slug, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || '';
  const intro = main.match(/<section class="section shell project-intro">([\s\S]*?)<\/section>/)?.[1] || '';

  test(`${slug}: separate Scope and Outcome headings explain the photographed work`, () => {
    for (const heading of ['Scope', 'Outcome']) {
      assert.match(intro, new RegExp(`<h[23](?:\\s[^>]*)?>${heading}<\\/h[23]>\\s*<p>[^<]{35,}<\\/p>`), heading);
    }
  });

  test(`${slug}: project introduction links to a matching existing service and guide`, () => {
    for (const route of [`services/${service}/`, `guides/${guide}/`]) {
      assert.ok(intro.includes(`href="../../${route}"`), `Missing contextual ${route}`);
      assert.ok(fs.existsSync(path.join(root, route, 'index.html')), `Broken destination: ${route}`);
    }
  });

  test(`${slug}: case text avoids unsupported testimonials, dates, prices and promises`, () => {
    const visible = main.replace(/<[^>]*>/g, ' ');
    assert.doesNotMatch(main, /<blockquote\b|itemprop="(?:review|ratingValue|dateCreated|datePublished)"/i);
    assert.doesNotMatch(visible, /\b(?:testimonials?|five[- ]star|5[- ]star|happy (?:client|customer)|client said|customer said|guaranteed|guarantee|completed (?:on|in)|finished (?:on|in)|completion date|project date)\b|\$\s*\d/i);
    assert.doesNotMatch(visible, /\b(?:19|20)\d{2}\b|\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/);
  });
}

test('deck evidence keeps separate settings rather than inventing one before-and-after sequence', () => {
  const html = fs.readFileSync(path.join(root, 'projects/decking-refinishing-maintenance/index.html'), 'utf8');
  assert.match(html, /examples, not a single before-and-after project sequence/);
  assert.match(html, /<h[23]>Outcome<\/h[23]>\s*<p>[^<]*separate[^<]*settings/i);
  for (const image of ['decking-preparation', 'decking-coating', 'decking-finished-entry', 'decking-finished-outdoor']) {
    assert.ok(html.includes(`/optimized/${image}-1440.webp`), image);
  }
});

test('fence image descriptions identify fence details and fence work', () => {
  const html = fs.readFileSync(path.join(root, 'projects/timber-fence-repair/index.html'), 'utf8');
  assert.match(html, /<img src="[^\"]*fence-detail-1440\.webp" alt="Damaged timber fence post and paling detail"/);
  assert.match(html, /<img src="[^\"]*fence-during-1440\.webp" alt="Timber fence repair work in progress"/);
});

test('homepage photographed project discovery includes related services and maintenance advice', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const section = html.match(/<section class="section shell project-feature">([\s\S]*?)<\/section>/)?.[1] || '';
  assert.match(section, /href="\.\/services\/roofing-gutters-exterior\/gutter-services\/"/);
  assert.match(section, /href="\.\/guides\/seasonal-home-maintenance-australia\/"/);
});
