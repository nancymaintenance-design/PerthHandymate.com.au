const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const origin = 'https://www.perthhandymate.com.au';
const areas = [
  ['perth-central', 'Perth CBD & Inner Suburbs', 'building and access'],
  ['north-perth-stirling', 'North Perth & Stirling', 'repair list'],
  ['joondalup-northern-suburbs', 'Joondalup & Northern Suburbs', 'outdoor item its own location'],
  ['south-perth-canning', 'South Perth & Canning', 'rooms and responsibilities'],
  ['fremantle-coastal-south', 'Fremantle & Coastal South', 'window, timber and exterior repairs'],
  ['eastern-suburbs-midland-swan', 'Eastern Suburbs, Midland & Swan', 'property walkthrough'],
  ['cockburn-rockingham-southern-corridor', 'Cockburn, Rockingham & Southern Corridor', 'supplied products'],
];
const read = route => fs.readFileSync(path.join(root, route, 'index.html'), 'utf8');
const main = html => html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
const links = html => [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)]
  .map(match => match[1].replaceAll('&amp;', '&'));
const localUrls = (html, route) => links(html)
  .filter(href => !/^(?:[a-z]+:|\/\/|#)/i.test(href))
  .map(href => new URL(href, `${origin}/${route}/`));

for (const [slug, label, guidancePhrase] of areas) {
  const route = `areas/${slug}`;
  test(`${label} offers local guidance and at least four service details with suburb context`, () => {
    const content = main(read(route));
    const guidance = content.match(/<section\b[^>]*id="local-property-guidance"[^>]*>([\s\S]*?)<\/section>/)?.[1];
    assert.ok(guidance, `${route}: missing property and access guidance`);
    const headings = [...guidance.matchAll(/<h[23]>([^<]+)<\/h[23]>/g)].map(([, heading]) => heading);
    assert.ok(headings.some(heading => heading.includes(guidancePhrase)), `${route}: missing area-specific guidance phrase "${guidancePhrase}"`);
    const details = localUrls(content, route).filter(url => /^\/services\/[^/]+\/[^/]+\/$/.test(url.pathname));
    assert.ok(new Set(details.map(url => url.pathname)).size >= 4, `${route}: fewer than four detail services`);
    for (const url of details) assert.equal(url.searchParams.get('suburb'), label, `${route}: ${url.href}`);
  });
}

test('renderer retains category discovery and connects surface assessment to guide and contact', () => {
  const category = 'services/roofing-gutters-exterior';
  const detail = `${category}/renderers`;
  assert.ok(localUrls(main(read(category)), category).some(url => url.pathname === `/${detail}/`));
  const content = main(read(detail));
  const urls = localUrls(content, detail);
  assert.ok(urls.some(url => url.pathname === `/${category}/`));
  assert.ok(urls.some(url => url.pathname === '/guides/wall-patching-paint-touch-ups-guide/'), 'rendering finish guide');
  assert.ok(urls.some(url => url.pathname === '/contact/' && url.searchParams.get('q') === 'Renderers'));
});

test('all 67 canonical details remain reachable through the services index and category pages', () => {
  const index = main(read('services'));
  const categories = localUrls(index, 'services').filter(url => /^\/services\/[^/]+\/$/.test(url.pathname));
  const reachable = new Set();
  for (const category of categories) {
    const route = category.pathname.slice(1, -1);
    for (const url of localUrls(main(read(route)), route)) {
      if (/^\/services\/[^/]+\/[^/]+\/$/.test(url.pathname)) reachable.add(url.pathname);
    }
  }
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/service-catalog.json'), 'utf8')).canonicalServices;
  assert.equal(catalog.length, 67);
  for (const service of catalog) assert.ok(reachable.has(`/${service.url.replace(/^\/+|\/+$/g, '')}/`), service.url);
});

test('area and exterior discovery links resolve to local files', () => {
  for (const route of [...areas.map(([slug]) => `areas/${slug}`), 'services', 'services/roofing-gutters-exterior', 'services/roofing-gutters-exterior/renderers']) {
    for (const url of localUrls(main(read(route)), route)) {
      const relative = decodeURIComponent(url.pathname).slice(1);
      const file = path.join(root, relative, ...(url.pathname.endsWith('/') ? ['index.html'] : []));
      assert.ok(fs.existsSync(file), `${route}: ${url.href}`);
    }
  }
});
