const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { validateContact } = require('../assets/js/site');
const { createContactHandler } = require('../api/contact');
const { loadPlaywright, browserLaunchOptions } = require('./helpers/browser-runtime');
const root = path.resolve(__dirname, '..');
const valid = { name: 'Alex Morgan', email: 'alex@example.com', phone: '0400 000 000', postcode: '6000', service: 'Handyman, interiors & appliance repairs', message: 'A cupboard hinge needs repair.', website: '' };
const response = () => ({ statusCode: 0, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader() {} });
const emailOfLength = n => 'a'.repeat(n - 6) + '@b.com';
const cases = [
  ['name', 'a', false], ['name', 'ab', true], ['name', 'a'.repeat(100), true], ['name', 'a'.repeat(101), false],
  ['phone', '12345', false], ['phone', '123456', true], ['phone', '1'.repeat(40), true], ['phone', '1'.repeat(41), false],
  ['service', '', false], ['service', 'a', false], ['service', 'ab', true], ['service', 'a'.repeat(160), true], ['service', 'a'.repeat(161), false],
  ['message', 'a'.repeat(9), false], ['message', 'a'.repeat(10), true], ['message', 'a'.repeat(3000), true], ['message', 'a'.repeat(3001), false],
  ['email', '', false], ['email', 'bad-email', false], ['email', emailOfLength(254), true], ['email', emailOfLength(255), false],
  ['postcode', '', true], ['postcode', 'a'.repeat(100), true], ['postcode', 'a'.repeat(101), false],
  ['phone', '', false], ['name', null, false], ['phone', 1234567, false], ['postcode', {}, false],
];
// Break caught: browser accepts a field that the handler rejects, or API hides which field needs correction.
for (const [field, value, accepted] of cases) test(`client/API ${field} boundary ${JSON.stringify(value)?.slice(0, 25)} (${String(value).length}) accepted=${accepted}`, async () => {
  const enquiry = { ...valid, [field]: value };
  const client = validateContact(enquiry);
  assert.equal(client.valid, accepted, 'client boundary');
  const handler = createContactHandler({ env: { RESEND_API_KEY: 'test', RESEND_FROM_EMAIL: 'test@example.com' }, fetch: async () => ({ ok: true }) });
  const res = response();
  await handler({ method: 'POST', headers: { origin: 'http://127.0.0.1', 'content-type': 'application/json' }, body: enquiry }, res);
  assert.equal(res.statusCode, accepted ? 201 : 400, 'server boundary');
  if (!accepted) assert.equal(typeof res.body.errors?.[field], 'string', 'safe field feedback');
});

let server, browser, base, sent = [];
test.before(async () => {
  const handler = createContactHandler({ env: { RESEND_API_KEY: 'test', RESEND_FROM_EMAIL: 'test@example.com' }, fetch: async () => ({ ok: true }) });
  server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/api/contact') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      req.body = Buffer.concat(chunks).toString();
      sent.push({ method: req.method, body: req.body });
      res.status = code => { res.statusCode = code; return res; };
      res.json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
      await handler(req, res);
      return;
    }
    const file = path.join(root, pathname, pathname.endsWith('/') ? 'index.html' : '');
    if (req.method !== 'GET' || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const pw = loadPlaywright();
  browser = await pw.chromium.launch(browserLaunchOptions(pw.chromium.executablePath()));
});
test.after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });
async function open(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
  t.after(() => context.close());
  await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.setDefaultNavigationTimeout(30000);
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  t.after(() => assert.deepEqual(errors, [], 'no runtime errors'));
  await page.goto(base + '/contact/', { waitUntil: 'load' });
  return page;
}
async function fill(page) {
  for (const field of ['name', 'email', 'phone', 'postcode', 'message']) await page.locator(`[name="${field}"]`).fill(valid[field]);
  await page.locator('[name="service"]').selectOption(valid.service);
}

test('form exposes required fields, limits and associated accessible errors', async t => {
  const page = await open(t);
  assert.equal(await page.getByLabel('Type of work', { exact: true }).count(), 1);
  assert.match(await page.locator('[data-contact-form]').innerText(), /required.*optional/i);
  for (const [field, min, max] of [['name', 2, 100], ['phone', 6, 40], ['message', 10, 3000], ['email', null, 254], ['postcode', null, 100]]) {
    const input = page.locator(`[name="${field}"]`);
    assert.equal(await input.getAttribute('maxlength'), String(max));
    if (min) assert.equal(await input.getAttribute('minlength'), String(min));
    assert.equal(await input.evaluate(e => e.required), field !== 'postcode');
    const error = page.locator(`[data-error="${field}"]`);
    assert.equal(await error.count(), 1);
    assert.ok((await input.getAttribute('aria-describedby')).split(' ').includes(await error.getAttribute('id')));
  }
  await page.locator('[type="submit"]').click();
  assert.equal(await page.locator(':focus').getAttribute('name'), 'name');
  assert.equal(await page.locator('[name="service"]').getAttribute('aria-invalid'), 'true');
  assert.match(await page.locator('[data-error="service"]').innerText(), /type of work/i);
});

