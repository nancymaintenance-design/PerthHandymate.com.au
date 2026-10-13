const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'data/indexing-policy.json'), 'utf8'));
const indexableServices = new Set([...policy.indexableServiceRoutes, ...(policy.supplementalServiceRoutes || [])]);

function walk(directory, visitor) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target, visitor);
    else visitor(target);
  }
}

function routeFor(file) {
  return `${path.relative(root, path.dirname(file)).split(path.sep).join('/')}/`;
}

function setRobotsDirective(file, directive) {
  const html = fs.readFileSync(file, 'utf8');
  if (html.includes(`<meta name="robots" content="${directive}">`)) return;
  const updated = html.replace(/<meta name="robots" content="(?:index|noindex),follow">/, `<meta name="robots" content="${directive}">`);
  if (updated === html) throw new Error(`Missing robots directive: ${routeFor(file)}`);
  fs.writeFileSync(file, updated);
}

walk(path.join(root, 'services'), (file) => {
  if (path.basename(file) !== 'index.html') return;
  const route = routeFor(file);
  if (route.split('/').filter(Boolean).length !== 3) return;
  setRobotsDirective(file, indexableServices.has(route) ? 'index,follow' : 'noindex,follow');
});

const sitemapRoutes = [
  ...policy.indexableSitemapRoutes,
  ...policy.indexableServiceRoutes,
  ...(policy.supplementalServiceRoutes || []),
  ...(policy.indexableProjectRoutes || []),
];
const sitemapFile = path.join(root, 'sitemap.xml');
const existingSitemap = fs.existsSync(sitemapFile) ? fs.readFileSync(sitemapFile, 'utf8') : '';
const existingDates = new Map([...existingSitemap
  .matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)]
  .map(([, url, date]) => [url, date]));
const modifications = JSON.parse(fs.readFileSync(path.join(root, 'data/content-modifications.json'), 'utf8')).routes;
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapRoutes.map((route) => {
    const url = `${policy.origin}${route}`;
    const date = modifications[`/${route}`]?.date || existingDates.get(url);
    return `  <url><loc>${url}</loc>${date ? `<lastmod>${date}</lastmod>` : ''}</url>`;
  }),
  '</urlset>',
  '',
].join('\n');
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);

const catalogFile = path.join(root, 'data/search-catalog.js');
const catalogPrefix = 'window.ELLIS_SEARCH_CATALOG=';
const serviceCatalog = JSON.parse(fs.readFileSync(path.join(root, 'data/service-catalog.json'), 'utf8'));
const supplemental = JSON.parse(fs.readFileSync(path.join(root, 'data/supplemental-services.json'), 'utf8'));
const searchCatalog = [...supplemental.services, ...serviceCatalog.canonicalServices].map((item) => ({
  service: item.title,
  canonical: item.categoryTitle,
  route: item.url,
  terms: [...new Set([item.title, ...item.searchTerms].map((term) => term.toLowerCase()))],
}));
if (searchCatalog.length !== policy.indexableServiceRoutes.length + (policy.supplementalServiceRoutes || []).length) throw new Error('Search catalog coverage is incomplete');
fs.writeFileSync(catalogFile, `${catalogPrefix}${JSON.stringify(searchCatalog, null, 2)};\n`);

const cards = [
  ['icon-handyman.webp', 'Handyman repairs', 'services/handyman-interiors-appliance-repairs/handymen/'],
  ['icon-carpentry.webp', 'Carpentry', 'services/handyman-interiors-appliance-repairs/carpenters/'],
  ['icon-bathroom.webp', 'Door repairs & installation', 'services/doors-windows-glass-screens/door-installation/'],
  ['icon-fly-screen-repairs.webp', 'Fly screen repairs', 'services/doors-windows-glass-screens/fly-screens/'],
  ['icon-window-repairs.webp', 'Window repairs', 'services/doors-windows-glass-screens/window-repairs/'],
  ['icon-tiling.webp', 'Minor tiling', 'services/handyman-interiors-appliance-repairs/tiling/'],
  ['icon-house-painting.webp', 'House painting', 'services/roofing-gutters-exterior/house-painters/'],
  ['icon-lawn-mowing.webp', 'Garden clean-up', 'services/gardens-landscaping/garden-clean-up/'],
].map(([icon, label, route]) => {
  const height = {'icon-carpentry.webp':64,'icon-tiling.webp':80,'icon-window-repairs.webp':93}[icon] || 96;
  return `<article class="service-card popular-card"><img src="./assets/images/${icon}" alt="" width="96" height="${height}" loading="lazy" decoding="async"><p class="eyebrow">Popular service</p><h3><a href="./${route}">${label}</a></h3><span class="text-link">Explore service <span aria-hidden="true">→</span></span></article>`;
}).join('');
const homeFile = path.join(root, 'index.html');
const home = fs.readFileSync(homeFile, 'utf8');
const start = '<div class="card-grid popular-grid">';
const end = '<p class="section-action">';
const before = home.indexOf(start);
const after = home.indexOf(end, before);
if (before < 0 || after < 0) throw new Error('Popular service section not found');
fs.writeFileSync(homeFile, `${home.slice(0, before)}${start}${cards}</div>${home.slice(after)}`);

console.log(`Applied PHM indexing policy: ${sitemapRoutes.length} sitemap URLs, ${searchCatalog.length} searchable services.`);
