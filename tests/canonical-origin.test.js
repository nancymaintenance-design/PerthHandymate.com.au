const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const origin = 'https://www.perthhandymate.com.au/';

function htmlPages(dir = root, pages = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'tests' || entry.name.startsWith('.vercel')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlPages(fullPath, pages);
    if (entry.isFile() && entry.name.endsWith('.html') && !entry.name.startsWith('google')) pages.push(fullPath);
  }
  return pages;
}

test('ships www canonicals on every public HTML page', () => {
  const pages = htmlPages();
  assert.equal(pages.length, 98);
  for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8');
    const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1];
    assert.ok(canonical?.startsWith(origin), `${path.relative(root, page)} canonical: ${canonical || 'missing'}`);
  }
});

test('advertises the www sitemap in robots.txt', () => {
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  assert.match(robots, /^Sitemap: https:\/\/www\.perthhandymate\.com\.au\/sitemap\.xml$/m);
});

test('lists only www URLs in sitemap.xml', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(urls.length, 97);
  assert.ok(urls.every((url) => url.startsWith(origin)));
});
