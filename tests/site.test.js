const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = global;
require('../data/search-catalog.js');

const {
  resolveServiceSearch,
  validateContact,
  mergeContactHref,
  buildContactPrefill,
} = require('../assets/js/site.js');

test('routes approved core-service queries to the correct detail with location preserved', () => {
  assert.deepEqual(resolveServiceSearch('  handyman  ', '6000'), {
    route: 'services/handyman-interiors-appliance-repairs/handymen/',
    service: 'Handyman, interiors & appliance repairs',
    query: 'handyman',
    postcode: '6000',
    matched: true,
  });
  assert.deepEqual(resolveServiceSearch('carpentry', 'Perth'), {
    route: 'services/handyman-interiors-appliance-repairs/carpenters/',
    service: 'Handyman, interiors & appliance repairs',
    query: 'carpentry',
    postcode: 'Perth',
    matched: true,
  });
  assert.deepEqual(resolveServiceSearch('flyscreen repair', '6050'), {
    route: 'services/doors-windows-glass-screens/fly-screens/',
    service: 'Doors, windows, glass & screens',
    query: 'flyscreen repair',
    postcode: '6050',
    matched: true,
  });
});

test('routes merged canonical display names selected from suggestions to their detail pages', () => {
  assert.deepEqual(resolveServiceSearch('Gutter Services', '3000'), {
    route: 'services/roofing-gutters-exterior/gutter-services/',
    service: 'Roofing, gutters & exterior',
    query: 'Gutter Services',
    postcode: '3000',
    matched: true,
  });
  assert.deepEqual(resolveServiceSearch('Door Installation', 'Perth'), {
    route: 'services/doors-windows-glass-screens/door-installation/',
    service: 'Doors, windows, glass & screens',
    query: 'Door Installation',
    postcode: 'Perth',
    matched: true,
  });
});

test('generated service catalog covers all 75 source labels through 67 canonical pages', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/service-catalog.json'), 'utf8'));
  assert.equal(catalog.rawServices.length, 75);
  assert.equal(new Set(catalog.rawServices.map((item) => item.label)).size, 75);
  assert.equal(catalog.canonicalServices.length, 67);
  assert.equal(new Set(catalog.canonicalServices.map((item) => item.url)).size, 67);
  for (const item of catalog.rawServices) assert.ok(fs.existsSync(path.join(__dirname, '..', item.url, 'index.html')), item.label);
});

test('search catalog contains only the approved 15 core services', () => {
  const policy = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/indexing-policy.json'), 'utf8'));
  assert.equal(window.ELLIS_SEARCH_CATALOG.length, 15);
  assert.deepEqual(
    new Set(window.ELLIS_SEARCH_CATALOG.map((item) => item.route)),
    new Set(policy.indexableServiceRoutes),
  );
  for (const item of window.ELLIS_SEARCH_CATALOG) {
    const actual = resolveServiceSearch(item.terms[0], '6000');
    assert.equal(actual.route, item.route, item.service);
    assert.equal(actual.postcode, '6000', item.service);
  }
  assert.equal(resolveServiceSearch('sparky', '6000').matched, false);
  assert.equal(resolveServiceSearch('roofing', '6000').matched, false);
});

test('canonical detail content has no exact summary or common-task-group reuse', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/service-catalog.json'), 'utf8'));
  const summaries = catalog.canonicalServices.map((item) => item.summary.trim().toLowerCase());
  const taskGroups = catalog.canonicalServices.map((item) => (item.commonTasks || []).map((tag) => tag.trim().toLowerCase()).join('|'));
  const tellGroups = catalog.canonicalServices.map((item) => (item.customerInfo || []).map((line) => line.trim().toLowerCase()).join('|'));
  assert.equal(new Set(summaries).size, 67, 'exact duplicate summaries remain');
  assert.equal(new Set(taskGroups).size, 67, 'exact duplicate common-task groups remain');
  assert.equal(new Set(tellGroups).size, 67, 'exact duplicate what-to-tell groups remain');
  assert.ok(catalog.canonicalServices.every((item) => item.commonTasks.length === 3 && item.customerInfo.length === 3));
});

test('ships the reviewed 67-service content in the public catalog and rendered pages', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/service-catalog.json'), 'utf8')).canonicalServices;
  assert.equal(catalog.length, 67);
  for (const item of catalog) {
    assert.equal(item.commonTasks.length, 3, `${item.slug} commonTasks`);
    assert.equal(item.customerInfo.length, 3, `${item.slug} customerInfo`);
    for (const field of ['summary', 'safetyNote', 'nextStep']) assert.equal(typeof item[field], 'string', `${item.slug} ${field}`);
    const page = fs.readFileSync(path.join(__dirname, '..', item.url, 'index.html'), 'utf8');
    for (const text of [item.summary, ...item.commonTasks, ...item.customerInfo, item.safetyNote, item.nextStep]) assert.ok(page.includes(text.replaceAll('&', '&amp;')), `${item.slug} visible: ${text}`);
  }
});

