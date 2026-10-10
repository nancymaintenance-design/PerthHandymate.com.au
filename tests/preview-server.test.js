const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { createBuildFixture, buildLocal } = require('./helpers/local-build');

async function startPreview(t, root) {
  const reservation = http.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, [path.join(root, 'preview-server.js')], {
    cwd: os.tmpdir(), env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('preview did not start')), 5000);
    child.stdout.on('data', () => { clearTimeout(timeout); resolve(); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`preview exited ${code}`)); });
  });
  return { port, base: `http://127.0.0.1:${port}` };
}

function rawRequest(port, requestPath) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path: requestPath }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
    }).on('error', reject);
  });
}

test('preview serves the built artifact and local recovery routes over HTTP', async t => {
  const root = createBuildFixture(t);
  assert.equal(buildLocal(root).status, 0);
  fs.writeFileSync(path.join(root, 'index.html'), '<main>UNBUILT SOURCE PROBE</main>');
  fs.writeFileSync(path.join(root, '.env.local'), 'PREVIEW_SECRET=private-probe');
  const { base, port } = await startPreview(t, root);

  await t.test('serves dist while source docs, configuration and secrets stay private', async () => {
    const home = await fetch(`${base}/`);
    assert.equal(home.status, 200);
    assert.ok(!(await home.text()).includes('UNBUILT SOURCE PROBE'));
    for (const route of ['/README.md', '/docs/seo/seo-implementation-report.md', '/.env.local', '/vercel.json', '/api/contact.js']) {
      const response = await fetch(`${base}${route}`, { redirect: 'follow' });
      assert.equal(response.status, 404, route);
      assert.ok(!(await response.text()).includes('private-probe'), route);
    }
  });
  await t.test('index and directory redirects preserve local navigation and query', async () => {
    for (const [route, target] of [
      ['/index.html?source=test', '/?source=test'],
      ['/services/index.html?source=test&x=1', '/services/?source=test&x=1'],
      ['/services?source=test', '/services/?source=test'],
    ]) {
      const response = await fetch(`${base}${route}`, { redirect: 'manual' });
      assert.equal(response.status, 308, route);
      assert.equal(response.headers.get('location'), target, route);
      assert.equal((await fetch(`${base}${route}`)).status, 200, route);
    }
  });
  await t.test('unknown nested routes end in branded noindex 404 with usable recovery assets', async () => {
    for (const route of ['/not-a-real-page', '/missing/nested/page/', '/missing/nested/page.html']) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 404, route);
      const body = await response.text();
      assert.match(body, /name="robots" content="noindex,follow"/);
      assert.match(body, /404 · Page not found/);
      assert.match(body, /href="\/"/);
      assert.match(body, /data-service-search/);
      const assets = [...body.matchAll(/(?:src|href)="(\/(?:assets|data)\/[^\"]+)"/g)].map(match => match[1]);
      assert.ok(assets.length > 0);
      for (const asset of assets) assert.equal((await fetch(`${base}${asset}`)).status, 200, asset);
    }
    const explicit = await fetch(`${base}/404.html`);
    assert.equal(explicit.status, 200);
    assert.match(await explicit.text(), /name="robots" content="noindex,follow"/);
  });
  await t.test('rejects malformed encoding and prevents decoded traversal without crashing', async () => {
    assert.equal((await rawRequest(port, '/%E0%A4%A')).status, 400);
    for (const route of ['/%2e%2e/README.md', '/%2e%2e%5cREADME.md', '/%2f..%2fREADME.md']) {
      const response = await rawRequest(port, route);
      assert.equal(response.status, 404, route);
      assert.ok(!response.body.includes('Static website candidate'), route);
    }
    assert.equal((await fetch(`${base}/`)).status, 200);
  });
});

test('preview exits clearly when dist has not been built', async t => {
  const root = createBuildFixture(t);
  const child = spawn(process.execPath, [path.join(root, 'preview-server.js')], {
    cwd: os.tmpdir(), env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const result = await Promise.race([
    once(child, 'exit').then(([code]) => code),
    new Promise(resolve => setTimeout(() => resolve('still running'), 1500)),
  ]);
  if (child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
  assert.equal(result, 1);
  assert.match(stderr, /node scripts\/build-local\.js/);
});
