const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { renderHome } = require('../tools/render-home-clarity');
const { renderChinese } = require('../scripts/lib/locales');
const { loadPlaywright, browserLaunchOptions } = require('./helpers/browser-runtime');
const root = path.resolve(__dirname, '..');
const { chromium } = loadPlaywright();
let browser;
test.before(async () => { browser = await chromium.launch(browserLaunchOptions(chromium.executablePath())); });
test.after(async () => { await browser?.close(); });

// Real DOM, scroll geometry, IntersectionObserver and focus behavior; only time is controlled.
async function fixture(t, { reducedMotion = 'no-preference', chinese = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 700, height: 600 }, reducedMotion });
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'no browser runtime errors'));
  await page.clock.install();
  let html = renderHome(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  html = html.match(/<section class="section insight-strip" id="repair-planning-guides">[\s\S]*?<\/section>/)[0];
  if (chinese) {
    const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'locales/parts/revision-home-autoplay-20261020.json'), 'utf8'));
    html = renderChinese(html, 'index.html', new Set(['/']), value => dictionary[value] || value);
  }
  await page.setContent(`<style>.home-guide-track{display:flex;overflow:auto;width:600px;gap:20px}.home-guide-card{flex:0 0 180px}button{min-width:46px;min-height:46px}</style>${html}<button id="outside">Outside</button><div style="height:2000px"></div>`);
  const source = fs.readFileSync(path.join(root, 'typescript/assets/js/home-guides.ts'), 'utf8');
  await page.addScriptTag({ content: ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText });
  await page.evaluate(() => new Promise(requestAnimationFrame));
  return page;
}
const offset = page => page.locator('#home-guide-track').evaluate(track => track.scrollLeft);
// Chromium's native smooth-scroll compositor uses real frame time, independent of page.clock.
const settle = () => new Promise(resolve => setTimeout(resolve, 800));
const advance = async page => { await page.clock.runFor(5500); await settle(); };

test('mobile carousel keeps both arrows and the position on the same row', async t => {
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  t.after(() => page.close());
  const css = fs.readFileSync(path.join(root, 'assets/css/home-clarity.css'), 'utf8');
  await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:24px}${css}</style><div class="home-guides-controls"><button data-guide-autoplay>Pause automatic guides</button><button data-guide-prev>←</button><span data-guide-position>1 / 12</span><button data-guide-next>→</button></div>`);
  const positions = await page.locator('[data-guide-prev], [data-guide-position], [data-guide-next]').evaluateAll(elements => elements.map(e => e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2));
  assert.ok(Math.max(...positions) - Math.min(...positions) < 2, 'navigation controls stay together');
});

test('guides advance after five seconds and cycle from the end', async t => {
  const page = await fixture(t);
  await page.clock.runFor(4999);
  assert.equal(await offset(page), 0);
  await page.clock.runFor(1000);
  await settle();
  assert.ok(await offset(page) > 100, 'first automatic advance');
  assert.equal(await page.locator('[data-guide-position]').getAttribute('aria-live'), 'off');
  await page.locator('#home-guide-track').evaluate(track => { track.scrollLeft = track.scrollWidth; });
  await advance(page);
  assert.ok(await offset(page) < 20, `last viewport wraps to the first guide (offset ${await offset(page)})`);
});

test('pointer hovering does not prevent autoplay; keyboard reading still pauses it', async t => {
  const page = await fixture(t);
  await page.locator('#repair-planning-guides').hover();
  await advance(page);
  assert.ok(await offset(page) > 100, 'autoplay continues with the pointer inside the guide section');
  await page.locator('#home-guide-track a').first().focus();
  const focused = await offset(page);
  await advance(page);
  assert.equal(await offset(page), focused);
  await page.locator('#outside').focus();
  await advance(page);
  assert.ok(await offset(page) > focused);
});

test('explicit pause persists across hover, focus and viewport changes; resume works', async t => {
  const page = await fixture(t);
  const toggle = page.locator('[data-guide-autoplay]');
  await toggle.click();
  assert.equal(await toggle.innerText(), 'Resume automatic guides');
  assert.equal(await page.locator('[data-guide-position]').getAttribute('aria-live'), 'polite');
  await page.locator('#outside').focus();
  await page.mouse.move(690, 590);
  await page.evaluate(() => window.scrollTo(0, 1000));
  await advance(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await advance(page);
  assert.equal(await offset(page), 0);
  await toggle.click();
  assert.equal(await toggle.innerText(), 'Pause automatic guides');
  await page.locator('#outside').focus();
  await page.mouse.move(690, 590);
  await advance(page);
  assert.ok(await offset(page) > 100);
});

test('offscreen sections and hidden tabs suspend autoplay', async t => {
  const page = await fixture(t);
  await page.evaluate(() => window.scrollTo(0, 1000));
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await advance(page);
  assert.equal(await offset(page), 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise(requestAnimationFrame));
  // Headless Chromium keeps pages visible; emulate only the browser visibility boundary.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await advance(page);
  assert.equal(await offset(page), 0);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await advance(page);
  assert.ok(await offset(page) > 100);
});

test('reduced motion defaults to paused and manual buttons and keyboard remain usable', async t => {
  const page = await fixture(t, { reducedMotion: 'reduce' });
  await advance(page);
  assert.equal(await offset(page), 0);
  assert.equal(await page.locator('[data-guide-autoplay]').innerText(), 'Resume automatic guides');
  await page.locator('[data-guide-next]').click();
  assert.ok(await offset(page) > 100);
  await page.locator('#home-guide-track').focus();
  await page.keyboard.press('End');
  await page.waitForFunction(() => document.querySelector('[data-guide-next]').disabled);
  assert.equal(await page.locator('[data-guide-next]').isDisabled(), true);
  await page.keyboard.press('Home');
  assert.equal(await offset(page), 0);
  await page.keyboard.press('ArrowRight');
  assert.ok(await offset(page) > 100);
  await page.locator('[data-guide-prev]').click();
  assert.equal(await offset(page), 0);
  await page.locator('[data-guide-autoplay]').click();
  await page.locator('#outside').focus();
  await page.mouse.move(690, 590);
  await advance(page);
  assert.ok(await offset(page) > 100, 'explicit resume may opt into reduced-motion autoplay');
});

test('Chinese pause and resume names follow the translated HTML', async t => {
  const page = await fixture(t, { chinese: true });
  const toggle = page.locator('[data-guide-autoplay]');
  assert.equal(await toggle.innerText(), '暂停指南自动轮播');
  await toggle.click();
  assert.equal(await toggle.innerText(), '继续指南自动轮播');
});

test('changing the motion preference stops already running autoplay', async t => {
  const page = await fixture(t);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !document.querySelector('[data-guide-resume-label]').hidden);
  await advance(page);
  assert.equal(await offset(page), 0);
});
