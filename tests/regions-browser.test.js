const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const root = path.resolve(__dirname, '..');
const { loadPlaywright, browserLaunchOptions } = require('./helpers/browser-runtime');
const { redirectFor } = require('./helpers/vercel-routing');
const playwright = loadPlaywright();
const { areas } = require('../tools/render-regions');
let browser, server, base;
test.before(async () => {
  server = http.createServer((req, res) => {
    if (req.method !== 'GET') return res.writeHead(405).end();
    const url = new URL(req.url, 'http://localhost');
    const redirect = redirectFor(url.pathname);
    if (redirect) return res.writeHead(redirect.status, { Location: new URL(redirect.location).pathname + url.search }).end();
    const file = path.resolve(root, '.' + url.pathname, url.pathname.endsWith('/') ? 'index.html' : '');
    if (path.relative(root, file).startsWith('..') || !fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type', { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await playwright.chromium.launch(browserLaunchOptions(playwright.chromium.executablePath()));
});
test.after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });
async function pageFor(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...options });
  t.after(() => context.close());
  await context.route('**/*', route => route.request().url().startsWith(base) && route.request().method() === 'GET' ? route.continue() : route.abort());
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, []));
  return page;
}
// Breaks caught: missing pages/canonicals or service links requiring JavaScript.
test('all nine region destinations work without JavaScript and retain clean self-canonicals', async t => {
  const page = await pageFor(t, { javaScriptEnabled: false });
  for (const area of areas) {
    const response = await page.goto(`${base}/areas/${area.slug}/`);
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), `https://www.perthhandymate.com.au/areas/${area.slug}/`);
    assert.ok(await page.locator('#suburb-repair-links a').count() >= 4);
    assert.match(await page.locator('#local-property-guidance').innerText(), /repair/i);
  }
});
// Breaks caught: display-size card titles, partial rounding, overflow, or lost keyboard links.
test('region hub has three desktop columns, full rounding and a keyboard path at narrow width', async t => {
  const page = await pageFor(t);
  await page.goto(base + '/areas/');
  const metrics = await page.locator('.area-grid').evaluate(grid => ({ columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length, cards: grid.children.length, radius: ['borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius'].map(k => parseFloat(getComputedStyle(grid.firstElementChild)[k])), font: parseFloat(getComputedStyle(grid.querySelector('h2')).fontSize) }));
  assert.equal(metrics.columns, 3); assert.equal(metrics.cards, 9);
  assert.ok(metrics.radius.every(n => n >= 10)); assert.ok(metrics.font >= 22 && metrics.font <= 26);
  if (process.env.PHM_CAPTURE_LABEL) { const folder = path.resolve(root, '../reports/task-2-regions/screenshots'); fs.mkdirSync(folder, { recursive: true }); await page.screenshot({ path: path.join(folder, 'areas-desktop.png'), fullPage: true }); }
  await page.setViewportSize({ width: 390, height: 844 });
  // Chromium can expose the previous layout's scroll width until its resize paint.
  // Wait for layout/paint, then measure the unchanged strict overflow contract.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth).map(el => [el.tagName, el.className, el.getBoundingClientRect().right]).slice(0, 10))));
  await page.locator('.area-grid h2 a').first().focus();
  await page.keyboard.press('Enter'); await page.waitForURL(base + '/areas/perth-central/');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
});
// Breaks caught: context lost on the service or Contact, unsafe query rendering, broken index redirects.
test('every sticking-door discovery link keeps repair intent and validated locality through Contact', async t => {
  const page = await pageFor(t);
  let checked = 0;
  for (const origin of ['/areas/', ...areas.map(a => `/areas/${a.slug}/`)]) {
    await page.goto(base + origin);
    const links = await page.locator('main a').filter({ hasText: /^Sticking-door repairs in / }).evaluateAll(nodes => nodes.map(a => ({ href: a.getAttribute('href'), text: a.textContent })));
    assert.equal(links.length, origin === '/areas/' ? 2 : 1, origin);
    for (const link of links) {
      await page.goto(base + origin);
      const suburb = link.text.slice('Sticking-door repairs in '.length);
      await page.locator('main a').filter({ hasText: link.text }).click();
      assert.equal(await page.locator('h1').innerText(), 'Door Repairs in Perth', origin);
      assert.equal(new URL(page.url()).pathname, '/services/doors-windows-glass-screens/door-repairs/');
      assert.equal(await page.locator('[data-local-context]').innerText(), `Door Repairs in ${suburb} — selected repair location. Ellis confirms the scope and assessment arrangements with you.`);
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://www.perthhandymate.com.au/services/doors-windows-glass-screens/door-repairs/');
      await page.locator('.page-hero a[data-preserve-search]').first().click();
      await page.waitForURL(url => url.pathname === '/contact/');
      assert.equal(await page.locator('[name=postcode]').inputValue(), suburb);
      assert.equal(await page.locator('[name=service]').inputValue(), 'Doors, windows, glass & screens');
      assert.equal(await page.locator('[name=message]').inputValue(), 'Service request: Door Repairs');
      checked++;
    }
  }
  assert.equal(checked, 11);
});
test('named suburb goes through service context to Contact prefill and rejects unknown/XSS banners', async t => {
  const page = await pageFor(t);
  await page.goto(base + '/areas/perth-central/');
  const localLink = page.locator('#suburb-repair-links a').filter({ hasText: 'East Perth' });
  await localLink.click();
  assert.match(await page.locator('[data-local-context]').innerText(), /East Perth/);
  const defaultH1 = await page.locator('h1').innerText();
  assert.match(defaultH1, /Perth/);
  const canonical = await page.locator('link[rel=canonical]').getAttribute('href');
  assert.ok(!canonical.includes('?'));
  if (process.env.PHM_CAPTURE_LABEL) await page.screenshot({ path: path.resolve(root, '../reports/task-2-regions/screenshots/service-east-perth.png') });
  const servicePath = new URL(page.url()).pathname;
  await page.locator('.page-hero a[data-preserve-search]').first().click();
  await page.waitForURL(url => url.pathname === '/contact/');
  assert.equal(await page.locator('[name=postcode]').inputValue(), 'East Perth');
  assert.ok((await page.locator('[name=service]').inputValue()).length > 0);
  assert.match(await page.locator('[name=message]').inputValue(), /Service request:/);
  for (const suburb of ['Unknown Place', '<img src=x onerror=alert(1)>', 'East Perth\u0000']) {
    await page.goto(base + servicePath + '?suburb=' + encodeURIComponent(suburb));
    assert.equal(await page.locator('[data-local-context]').count(), 0);
    assert.equal(await page.locator('h1').innerText(), defaultH1);
    assert.equal(await page.locator('img[onerror]').count(), 0);
  }
  await page.goto(base + servicePath + 'index.html?suburb=East+Perth&q=sticking+door');
  assert.equal(new URL(page.url()).pathname, servicePath);
  assert.match(await page.locator('[data-local-context]').innerText(), /East Perth/);
  assert.equal(new URL(page.url()).searchParams.get('q'), 'sticking door');
});
