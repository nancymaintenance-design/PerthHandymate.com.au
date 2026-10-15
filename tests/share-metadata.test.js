const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts/normalize-share-metadata.js');
const origin = 'https://www.perthhandymate.com.au';
const decoded = values => values.map(value => value.replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>'));
function meta(html, key) {
  return [...html.matchAll(/<meta\b[^>]*>/g)].filter(m => new RegExp(`(?:name|property)="${key}"`).test(m[0])).map(m => m[0].match(/content="([^"]*)"/)[1]);
}
test('all public routes share their reviewed title, description and a real same-origin image', () => {
  const paths = [...fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
  for (const route of [...paths, '/404.html']) {
    const html = fs.readFileSync(path.join(root, '.' + route, route.endsWith('/') ? 'index.html' : ''), 'utf8');
    assert.deepEqual(decoded(meta(html, 'og:title')), decoded([html.match(/<title>([^<]*)<\/title>/)[1]]), route);
    assert.deepEqual(decoded(meta(html, 'og:description')), decoded(meta(html, 'description')), route);
    assert.deepEqual(meta(html, 'twitter:title'), meta(html, 'og:title'), route);
    assert.deepEqual(meta(html, 'twitter:description'), meta(html, 'og:description'), route);
    const [image] = meta(html, 'og:image');
    assert.ok(image, route + ': share image');
    const url = new URL(image);
    assert.equal(url.origin, origin, route);
    assert.ok(fs.statSync(path.join(root, '.' + decodeURIComponent(url.pathname))).isFile(), route);
    assert.deepEqual(meta(html, 'twitter:image'), [image], route);
    assert.equal(meta(html, 'og:image:alt').length, 1, route);
  }
});
test('normalizer deduplicates escaped share tags, resolves nested/root images, falls back safely and preserves non-share bytes', t => {
  assert.ok(fs.existsSync(script), 'deterministic metadata normalizer exists');
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'phm-share-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  fs.mkdirSync(path.join(fixture, 'assets/images'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'nested/page'), { recursive: true });
  for (const name of ['photo.webp', 'ellis-services-group-logo.webp']) fs.copyFileSync(path.join(root, 'assets/images/ellis-services-group-logo.webp'), path.join(fixture, 'assets/images', name));
  const page = (route, body) => `<!doctype html><html><head><title>Repair &amp; care &quot;Perth&quot; $&amp;</title><meta name="description" content="Assess &amp; agree &quot;work&quot;."><meta name="robots" content="noindex,follow"><link rel="canonical" href="${origin}${route}"><meta property="og:title" content="old"><meta name="twitter:card" content="old"><meta property="og:image" content="duplicate"><script type="application/ld+json">{"name":"Unchanged & entity"}</script></head><body><main>${body}</main></body></html>`;
  const files = [
    ['index.html', page('/', '<img src="/assets/images/photo.webp" alt="Before &amp; after &quot;repair&quot;" width="1200" height="800">')],
    ['nested/page/index.html', page('/nested/page/', '<img src="../../assets/images/photo.webp" alt="Original before-state" width="1200" height="800">')],
    ['fallback.html', page('/fallback.html', '<img src="https://outside.example/image.jpg" alt="External" width="1200" height="800"><img src="/missing.webp" alt="Missing" width="1200" height="800"><img src="/assets/images/photo.webp" alt="" width="96" height="96">')],
  ];
  for (const [file, html] of files) fs.writeFileSync(path.join(fixture, file), html);
  const run = () => spawnSync(process.execPath, [script, fixture], { encoding: 'utf8' });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const first = files.map(([file, before]) => {
    const after = fs.readFileSync(path.join(fixture, file), 'utf8');
    const removeShare = html => html.replace(/<meta\b[^>]*(?:property|name)="(?:og:|twitter:)[^"]*"[^>]*>/g, '');
    assert.equal(removeShare(after), removeShare(before), file + ': body/canonical/robots/schema byte preservation');
    assert.deepEqual(meta(after, 'og:title'), ['Repair &amp; care &quot;Perth&quot; $&amp;']);
    assert.deepEqual(meta(after, 'og:image'), [origin + '/assets/images/' + (file === 'fallback.html' ? 'ellis-services-group-logo.webp' : 'photo.webp')]);
    assert.deepEqual(meta(after, 'twitter:card'), [file === 'fallback.html' ? 'summary' : 'summary_large_image']);
    if (file === 'nested/page/index.html') assert.deepEqual(meta(after, 'og:image:alt'), ['Original before-state']);
    if (file === 'index.html') assert.deepEqual(meta(after, 'og:image:alt'), ['Before &amp; after &quot;repair&quot;']);
    return after;
  });
  assert.equal(run().status, 0);
  files.forEach(([file], i) => assert.equal(fs.readFileSync(path.join(fixture, file), 'utf8'), first[i], file + ': idempotency'));
});
