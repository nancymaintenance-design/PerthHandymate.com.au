const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { loadPlaywright, browserLaunchOptions } = require('./helpers/browser-runtime');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../reports/rectification-local-2026-10-15/visual');
const handymen = '/services/handyman-interiors-appliance-repairs/handymen/';
let server, browser, base;
test.before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(root, '.' + url.pathname, url.pathname.endsWith('/') ? 'index.html' : '');
    if (req.method !== 'GET' || path.relative(root, file).startsWith('..') || !fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type', { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const pw = loadPlaywright();
  browser = await pw.chromium.launch(browserLaunchOptions(pw.chromium.executablePath()));
});
test.after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });
async function pageAt(t, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  t.after(() => context.close());
  await context.route('**/*', route => route.request().url().startsWith(base) && route.request().method() === 'GET' ? route.continue() : route.abort());
  return context.newPage();
}
async function record(page, name, metrics) {
  console.log(name, JSON.stringify(metrics));
  if (!process.env.PHM_LAYOUT_CAPTURE) return;
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, name + '.json'), JSON.stringify(metrics, null, 2));
  await page.screenshot({ path: path.join(output, name + '.png') });
}

// Breaks caught: oversized hero headings delay service discovery below the first desktop viewport.
for (const viewport of [{ width: 1440, height: 1000 }, { width: 1920, height: 1080 }]) {
  test(`hero hierarchy and service discovery at ${viewport.width}`, async t => {
    const page = await pageAt(t, viewport);
    for (const [route, cap] of [['/', 64], ['/services/', 64], ['/contact/', 64], ['/areas/', 64], ['/areas/fremantle-coastal-south/', 64], ['/guides/', 58], ['/guides/seasonal-home-maintenance-australia/', 58], [handymen, 58]]) {
      await page.goto(base + route);
      const m = await page.evaluate(() => ({ font: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize), overflow: document.documentElement.scrollWidth - innerWidth, titleBottom: Math.max(...[...document.querySelectorAll('.services-overview-cards h3')].slice(0, 3).map(e => e.getBoundingClientRect().bottom)) }));
      await record(page, `hierarchy-${viewport.width}-${route.replace(/\W/g, '') || 'home'}`, m);
      assert.ok(m.font <= cap, `${route} H1 ${m.font} exceeds ${cap}`);
      assert.equal(m.overflow, 0, route);
      if (route === '/services/') assert.ok(m.titleBottom < 900, `first service titles end at ${m.titleBottom}; reserve space below them within 1000px`);
    }
  });
  // Breaks caught: longest card stretches neighbours; fixing only align-items leaves row-sized holes.
  test(`unequal task cards keep natural interiors and close following cards at ${viewport.width}`, async t => {
    const page = await pageAt(t, viewport);
    await page.goto(base + handymen);
    const m = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.handyman-task-grid article')].map(card => {
        const box = card.getBoundingClientRect();
        const boxes = [...card.children].map(e => e.getBoundingClientRect());
        const contentBottom = Math.max(...boxes.map(b => b.bottom));
        return { id: card.id, x: box.x, y: box.y, height: box.height, bottom: box.bottom, width: box.width, fragments: card.getClientRects().length, blank: box.bottom - contentBottom, innerGap: Math.max(0, ...boxes.slice(1).map((b, i) => b.top - boxes[i].bottom)) };
      });
      const gaps = cards.map(card => {
        const next = cards.filter(other => Math.abs(other.x - card.x) < 1 && other.y > card.y).sort((a, b) => a.y - b.y)[0];
        return next ? next.y - card.bottom : 0;
      });
      return { cards, gaps, columns: new Set(cards.map(c => Math.round(c.x))).size };
    });
    await page.locator('#clothesline-repairs').scrollIntoViewIfNeeded();
    await record(page, `cards-${viewport.width}`, m);
    assert.equal(m.columns, 3);
    assert.ok(m.cards.every(c => c.fragments === 1), 'every card stays whole in its column');
    assert.ok(m.cards.every(c => c.blank <= 180 && c.innerGap <= 180), JSON.stringify(m));
    assert.ok(m.gaps.every(gap => gap <= 32), `exterior row holes ${m.gaps}`);
    const visual = [...m.cards].sort((a, b) => a.x - b.x || a.y - b.y).map(c => c.id);
    assert.deepEqual(visual, m.cards.map(c => c.id), 'DOM order matches down-column reading order');
    const links = page.locator('.handyman-task-grid a');
    await links.first().focus();
    for (let i = 0; i < await links.count(); i++) {
      assert.equal(await links.nth(i).evaluate(e => document.activeElement === e), true, 'Tab follows visible column flow');
      if (i + 1 < await links.count()) await page.keyboard.press('Tab');
    }
  });
  // Breaks caught: reading line expands to the wide comparison shell, or the whole desktop collapses.
  test(`long prose stays bounded while desktop grids and photography stay wide at ${viewport.width}`, async t => {
    const page = await pageAt(t, viewport);
    await page.goto(base + handymen);
    const m = await page.evaluate(() => ({
      prose: [...document.querySelectorAll('#service-work-options>div:not(.handyman-task-grid) p, #service-work-options>article p, #repair-planning-guides p')].map(e => ({ width: e.getBoundingClientRect().width, clipped: getComputedStyle(e).overflow === 'hidden' || e.scrollHeight > e.clientHeight + 1 })),
      grid: document.querySelector('.handyman-task-grid').getBoundingClientRect().width,
      intro: getComputedStyle(document.querySelector('.handyman-intro')).gridTemplateColumns.split(' ').length,
      scene: getComputedStyle(document.querySelector('.handyman-scenes')).gridTemplateColumns.split(' ').length
    }));
    await page.locator('#service-work-options>div[id]:not(.handyman-task-grid),#service-work-options>article').first().scrollIntoViewIfNeeded();
    await record(page, `prose-${viewport.width}`, m);
    assert.ok(m.prose.length > 3);
    assert.ok(m.prose.every(p => p.width <= 850 && !p.clipped), JSON.stringify(m));
    assert.ok(m.grid >= 1100); assert.equal(m.intro, 2); assert.equal(m.scene, 3);
  });
}

