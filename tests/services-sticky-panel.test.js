const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const { loadPlaywright, browserLaunchOptions } = require('./helpers/browser-runtime');
const playwright = loadPlaywright();
const capture = process.env.PHM_CAPTURE_LABEL;
const screenshots = path.resolve(root, '../reports/task-1-services-panel/screenshots');
let browser, server, base;

test.before(async () => {
  server = http.createServer((request, response) => {
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = path.resolve(root, `.${pathname}`, pathname.endsWith('/') ? 'index.html' : '');
    if (path.relative(root, file).startsWith('..') || !fs.existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    const type = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' }[path.extname(file)];
    response.setHeader('Content-Type', type || 'application/octet-stream');
    response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await playwright.chromium.launch(browserLaunchOptions(playwright.chromium.executablePath()));
  if (capture) fs.mkdirSync(screenshots, { recursive: true });
});
test.after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function pageAt(t, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  t.after(() => context.close());
  await context.route('**/*', route => {
    const request = route.request();
    return request.url().startsWith(base) && request.method() === 'GET' ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/services/`, { waitUntil: 'load' });
  t.after(() => assert.deepEqual(errors, [], 'no runtime JavaScript errors'));
  return page;
}

async function measure(page) {
  return page.evaluate(() => {
    const header = document.querySelector('.site-header').getBoundingClientRect();
    const section = document.querySelector('.services-overview-layout').getBoundingClientRect();
    const cards = document.querySelector('.services-overview-cards').getBoundingClientRect();
    const panel = document.querySelector('.services-team-panel');
    const box = panel.getBoundingClientRect();
    const link = panel.querySelector('a[href="../contact/"]');
    return {
      headerBottom: header.bottom,
      sectionTop: section.top,
      sectionBottom: section.bottom,
      cardsTop: cards.top,
      cardsRight: cards.right,
      panelTop: box.top,
      panelBottom: box.bottom,
      panelLeft: box.left,
      panelRight: box.right,
      panelHeight: box.height,
      position: getComputedStyle(panel).position,
      overflow: document.documentElement.scrollWidth - innerWidth,
      linkTop: link?.getBoundingClientRect().top,
      linkBottom: link?.getBoundingClientRect().bottom,
      linkVisible: !!link && getComputedStyle(link).visibility === 'visible',
      imageLoaded: panel.querySelector('img').naturalWidth > 0,
      radius: getComputedStyle(panel).borderTopLeftRadius,
    };
  });
}

async function shot(page, name) {
  if (capture) await page.screenshot({ path: path.join(screenshots, `${capture}-${name}.png`) });
}

// Breaks caught: missing Contact action, non-sticky desktop card, or card escaping its section.
test('desktop team card stays beside the grid, sticks below the header, then releases', async t => {
  const page = await pageAt(t, { width: 1440, height: 900 });
  const panel = page.locator('.services-team-panel');
  const contact = panel.getByRole('link', { name: 'Contact Us' });
  assert.equal(await contact.count(), 1, 'a clearly labelled Contact action exists');
  assert.equal(await contact.getAttribute('href'), '../contact/');
  assert.ok((await contact.getAttribute('class')).includes('button'), 'uses established button style');
  const start = await measure(page);
  assert.equal(start.overflow, 0);
  assert.ok(start.imageLoaded, 'existing team image loads');
  assert.ok(parseFloat(start.radius) >= 10, 'existing card corners remain rounded');
  assert.ok(start.panelLeft > start.cardsRight, 'panel remains alongside the grid');
  assert.ok(Math.abs(start.panelTop - start.cardsTop) < 2, 'panel begins with the grid');
  await shot(page, 'desktop-start');

  await page.evaluate(() => window.scrollTo(0, document.querySelector('.services-overview-layout').getBoundingClientRect().top + scrollY + 300));
  const middle = await measure(page);
  assert.equal(middle.position, 'sticky');
  assert.ok(middle.panelTop >= middle.headerBottom + 8, 'panel clears sticky header');
  assert.ok(middle.panelTop <= middle.headerBottom + 26, 'panel stays in view while cards scroll');
  assert.ok(middle.linkBottom <= 900, 'Contact stays reachable in normal desktop height');
  assert.equal(middle.overflow, 0);
  await shot(page, 'desktop-middle');

  await page.evaluate(() => window.scrollTo(0, document.querySelector('.services-overview-layout').getBoundingClientRect().bottom + scrollY - 120));
  const end = await measure(page);
  assert.ok(end.panelBottom <= end.sectionBottom + 1, 'panel releases within its parent before following sections');
  assert.ok(end.panelTop < middle.panelTop - 80, 'panel moves upward after sticky release');
  assert.equal(end.overflow, 0);
  await shot(page, 'desktop-end');
});

// Breaks caught: a short-height sticky card hiding Contact or breaking keyboard navigation.
test('short desktop viewport leaves Contact reachable by keyboard without a nested scroll trap', async t => {
  const page = await pageAt(t, { width: 1440, height: 600 });
  const panel = page.locator('.services-team-panel');
  const contact = panel.getByRole('link', { name: 'Contact Us' });
  assert.equal((await measure(page)).position, 'static', 'short viewport uses document flow');
  await page.locator('.services-overview-cards .service-card:last-child .text-link').focus();
  await page.keyboard.press('Tab');
  assert.equal(await contact.evaluate(link => document.activeElement === link), true, 'Contact follows the grid in tab order');
  const focused = await measure(page);
  assert.ok(focused.linkVisible && focused.linkTop >= focused.headerBottom, 'focused Contact is not obscured by the header');
  assert.ok(focused.linkBottom <= 600, 'focused Contact is on screen');
  assert.equal(focused.overflow, 0);
  await shot(page, 'short-desktop-contact');
  await page.keyboard.press('Enter');
  await page.waitForURL(`${base}/contact/`);
  assert.equal(new URL(page.url()).pathname, '/contact/');
});

// Breaks caught: sticky or overlay behavior leaking into tablet/mobile and losing the other CTA.
for (const viewport of [{ width: 820, height: 700 }, { width: 390, height: 844 }]) {
  test(`team card stays in document flow at ${viewport.width}px with no horizontal overflow`, async t => {
    const page = await pageAt(t, viewport);
    const layout = await measure(page);
    assert.equal(layout.position, 'static');
    assert.ok(layout.panelTop >= layout.cardsTop, 'panel follows the service grid');
    assert.ok(layout.panelRight <= viewport.width, 'panel stays within viewport');
    assert.equal(layout.overflow, 0);
    const contact = page.locator('.services-team-panel').getByRole('link', { name: 'Contact Us' });
    await contact.scrollIntoViewIfNeeded();
    assert.ok(await contact.isVisible());
    assert.equal(await page.locator('.cta-band a[href="../contact/"]').count(), 1, 'later Contact CTA remains');
    await shot(page, `flow-${viewport.width}`);
  });
}
