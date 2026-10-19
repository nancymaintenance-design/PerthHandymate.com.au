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
  assert.equal(config.buildCommand, 'npm run build', 'production checks TypeScript before using the same bilingual pipeline');
  const expectedEntries = [...fs.readdirSync(root).filter(file=>/\.(?:html|ico|png)$/.test(file)),
    'about','areas','assets','contact','data','faq','guides','privacy','projects','robots.txt','services','site.webmanifest','sitemap.xml','zh','feed.json','feed.xml'];
  assert.deepEqual(fs.readdirSync(output).sort(), expectedEntries.sort(), 'publication inputs match vercel.json');
  for (const file of ['index.html', '404.html', 'sitemap.xml', 'services/handyman-interiors-appliance-repairs/handymen/index.html', 'favicon.ico', 'favicon-32.png', 'robots.txt', 'site.webmanifest', 'assets/css/global.css', 'data/keyword-content-round.json']) {
    assert.ok(fs.existsSync(path.join(output, file)), `${file} is published`);
  }
  assert.equal(fs.readFileSync(path.join(output, 'build-probe.html'), 'utf8'), '<a href="services/?source=test#repairs">Services</a>');
  assert.ok(fs.readFileSync(path.join(output,'zh/contact/index.html'),'utf8').includes('lang="zh-Hans"'), 'Chinese pages are generated in the same build');
  for (const entry of ['.git', '.env.local', '.env.example', 'docs', 'tests', 'scripts', 'tools', 'locales', 'typescript', 'tsconfig.json', 'package.json', 'package-lock.json', 'AGENTS.md', 'README.md', 'vercel.json']) {
    assert.ok(!fs.existsSync(path.join(output, entry)), `${entry} is not published`);
  }

  fs.writeFileSync(path.join(output, 'stale-file.txt'), 'stale output');
  const rebuild = buildLocal(root);
  assert.equal(rebuild.status, 0, rebuild.stderr || rebuild.stdout);
  assert.ok(!fs.existsSync(path.join(output, 'stale-file.txt')), 'rebuild removes stale output');
  const originalHome=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const reviewedOutput=fs.readFileSync(path.join(output,'index.html'),'utf8');
  fs.writeFileSync(path.join(root,'index.html'),originalHome.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/,'<h1>A new English headline without a reviewed Chinese translation</h1>'));
  const incomplete=buildLocal(root);
  assert.notEqual(incomplete.status,0,'untranslated changes fail the actual build');
  assert.match(incomplete.stderr,/Missing Chinese translation/);
  assert.equal(fs.readFileSync(path.join(output,'index.html'),'utf8'),reviewedOutput,'failed translation check preserves the previous working preview');
});
