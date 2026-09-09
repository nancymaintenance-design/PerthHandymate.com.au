const fs = require('node:fs');
const path = require('node:path');

const sitemap = fs.readFileSync(path.resolve(__dirname, '../sitemap.xml'), 'utf8');
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
if (paths.length !== 97) throw new Error(`Expected 97 sitemap URLs, found ${paths.length}`);
const port = Number(process.env.ELLIS_PREVIEW_PORT || 8765);

async function run() {
  let failures = 0;
  for (const pathname of paths) {
    const response = await fetch(`http://127.0.0.1:${port}${pathname}`);
    const body = await response.text();
    if (response.status !== 200 || !response.headers.get('content-type')?.startsWith('text/html') || !body.includes('<main id="main">')) {
      failures += 1;
      console.error(`${pathname}: ${response.status} ${response.headers.get('content-type')}`);
    }
  }
  const notFoundPage = await fetch(`http://127.0.0.1:${port}/404.html`);
  const notFoundBody = await notFoundPage.text();
  if (notFoundPage.status !== 200 || !notFoundBody.includes('404 · Page not found') || !notFoundBody.includes('data-service-search')) {
    failures += 1;
    console.error(`/404.html: ${notFoundPage.status} branded recovery page missing`);
  }
  if (failures) process.exit(1);
  console.log(`HTTP smoke passed: ${paths.length}/97 sitemap pages plus branded 404.html returned expected local HTML.`);
}

run().catch((error) => { console.error(error); process.exit(1); });
