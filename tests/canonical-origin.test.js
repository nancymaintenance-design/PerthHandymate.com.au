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

test('redirects the legacy North Perth index.html URL to its canonical directory URL', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const redirect = config.redirects.find((rule) => rule.source === '/areas/north-perth-stirling/index.html');
  assert.ok(redirect, 'legacy index.html redirect exists');
  assert.equal(redirect.destination, 'https://www.perthhandymate.com.au/areas/north-perth-stirling/');
  assert.equal(redirect.permanent, true);
});

test('redirects every legacy index.html URL to its canonical directory URL', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const rootRedirect = config.redirects.find((rule) => rule.source === '/index.html');
  const nestedRedirect = config.redirects.find((rule) => rule.source === '/:path*/index.html');
  assert.deepEqual(rootRedirect, { source: '/index.html', destination: '/', permanent: true });
  assert.deepEqual(nestedRedirect, { source: '/:path*/index.html', destination: '/:path*/', permanent: true });
});

test('public pages link to canonical directory URLs instead of index.html', () => {
  for (const file of htmlFiles(root)) {
    if (path.basename(file) !== 'index.html') continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
      const href = match[1];
      if (/^(?:https?:|mailto:|tel:|#)/i.test(href)) continue;
      assert.doesNotMatch(href.split(/[?#]/)[0], /(?:^|\/)index\.html$/i, `${path.relative(root, file)}: ${href}`);
    }
  }
});
