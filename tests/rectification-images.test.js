const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { loadPlaywright, browserLaunchOptions } = require('./helpers/browser-runtime');
const root = path.resolve(__dirname, '..');
let server, browser, base;
test.before(async () => {
  server = http.createServer((req, res) => {
    const file = path.join(root, new URL(req.url, 'http://localhost').pathname, req.url.endsWith('/') ? 'index.html' : '');
    if (req.method !== 'GET' || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const pw = loadPlaywright();
  browser = await pw.chromium.launch(browserLaunchOptions(pw.chromium.executablePath()));
});
test.after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });

// Break caught: a JS background loader downloads the original even while the optimized img is used.
test('cold category visits display responsive WebP without requesting the original PNG', async () => {
  const categories = ['electrical-plumbing-gas-air-conditioning', 'handyman-interiors-appliance-repairs', 'doors-windows-glass-screens', 'roofing-gutters-exterior', 'gardens-landscaping', 'outdoor-structures-fencing-pools', 'building-renovation-structural', 'planning-inspection-compliance', 'cleaning-removals-pest-hazard'];
  const originals = [];
  for (const category of categories) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      await context.route('**/*', route => route.request().url().startsWith(base) && route.request().method() === 'GET' ? route.continue() : route.abort());
      const page = await context.newPage();
      page.on('request', req => { if (/\/assets\/images\/services\/[^/]+\.png(?:\?|$)/.test(req.url())) originals.push(new URL(req.url()).pathname); });
      await page.goto(`${base}/services/${category}/`, { waitUntil: 'load' });
      const img = page.locator('[data-service-image] img');
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(e => e.decode());
      assert.ok(await img.isVisible());
      assert.match(await img.evaluate(e => e.currentSrc), new RegExp(`/optimized/${category}-\\d+\\.webp$`));
      assert.equal(await img.getAttribute('loading'), 'lazy');
      assert.match(await img.getAttribute('srcset'), /480w.*960w.*1440w/);
    } finally { await context.close(); }
  }
  assert.deepEqual(originals, [], 'only responsive image resources should be loaded');
});
