'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

// Break caught: a restored legacy heading causes ENOENT after page writes in a fresh checkout.
test('wording generator creates missing report parents and completes a fresh filesystem pass', t => {
  const parent = path.resolve(root, '../reports/final-fix-fixtures');
  fs.mkdirSync(parent, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(parent, 'wording-'));
  // Only this newly created, fully resolved fixture is removed; no source directory is touched.
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  for (const file of ['tools/local-marketing-wording.js', 'tools/render-regions.js', 'data/content.js', 'data/service-catalog.json', 'data/heading-keyword-policy.json', 'data/content-modifications.json', 'docs/seo/content-expansion-2026-10-12/coverage.json']) {
    const target = path.join(fixture, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, file), target);
  }
  for (const dir of ['services', 'areas', 'about', 'contact', 'faq']) fs.mkdirSync(path.join(fixture, dir));
  for (const file of ['index.html', 'about/index.html', 'contact/index.html', 'faq/index.html']) fs.writeFileSync(path.join(fixture, file), '<main><h2>How Our Perth Handyman Team Works</h2></main>');
  const report = path.join(fixture, '.superpowers/sdd/approved-execution/task-2-wording-coverage.json');
  assert.equal(fs.existsSync(path.dirname(report)), false);
  const run = () => spawnSync(process.execPath, ['tools/local-marketing-wording.js'], { cwd: fixture, encoding: 'utf8' });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /Reviewed 4 non-guide marketing pages; changed 4\./);
  assert.equal(fs.readFileSync(path.join(fixture, 'index.html'), 'utf8'), '<main><h2>How Our Handyman Team Works</h2></main>');
  const evidence = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(evidence.length, 4);
  assert.deepEqual(evidence.find(row => row.file === 'index.html').headings, [['How Our Perth Handyman Team Works', 'How Our Handyman Team Works']]);
  const second = run();
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /changed 0\./);
});
