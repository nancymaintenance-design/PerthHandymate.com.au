const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
  const requested = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const target = path.resolve(root, `.${requested}`);
  const safeTarget = target.startsWith(`${root}${path.sep}`) ? target : path.join(root, '404.html');

  fs.readFile(safeTarget, (error, body) => {
    if (!error) {
      response.writeHead(200, { 'Content-Type': types[path.extname(safeTarget)] || 'application/octet-stream' });
      response.end(body);
      return;
    }

    fs.readFile(path.join(root, '404.html'), (notFoundError, notFoundBody) => {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(notFoundError ? 'Not found' : notFoundBody);
    });
  });
}).listen(port, host, () => {
  console.log(`Ellis Services Group preview: http://${host}:${port}/`);
});
