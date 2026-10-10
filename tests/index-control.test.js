const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, config, redirectFor } = require('./helpers/vercel-routing');

const routes = config.routes || [];
const notFound = fs.readFileSync(path.join(root, '404.html'), 'utf8');

test('404 recovery page prevents indexing while allowing crawlers to follow recovery links', () => {
  const robots = [...notFound.matchAll(/<meta\b[^>]*name="robots"[^>]*content="([^"]+)"[^>]*>/gi)];
  assert.deepEqual(robots.map(match => match[1]), ['noindex,follow']);
});

test('404 recovery links and assets work when served at a nested missing URL', () => {
  const request = new URL('https://www.perthhandymate.com.au/missing/nested/page/');
  for (const match of notFound.matchAll(/(?:href|src|data-root)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(?:https?:|mailto:|tel:|#)/.test(value)) continue;
    assert.ok(value.startsWith('/'), `${value} must resolve from the public root at ${request.pathname}`);
    const resolved = new URL(value, request);
    const target = path.join(root, resolved.pathname, value.endsWith('/') ? 'index.html' : '');
    assert.ok(fs.existsSync(target), `${resolved.pathname} exists`);
  }
});

test('missing routes use the branded 404 response only after filesystem resolution', () => {
  const filesystem = routes.findIndex(rule => rule.handle === 'filesystem');
  assert.ok(filesystem >= 0, 'existing public files and API functions must resolve before fallback');
  const fallback = routes.at(-1);
  assert.equal(fallback?.status, 404, 'missing paths must not return a soft 404 with status 200');
  assert.equal(fallback.dest, '/404.html');
  assert.ok(routes.indexOf(fallback) > filesystem);
  for (const pathname of ['/missing/', '/missing/nested/page/', '/missing.css', '/api/missing']) {
    assert.match(pathname, new RegExp(fallback.src), pathname);
  }
  assert.ok(fs.existsSync(path.join(root, 'api/contact.js')), 'contact function remains available to filesystem routing');
});

test('slashless page directories redirect permanently without changing files or contact API', () => {
  for (const pathname of ['/contact', '/services', '/areas/north-perth-stirling', '/services/handyman-interiors-appliance-repairs/handymen']) {
    assert.deepEqual(redirectFor(pathname), {
      status: 308,
      location: `https://www.perthhandymate.com.au${pathname}/`,
    }, pathname);
  }
  for (const pathname of ['/', '/contact/', '/api/contact', '/api/contact/', '/assets/css/global.css', '/assets/js/site.js', '/robots.txt', '/sitemap.xml', '/favicon.ico', '/site.webmanifest', '/google28003a8fb6bb282a.html', '/.well-known/security.txt']) {
    assert.equal(redirectFor(pathname), null, `${pathname} must not acquire a slash or another redirect`);
  }
});

test('non-www requests redirect directly to their final www directory or file URL', () => {
  const cases = [
    ['/', 'https://www.perthhandymate.com.au/'],
    ['/index.html', 'https://www.perthhandymate.com.au/'],
    ['/contact', 'https://www.perthhandymate.com.au/contact/'],
    ['/contact/', 'https://www.perthhandymate.com.au/contact/'],
    ['/areas/north-perth-stirling/index.html', 'https://www.perthhandymate.com.au/areas/north-perth-stirling/'],
    ['/services/handyman-interiors-appliance-repairs/handymen/index.html', 'https://www.perthhandymate.com.au/services/handyman-interiors-appliance-repairs/handymen/'],
    ['/assets/css/global.css', 'https://www.perthhandymate.com.au/assets/css/global.css'],
    ['/api/contact', 'https://www.perthhandymate.com.au/api/contact'],
  ];
  for (const [pathname, location] of cases) {
    const redirect = redirectFor(pathname, 'perthhandymate.com.au');
    assert.deepEqual(redirect, { status: 308, location }, pathname);
    const target = new URL(redirect.location);
    assert.equal(redirectFor(target.pathname, target.hostname), null, 'destination must not need a second redirect');
  }
  assert.equal(redirectFor('/assets/css/global.css', 'perthhandymateXcomYau'), null, 'host dots must match literally');
});

test('security headers protect normal, API, asset and error responses without a CSP', () => {
  for (const pathname of ['/', '/contact/', '/api/contact', '/assets/css/global.css', '/404.html', '/missing/nested/']) {
    const headers = Object.assign({}, ...routes.filter(rule => rule.src
      && new RegExp(rule.src).test(pathname) && rule.continue === true).map(rule => rule.headers || {}));
    assert.equal(headers['X-Content-Type-Options'], 'nosniff', pathname);
    assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin', pathname);
    assert.equal(headers['Permissions-Policy'], 'camera=(), microphone=(), geolocation=()', pathname);
    assert.equal(headers['X-Frame-Options'], 'DENY', pathname);
  }
  for (const rule of routes) {
    assert.ok(!Object.keys(rule.headers || {}).some(key => /^content-security-policy(?:-report-only)?$/i.test(key)), 'CSP is outside this task');
    if (rule.headers && !rule.headers.Location) assert.equal(rule.continue, true, 'header rules must continue to files/API/fallback');
  }
});

test('all existing sitemap routes remain canonical and resolve before the 404 fallback', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = new URL(match[1]);
    assert.equal(redirectFor(url.pathname, url.hostname), null, url.href);
    assert.ok(fs.existsSync(path.join(root, url.pathname, 'index.html')), url.href);
  }
  assert.ok(routes.some(rule => rule.handle === 'filesystem'));
});

test('asset caching remains in effect while headers continue to filesystem routing', () => {
  for (const [pathname, expected] of [
    ['/assets/images/favicon-32.png', 'public, max-age=604800, stale-while-revalidate=86400'],
    ['/assets/css/global.css', 'public, max-age=3600, stale-while-revalidate=86400'],
    ['/assets/js/site.js', 'public, max-age=3600, stale-while-revalidate=86400'],
  ]) {
    const headers = Object.assign({}, ...routes.filter(rule => rule.src
      && new RegExp(rule.src).test(pathname) && rule.continue === true).map(rule => rule.headers || {}));
    assert.equal(headers['Cache-Control'], expected, pathname);
  }
});
