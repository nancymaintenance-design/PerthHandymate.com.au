const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const failures = [];
const notes = [];
const htmlFiles = [];
const productionOrigin = 'https://www.perthhandymate.com.au/';
const indexingPolicy = JSON.parse(fs.readFileSync(path.join(root, 'data/indexing-policy.json'), 'utf8'));
const indexableServiceRoutes = new Set(indexingPolicy.indexableServiceRoutes);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'tests' || entry.name === '.git' || entry.name === '.superpowers' || entry.name === 'node_modules' || entry.name === 'google28003a8fb6bb282a.html') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) htmlFiles.push(full);
  }
}
function fail(message) { failures.push(message); }
function rel(file) { return path.relative(root, file).replace(/\\/g, '/'); }

walk(root);
if (htmlFiles.length !== 98) fail(`Expected 98 HTML pages, found ${htmlFiles.length}`);

const titles = new Map();
const descriptions = new Map();
const expectedNav = ['Home', 'Services', 'Areas We Service', 'Guides & Advice', 'Contact Us'];
let checkedLinks = 0;
let jsonLdBlocks = 0;

for (const file of htmlFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const title = source.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = source.match(/<meta name="description" content="([^"]+)"/i)?.[1];
  if (!title) fail(`${rel(file)} has no title`);
  if (!description) fail(`${rel(file)} has no meta description`);
  if (titles.has(title)) fail(`${rel(file)} duplicates title from ${titles.get(title)}`); else titles.set(title, rel(file));
  if (descriptions.has(description)) fail(`${rel(file)} duplicates description from ${descriptions.get(description)}`); else descriptions.set(description, rel(file));
  if (!source.includes(`rel="canonical" href="${productionOrigin}`)) fail(`${rel(file)} lacks production-domain canonical`);
  const route = rel(file).replace(/index\.html$/, '');
  const isServiceLeaf = route.startsWith('services/') && route.split('/').filter(Boolean).length === 3;
  const expectedRobots = isServiceLeaf && !indexableServiceRoutes.has(route) ? 'noindex,follow' : 'index,follow';
  if (!source.includes(`<meta name="robots" content="${expectedRobots}">`)) fail(`${rel(file)} lacks expected ${expectedRobots} directive`);
  if (source.includes('https://www.ellisservices.example/')) fail(`${rel(file)} retains the test domain`);
  const logoPattern = /<header class="site-header">[\s\S]*?<img class="brand-logo" src="[^"]*assets\/images\/ellis-services-group-logo\.png" alt="Ellis Services Group logo" width="1237" height="1272">[\s\S]*?<\/header>/;
  if (!logoPattern.test(source)) fail(`${rel(file)} does not use the official header logo`);
  if ((source.match(/class="brand-logo"/g) || []).length !== 1) fail(`${rel(file)} must contain exactly one header brand logo`);
  if ((source.match(/<span class="brand-name">Ellis Services Group<\/span>/g) || []).length !== 1) fail(`${rel(file)} must show the company name beside the header logo`);
  if ((source.match(/href="tel:\+61403069685"/g) || []).length < 2) fail(`${rel(file)} must expose the confirmed phone link in header and footer`);
  if ((source.match(/0403 069 685/g) || []).length < 2) fail(`${rel(file)} must display the confirmed phone number in header and footer`);
  const prohibitedAssetDisclosure = /AI-generated|illustrative concept|not evidence|concept candidate|not (?:a |an )?real (?:customer|project|employee|provider|property|advice session)/i;
  if (prohibitedAssetDisclosure.test(source)) fail(`${rel(file)} retains a customer-visible material disclaimer phrase`);

  const nav = source.match(/<nav id="main-nav"[\s\S]*?<\/nav>/)?.[0] || '';
  const navLabels = [...nav.matchAll(/<a [^>]*>([^<]+)<\/a>/g)].map((match) => match[1]);
  if (JSON.stringify(navLabels) !== JSON.stringify(expectedNav)) fail(`${rel(file)} primary navigation differs: ${navLabels.join(', ')}`);

  for (const match of source.matchAll(/<(?:a|img|script|link)\b[^>]*(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(?:https?:|data:|#|mailto:|tel:)/.test(value)) continue;
    const clean = value.split(/[?#]/)[0];
    let target = path.resolve(path.dirname(file), clean || '.');
    if (clean.endsWith('/')) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) fail(`${rel(file)} has broken local reference: ${value}`);
    checkedLinks += 1;
  }

  for (const match of source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(match[1]); jsonLdBlocks += 1; } catch (error) { fail(`${rel(file)} has invalid JSON-LD: ${error.message}`); }
  }
}

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const popularBlock = home.match(/<div class="card-grid popular-grid">([\s\S]*?)<\/div>/)?.[1] || '';
if ((popularBlock.match(/icon-[^"']+\.png/g) || []).length !== 8) fail('Home does not expose eight popular-service icons');
if (!home.includes('data-service-search') || !home.includes('name="q"') || !home.includes('name="postcode"') || !home.includes('data-clear-search')) fail('Home search controls are incomplete');

const css = fs.readFileSync(path.join(root, 'assets/css/global.css'), 'utf8');
if (!css.includes('.brand-logo{display:block;width:64px;height:64px;object-fit:contain}')) fail('Desktop brand logo dimensions are not fixed');
if (!css.includes('@media(max-width:390px)') || !css.includes('.brand-logo{width:48px;height:50px}') || !css.includes('.brand-name{display:block;max-width:116px')) fail('390px logo and visible brand-name layout are not fixed');
if (!css.includes('@media(max-width:920px)') || !css.includes('.nav-toggle{display:block}')) fail('Navigation does not collapse before the logo can crowd five links');
if (!css.includes('@media(max-width:1100px){.header-call strong{display:none}}')) fail('Header call CTA does not compact before navigation can crowd');

const contact = fs.readFileSync(path.join(root, 'contact/index.html'), 'utf8');
if (!/<form[^>]+data-contact-form[^>]+novalidate/.test(contact)) fail('Contact form must use local novalidate behavior');
if (/<form[^>]+action=/.test(contact)) fail('Contact form unexpectedly has a submission action');
if (!contact.includes('does not transmit or store them')) fail('Contact page lacks explicit non-transmission message');
if (!contact.includes('name="postcode"')) fail('Contact page lacks the local location-prefill field');
if (!contact.includes('name="phone"') || !contact.includes('data-error="phone"')) fail('Contact page lacks the required phone field and local error target');
if (!contact.includes('No recipient or sending service is configured')) fail('Contact page overstates the current delivery state');
if ((contact.match(/href="tel:\+61403069685"/g) || []).length < 3) fail('Contact page lacks its dedicated confirmed phone link');

const formConfig = fs.readFileSync(path.join(root, 'data/form-config.js'), 'utf8');
if (!formConfig.includes("recipient:''") || !formConfig.includes("endpoint:''") || !formConfig.includes('enabled:false')) fail('Form delivery recipient/endpoint contract is incomplete');

const notFound = fs.readFileSync(path.join(root, '404.html'), 'utf8');
if (!notFound.includes('404 · Page not found') || !notFound.includes('data-service-search') || !notFound.includes('Return home')) fail('404 page lacks branded recovery controls');

const perthAreaNames = ['Perth CBD & Inner Suburbs','North Perth & Stirling','Joondalup & Northern Suburbs','South Perth & Canning','Fremantle & Coastal South','Eastern Suburbs, Midland & Swan','Cockburn, Rockingham & Southern Corridor'];
const perthAreaSlugs = ['perth-central','north-perth-stirling','joondalup-northern-suburbs','south-perth-canning','fremantle-coastal-south','eastern-suburbs-midland-swan','cockburn-rockingham-southern-corridor'];
const oldAreaSlugs = ['sydney','melbourne','brisbane','perth','adelaide','canberra','gold-coast'];
const customerHtml = htmlFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
for (const oldCity of ['Sydney','Melbourne','Brisbane','Adelaide','Canberra','Gold Coast']) {
  if (new RegExp(`\\b${oldCity.replace(' ', '\\s+')}\\b`, 'i').test(customerHtml)) fail(`Old service-market city remains in customer HTML: ${oldCity}`);
}
for (const phrase of ['major Australian cities','Australian cities','across Australia','nationwide','national coverage','Australia-wide']) {
  if (customerHtml.toLowerCase().includes(phrase.toLowerCase())) fail(`National-coverage phrase remains in customer HTML: ${phrase}`);
}
for (const slug of oldAreaSlugs) if (fs.existsSync(path.join(root, 'areas', slug))) fail(`Old area directory remains: areas/${slug}`);
for (const slug of perthAreaSlugs) if (!fs.existsSync(path.join(root, 'areas', slug, 'index.html'))) fail(`Missing Perth area page: areas/${slug}/index.html`);
const sitemapSource = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const slug of oldAreaSlugs) if (sitemapSource.includes(`/areas/${slug}/`)) fail(`Old area URL remains in sitemap: areas/${slug}/`);
for (const slug of perthAreaSlugs) if (!sitemapSource.includes(`/areas/${slug}/`)) fail(`New Perth area URL missing from sitemap: areas/${slug}/`);
const publicContentData = fs.readFileSync(path.join(root, 'data/content.js'), 'utf8');
for (const slug of perthAreaSlugs) if (!publicContentData.includes(`"slug": "${slug}"`)) fail(`New Perth area missing from JS content data: ${slug}`);
const areaPages = htmlFiles.filter((file) => /^areas\/[^/]+\/index\.html$/.test(rel(file)));
if (areaPages.length !== 7) fail(`Expected 7 Perth area pages, found ${areaPages.length}`);
for (const [index, slug] of perthAreaSlugs.entries()) {
  const areaPath = path.join(root, 'areas', slug, 'index.html');
  if (!fs.existsSync(areaPath)) continue;
  const source = fs.readFileSync(areaPath, 'utf8');
  const visibleName = perthAreaNames[index].replaceAll('&', '&amp;');
  if (!source.includes(visibleName)) fail(`Perth area name is not visible on ${slug}`);
  if (!/representative suburbs/i.test(source) || !/postcode/i.test(source) || !/availability/i.test(source)) fail(`${slug} lacks representative-suburb and request-specific coverage limits`);
}
const categoryPages = htmlFiles.filter((file) => /^services\/[^/]+\/index\.html$/.test(rel(file)));
const serviceDetailPages = htmlFiles.filter((file) => /^services\/[^/]+\/[^/]+\/index\.html$/.test(rel(file)));
if (categoryPages.length !== 9) fail(`Expected 9 service category pages, found ${categoryPages.length}`);
if (serviceDetailPages.length < 67) fail(`Expected at least 67 canonical service detail pages, found ${serviceDetailPages.length}`);
for (const file of [...categoryPages, ...serviceDetailPages]) {
  const source = fs.readFileSync(file, 'utf8');
  if ((source.match(/<h1\b/g) || []).length !== 1) fail(`${rel(file)} must contain exactly one H1`);
  if (source.includes('"@type":"Country"')) fail(`${rel(file)} still declares country-wide areaServed`);
  const blocks = [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
  const service = blocks.find((block) => block['@type'] === 'Service');
  const declared = service?.areaServed?.map((area) => area.name) || [];
  if (JSON.stringify(declared) !== JSON.stringify(['Perth metropolitan area'])) fail(`${rel(file)} does not limit Service JSON-LD to Perth metropolitan area`);
  if (!source.includes('Perth metropolitan area')) fail(`${rel(file)} visible copy does not state the Perth metropolitan service area`);
  const serviceCtas = source.match(/data-preserve-search href="[^"]+service=/g) || [];
  if (serviceCtas.length !== 2) fail(`${rel(file)} does not preserve service context on both contact CTAs`);
}

const expectedRawServices = [
  'Aircon Installation','Blinds & Curtains','Carpenters','Carpet Repair','Cladding','Electricians','Floor Sanding','Fly Screens','Insulation','New Carpet','Plasterers','Plumbers','Shower Screens','Tiling','Waterproofing',
  'Asbestos Removal','Concrete Resurfacing','Flyscreen Repair','Gutter Cleaning','Gutter Installation','Gutter Repair','House Painters','New Doors','Pavers','Roof Repairs','Roofing','Skylights','Verandah Builders','Window Installation','Window Repairs',
  'Deck Builders','Fence Builders','Fencing Contractors','Garden Clean Up','Garden Landscapers','Gardeners','Lawn Mowing','Patio Builders','Pergola Builders','Pool Fence Installers','Pool Resurfacing','Surveyors','Synthetic Grass','Timber Fencing','Tree Arborists',
  'Bathroom','Bricklayers','Builders','Building Certifiers','Building Inspectors','Carports & Garages','Concreters','Demolition','Draftsmen','Home Renovators','Renderers','Renovation Builders','Restumping','Retaining Walls','Structural Engineers',
  'Air Conditioning','Cabinet Makers','Cleaners','Dishwasher Repair','Door Installers','Furniture Removalists','Gas Fitters','Glass Glaziers','Handymen','IKEA Kitchens','Oven Repair','Pest Control','Rubbish Removal','Removalists','Upholstery Repair'
];
const catalogPath = path.join(root, 'data/service-catalog.json');
if (!fs.existsSync(catalogPath)) {
  fail('Missing data/service-catalog.json coverage inventory');
} else {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const labels = catalog.rawServices.map((item) => item.label);
  const missing = expectedRawServices.filter((label) => !labels.includes(label));
  const unexpected = labels.filter((label) => !expectedRawServices.includes(label));
  if (catalog.rawServices.length !== 75 || new Set(labels).size !== 75) fail(`Raw service coverage must contain 75 unique labels, found ${catalog.rawServices.length}/${new Set(labels).size}`);
  if (missing.length || unexpected.length) fail(`Raw service coverage mismatch; missing: ${missing.join(', ') || 'none'}; unexpected: ${unexpected.join(', ') || 'none'}`);
  if (catalog.canonicalServices.length < 67) fail(`Canonical service catalog must contain at least 67 entries, found ${catalog.canonicalServices.length}`);
  const slugs = catalog.canonicalServices.map((item) => item.slug);
  if (new Set(slugs).size !== slugs.length) fail('Canonical service slugs are not unique');
  for (const item of catalog.rawServices) {
    const target = path.join(root, item.url, 'index.html');
    if (!fs.existsSync(target)) fail(`Raw service has no detail target: ${item.label} -> ${item.url}`);
  }
  const categorySource = categoryPages.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  for (const label of expectedRawServices) {
    const encodedLabel = label.replaceAll('&', '&amp;');
    if (!categorySource.includes(`>${encodedLabel}<`)) fail(`Raw service label is not visible in category directories: ${label}`);
  }
  if ((categorySource.match(/>Explore service</g) || []).length !== 75) fail('Category directories must expose one Explore service link for each raw label');
  if ((categorySource.match(/data-service-image=/g) || []).length !== 9) fail('Nine category image integration paths are not reserved');
  const categorySlugs = [...new Set(catalog.rawServices.map((item) => item.category))];
  if (categorySlugs.length !== 9) fail(`Expected 9 image categories, found ${categorySlugs.length}`);
  for (const slug of categorySlugs) {
    const imagePath = path.join(root, 'assets/images/services', `${slug}.png`);
    if (!fs.existsSync(imagePath)) { fail(`Missing category image: assets/images/services/${slug}.png`); continue; }
    const image = fs.readFileSync(imagePath);
    const isPng = image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    if (!isPng || image.readUInt32BE(16) !== 1672 || image.readUInt32BE(20) !== 941) fail(`Category image is not a valid 1672x941 PNG: ${slug}.png`);
    const categoryPage = fs.readFileSync(path.join(root, 'services', slug, 'index.html'), 'utf8');
    if (!categoryPage.includes(`src="../../assets/images/services/${slug}.png"`)) fail(`Category page does not render its matching image: ${slug}`);
  }
  for (const item of catalog.canonicalServices) {
    const detailPage = fs.readFileSync(path.join(root, item.url, 'index.html'), 'utf8');
    const expectedImage = `src="../../../assets/images/services/${item.category}.png"`;
    if (!detailPage.includes(expectedImage)) fail(`Service detail does not reuse its category image: ${item.url}`);
    const expectedAlt = `alt="${item.title.replaceAll('&', '&amp;')} service context within`;
    if (!detailPage.includes(expectedAlt)) fail(`Service detail image alt is not service-specific: ${item.url}`);
  }
}

const faq = fs.readFileSync(path.join(root, 'faq/index.html'), 'utf8');
if ((faq.match(/<details>/g) || []).length !== 36) fail('FAQ page does not contain all 36 content-pack questions');
const guidePages = htmlFiles.filter((file) => rel(file).startsWith('guides/') && rel(file) !== 'guides/index.html');
if (guidePages.length !== 8) fail(`Expected 8 guide detail pages, found ${guidePages.length}`);
const oldGuideSentence = 'This guide is general information only. It cannot assess a site, diagnose a hazard or replace advice from an appropriately qualified local professional.';
const newGuideSentence = 'This guide is for general reference only. Actual conditions vary. Contact Ellis Services Group to arrange an on-site assessment by the appropriate trade professional.';
const allGuideSource = guidePages.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
if (allGuideSource.split(oldGuideSentence).length - 1 !== 0) fail('Old guide scope sentence remains in guide pages');
if (allGuideSource.split(newGuideSentence).length - 1 !== 8) fail('New on-site assessment guide sentence must appear on all 8 guide pages');

for (const asset of ['ellis-services-group-logo.png','hero-homepage-v2.png','icon-electrician.png','icon-plumber.png','icon-air-conditioning.png','icon-handyman.png','icon-roofing.png','icon-lawn-mowing.png','icon-house-painting.png','icon-bathroom.png','support-service-network.png','support-property-manager.png','support-guides-advice.png']) {
  if (!fs.existsSync(path.join(root, 'assets/images', asset))) fail(`Missing image asset: ${asset}`);
}

const supportPlacements = [
  ['index.html', 'support-property-manager.png'],
  ['services/index.html', 'support-service-network.png'],
  ['guides/index.html', 'support-guides-advice.png'],
];
for (const [page, asset] of supportPlacements) {
  const source = fs.readFileSync(path.join(root, page), 'utf8');
  const imagePattern = new RegExp(`<img[^>]+${asset.replace('.', '\\.')}[^>]+width="1672"[^>]+height="941"`);
  if (!imagePattern.test(source)) fail(`${page} lacks fixed dimensions for ${asset}`);
}

const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
if (!robots.includes('Allow: /') || robots.includes('Disallow: /')) fail('robots.txt must allow production crawling');
if (!robots.includes(`Sitemap: ${productionOrigin}sitemap.xml`)) fail('robots.txt lacks the production sitemap URL');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
if (sitemap.includes('https://www.ellisservices.example/') || !sitemap.includes(`<loc>${productionOrigin}`)) fail('sitemap.xml does not consistently use the production domain');

notes.push(`HTML pages: ${htmlFiles.length}`);
notes.push(`Unique titles: ${titles.size}`);
notes.push(`Unique descriptions: ${descriptions.size}`);
notes.push(`Local references checked: ${checkedLinks}`);
notes.push(`Valid JSON-LD blocks: ${jsonLdBlocks}`);
notes.push(`Guide detail pages: ${guidePages.length}`);
notes.push('FAQ entries: 36');

console.log(notes.join('\n'));
if (failures.length) {
  console.error('\nFAILURES\n' + failures.join('\n'));
  process.exit(1);
}
console.log('\nSITE CHECK PASSED');
