// Local built-dist acceptance only. Never submits the enquiry form or opens tel/mail links.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { auditPage, resolveLocalLink, text } = require('./content-round2-acceptance');
const { inventorySite } = require('./content-seo-inventory');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/UFTR/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4181';
assert.equal(new URL(origin).hostname, '127.0.0.1', 'Only a loopback preview is allowed');
const out = path.join(root, '.seo-cache/after-visual');
fs.mkdirSync(out, { recursive: true });
const baselineRoutes = ['/', '/services/handyman-interiors-appliance-repairs/handymen/', '/guides/prepare-before-home-repair-quote/', '/about/', '/contact/', '/areas/north-perth-stirling/'];
const samples = [...baselineRoutes, '/services/', '/services/handyman-interiors-appliance-repairs/', '/guides/', '/projects/bathroom-tile-shower-repair/', '/faq/', '/areas/', '/privacy/', '/404.html'];

async function main() {
  const pages = inventorySite(root);
  const html = new Map();
  const statuses = [];
  // Fetch the actual server responses, then validate their semantics and every local anchor.
  for (const p of pages) {
    const response = await fetch(origin + p.path);
    const body = await response.text();
    assert.equal(response.status, 200, p.path);
    assert.deepEqual(auditPage(body, p.path).issues, [], p.path);
    html.set(p.path, body);
    statuses.push({ path: p.path, status: response.status });
  }
  let linkCount = 0;
  for (const [route, source] of html) for (const match of source.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)) {
    const href = match[1].replaceAll('&amp;', '&');
    const url = new URL(href, 'https://www.perthhandymate.com.au' + route);
    if (url.origin !== 'https://www.perthhandymate.com.au') continue;
    const issue = resolveLocalLink(href, route, target => html.get(target) ?? null);
    assert.equal(issue, null, `${route}: ${issue}`);
    linkCount++;
  }
  const missing = await fetch(origin + '/acceptance-missing-route/');
  assert.equal(missing.status, 404);
  assert.match(text(await missing.text()), /Page not found/);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const screenshots = [], rendering = [], interactions = [], blocked = [], errors = [], unexpectedRequests = [];
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      await context.route('**/*', route => {
        const request = route.request();
        if (new URL(request.url()).origin !== origin) { blocked.push(request.url()); return route.abort('blockedbyclient'); }
        if (!['GET', 'HEAD'].includes(request.method()) || /\/api\//.test(new URL(request.url()).pathname)) {
          unexpectedRequests.push({ url: request.url(), method: request.method() });
          return route.abort('blockedbyclient');
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT/.test(message.text())) errors.push(message.text()); });
      for (const route of samples) {
        const response = await page.goto(origin + route, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200, route);
        // Force lazy images to load for complete full-page screenshot/image checks.
        await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; }));
        await page.waitForFunction(() => [...document.images].every(img => img.complete));
        await page.evaluate(() => window.scrollTo(0, 0));
        const result = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          brokenImages: [...document.images].filter(img => !img.naturalWidth).map(img => img.src),
          logo: document.querySelector('.brand-logo').getAttribute('src'),
          brand: document.querySelector('.brand-name').textContent,
          background: getComputedStyle(document.querySelector('header')).backgroundColor,
          h1: document.querySelector('main h1').textContent,
        }));
        assert.equal(result.overflow, false, `${width} ${route} overflow`);
        assert.deepEqual(result.brokenImages, [], `${width} ${route} images`);
        assert.equal(result.brand, 'Ellis Services Group');
        rendering.push({ width, path: route, ...result });
        const index = baselineRoutes.indexOf(route);
        if (index >= 0) {
          const file = `${width}-${index}.png`;
          await page.screenshot({ path: path.join(out, file), fullPage: true });
          screenshots.push({ width, route, after: `.seo-cache/after-visual/${file}`, before: `.seo-cache/baseline-visual/${file}` });
        }
        if (width === 390) {
          const toggle = page.locator('[data-nav-toggle]');
          await toggle.click();
          assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
          assert.equal(await page.locator('#main-nav').getAttribute('data-open'), 'true');
          await toggle.click();
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        }
        if (route === '/faq/') {
          const details = page.locator('details').first();
          await details.locator('summary').click();
          assert.equal(await details.getAttribute('open'), '');
          await details.locator('summary').click();
          assert.equal(await details.getAttribute('open'), null);
          interactions.push(`${width}: FAQ open/close`);
        }
      }
      await page.goto(origin, { waitUntil: 'networkidle' });
      await page.locator('[data-service-search] [name="q"]').fill('handyman');
      assert.equal(await page.locator('[data-suggestions]').isVisible(), true);
      await page.locator('[data-clear-search]').click();
      assert.equal(await page.locator('[data-service-search] [name="q"]').inputValue(), '');
      await page.locator('[data-service-search] [name="q"]').fill('handyman');
      await page.locator('[data-service-search] [name="postcode"]').fill('6000');
      await Promise.all([page.waitForURL(url => url.searchParams.get('q') === 'handyman'), page.locator('[data-service-search] button[type="submit"]').click()]);
      const searchUrl = new URL(page.url());
      assert.equal(searchUrl.searchParams.get('postcode'), '6000');
      assert.ok(searchUrl.pathname.startsWith('/services/'));
      const contact = page.locator('main a[data-preserve-search][href*="contact/"]').first();
      await Promise.all([page.waitForURL('**/contact/**'), contact.click()]);
      assert.equal(await page.locator('[data-contact-form] [name="postcode"]').inputValue(), '6000');
      assert.equal(await page.locator('[data-contact-form] [name="message"]').inputValue(), 'Service request: handyman');
      assert.ok(await page.locator('[data-contact-form] [name="service"]').inputValue());
      interactions.push(`${width}: search suggestions/clear/search route/contact CTA/service+postcode+message prefill; enquiry form never submitted`);
      // Guide CTA has always been a plain contact link (no data-preserve-search contract).
      await page.goto(origin + '/guides/prepare-before-home-repair-quote/?q=door&postcode=6021', { waitUntil: 'networkidle' });
      await Promise.all([page.waitForURL(url => url.pathname === '/contact/'), page.locator('main a[href*="contact/"]').first().click()]);
      assert.equal(await page.locator('[data-contact-form] [name="message"]').inputValue(), '');
      interactions.push(`${width}: guide plain contact CTA opens contact with unchanged unprefilled behavior`);
      for (const route of ['/projects/bathroom-tile-shower-repair/', '/areas/north-perth-stirling/']) {
        await page.goto(origin + route + '?q=door&postcode=6021', { waitUntil: 'networkidle' });
        const cta = page.locator('main a[data-preserve-search][href*="contact/"]').first();
        await Promise.all([page.waitForURL('**/contact/**'), cta.click()]);
        assert.equal(await page.locator('[name="postcode"]').inputValue(), '6021');
        assert.equal(await page.locator('[name="message"]').inputValue(), 'Service request: door');
        interactions.push(`${width}: ${route} contact CTA preserves query and postcode`);
      }
      await page.goto(origin + '/404.html', { waitUntil: 'networkidle' });
      await page.locator('[data-service-search] [name="q"]').fill('handyman');
      await Promise.all([page.waitForURL(url => url.pathname.startsWith('/services/')), page.locator('[data-service-search] button[type="submit"]').click()]);
      interactions.push(`${width}: 404 search recovery and mobile navigation across 14 page types/samples`);
      await context.close();
    }
    assert.deepEqual(unexpectedRequests, [], 'No API or enquiry POST attempted');
    assert.deepEqual(errors, [], 'No unexpected browser console or page errors');
    const report = { analyzedAt: new Date().toISOString(), origin, statuses, localLinksChecked: linkCount, missingRouteStatus: missing.status, rendering, interactions, screenshots, blockedExternalRequests: blocked.length, blockedExternalHosts: [...new Set(blocked.map(url => new URL(url).hostname))], unexpectedRequests, errors, limitations: ['Built static preview has no serverless contact API; no real enquiry was submitted and email delivery is untested.', 'Aborted analytics script requests may create expected ERR_BLOCKED_BY_CLIENT console events, excluded from app errors.'] };
    fs.writeFileSync(path.join(root, '.seo-cache/content-round2-browser-acceptance.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ pages: statuses.length, localLinks: linkCount, renders: rendering.length, screenshots: screenshots.length, interactions: interactions.length, blockedExternalRequests: blocked.length, errors, unexpectedRequests }, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
