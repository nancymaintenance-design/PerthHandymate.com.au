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

test('prioritises Perth service intent on the five primary SEO landing pages', () => {
  const pages = [
    ['services/handyman-interiors-appliance-repairs/handymen/index.html', 'Handyman Services Perth | Repairs & Property Maintenance | Ellis Services Group', 'Handyman Services in Perth', 'Handyman services in Perth for minor repairs, maintenance, assembly and property fixes. Share your task and location with Ellis Services Group.'],
    ['services/handyman-interiors-appliance-repairs/carpenters/index.html', 'Carpentry Services Perth | Repairs, Doors & Joinery | Ellis Services Group', 'Carpentry Services in Perth', 'Carpentry services in Perth for timber repairs, doors, trim, fitted storage and scoped home improvements. Start your enquiry with Ellis Services Group.'],
    ['services/roofing-gutters-exterior/gutter-services/index.html', 'Gutter Cleaning & Repairs Perth | Ellis Services Group', 'Gutter Cleaning & Repairs in Perth', 'Gutter cleaning and repair services in Perth for blocked, leaking or damaged gutters and downpipes. Share your property details with Ellis Services Group.'],
    ['services/doors-windows-glass-screens/door-installation/index.html', 'Door Installation Perth | Internal & External Doors | Ellis Services Group', 'Door Installation in Perth', 'Door installation services in Perth for internal and external doors, frames, hardware and adjustments. Share your door requirements with Ellis Services Group.'],
    ['services/handyman-interiors-appliance-repairs/ikea-kitchens/index.html', 'IKEA Kitchen Installation Perth | Ellis Services Group', 'IKEA Kitchen Installation in Perth', 'IKEA kitchen installation services in Perth for confirmed modular kitchen plans, cabinet assembly and fitting coordination. Contact Ellis Services Group.'],
  ];

  for (const [file, title, h1, description] of pages) {
    const page = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(page.includes(`<title>${title}</title>`), `${file} title`);
    assert.ok(page.includes(`<h1>${h1}</h1>`), `${file} H1`);
    assert.ok(page.includes(`<meta name="description" content="${description}">`), `${file} description`);
  }
});

test('uses a search-led Perth handyman question on the services index', () => {
  const services = fs.readFileSync(path.join(__dirname, '../services/index.html'), 'utf8');
  assert.match(services, /<title>Find a Reliable Handyman in Perth \| Property Maintenance Services \| Ellis Services Group<\/title>/);
  assert.match(services, /<h1>How do I find a reliable handyman in Perth\?<\/h1>/);
  assert.match(services, /Looking for a reliable handyman in Perth\?/);
  assert.doesNotMatch(services, /Property work, organised around how people ask for help/);
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

test('prefills contact from a selected regional service project', () => {
  assert.deepEqual(buildContactPrefill('?service=Electrical%2C+plumbing%2C+gas+%26+air+conditioning&location=Perth+CBD+%26+Inner+Suburbs&q=Essential+systems'), {
    service: 'Electrical, plumbing, gas & air conditioning',
    location: 'Perth CBD & Inner Suburbs',
    message: 'Service request: Essential systems',
  });
});

test('ships the PHM GA4 measurement on every customer-facing HTML page', () => {
  const customerPages = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === '.superpowers' || entry.name === '.worktrees' || entry.name === 'node_modules') continue;
        walk(target);
      }
      if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'google28003a8fb6bb282a.html') customerPages.push(target);
    }
  };
  walk(path.join(__dirname, '..'));
  assert.equal(customerPages.length, 109, 'customer-facing page inventory changed unexpectedly');
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
      if (entry.name === '.git' || entry.name === '.superpowers' || entry.name === '.worktrees' || entry.name === 'node_modules') continue;
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
  assert.match(home, /<img src="\.\/assets\/images\/instagram-icon\.png" alt="" width="18" height="18"(?: loading="lazy" decoding="async")?>/);
  assert.match(home, /<span>Instagram<\/span>/);
  assert.match(styles, /\.site-footer \.footer-social-links\{display:flex/);
  assert.match(styles, /\.site-footer \.footer-instagram\{display:inline-flex/);
  assert.doesNotMatch(home, /<a class="footer-instagram"[^>]*>\s*<svg/);
});

