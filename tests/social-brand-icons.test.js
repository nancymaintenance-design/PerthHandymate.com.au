const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createBuildFixture, buildLocal } = require('./helpers/local-build');
const root = path.resolve(__dirname, '..');

test('Important social icons retain Facebook circle and LinkedIn square brand colours', () => {
  const css = fs.readFileSync(path.join(root, 'assets/css/global.css'), 'utf8');
  assert.match(css, /\.footer-linkedin \.footer-social-icon\{[^}]*background:#0a66c2;[^}]*color:#fff;[^}]*border-radius:3px/);
  assert.match(css, /\.footer-facebook \.footer-social-icon\{[^}]*background:#1877f2;[^}]*color:#fff;[^}]*border-radius:50%/);
  assert.match(css, /\.footer-social-icon\{width:18px;height:18px;flex:0 0 18px/);
  assert.match(css, /\.footer-instagram img\{width:18px;height:18px;flex:0 0 18px/);
});

test('all 114 built pages expose the four social destinations inside Important', t => {
  const fixture = createBuildFixture(t);
  const result = buildLocal(fixture);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = path.join(fixture, 'dist');
  const walk = directory => fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : /^(?:index|404)\.html$/.test(entry.name) ? [path.join(directory,entry.name)] : []);
  const pages = walk(output);
  assert.equal(pages.length, 114);
  for (const file of pages) {
    const html = fs.readFileSync(file,'utf8');
    const region = html.match(/<h2>Important<\/h2>[\s\S]*?<div class="footer-social-region"[\s\S]*?<\/a><\/div><\/div>/)?.[0];
    assert.ok(region, file);
    for (const url of ['https://share.google/qaKT4Kj7ycWHQCQWh','https://www.instagram.com/elliservices_group/','https://share.google/Z4tImXHToPi9H4LmH','https://share.google/HbT2Uijg3K6yaqcpV']) assert.ok(region.includes(url), file+': '+url);
    assert.equal((html.match(/class="footer-social-region"/g)||[]).length,1,file);
  }
});
