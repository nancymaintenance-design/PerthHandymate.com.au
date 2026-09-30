const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const origin = 'https://www.perthhandymate.com.au';
const root = path.resolve(__dirname, '..');

function publicPaths(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules', 'dist', 'tests'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return publicPaths(full);
    if (entry.name !== 'index.html') return [];
    const route = path.relative(root, path.dirname(full)).split(path.sep).filter(Boolean).join('/');
    return [`/${route}${route ? '/' : ''}`];
  });
}

async function verify(pathname) {
  const canonical = `${origin}${pathname}`;
  const legacy = pathname === '/' ? '/index.html' : `${pathname}index.html`;
  const [page, redirect] = await Promise.all([
    fetch(canonical),
    fetch(`${origin}${legacy}`, { redirect: 'manual' }),
  ]);
  assert.equal(page.status, 200, `${pathname}: canonical response`);
  assert.equal(redirect.status, 308, `${legacy}: permanent redirect`);
  assert.equal(new URL(redirect.headers.get('location'), origin).href, canonical, `${legacy}: redirect target`);
  const html = await page.text();
  assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`), `${pathname}: self canonical`);
  for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|tel:|#)/i.test(href)) continue;
    assert.doesNotMatch(href.split(/[?#]/)[0], /(?:^|\/)index\.html$/i, `${pathname}: ${href}`);
  }
}

async function main() {
  const sitemap = await fetch(`${origin}/sitemap.xml`);
  assert.equal(sitemap.status, 200, 'sitemap response');
  const xml = await sitemap.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]));
  assert.equal(urls.length, 53, 'expected indexable URL count');
  assert.equal(new Set(urls.map((url) => url.href)).size, urls.length, 'duplicate sitemap entries');
  for (const url of urls) assert.equal(url.origin, origin, `${url.href}: canonical host`);
  const paths = publicPaths(root);
  assert.equal(paths.length, 108, 'expected public page count');
  for (const url of urls) assert.ok(paths.includes(url.pathname), `${url.pathname}: sitemap page missing from source`);
  for (let index = 0; index < paths.length; index += 8) {
    await Promise.all(paths.slice(index, index + 8).map(verify));
  }
  console.log(`Production canonical check passed: ${paths.length} pages, ${paths.length} legacy redirects, ${urls.length} sitemap URLs.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
