const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const { routes } = JSON.parse(fs.readFileSync(path.join(root, 'data/content-modifications.json'), 'utf8'));
const sitemapFile = path.join(root, 'sitemap.xml');
const origin = 'https://www.perthhandymate.com.au';
let changed = 0;
const original = fs.readFileSync(sitemapFile, 'utf8');
const sitemap = original.replace(/<url><loc>([^<]+)<\/loc>(?:<lastmod>[^<]+<\/lastmod>)?<\/url>/g, (raw, url) => {
  const route = url.startsWith(origin + '/') ? url.slice(origin.length) : null;
  if (!route || !routes[route]) return raw;
  const { date, reason, source } = routes[route];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !reason || !source) throw new Error(`Invalid content modification record: ${route}`);
  const replacement = `<url><loc>${url}</loc><lastmod>${date}</lastmod></url>`;
  if (replacement !== raw) changed++;
  if (route.startsWith('/guides/') && route !== '/guides/') {
    const file = path.join(root, route.slice(1), 'index.html');
    const html = fs.readFileSync(file, 'utf8');
    if (!/Updated \d{4}-\d{2}-\d{2}/.test(html)) throw new Error(`Missing visible guide Updated date: ${route}`);
    const next = html.replace(/Updated \d{4}-\d{2}-\d{2}/, `Updated ${date}`);
    if (next !== html) fs.writeFileSync(file, next);
  }
  return replacement;
});
if (sitemap !== original) fs.writeFileSync(sitemapFile, sitemap);
console.log(`Applied recorded content dates: ${changed} sitemap entries updated; membership unchanged.`);