test('reviewed service content has no duplicate leaves or retired template language', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/service-catalog.json'), 'utf8')).canonicalServices;
  const scalarFields = ['summary', 'safetyNote', 'nextStep'];
  assert.ok(catalog.every((item) => scalarFields.every((field) => typeof item[field] === 'string') && ['commonTasks', 'customerInfo'].every((field) => Array.isArray(item[field]))), 'reviewed leaf fields are missing');
  for (const field of scalarFields) {
    const values = catalog.map((item) => item[field].trim().toLowerCase());
    assert.equal(new Set(values).size, 67, `${field} exact duplicates`);
  }
  for (const field of ['commonTasks', 'customerInfo']) {
    const values = catalog.flatMap((item) => item[field].map((value) => value.trim().toLowerCase()));
    assert.equal(new Set(values).size, 201, `${field} leaf exact duplicates`);
  }
  const allLeafText = catalog.flatMap((item) => [item.summary, ...item.commonTasks, ...item.customerInfo, item.safetyNote, item.nextStep]).join('\n').toLowerCase();
  for (const retired of ['mowing & tidy-up', 'whether switchboards is', 'whether access controls is', 'review the property for']) assert.equal(allLeafText.includes(retired), false, retired);
  assert.equal(catalog.some((item) => /^plan /i.test(item.commonTasks[1] || '') && /^coordinate /i.test(item.commonTasks[2] || '')), false, 'generic Review/Plan/Coordinate task sequence');
});

test('routes an unknown non-empty service query to contact while preserving inputs', () => {
  assert.deepEqual(resolveServiceSearch('solar battery tuning', '2060'), {
    route: 'contact/',
    service: '',
    query: 'solar battery tuning',
    postcode: '2060',
    matched: false,
  });
});

test('rejects missing contact fields, phone and malformed email without sending anything', () => {
  assert.deepEqual(validateContact({ name: '', email: 'not-an-email', phone: '', service: '', message: '' }), {
    valid: false,
    errors: {
      name: 'Enter your name.',
      email: 'Enter a valid email address.',
      phone: 'Enter a phone number.',
      service: 'Choose a service area.',
      message: 'Tell us what you need help with.',
    },
  });
});

test('accepts a complete local enquiry check', () => {
  assert.deepEqual(validateContact({
    name: 'Alex Morgan',
    email: 'alex@example.com',
    phone: '0400 000 000',
    service: 'Roofing, gutters & exterior',
    message: 'Please inspect a leaking gutter near the rear deck.',
  }), { valid: true, errors: {} });
});

test('preserves the known search query and location when continuing from a service page', () => {
  assert.equal(
    mergeContactHref('../../contact/index.html?service=Electrical%2C+plumbing%2C+gas+%26+air+conditioning', '?q=sparky&postcode=2000'),
    '../../contact/index.html?service=Electrical%2C+plumbing%2C+gas+%26+air+conditioning&q=sparky&postcode=2000',
  );
});

test('builds local contact prefills from unknown query and suburb parameters', () => {
  assert.deepEqual(buildContactPrefill('?q=solar+battery+tuning&suburb=North+Sydney'), {
    service: '',
    location: 'North Sydney',
    message: 'Service request: solar battery tuning',
  });
});

test('builds local contact prefills from canonical service and postcode parameters', () => {
  assert.deepEqual(buildContactPrefill('?service=Roofing%2C+gutters+%26+exterior&q=roofer&postcode=4000'), {
    service: 'Roofing, gutters & exterior',
    location: '4000',
    message: 'Service request: roofer',
  });
});

test('ships the PHM GA4 measurement on every customer-facing HTML page', () => {
  const customerPages = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === '.superpowers' || entry.name === 'node_modules') continue;
        walk(target);
      }
      if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'google28003a8fb6bb282a.html') customerPages.push(target);
    }
  };
  walk(path.join(__dirname, '..'));
  assert.equal(customerPages.length, 98, 'customer-facing page inventory changed unexpectedly');
  for (const page of customerPages) {
    const html = fs.readFileSync(page, 'utf8');
    assert.match(html, /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-QDLBD5EN3B/, page);
    assert.equal((html.match(/gtag\('config','G-QDLBD5EN3B'\)/g) || []).length, 1, page);
  }
  const verification = fs.readFileSync(path.join(__dirname, '../google28003a8fb6bb282a.html'), 'utf8');
  assert.doesNotMatch(verification, /G-QDLBD5EN3B/);
});

