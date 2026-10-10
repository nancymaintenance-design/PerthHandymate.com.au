const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, 'dist');
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('Built dist output is missing. Run node scripts/build-local.js before preview.');
  process.exit(1);
}
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

http.createServer((request, response) => {
  function notFound() {
    fs.readFile(path.join(root, '404.html'), (notFoundError, notFoundBody) => {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(notFoundError ? 'Not found' : notFoundBody);
    });
  }
  let url;
  let pathname;
  try {
    // Check before URL parsing normalizes dot segments away.
    pathname = decodeURIComponent(request.url.split(/[?#]/)[0]);
    url = new URL(request.url, `http://${host}`);
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Malformed request URI');
    return;
  }
  if (!pathname.startsWith('/') || pathname.startsWith('//') || /[\\\0]/.test(pathname)
    || pathname.split('/').some(segment => segment === '..' || segment === '.')) {
    notFound();
    return;
  }
  let redirect;
  if (url.pathname.endsWith('/index.html')) redirect = url.pathname.slice(0, -10);
  else if (!/^\/api(?:\/|$)/.test(pathname) && /\/[^.\/]+$/.test(pathname) && !pathname.includes('.')) {
    redirect = `${url.pathname}/`;
  }
  if (redirect) {
    response.writeHead(308, { Location: `${redirect}${url.search}` });
    response.end();
    return;
  }
  const requested = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const target = path.resolve(root, `.${requested}`);
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    notFound();
    return;
  }
  fs.readFile(target, (error, body) => {
    if (error) { notFound(); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
    response.end(body);
  });
}).listen(port, host, () => {
  console.log(`Ellis Services Group preview: http://${host}:${port}/`);
});
