const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { createBuildFixture } = require('./helpers/local-build');

test('site checker resolves root-relative public assets from the site root', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'check-site.js')], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /SITE CHECK PASSED/);
});

// Break caught: accepting a native GET fallback or an enabled submit before the JSON handler attaches.
test('site checker rejects contact markup that loses its safe submission boundary', t => {
  const root = createBuildFixture(t);
  const file = path.join(root, 'contact/index.html');
  const source = fs.readFileSync(file, 'utf8');
  const unsafe = [
    [source.replace(' method="post" action="/api/contact"', ''), /Contact form must POST only to the local contact endpoint/],
    [source.replace('method="post"', 'method="get"'), /Contact form must POST only to the local contact endpoint/],
    [source.replace('action="/api/contact"', 'action="https:\/\/example.com\/"'), /Contact form must POST only to the local contact endpoint/],
    [source.replace('type="submit" disabled', 'type="submit"'), /Contact form must begin with a disabled submit button/],
  ];
  for (const [html, reason] of unsafe) {
    fs.writeFileSync(file, html);
    const result = spawnSync(process.execPath, [path.join(root, 'tests/check-site.js')], { encoding: 'utf8' });
    assert.equal(result.status, 1, 'unsafe form must fail local acceptance');
    assert.match(result.stderr + result.stdout, reason);
  }
});

test('site checker rejects a reference that escapes the public root even when its target exists', t => {
  const root = createBuildFixture(t);
  const outsideName = `${path.basename(root)}-outside.css`;
  const outside = path.join(root, '..', outsideName);
  fs.writeFileSync(outside, 'body {}');
  t.after(() => fs.rmSync(outside, { force: true }));
  const page = path.join(root, '404.html');
  const source = fs.readFileSync(page, 'utf8');
  fs.writeFileSync(page, source.replace('/assets/css/global.css', `/../${outsideName}`));

  const result = spawnSync(process.execPath, [path.join(root, 'tests/check-site.js')], { encoding: 'utf8' });
  assert.equal(result.status, 1, 'an existing file outside the public root must not count as a valid asset');
  assert.match(result.stderr + result.stdout, /404\.html has local reference outside public root:/);
});
