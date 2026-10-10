const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const sitemap = fs.readFileSync(path.resolve(__dirname, '../dist/sitemap.xml'), 'utf8');
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
assert.equal(paths.length, 113, 'Expected 113 built sitemap URLs');
const port = Number(process.env.ELLIS_PREVIEW_PORT || 4180);
const base = `http://127.0.0.1:${port}`;

async function run() {
  let failures = 0;
  for (const pathname of paths) {
    const response = await fetch(`${base}${pathname}`);
    const body = await response.text();
    if (response.status !== 200 || !response.headers.get('content-type')?.startsWith('text/html') || !/<main\b[^>]*\bid="main"(?:\s|>)/.test(body)) {
      failures += 1;
      console.error(`${pathname}: ${response.status} ${response.headers.get('content-type')}`);
    }
  }
  const notFoundPage = await fetch(`${base}/404.html`);
  const notFoundBody = await notFoundPage.text();
  if (notFoundPage.status !== 200 || !notFoundBody.includes('404 · Page not found') || !notFoundBody.includes('data-service-search') || !notFoundBody.includes('name="robots" content="noindex,follow"')) {
    failures += 1;
    console.error(`/404.html: ${notFoundPage.status} branded recovery page missing`);
  }
  for (const route of ['/missing-smoke-page', '/missing-smoke/nested/page/', '/missing-smoke/nested/page.html', '/README.md', '/docs/seo/seo-implementation-report.md', '/.env.local', '/vercel.json', '/api/contact.js']) {
    const response = await fetch(`${base}${route}`);
    const body = await response.text();
    assert.equal(response.status, 404, route);
    assert.ok(body.includes('name="robots" content="noindex,follow"'), route);
    assert.ok(body.includes('data-service-search') && body.includes('href="/"'), route);
  }
  const recoveryAssets = [...notFoundBody.matchAll(/(?:src|href)="(\/(?:assets|data)\/[^\"]+)"/g)].map(match => match[1]);
  assert.ok(recoveryAssets.length > 0);
  for (const asset of recoveryAssets) assert.equal((await fetch(`${base}${asset}`)).status, 200, asset);
  for (const [route, target] of [
    ['/index.html?source=smoke', '/?source=smoke'],
    ['/services/index.html?source=smoke&x=1', '/services/?source=smoke&x=1'],
    ['/services?source=smoke', '/services/?source=smoke'],
  ]) {
    const response = await fetch(`${base}${route}`, { redirect: 'manual' });
    assert.equal(response.status, 308, route);
    assert.equal(response.headers.get('location'), target, route);
    assert.equal((await fetch(`${base}${route}`)).status, 200, route);
  }
  if (failures) process.exit(1);
  console.log(`HTTP smoke passed: ${paths.length}/${paths.length} built sitemap pages plus branded 404.html returned expected local HTML; unknown/nested/private paths returned noindex 404; ${recoveryAssets.length} recovery assets and 3 query-preserving local redirects passed.`);
}

run().catch((error) => { console.error(error); process.exit(1); });
