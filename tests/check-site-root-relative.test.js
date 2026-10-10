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
