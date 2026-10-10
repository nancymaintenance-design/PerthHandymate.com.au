const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createBuildFixture, buildLocal } = require('./helpers/local-build');

test('README orders reproducible build before preview and HTTP smoke acceptance', () => {
  const readme = fs.readFileSync(path.resolve(__dirname, '../README.md'), 'utf8');
  const build = readme.indexOf('node scripts/build-local.js');
  const preview = readme.indexOf('node preview-server.js');
  const smoke = readme.indexOf('node tests/http-smoke.js');
  assert.ok(build >= 0, 'README must document node scripts/build-local.js');
  assert.ok(build < preview && preview < smoke, 'build must precede preview and HTTP smoke');
});

test('local build recreates the published site from clean source inputs', t => {
  const root = createBuildFixture(t);
  const output = path.join(root, 'dist');
  assert.ok(!fs.existsSync(output), 'fixture starts without build output');
  fs.writeFileSync(path.join(root, 'build-probe.html'), '<a href="services/index.html?source=test#repairs">Services</a>');
  fs.writeFileSync(path.join(root, '.env.local'), 'BUILD_TEST_SECRET=not-for-publication');

  const result = buildLocal(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const inputs = config.buildCommand.match(/cp -R (.*?) dist\//)[1].split(/\s+/);
  const expectedEntries = inputs.flatMap(input => input.startsWith('*.')
    ? fs.readdirSync(root).filter(file => file.endsWith(input.slice(1))) : [input]);
  assert.deepEqual(fs.readdirSync(output).sort(), expectedEntries.sort(), 'publication inputs match vercel.json');
  for (const file of ['index.html', '404.html', 'sitemap.xml', 'services/handyman-interiors-appliance-repairs/handymen/index.html', 'favicon.ico', 'favicon-32.png', 'robots.txt', 'site.webmanifest', 'assets/css/global.css', 'data/keyword-content-round.json']) {
    assert.ok(fs.existsSync(path.join(output, file)), `${file} is published`);
  }
  assert.equal(fs.readFileSync(path.join(output, 'build-probe.html'), 'utf8'), '<a href="services/?source=test#repairs">Services</a>');
  for (const entry of ['.git', '.env.local', '.env.example', 'docs', 'tests', 'scripts', 'tools', 'README.md', 'vercel.json']) {
    assert.ok(!fs.existsSync(path.join(output, entry)), `${entry} is not published`);
  }

  fs.writeFileSync(path.join(output, 'stale-file.txt'), 'stale output');
  const rebuild = buildLocal(root);
  assert.equal(rebuild.status, 0, rebuild.stderr || rebuild.stdout);
  assert.ok(!fs.existsSync(path.join(output, 'stale-file.txt')), 'rebuild removes stale output');
});
