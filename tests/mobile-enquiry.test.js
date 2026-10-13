const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
// Use the workspace runtime without adding a production dependency.
let playwright;
try { playwright = require('playwright'); } catch {
  playwright = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
}
const capture = process.env.PHM_CAPTURE_LABEL;
const screenshots = path.resolve(root, '../reports/seo-optimization-local-2026-10-13/screenshots');
let browser, server, base, fixture;
test.before(async () => {
  // Build outside source so concurrent inventory tests never see dist being replaced.
  const reports = path.resolve(root, '../reports/seo-optimization-local-2026-10-13');
  fs.mkdirSync(reports, { recursive: true });
  fixture = fs.mkdtempSync(path.join(reports, 'task-2-build-'));
  const inputs = [...fs.readdirSync(root).filter(file => /\.(?:html|ico|png)$/.test(file)), 'about', 'areas', 'assets', 'contact', 'data', 'faq', 'guides', 'privacy', 'projects', 'robots.txt', 'services', 'site.webmanifest', 'sitemap.xml'];
  for (const entry of inputs) fs.cpSync(path.join(root, entry), path.join(fixture, entry), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'scripts'));
  for (const script of ['build-local.js', 'normalize-index-links.js']) fs.copyFileSync(path.join(root, 'scripts', script), path.join(fixture, 'scripts', script));
  execFileSync(process.execPath, ['scripts/build-local.js'], { cwd: fixture });
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.join(fixture, 'dist', pathname, pathname.endsWith('/') ? 'index.html' : '');
    const type = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp' }[path.extname(file)];
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', type || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await playwright.chromium.launch({ headless: true, channel: 'msedge' });
  if (capture) fs.mkdirSync(screenshots, { recursive: true });
});
test.after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  if (fixture) fs.rmSync(fixture, { recursive: true, force: true });
});
async function pageAt(t, route, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  t.after(() => context.close());
  await context.route('**/*', route => {
    const req = route.request();
    return req.url().startsWith(base) && req.method() === 'GET' ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + route, { waitUntil: 'load' });
  t.after(() => assert.deepEqual(errors, [], 'no runtime JavaScript errors'));
  return page;
}
async function shot(page, name) {
  if (capture) {
    await page.screenshot({ path: path.join(screenshots, `${capture}-${name}-viewport.png`) });
    await page.screenshot({ path: path.join(screenshots, `${capture}-${name}.png`), fullPage: true });
  }
}
async function measure(page) {
  return page.evaluate(() => ({ height: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth - innerWidth, scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior }));
}
function contrast(fg, bg) {
  const luminance = value => value.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
// Breaks caught: light action backgrounds, buried quote CTA, missing first-screen routes,
// dropped case destinations, broken/obscured fragments and lost query prefill.
test('built shared orange actions meet text contrast in idle, hover and keyboard focus', async t => {
  const page = await pageAt(t, '/');
  for (const selector of ['.header-call', '.hero .button.primary', '.search-button']) {
    const el = page.locator(selector);
    for (const state of ['idle', 'hover', 'focus']) {
      await page.mouse.move(0, 0);
      if (state === 'hover') await el.hover();
      if (state === 'focus') { await el.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); }
      const style = await el.evaluate(e => { const s = getComputedStyle(e); return { color: s.color, bg: s.backgroundColor, outline: s.outlineStyle, width: parseFloat(s.outlineWidth) }; });
      assert.ok(contrast(style.color, style.bg) >= 4.5, `${selector} ${state}: ${contrast(style.color, style.bg).toFixed(2)}:1`);
      if (state === 'focus') assert.ok(style.outline !== 'none' && style.width >= 2, 'visible keyboard focus');
    }
  }
});
for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`built home first-screen paths and compact projects at ${viewport.width}`, async t => {
    const page = await pageAt(t, '/', viewport);
    const metrics = await measure(page);
    const quote = await page.locator('.hero .button.primary').boundingBox();
    console.log('home', viewport.width, JSON.stringify({ ...metrics, quoteBottom: quote.y + quote.height }));
    await shot(page, `home-${viewport.width}`);
    assert.equal(metrics.overflow, 0);
    assert.equal(metrics.scrollBehavior, 'auto');
    assert.ok(quote.y + quote.height <= viewport.height, 'quote CTA is above the fold');
    const quick = page.getByRole('navigation', { name: 'Quick enquiry paths' });
    assert.equal(await quick.count(), 1, 'visible direct services, areas and enquiry paths');
    for (const destination of ['/services/', '/areas/', '/contact/']) {
      const link = quick.locator(`a[href$="${destination}"]`);
      assert.equal(await link.count(), 1);
      assert.ok((await link.boundingBox()).height >= 44);
    }
    if (viewport.width === 390) {
      assert.ok((await quick.boundingBox()).y < viewport.height + 100, 'quick routes within or immediately below first screen');
      assert.ok(metrics.height < 16500, 'materially shorter than the 19,827px audit baseline');
    }
    const cases = await page.locator('a[href*="/projects/"]').evaluateAll(links => [...new Set(links.map(a => new URL(a.href).pathname).filter(p => p !== '/projects/'))]);
    assert.equal(cases.length, 13, 'all case pages remain crawlable from home');
    for (const route of cases) assert.equal((await page.request.get(base + route)).status(), 200, route);
    assert.equal(await page.locator('.project-feature .evidence-feature').count(), 3);
    assert.equal(await page.locator('#repair-projects').count(), 1, 'existing home project section serves as the hub');
    assert.equal((await page.locator('.project-feature a[href*="/projects/"]').evaluateAll(links => [...new Set(links.map(a => new URL(a.href).pathname))])).length, 13);
    assert.equal(await page.locator('.project-feature .support-feature:not(.evidence-feature)').count(), 0, 'older projects use compact descriptive links');
    assert.ok(await page.locator('#local-repair-requests').isVisible(), 'coverage evidence stays visible');
  });
  test(`built enquiry fast paths retain menu, search and task location at ${viewport.width}`, async t => {
    const page = await pageAt(t, '/', viewport);
    const toggle = page.locator('[data-nav-toggle]');
    if (await toggle.isVisible()) {
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert.ok(await page.locator('#main-nav a[href="./services/"]').isVisible());
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    }
    await page.locator('#service-q').fill('clothesline');
    assert.ok(await page.locator('[data-suggestions]').isVisible());
    await page.locator('[data-clear-search]').click();
    assert.equal(await page.locator('#service-q').inputValue(), '');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'service-q');
    await page.locator('#service-q').fill('unknown repair request');
    await page.locator('#postcode').fill('6155');
    await page.locator('.search-button').click();
    await page.waitForURL('**/contact/?**');
    assert.equal(await page.locator('[name="postcode"]').inputValue(), '6155');
    assert.equal(await page.locator('[name="message"]').inputValue(), 'Service request: unknown repair request');
  });
  test(`built contact jump reaches usable form and preserves query at ${viewport.width}`, async t => {
    const page = await pageAt(t, '/contact/?q=Clothesline+repair&postcode=6155&service=Handyman%2C+interiors+%26+appliance+repairs', viewport);
    console.log('contact', viewport.width, JSON.stringify({ ...await measure(page), formTop: (await page.locator('[data-contact-form]').boundingBox()).y }));
    await shot(page, `contact-${viewport.width}`);
    assert.equal((await measure(page)).overflow, 0);
    const jump = page.locator('.contact-hero a[href="#enquiry-form"]');
    assert.equal(await jump.count(), 1, 'explicit jump to form');
    const box = await jump.boundingBox();
    assert.ok(box.y + box.height <= viewport.height, 'jump is above the fold');
    await jump.click();
    assert.equal(await page.locator('#enquiry-form').count(), 1);
    const form = await page.locator('#enquiry-form').boundingBox();
    const header = await page.locator('.site-header').boundingBox();
    assert.ok(form.y >= header.y + header.height, 'form target clears sticky header');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').getAttribute('name'), 'name', 'jump gives keyboard access to first field');
    assert.equal(await page.locator('[name="postcode"]').inputValue(), '6155');
    assert.equal(await page.locator('[name="message"]').inputValue(), 'Service request: Clothesline repair');
    assert.equal(await page.locator('[name="service"]').inputValue(), 'Handyman, interiors & appliance repairs');
    const fields = await page.locator('[data-contact-form] input,[data-contact-form] select,[data-contact-form] textarea').evaluateAll(nodes => nodes.map(e => [e.name, e.type, e.required, e.labels?.length || 0]));
    assert.deepEqual(fields, [['website','text',false,0],['name','text',false,1],['email','email',false,1],['phone','tel',false,1],['postcode','text',false,1],['service','select-one',false,1],['message','textarea',false,1]]);
  });
  for (const service of ['handymen', 'clothesline-repairs-installation']) test(`built ${service} section navigation resolves below header at ${viewport.width}`, async t => {
    const page = await pageAt(t, `/services/handyman-interiors-appliance-repairs/${service}/`, viewport);
    await shot(page, `${service}-${viewport.width}`);
    assert.equal((await measure(page)).overflow, 0);
    const nav = page.getByRole('navigation', { name: 'On this page' });
    assert.equal(await nav.count(), 1, 'concise visible section navigation');
    const hrefs = await nav.locator('a').evaluateAll(links => links.map(a => a.getAttribute('href')));
    assert.ok(hrefs.length >= 3 && hrefs.length <= 8);
    for (const href of hrefs) {
      assert.ok(href.startsWith('#'));
      const target = page.locator(href);
      assert.equal(await target.count(), 1, href);
      await nav.locator(`a[href="${href}"]`).click();
      assert.ok((await target.boundingBox()).y >= (await page.locator('.site-header').boundingBox()).height, `${href} clears sticky header`);
    }
  });
}