test('publishes company registration identifiers with the official ABR lookup', () => {
  const about = fs.readFileSync(path.join(__dirname, '../about/index.html'), 'utf8');
  assert.match(about, /<title>About Ellis Services Group \| Perth Property Services<\/title>/);
  assert.match(about, /<link rel="canonical" href="https:\/\/www\.perthhandymate\.com\.au\/about\/">/);
  assert.match(about, /<h1>About Ellis Services Group<\/h1>/);
  assert.match(about, /140 St Georges Terrace, Perth WA 6000/);
  assert.match(about, /href="tel:\+61403069685"/);
  assert.match(about, /mailto:handyman\.maintenance\.au@outlook\.com/);
  assert.match(about, /<h3>Company Registration<\/h3>/);
  assert.match(about, /<strong>ABN<\/strong><br>96 645 821 745/);
  assert.match(about, /<strong>ACN<\/strong><br>645 821 745/);
  assert.match(about, /href="https:\/\/abr\.business\.gov\.au\/ABN\/View\?id=645821745"[\s\S]*?>View our ABR record/);
  assert.doesNotMatch(about, /insured|insurance policy|licen[cs]e number|policy limit/i);
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
  assert.equal(policy.indexableSitemapRoutes.length + policy.indexableServiceRoutes.length + 8, 50);

  const indexable = new Set(policy.indexableServiceRoutes);
  for (const route of leafRoutes) {
    const html = fs.readFileSync(path.join(root, route, 'index.html'), 'utf8');
    if (indexable.has(route)) assert.match(html, /<meta name="robots" content="index,follow">/);
    else assert.match(html, /<meta name="robots" content="noindex,follow">/);
  }

  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.equal((sitemap.match(/<loc>/g) || []).length, 53);
  assert.match(sitemap, /https:\/\/www\.perthhandymate\.com\.au\/projects\/roof-and-gutter-maintenance\//);
  assert.match(sitemap, /https:\/\/www\.perthhandymate\.com\.au\/projects\/exterior-timber-window-door-repair\//);
  assert.match(sitemap, /https:\/\/www\.perthhandymate\.com\.au\/projects\/bathroom-tile-shower-repair\//);
  assert.match(sitemap, /https:\/\/www\.perthhandymate\.com\.au\/projects\/garden-clean-up\//);
  assert.match(sitemap, /https:\/\/www\.perthhandymate\.com\.au\/projects\/interior-wall-repair-painting\//);
  assert.match(sitemap, /https:\/\/www\.perthhandymate\.com\.au\/projects\/sliding-door-flyscreen-repair\//);
  assert.match(sitemap, /https:\/\/www\.perthhandymate\.com\.au\/projects\/timber-fence-repair\//);
  assert.match(sitemap, /https:\/\/www\.perthhandymate\.com\.au\/projects\/decking-refinishing-maintenance\//);
  assert.match(sitemap, /https:\/\/www\.perthhandymate\.com\.au\/projects\/door-lock-replacement-installation\//);
  assert.match(sitemap, /https:\/\/www\.perthhandymate\.com\.au\/projects\/kitchen-cabinet-hinge-repair\//);
  for (const route of policy.indexableServiceRoutes) assert.match(sitemap, new RegExp(`https://www\\.perthhandymate\\.com\\.au/${route}`));
  for (const route of leafRoutes.filter((route) => !indexable.has(route))) assert.doesNotMatch(sitemap, new RegExp(`https://www\\.perthhandymate\\.com\\.au/${route}`));

  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const popular = home.slice(home.indexOf('<div class="card-grid popular-grid">'), home.indexOf('<p class="section-action">'));
  assert.equal((popular.match(/class="service-card popular-card"/g) || []).length, 8);
  for (const [route, icon] of [
    ['services/handyman-interiors-appliance-repairs/handymen/', 'icon-handyman.png'],
    ['services/handyman-interiors-appliance-repairs/carpenters/', 'icon-carpentry.png'],
    ['services/doors-windows-glass-screens/door-installation/', 'icon-bathroom.png'],
    ['services/doors-windows-glass-screens/fly-screens/', 'icon-fly-screen-repairs.png'],
    ['services/doors-windows-glass-screens/window-repairs/', 'icon-window-repairs.png'],
    ['services/handyman-interiors-appliance-repairs/tiling/', 'icon-tiling.png'],
    ['services/roofing-gutters-exterior/house-painters/', 'icon-house-painting.png'],
    ['services/gardens-landscaping/garden-clean-up/', 'icon-lawn-mowing.png'],
  ]) {
    assert.ok(fs.existsSync(path.join(root, 'assets/images', icon)), `missing ${icon}`);
    assert.match(
      popular,
      new RegExp(`<article class="service-card popular-card"><img src="\\./assets/images/${icon}"[^>]*>[\\s\\S]*?href="\\./${route}index\\.html"`),
      route,
    );
  }
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

test('publishes the roof and gutter maintenance case study from the homepage', () => {
  const root = path.join(__dirname, '..');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const caseStudy = fs.readFileSync(path.join(root, 'projects/roof-and-gutter-maintenance/index.html'), 'utf8');

  assert.match(home, /href="\.\/projects\/roof-and-gutter-maintenance\/index\.html"/);
  assert.match(home, /Gutter cleaning &amp; roofline maintenance/);
  assert.ok(caseStudy.includes('<h1>Gutter cleaning &amp; roofline maintenance</h1>'));
  assert.match(caseStudy, /blocked gutter cleaning/);
  assert.match(caseStudy, /services\/roofing-gutters-exterior\/index\.html/);
  assert.match(caseStudy, /contact\/index\.html\?service=Roofing%2C%20gutters%20%26%20exterior/);

  for (const asset of ['roof-gutter-before.png', 'roof-gutter-during.png', 'roof-gutter-completed.png', 'roof-gutter-detail.png']) {
    const image = fs.readFileSync(path.join(root, 'assets/images/projects', asset));
    assert.ok(image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `${asset} must be a PNG`);
  }
});

test('publishes the exterior timber window and door repair case study from the homepage', () => {
  const root = path.join(__dirname, '..');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const caseStudy = fs.readFileSync(path.join(root, 'projects/exterior-timber-window-door-repair/index.html'), 'utf8');

  assert.match(home, /href="\.\/projects\/exterior-timber-window-door-repair\/index\.html"/);
  assert.match(home, /Sticking timber window &amp; exterior door repair/);
  assert.ok(caseStudy.includes('<h1>Sticking timber window &amp; exterior door repair</h1>'));
  assert.match(caseStudy, /sticking timber window/);
  assert.match(caseStudy, /services\/handyman-interiors-appliance-repairs\/carpenters\/index\.html/);

  for (const asset of ['timber-repair-before.png', 'timber-repair-damage.png', 'timber-repair-during.png', 'timber-repair-completed.png']) {
    const image = fs.readFileSync(path.join(root, 'assets/images/projects', asset));
    assert.ok(image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `${asset} must be a PNG`);
  }
});

test('publishes the bathroom tile and shower area repair case study from the homepage', () => {
  const root = path.join(__dirname, '..');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const caseStudy = fs.readFileSync(path.join(root, 'projects/bathroom-tile-shower-repair/index.html'), 'utf8');

  assert.match(home, /href="\.\/projects\/bathroom-tile-shower-repair\/index\.html"/);
  assert.match(home, /Shower resealing &amp; tile grout repair/);
  assert.ok(caseStudy.includes('<h1>Shower resealing &amp; tile grout repair</h1>'));
  assert.match(caseStudy, /split shower silicone/);
  assert.match(caseStudy, /services\/handyman-interiors-appliance-repairs\/tiling\/index\.html/);

  for (const asset of ['bathroom-repair-before.png', 'bathroom-repair-damage.png', 'bathroom-repair-during.png', 'bathroom-repair-completed.png']) {
    const image = fs.readFileSync(path.join(root, 'assets/images/projects', asset));
    assert.ok(image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `${asset} must be a PNG`);
  }
});

test('publishes the garden clean-up case study from the homepage', () => {
  const root = path.join(__dirname, '..');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const caseStudy = fs.readFileSync(path.join(root, 'projects/garden-clean-up/index.html'), 'utf8');

  assert.match(home, /href="\.\/projects\/garden-clean-up\/index\.html"/);
  assert.match(home, /Garden clean-up &amp; maintenance odd jobs/);
  assert.ok(caseStudy.includes('<h1>Garden clean-up &amp; maintenance odd jobs</h1>'));
  assert.match(caseStudy, /garden maintenance odd jobs/);
  assert.match(caseStudy, /services\/gardens-landscaping\/garden-clean-up\/index\.html/);

  for (const asset of ['garden-clean-up-before.png', 'garden-clean-up-detail.png', 'garden-clean-up-during.png', 'garden-clean-up-completed.png']) {
    const image = fs.readFileSync(path.join(root, 'assets/images/projects', asset));
    assert.ok(image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `${asset} must be a PNG`);
  }
});

test('publishes the interior wall repair and painting case study from the homepage', () => {
  const root = path.join(__dirname, '..');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const caseStudy = fs.readFileSync(path.join(root, 'projects/interior-wall-repair-painting/index.html'), 'utf8');

  assert.match(home, /href="\.\/projects\/interior-wall-repair-painting\/index\.html"/);
  assert.match(home, /Interior wall repair &amp; painting touch-ups/);
  assert.ok(caseStudy.includes('<h1>Interior wall repair &amp; painting touch-ups</h1>'));
  assert.match(caseStudy, /painting touch-ups/);
  assert.match(caseStudy, /services\/roofing-gutters-exterior\/house-painters\/index\.html/);

  for (const asset of ['interior-wall-before.jpg', 'interior-wall-detail.jpg', 'interior-wall-during.jpg', 'interior-wall-completed.jpg']) {
    const image = fs.readFileSync(path.join(root, 'assets/images/projects', asset));
    assert.ok(image.subarray(0, 3).equals(Buffer.from([255,216,255])), `${asset} must be a JPEG`);
  }
});

test('publishes the sliding door flyscreen repair case study from the homepage', () => {
  const root = path.join(__dirname, '..');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const caseStudy = fs.readFileSync(path.join(root, 'projects/sliding-door-flyscreen-repair/index.html'), 'utf8');

  assert.match(home, /href="\.\/projects\/sliding-door-flyscreen-repair\/index\.html"/);
  assert.match(home, /Torn flyscreen mesh repair &amp; remeshing/);
  assert.ok(caseStudy.includes('<h1>Torn flyscreen mesh repair &amp; remeshing</h1>'));
  assert.match(caseStudy, /torn flyscreen mesh/);
  assert.match(caseStudy, /services\/doors-windows-glass-screens\/fly-screens\/index\.html/);

  for (const asset of ['flyscreen-before.jpg', 'flyscreen-detail.jpg', 'flyscreen-during.jpg', 'flyscreen-completed.jpg']) {
    const image = fs.readFileSync(path.join(root, 'assets/images/projects', asset));
    assert.ok(image.subarray(0, 3).equals(Buffer.from([255,216,255])), `${asset} must be a JPEG`);
  }
});

test('publishes the timber fence repair case study from the homepage', () => {
  const root = path.join(__dirname, '..');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const caseStudy = fs.readFileSync(path.join(root, 'projects/timber-fence-repair/index.html'), 'utf8');
  assert.match(home, /href="\.\/projects\/timber-fence-repair\/index\.html"/);
  assert.match(home, /Damaged timber fence panel &amp; post repair/);
  assert.ok(caseStudy.includes('<h1>Damaged timber fence panel &amp; post repair</h1>'));
  assert.match(caseStudy, /damaged fence panel/);
  assert.match(caseStudy, /services\/outdoor-structures-fencing-pools\/fence-builders\/index\.html/);
  for (const asset of ['fence-before.jpg', 'fence-detail.jpg', 'fence-during.jpg', 'fence-completed.jpg']) {
    const image = fs.readFileSync(path.join(root, 'assets/images/projects', asset));
    assert.ok(image.subarray(0, 3).equals(Buffer.from([255,216,255])), `${asset} must be a JPEG`);
  }
});
test('publishes decking refinishing and maintenance examples without presenting separate photos as one project sequence', () => {
  const root = path.join(__dirname, '..');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const page = fs.readFileSync(path.join(root, 'projects/decking-refinishing-maintenance/index.html'), 'utf8');

  assert.match(home, /href="\.\/projects\/decking-refinishing-maintenance\/index\.html"/);
  assert.match(home, /Deck timber maintenance &amp; refinishing/);
  assert.ok(page.includes('<h1>Deck timber maintenance &amp; refinishing</h1>'));
  assert.match(page, /These images are examples, not a single before-and-after project sequence\./);
  assert.match(page, /services\/outdoor-structures-fencing-pools\/deck-builders\/index\.html/);

  for (const asset of ['decking-preparation.jpg', 'decking-coating.jpg', 'decking-finished-entry.jpg', 'decking-finished-outdoor.jpg']) {
    const image = fs.readFileSync(path.join(root, 'assets/images/projects', asset));
    assert.ok(image.subarray(0, 3).equals(Buffer.from([255, 216, 255])), `${asset} must be a JPEG`);
  }
});

test('publishes the door lock replacement and smart lock installation example from the homepage', () => {
  const root = path.join(__dirname, '..');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const page = fs.readFileSync(path.join(root, 'projects/door-lock-replacement-installation/index.html'), 'utf8');

  assert.match(home, /href="\.\/projects\/door-lock-replacement-installation\/index\.html"/);
  assert.ok(page.includes('<h1>Door hardware replacement &amp; smart lock fitting</h1>'));
  assert.match(page, /Door hardware replacement and smart lock fitting example/);
  assert.doesNotMatch(page, /Samsung/);
  assert.match(page, /services\/doors-windows-glass-screens\/door-installation\/index\.html/);

  for (const asset of ['door-lock-removed.jpg', 'door-lock-hardware.jpg', 'door-smart-lock-installed.jpg', 'door-lock-completed.jpg']) {
    const image = fs.readFileSync(path.join(root, 'assets/images/projects', asset));
    assert.ok(image.subarray(0, 3).equals(Buffer.from([255, 216, 255])), `${asset} must be a JPEG`);
  }
});

test('publishes the kitchen cabinet hinge repair case study from the homepage', () => {
  const root = path.join(__dirname, '..');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const page = fs.readFileSync(path.join(root, 'projects/kitchen-cabinet-hinge-repair/index.html'), 'utf8');

  assert.match(home, /href="\.\/projects\/kitchen-cabinet-hinge-repair\/index\.html"/);
  assert.match(home, /Cupboard hinge pulled-out repair &amp; cabinet door alignment/);
  assert.ok(page.includes('<h1>Cupboard hinge pulled-out repair &amp; cabinet door alignment</h1>'));
  assert.match(page, /cupboard hinge pulled out/);
  assert.match(page, /services\/handyman-interiors-appliance-repairs\/carpenters\/index\.html/);

  for (const asset of ['cabinet-hinge-before.jpg', 'cabinet-hinge-detail.jpg', 'cabinet-hinge-during.jpg', 'cabinet-hinge-completed.jpg']) {
    const image = fs.readFileSync(path.join(root, 'assets/images/projects', asset));
    assert.ok(image.subarray(0, 3).equals(Buffer.from([255, 216, 255])), `${asset} must be a JPEG`);
  }
});

test('uses distinct search-led case-study titles and grounded scenario copy', () => {
  const root = path.join(__dirname, '..');
  const cases = [
    ['roof-and-gutter-maintenance', 'Gutter cleaning &amp; roofline maintenance', 'blocked gutter cleaning'],
    ['exterior-timber-window-door-repair', 'Sticking timber window &amp; exterior door repair', 'sticking timber window'],
    ['bathroom-tile-shower-repair', 'Shower resealing &amp; tile grout repair', 'split shower silicone'],
    ['garden-clean-up', 'Garden clean-up &amp; maintenance odd jobs', 'garden maintenance odd jobs'],
    ['interior-wall-repair-painting', 'Interior wall repair &amp; painting touch-ups', 'painting touch-ups'],
    ['sliding-door-flyscreen-repair', 'Torn flyscreen mesh repair &amp; remeshing', 'torn flyscreen mesh'],
    ['timber-fence-repair', 'Damaged timber fence panel &amp; post repair', 'damaged fence panel'],
    ['decking-refinishing-maintenance', 'Deck timber maintenance &amp; refinishing', 'deck timber maintenance'],
    ['door-lock-replacement-installation', 'Door hardware replacement &amp; smart lock fitting', 'door hardware'],
    ['kitchen-cabinet-hinge-repair', 'Cupboard hinge pulled-out repair &amp; cabinet door alignment', 'cupboard hinge pulled out'],
  ];
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const phaseHeadings = /<h2>Before, (?:during |detail, )?(?:repair and |during and )?completed<\/h2>/i;

  assert.equal(cases.length, 10, 'the existing homepage case-study count must not grow');
  assert.equal(new Set(cases.map(([, title]) => title)).size, cases.length, 'case-study titles must be distinct');
  assert.doesNotMatch(home, phaseHeadings);

  for (const [slug, title, scenario] of cases) {
    const page = fs.readFileSync(path.join(root, 'projects', slug, 'index.html'), 'utf8');
    assert.match(home, new RegExp(`${title}[\\s\\S]{0,800}?href=\"\\.\\/projects\\/${slug}\\/index\\.html\"`));
    assert.ok(page.includes(`<h1>${title}</h1>`), `${slug} should use its search-led heading`);
    assert.match(page.toLowerCase(), new RegExp(scenario.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    assert.doesNotMatch(page, phaseHeadings);
  }
});
