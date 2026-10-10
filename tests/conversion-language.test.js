const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createBuildFixture, buildLocal } = require('./helpers/local-build');
const root = path.resolve(__dirname, '..');
const authoredDirs = ["about","areas","contact","faq","guides","privacy","projects","services"];
const authoredFiles = ["index.html","404.html","data/content.js"];
const forbidden = new RegExp("cannot confirm serviceability|not an automatic quote|not confirm availability|search engines and AI systems|does not replace a regulator|not replace engineering|If the first request cannot be matched|availability and response time remain unconfirmed|not an emergency response channel|decision aid, not legal advice|general Australian guide|general (?:information|guidance)|not a promise of attendance|does not by itself establish|may still be unsuitable|operating model does not remove", 'i');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : entry.name.endsWith('.html') ? [path.join(dir, entry.name)] : []);
}
function customerText(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return file.endsWith('.html') ? raw.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ') : raw;
}
function check(files) {
  const hits = files.map(file => ({ file: path.relative(root, file), match: customerText(file).match(forbidden)?.[0] })).filter(hit => hit.match);
  assert.deepEqual(hits, [], JSON.stringify(hits, null, 2));
}
test('customer copy replaces audited deflection and production commentary with service actions', () => {
  check([...authoredFiles.map(file => path.join(root, file)), ...authoredDirs.flatMap(dir => walk(path.join(root, dir)))]);
});
test('generated customer pages contain no audited deflection or production commentary', t => {
  const fixture = createBuildFixture(t);
  const result = buildLocal(fixture);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = path.join(fixture, 'dist');
  assert.ok(fs.existsSync(path.join(output, 'index.html')), 'build output exists');
  check(walk(output));
  const text = customerText(path.join(output, 'index.html'));
  assert.match(text, /Ellis/);
  assert.match(text, /(?:assessment|inspect|inspection)/i);
  assert.match(text, /quote/i);
});