test('uses the company favicon on every customer-facing HTML page', () => {
  const root = path.join(__dirname, '..');
  const customerPages = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === '.superpowers' || entry.name === 'node_modules') continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'google28003a8fb6bb282a.html') customerPages.push(target);
    }
  };
  walk(root);
  assert.ok(customerPages.length > 0);
  for (const page of customerPages) {
    const html = fs.readFileSync(page, 'utf8');
    const faviconPath = path.relative(path.dirname(page), path.join(root, 'assets/images/favicon-32.png')).replace(/\\/g, '/');
    assert.ok(html.includes(`<link rel="icon" href="${faviconPath}">`), path.relative(root, page));
    assert.doesNotMatch(html, /<link rel="icon" href="data:,">/, path.relative(root, page));
  }
});

test('places an OpenStreetMap office map below the homepage call to action with a Google Maps fallback link', () => {
  const home = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const ctaEnd = home.indexOf('</section>', home.indexOf('<section class="cta-band">'));
  const officeStart = home.indexOf('<section class="office-location"');

  assert.ok(officeStart > ctaEnd, 'office location follows the homepage call to action');
  assert.match(home, /<h2[^>]*>Visit our Perth office<\/h2>/);
  assert.match(home, /140 St Georges Terrace<br>Perth WA 6000/);
  assert.match(home, /<iframe[^>]+title="Map showing the Ellis Services Group Perth office"[^>]+src="https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?bbox=/);
  assert.doesNotMatch(home, /<iframe[^>]+src="https:\/\/www\.google\.com\/maps/);
  assert.match(home, /href="https:\/\/www\.google\.com\/maps\/place\/140\+St\+Georges\+Terrace/);
  assert.match(home, /target="_blank"[^>]*>Open in Google Maps/);
});

test('exposes the Ellis Services Group Instagram profile from the homepage footer', () => {
  const home = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '../assets/css/global.css'), 'utf8');
  assert.match(home, /<div class="footer-social-links">/);
  assert.match(home, /<a class="footer-instagram" href="https:\/\/www\.instagram\.com\/elliservices_group\/" target="_blank" rel="noopener noreferrer" aria-label="Follow Ellis Services Group on Instagram" style="display:inline-flex;flex-direction:row;align-items:center;gap:6px">/);
  assert.match(home, /<img src="\.\/assets\/images\/instagram-icon\.png" alt="" width="18" height="18">/);
  assert.match(home, /<span>Instagram<\/span>/);
  assert.match(styles, /\.site-footer \.footer-social-links\{display:flex/);
  assert.match(styles, /\.site-footer \.footer-instagram\{display:inline-flex/);
  assert.doesNotMatch(home, /<a class="footer-instagram"[^>]*>\s*<svg/);
});

test('keeps all service pages live while focusing indexation, sitemap and homepage promotion on the approved core', () => {
  const policy = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/indexing-policy.json'), 'utf8'));
  const root = path.join(__dirname, '..');
  const leafRoutes = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      if (entry.isFile() && entry.name === 'index.html') {
        const route = `${path.relative(root, path.dirname(target)).split(path.sep).join('/')}/`;
        if (route.split('/').filter(Boolean).length === 3 && route.startsWith('services/')) leafRoutes.push(route);
      }
    }
  };
  walk(path.join(root, 'services'));
  assert.equal(leafRoutes.length, 67, 'existing service URLs must remain live');
  assert.equal(policy.indexableServiceRoutes.length, 15);
  assert.equal(policy.indexableSitemapRoutes.length + policy.indexableServiceRoutes.length, 42);

  const indexable = new Set(policy.indexableServiceRoutes);
  for (const route of leafRoutes) {
    const html = fs.readFileSync(path.join(root, route, 'index.html'), 'utf8');
    if (indexable.has(route)) assert.match(html, /<meta name="robots" content="index,follow">/);
    else assert.match(html, /<meta name="robots" content="noindex,follow">/);
  }

  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.equal((sitemap.match(/<loc>/g) || []).length, 42);
  for (const route of policy.indexableServiceRoutes) assert.match(sitemap, new RegExp(`https://www\\.perthhandymate\\.com\\.au/${route}`));
  for (const route of leafRoutes.filter((route) => !indexable.has(route))) assert.doesNotMatch(sitemap, new RegExp(`https://www\\.perthhandymate\\.com\\.au/${route}`));

  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const popular = home.slice(home.indexOf('<div class="card-grid popular-grid">'), home.indexOf('<p class="section-action">'));
  assert.equal((popular.match(/class="service-card popular-card"/g) || []).length, 8);
  for (const route of policy.homepagePromotionRoutes) assert.match(popular, new RegExp(`href="\\./${route}index\\.html"`));
  for (const retiredRoute of [
    'services/electrical-plumbing-gas-air-conditioning/electricians/',
    'services/electrical-plumbing-gas-air-conditioning/plumbers/',
    'services/electrical-plumbing-gas-air-conditioning/air-conditioning/',
    'services/roofing-gutters-exterior/roofing/',
    'services/gardens-landscaping/lawn-mowing/',
    'services/building-renovation-structural/bathroom/',
  ]) assert.doesNotMatch(popular, new RegExp(`href="\\./${retiredRoute}index\\.html"`));
});
