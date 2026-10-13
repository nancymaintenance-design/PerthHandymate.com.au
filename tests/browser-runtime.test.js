const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const runtime = require('./helpers/browser-runtime');

function fixture(t) {
  const reports = path.resolve(root, '../reports/seo-optimization-local-2026-10-13');
  fs.mkdirSync(reports, { recursive: true });
  const folder = fs.mkdtempSync(path.join(reports, 'browser-runtime-'));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  return folder;
}
function moduleAt(folder, marker) {
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'index.js'), `module.exports = ${JSON.stringify({ marker })};`);
  return folder;
}
test('standard Node module resolution wins over optional runtime fallbacks', t => {
  const folder = fixture(t);
  moduleAt(path.join(folder, 'node_modules/playwright'), 'standard');
  assert.deepEqual(runtime.loadPlaywright({ from: path.join(folder, 'runner.js'), env: { PHM_PLAYWRIGHT_MODULE: '/missing/override' } }), { marker: 'standard' });
});
test('explicit module location works outside the Codex cache', t => {
  const folder = fixture(t);
  const configured = moduleAt(path.join(folder, 'external-runtime'), 'configured');
  assert.deepEqual(runtime.loadPlaywright({ from: path.join(folder, 'runner.js'), env: { PHM_PLAYWRIGHT_MODULE: configured } }), { marker: 'configured' });
});
test('missing dependency without a user profile fails with setup guidance', t => {
  const folder = fixture(t);
  assert.throws(() => runtime.loadPlaywright({ from: path.join(folder, 'runner.js'), env: {} }), /Playwright.*README/);
});
test('optional Codex runtime is used only when its module exists', t => {
  const folder = fixture(t);
  moduleAt(path.join(folder, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'), 'optional');
  assert.deepEqual(runtime.loadPlaywright({ from: path.join(folder, 'runner.js'), env: { USERPROFILE: folder } }), { marker: 'optional' });
});
test('bundled Chromium is the default, with explicit channel or executable overrides', t => {
  const folder = fixture(t);
  const executable = path.join(folder, 'browser');
  fs.writeFileSync(executable, 'Synthetic executable path for configuration only.');
  assert.deepEqual(runtime.browserLaunchOptions(executable, { env: {} }), { headless: true });
  assert.deepEqual(runtime.browserLaunchOptions('/missing/bundled', { env: { PHM_BROWSER_CHANNEL: 'msedge' } }), { headless: true, channel: 'msedge' });
  assert.deepEqual(runtime.browserLaunchOptions('/missing/bundled', { env: { PHM_BROWSER_EXECUTABLE_PATH: executable } }), { headless: true, executablePath: executable });
});
test('installed Windows Chrome or Edge is detected if bundled Chromium is absent', t => {
  const folder = fixture(t);
  const edge = path.join(folder, 'Microsoft/Edge/Application/msedge.exe');
  fs.mkdirSync(path.dirname(edge), { recursive: true });
  fs.writeFileSync(edge, 'Synthetic executable path for configuration only.');
  assert.deepEqual(runtime.browserLaunchOptions('/missing/bundled', { env: { PROGRAMFILES: folder }, platform: 'win32' }), { headless: true, executablePath: edge });
});
test('unavailable browser or conflicting overrides fail explicitly without skipping coverage', t => {
  fixture(t);
  assert.throws(() => runtime.browserLaunchOptions('/missing/bundled', { env: {}, platform: 'test' }), /browser.*README/i);
  assert.throws(() => runtime.browserLaunchOptions('/missing/bundled', { env: { PHM_BROWSER_CHANNEL: 'msedge', PHM_BROWSER_EXECUTABLE_PATH: '/missing/explicit' } }), /either.*PHM_BROWSER_CHANNEL.*PHM_BROWSER_EXECUTABLE_PATH/i);
});