test('short details stay in the form and focus the invalid field without sending', async t => {
  const page = await open(t); await fill(page);
  sent = [];
  await page.locator('[name="message"]').fill('short');
  await page.locator('[type="submit"]').click();
  assert.equal(await page.locator(':focus').getAttribute('name'), 'message');
  assert.equal(await page.locator('[name="message"]').inputValue(), 'short');
  assert.equal(await page.locator('[name="email"]').inputValue(), valid.email);
  assert.equal(sent.length, 0);
});

test('server field errors are safely associated, preserve entries and allow retry', async t => {
  const page = await open(t); await fill(page);
  await page.route('**/api/contact', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Check the highlighted details.', errors: { email: '<img src=x onerror=alert(1)>', 'name"]': 'unsafe selector', message: { bad: true }, postcode: '' } }) }));
  await page.locator('[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('[name="email"]').getAttribute('aria-invalid') === 'true');
  assert.equal(await page.locator(':focus').getAttribute('name'), 'email');
  assert.equal(await page.locator('[data-error="email"] img').count(), 0);
  assert.equal(await page.locator('[name="email"]').inputValue(), valid.email);
  assert.equal(await page.locator('[type="submit"]').isEnabled(), true);
  await page.unroute('**/api/contact');
  await page.locator('[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('[data-form-status]').textContent.includes('Thanks'));
  assert.equal(await page.locator('[name="email"]').inputValue(), '');
});

test('duplicate submits during a pending request send one JSON POST and restore the button', async t => {
  const page = await open(t); await fill(page);
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let calls = 0;
  await page.route('**/api/contact', async route => { calls++; await pending; await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'We could not send your enquiry just now. Please call 0403 069 685.' }) }); });
  await page.locator('[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('[type="submit"]').disabled);
  await page.locator('[data-contact-form]').evaluate(e => e.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.equal(calls, 1);
  release();
  await page.waitForFunction(() => !document.querySelector('[type="submit"]').disabled);
  assert.equal(await page.locator('[name="message"]').inputValue(), valid.message);
  assert.match(await page.locator('[data-form-status]').innerText(), /could not send/i);
});

test('transport failure gives retry and telephone guidance, keeps entries and permits a successful retry', async t => {
  const page = await open(t); await fill(page);
  await page.route('**/api/contact', route => route.abort('failed'));
  await page.locator('[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector('[type="submit"]').disabled);
  assert.match(await page.locator('[data-form-status]').innerText(), /details are still here.*try again.*call 0403 069 685/i);
  assert.doesNotMatch(await page.locator('[data-form-status]').innerText(), /failed to fetch|networkerror/i);
  for (const field of ['name', 'email', 'phone', 'postcode', 'message']) assert.equal(await page.locator(`[name="${field}"]`).inputValue(), valid[field], field);
  await page.unroute('**/api/contact');
  await page.locator('[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('[data-form-status]').textContent.includes('Thanks'));
  assert.equal(await page.locator('[name="email"]').inputValue(), '');
});

for (const mode of ['disabled', 'handler blocked']) test(`without JavaScript (${mode}) contact values cannot navigate into a GET URL`, async t => {
  const context = await browser.newContext({ javaScriptEnabled: mode !== 'disabled' });
  t.after(() => context.close());
  await context.route('**/*', route => route.request().url().startsWith(base) && !(mode === 'handler blocked' && /\/site\.js$/.test(route.request().url())) ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(base + '/contact/');
  await fill(page);
  const form = page.locator('[data-contact-form]');
  assert.equal(await form.getAttribute('method'), 'post');
  assert.equal(await page.locator('[type="submit"]').isDisabled(), true);
  await page.locator('[name="name"]').press('Enter');
  assert.equal(page.url(), base + '/contact/');
  if (mode === 'disabled') {
    assert.ok(await page.locator('noscript a[href="tel:+61403069685"]').isVisible());
    assert.ok(await page.locator('noscript a[href="mailto:handyman.maintenance.au@outlook.com"]').isVisible());
  }
});
