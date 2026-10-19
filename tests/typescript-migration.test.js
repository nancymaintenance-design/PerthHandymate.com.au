const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('every executable website entry has an authoritative TypeScript source', () => {
  const entries = ['assets/js/analytics', 'assets/js/contact-validation', 'assets/js/handyman-clarity', 'assets/js/home-guides', 'assets/js/locales', 'assets/js/site', 'data/content', 'data/form-config', 'data/search-catalog', 'data/guide-library', 'api/contact', 'scripts/build-local', 'scripts/build-locales', 'scripts/lib/locales', 'scripts/normalize-index-links', 'preview-server'];
  for (const entry of entries) assert.ok(fs.existsSync(path.join(root, 'typescript', `${entry}.ts`)), `Missing TypeScript source: ${entry}`);
});

test('TypeScript migration does not allow unchecked JavaScript inputs', () => {
  const configPath = path.join(root, 'tsconfig.json');
  assert.ok(fs.existsSync(configPath), 'Missing strict compiler configuration');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert.equal(config.compilerOptions.strict, true);
  assert.notEqual(config.compilerOptions.allowJs, true);
});

test('generated compatibility artifacts match strictly checked TypeScript sources', () => {
  const result = require('node:child_process').spawnSync(process.execPath, ['--experimental-strip-types', 'typescript/compile.mts', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Verified \d+ TypeScript website entries/);
});