// Breaks caught: inherited green-on-navy labels or white-on-bright-orange body copy become unreadable.
test('shared surface text meets contrast thresholds in rendered pages', async t => {
  const page = await pageAt(t, { width: 1440, height: 1000 });
  for (const route of ['/services/', handymen, '/areas/fremantle-coastal-south/', '/contact/']) {
    await page.goto(base + route);
    const colors = await page.evaluate(() => {
      const lum = color => { const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; };
      return [...document.querySelectorAll('.page-hero .eyebrow,.cta-band h2,.cta-band p,.about-steps span')].map(e => {
        let surface = e; while (getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') surface = surface.parentElement;
        const style = getComputedStyle(e), fg = lum(style.color), bg = lum(getComputedStyle(surface).backgroundColor);
        return { text: e.textContent.slice(0, 50), ratio: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05), large: parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && parseInt(style.fontWeight) >= 700) };
      });
    });
    console.log(route, JSON.stringify(colors));
    assert.ok(colors.every(c => c.ratio >= (c.large ? 3 : 4.5)), JSON.stringify(colors));
  }
});

// Breaks caught: shared spacing hides anchored content behind the sticky header or overflows on phones.
test('phone siblings and anchors remain accessible with natural contact states', async t => {
  const page = await pageAt(t, { width: 390, height: 844 });
  for (const route of ['/', '/services/', handymen, '/areas/', '/areas/fremantle-coastal-south/', '/guides/', '/guides/seasonal-home-maintenance-australia/', '/contact/']) {
    await page.goto(base + route);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, route);
  }
  for (const [route, link] of [[handymen, '.service-toc a[href="#repair-planning-guides"]'], ['/guides/', '.guide-category-nav a'], ['/guides/seasonal-home-maintenance-australia/', '.guide-contents a'], ['/contact/', '.contact-jump a']]) {
    await page.goto(base + route);
    const anchor = page.locator(link).first();
    const href = await anchor.getAttribute('href');
    await anchor.click();
    const top = await page.locator(href).evaluate(e => e.getBoundingClientRect().top);
    const header = await page.locator('.site-header').evaluate(e => e.getBoundingClientRect().bottom);
    console.log('phone-anchor', JSON.stringify({ route, href, top, header }));
    assert.ok(top >= header + 4, `${route} anchor ${top}/${header}`);
  }
  const button = page.locator('.contact-form button[type="submit"]');
  const before = await button.boundingBox();
  await button.evaluate(e => { e.disabled = true; e.setAttribute('aria-busy', 'true'); });
  const after = await button.boundingBox();
  assert.equal(after.width, before.width); assert.equal(after.height, before.height);
  const state = await button.evaluate(e => ({ opacity: getComputedStyle(e).opacity, color: getComputedStyle(e).color }));
  assert.equal(state.opacity, '1', 'disabled label stays readable');
  await button.scrollIntoViewIfNeeded();
  await record(page, 'contact-phone-busy', state);
});
