const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const canonicalOrigin = 'https://www.perthhandymate.com.au';
const retiredOrigin = 'https://perthhandymate.com.au';

function htmlFiles(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git') return [];
    const fullPath = path.join(folder, entry.name);
    if (entry.isDirectory()) return htmlFiles(fullPath);
    return entry.name.endsWith('.html') ? [fullPath] : [];
  });
}

test('publishes www as the only absolute Handymate origin', () => {
  const files = [...htmlFiles(root), path.join(root, 'robots.txt'), path.join(root, 'sitemap.xml')];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.equal(source.includes(retiredOrigin), false, `${path.relative(root, file)} contains retired non-www origin`);
  }

  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.match(home, new RegExp(`<link rel="canonical" href="${canonicalOrigin}/">`));
  assert.match(robots, new RegExp(`Sitemap: ${canonicalOrigin}/sitemap\\.xml`));
  assert.match(sitemap, new RegExp(`<loc>${canonicalOrigin}/`));
});
