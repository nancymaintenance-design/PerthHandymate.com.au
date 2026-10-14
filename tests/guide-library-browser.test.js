const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const root = path.resolve(__dirname, '..');
const { loadPlaywright, browserLaunchOptions } = require('./helpers/browser-runtime');
const { guides } = require('../data/guide-library');
const playwright = loadPlaywright();
let browser, server, base;
test.before(async () => {
  server = http.createServer((req, res) => {
    if (req.method !== 'GET') return res.writeHead(405).end();
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(root, '.' + url.pathname, url.pathname.endsWith('/') ? 'index.html' : '');
    if (path.relative(root, file).startsWith('..') || !fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type', { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await playwright.chromium.launch(browserLaunchOptions(playwright.chromium.executablePath()));
});
test.after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });
async function pageFor(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...options });
  t.after(() => context.close());
  await context.route('**/*', route => route.request().url().startsWith(base) && route.request().method() === 'GET' ? route.continue() : route.abort());
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, []));
  return page;
}
async function capture(page, name, fullPage = true) {
  if (!process.env.PHM_CAPTURE_LABEL) return;
  const folder = path.resolve(root, '../reports/task-3-guides/screenshots');
  fs.mkdirSync(folder, { recursive: true });
  await page.screenshot({ path: path.join(folder, name + '.png'), fullPage });
}
// Breaks caught: billboard/two-column desktop layout, mobile overflow, square corners.
test('guide library renders twelve compact cards in desktop, tablet and phone grids', async t => {
  const page = await pageFor(t);
  for (const [width, columns] of [[1440, 3], [1920, 3], [900, 2], [390, 1]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + '/guides/');
    const metrics = await page.evaluate(() => ({
      cards: document.querySelectorAll('.guide-library .guide-card').length,
      columns: getComputedStyle(document.querySelector('.guide-card-grid')).gridTemplateColumns.split(' ').length,
      overflow: document.documentElement.scrollWidth - innerWidth,
      details: [...document.querySelectorAll('.guide-card')].map(card => ({
        font: parseFloat(getComputedStyle(card.querySelector('h3')).fontSize),
        corners: ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'].map(k => parseFloat(getComputedStyle(card)[k])),
        bottom: Math.round(card.getBoundingClientRect().bottom - card.querySelector('.text-link').getBoundingClientRect().bottom)
      }))
    }));
    assert.equal(metrics.cards, 12); assert.equal(metrics.columns, columns); assert.equal(metrics.overflow, 0);
    assert.ok(metrics.details.every(c => c.font >= 21.5 && c.font <= 24 && c.corners.every(r => r >= 12)));
    assert.ok(Math.max(...metrics.details.map(c => c.bottom)) - Math.min(...metrics.details.map(c => c.bottom)) <= 1);
    await capture(page, 'library-' + width);
  }
});
// Breaks caught: fake filters, stale fragments or target/focus hidden by the sticky header.
test('category links jump and focus real groups with and without JavaScript', async t => {
  for (const javaScriptEnabled of [true, false]) {
    const page = await pageFor(t, { javaScriptEnabled });
    await page.goto(base + '/guides/');
    const links = page.locator('nav[aria-label="Guide categories"] a');
    assert.equal(await links.count(), 5);
    for (let i = 0; i < 5; i++) {
      const link = links.nth(i), href = await link.getAttribute('href');
      await link.focus(); await page.keyboard.press('Enter');
      await page.waitForURL(url => url.hash === href);
      const target = page.locator(href);
      assert.equal(await target.evaluate(el => document.activeElement === el), true);
      const top = await target.evaluate(el => el.getBoundingClientRect().top);
      const header = await page.locator('.site-header').evaluate(el => el.getBoundingClientRect().bottom);
      assert.ok(top >= header + 4, `${href} focus obscured: ${top}/${header}`);
    }
  }
});
// Breaks caught: contents lost during regeneration, broad reading line or fragment collisions.
test('article hero uses desktop width and readable labels instead of a narrow billboard', async t => {
  const page = await pageFor(t);
  await page.goto(base + '/guides/sticking-doors-windows-repair-guide/');
  const m = await page.evaluate(() => {
    const h = document.querySelector('h1').getBoundingClientRect();
    const luminance = color => { const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; };
    const bg = luminance(getComputedStyle(document.querySelector('.page-hero')).backgroundColor);
    return { width: h.width, height: h.height, contrasts: ['.page-hero .eyebrow', '.article-meta'].map(s => { const fg = luminance(getComputedStyle(document.querySelector(s)).color); return (Math.max(bg, fg) + .05) / (Math.min(bg, fg) + .05); }) };
  });
  assert.ok(m.width >= 700 && m.height <= 160, JSON.stringify(m));
  assert.ok(m.contrasts.every(ratio => ratio >= 4.5), JSON.stringify(m));
});
test('all articles have readable columns, working section focus and coherent related cards', async t => {
  const page = await pageFor(t);
  for (const g of guides) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + `/guides/${g.slug}/`);
    const m = await page.evaluate(() => ({ width: document.querySelector('.guide-prose').getBoundingClientRect().width, font: parseFloat(getComputedStyle(document.querySelector('.guide-decision p')).fontSize), overflow: document.documentElement.scrollWidth - innerWidth, ids: [...document.querySelectorAll('[id]')].map(e => e.id) }));
    assert.ok(m.width >= 600 && m.width <= 860); assert.equal(m.font, 16); assert.equal(m.overflow, 0);
    assert.equal(new Set(m.ids).size, m.ids.length, g.slug + ': unique fragments');
    assert.equal(await page.locator('.guide-prose .guide-conclusion').count(), 1, g.slug + ': conclusion remains in reading column');
    assert.equal(await page.locator('.guide-prose #assessment-questions').count(), 1, g.slug + ': FAQs remain in reading column');
    const links = page.locator('.guide-contents a');
    for (let i = 0; i < await links.count(); i++) {
      const href = await links.nth(i).getAttribute('href');
      assert.equal(await page.locator(href).count(), 1, g.slug + href);
    }
    await page.locator('.guide-contents a[href="#next-step"]').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#next-step').evaluate(el => document.activeElement === el), true);
    assert.ok(await page.locator('#next-step').evaluate(el => el.getBoundingClientRect().top) >= 96);
    assert.equal(await page.locator('.guide-related .guide-card').count(), 3);
    await page.goto(base + `/guides/${g.slug}/`);
    await capture(page, g.slug + '-1440', false);
    for (const width of [900, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const responsive = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        headings: [...document.querySelectorAll('.guide-prose h2')].map(el => parseFloat(getComputedStyle(el).fontSize)),
        radius: parseFloat(getComputedStyle(document.querySelector('.guide-conclusion')).borderBottomRightRadius)
      }));
      assert.equal(responsive.overflow, 0, `${g.slug} ${width}: horizontal overflow`);
      assert.ok(responsive.headings.every(n => n <= 24), `${g.slug} ${width}: oversized section heading`);
      assert.ok(responsive.radius >= 12, `${g.slug} ${width}: rounded conclusion`);
    }
  }
  await page.goto(base + '/guides/sticking-doors-windows-repair-guide/');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  await page.locator('.guide-contents a[href="#next-step"]').click();
  assert.equal(await page.locator('#next-step').evaluate(el => document.activeElement === el), true);
  await capture(page, 'article-phone-conclusion', false);
  await page.goto(base + '/guides/sticking-doors-windows-repair-guide/');
  await capture(page, 'article-phone-start', false);
  // The shared header action is event-bound through data-nav-toggle, which the
  // premium static auditor cannot detect (it recognises inline handlers only).
  const menu = page.locator('[data-nav-toggle]');
  await menu.focus(); await page.keyboard.press('Enter');
  assert.equal(await menu.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('#main-nav').isVisible(), true);
  await page.keyboard.press('Enter');
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
});
