const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('site checker resolves root-relative public assets from the site root', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'check-site.js')], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /SITE CHECK PASSED/);
});
