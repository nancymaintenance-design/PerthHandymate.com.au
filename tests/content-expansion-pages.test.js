const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { inventorySite, extractPage } = require('../tools/content-seo-inventory');
const { auditPage, resolveLocalLink } = require('../tools/content-round2-acceptance');
const root = path.resolve(__dirname, '..');
const origin = 'https://www.perthhandymate.com.au';
const hm = '/services/handyman-interiors-appliance-repairs/';
const doors = '/services/doors-windows-glass-screens/';
const services = [
  [doors + 'door-repairs/', 'door repairs', 'Doors, windows, glass & screens', [/hinge/i, /latch/i, /frame/i, /locksmith/i, /fire.rated/i, /sliding/i, /replacement/i]],
  [hm + 'cabinet-wardrobe-repairs/', 'cabinet repairs', 'Handyman, interiors & appliance repairs', [/hinge/i, /runner/i, /mirrored/i, /wardrobe/i, /replacement/i]],
  [hm + 'shelving-mirror-picture-hanging/', 'shelf installation', 'Handyman, interiors & appliance repairs', [/wall/i, /load/i, /mirror/i, /picture/i, /TV/i, /electrical/i]],
  [hm + 'clothesline-repairs-installation/', 'clothesline repairs', 'Handyman, interiors & appliance repairs', [/restring/i, /bracket/i, /frame/i, /model/i, /disposal/i, /suppl/i]],
];
const projects = [
  ['clothesline-bracket-repair-canning', 'Canning', services[3][0], ['clothesline-canning-before', 'clothesline-canning-during', 'clothesline-canning-after']],
  ['shelf-installation-cockburn', 'Cockburn', services[2][0], ['shelves-cockburn-before', 'shelves-cockburn-during', 'shelves-cockburn-after']],
  ['drawer-runner-replacement-southern-corridor', 'Southern Corridor', services[1][0], ['drawer-southern-corridor-before', 'drawer-southern-corridor-after']],
];
const read = route => {
  const file = path.join(root, route === '/' ? 'index.html' : route.slice(1) + (route.endsWith('/') ? 'index.html' : ''));
  return fs.existsSync(file) && fs.statSync(file).isFile() ? fs.readFileSync(file, 'utf8') : null;
};

// Missing destinations, FAQ parity, contextual routes or task boundaries would
// prevent a visitor choosing the right scope and carrying it into an enquiry.
test('new service destinations explain task decisions with working discovery and quote prefill', () => {
  const pages = inventorySite(root);
  for (const [route, query, category, distinctions] of services) {
    const html = read(route);
    assert.ok(html, route + ': missing new service destination');
    const page = extractPage(html, route);
    assert.deepEqual(auditPage(html, route).issues, [], route);
    assert.ok(page.faqCount >= 4, route + ': practical visible and schema FAQs');
    for (const pattern of distinctions) assert.match(page.mainText, pattern, route);
    const inbound = pages.filter(p => p.path !== route && p.contextualInternalLinks.some(l => l.path === route));
    assert.ok(new Set(inbound.map(p => p.path)).size >= 3, route + ': contextual inbound pages');
    assert.ok(inbound.some(p => p.path === hm + 'handymen/'), route + ': handyman discovery');
    assert.ok(inbound.some(p => p.path.startsWith('/guides/') || p.path.startsWith('/projects/')), route + ': guide or evidence discovery');
    assert.ok(page.contextualInternalLinks.some(l => l.path.startsWith('/guides/')), route + ': supporting advice');
    const contacts = [...html.matchAll(/href="([^"]*contact\/\?[^"]*)"/g)].map(m => new URL(m[1].replaceAll('&amp;', '&'), origin + route));
    assert.ok(contacts.some(u => u.searchParams.get('service') === category && u.searchParams.get('q')), route + ': scope carried into contact');
    assert.doesNotMatch(page.mainText, /A\$\d|guaranteed|load tested|NDIS registered|washing.machine repairs|gas heater servicing|reticulation repairs/i);
  }
});

test('search sends focused tasks to their new service destination without changing original prices', () => {
  global.window = global;
  delete require.cache[require.resolve('../data/search-catalog.js')];
  require('../data/search-catalog.js');
  const api = require('../assets/js/site.js');
  for (const [route, query, category] of services) {
    const result = api.resolveServiceSearch(query, '6000');
    assert.equal('/' + result.route, route, query);
    assert.equal(result.service, category);
    const prefill = api.buildContactPrefill(`?service=${encodeURIComponent(result.service)}&q=${encodeURIComponent(query)}&postcode=6000`);
    assert.equal(prefill.location, '6000');
    assert.ok(prefill.message.includes(query));
  }
  const historic = execFileSync('git', ['show', 'cc9d2b6:data/service-catalog.json'], { cwd: root, encoding: 'utf8' });
  assert.equal(fs.readFileSync(path.join(root, 'data/service-catalog.json'), 'utf8'), historic, '67 priced services and prices remain byte-for-byte unchanged');
  assert.equal(JSON.parse(historic).canonicalServices.length, 67);
});

test('three supplied cases give scope, outcome, region and onward links without inventing proof', () => {
  const index = extractPage(read('/'), '/');
  for (const [slug, region, service, images] of projects) {
    const route = '/projects/' + slug + '/';
    const html = read(route);
    assert.ok(html, route + ': missing photographed case');
    const page = extractPage(html, route);
    assert.deepEqual(auditPage(html, route).issues, [], route);
    assert.match(page.mainText, new RegExp(region));
    const intro = html.match(/<section class="section shell project-intro">([\s\S]*?)<\/section>/)?.[1] || '';
    for (const h of ['Scope', 'Outcome']) assert.match(intro, new RegExp('<h[23]>' + h + '<\\/h[23]>\\s*<p>[^<]{35,}<\\/p>'));
    assert.ok(page.contextualInternalLinks.some(l => l.path === service));
    assert.ok(page.contextualInternalLinks.some(l => l.path.startsWith('/guides/')));
    assert.ok(index.contextualInternalLinks.some(l => l.path === route), route + ': project index discovery');
    assert.ok(extractPage(read(service), service).contextualInternalLinks.some(l => l.path === route), route + ': service evidence discovery');
    assert.match(html, /contact\/\?service=[^"]+q=/);
    const firstContact = [...html.matchAll(/href="([^"]*contact\/\?[^"]*)"/g)][0];
    const prefillQuery = new URL(firstContact[1].replaceAll('&amp;', '&'), origin + route).searchParams.get('q');
    assert.match(prefillQuery, slug.startsWith('drawer') ? /drawer.*runner/i : slug.startsWith('shelf') ? /shelf|shelv/i : /clothesline/i, route + ': quote identifies the actual task');
    assert.doesNotMatch(page.mainText, /\$\s*\d|\b(?:19|20)\d{2}\b|guarantee|load tested|new drawer boards|wardrobe replacement|five.star|completed (?:on|in)/i);
    const gallery = html.match(/<div class="project-gallery evidence-gallery">([\s\S]*?)<\/div>/)?.[1] || '';
    assert.equal([...gallery.matchAll(/<figure/g)].length, images.length);
    for (const stem of images) {
      const figure = [...gallery.matchAll(/<figure[^>]*>[\s\S]*?<\/figure>/g)].map(m => m[0]).find(f => f.includes(stem + '-1440.webp'));
      assert.ok(figure, stem + ': selected photograph present');
      const tag = figure.match(/<img\b[^>]*>/)?.[0] || '';
      assert.match(tag, /alt="[^"]{25,}"/);
      assert.match(tag, /width="1440" height="1080"/);
      assert.match(tag, /loading="lazy"/);
      assert.match(tag, /srcset="[^"]+-480\.webp 480w, [^"]+-960\.webp 960w, [^"]+-1440\.webp 1440w"/);
      assert.match(figure, /<figcaption>[\s\S]*?(?:Before|During|After)[\s\S]*?<\/figcaption>/);
      for (const width of [480, 960, 1440]) {
        const file = path.join(root, 'assets/images/projects/optimized', `${stem}-${width}.webp`);
        const data = fs.readFileSync(file);
        assert.equal(data.toString('ascii', 8, 12), 'WEBP');
        assert.ok(data.length <= 200 * 1024, file + ': image payload');
        assert.ok(!data.includes(Buffer.from('EXIF')), file + ': private EXIF stripped');
      }
    }
  }
  const drawer = read('/projects/drawer-runner-replacement-southern-corridor/');
  assert.doesNotMatch(drawer, /drawer[^"<>]*during|抽屉维修中/);
  assert.match(extractPage(drawer, '/projects/drawer-runner-replacement-southern-corridor/').mainText, /before and after|before-and-after/i);
  const css = fs.readFileSync(path.join(root, 'assets/css/global.css'), 'utf8');
  assert.match(css, /\.evidence-gallery \.project-card img\{[^}]*height:auto[^}]*aspect-ratio:auto[^}]*object-fit:contain/);
});

test('expanded 125-page inventory resolves all routes, FAQs, fragments and original term anchors', () => {
  const pages = inventorySite(root);
  assert.equal(pages.length, 125);
  const policy = require('../data/indexing-policy.json');
  for (const [route] of services) assert.ok(policy.supplementalServiceRoutes.includes(route.slice(1)));
  for (const [slug] of projects) assert.ok(policy.indexableProjectRoutes.includes('projects/' + slug + '/'));
  const issues = [];
  for (const page of pages) {
    const html = read(page.path);
    issues.push(...auditPage(html, page.path).issues.map(i => page.path + ': ' + i));
    for (const [, href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
      const issue = resolveLocalLink(href, page.path, read);
      if (issue) issues.push(page.path + ': ' + issue);
    }
  }
  const original = JSON.parse(execFileSync('git', ['show', 'cc9d2b6:docs/seo/content-round2/term-routing.json'], { cwd: root, encoding: 'utf8' }));
  const terms = require('../docs/seo/content-round2/term-routing.json');
  assert.deepEqual(terms, original);
  assert.equal(terms.length, 527);
  for (const term of terms) assert.equal(resolveLocalLink(term.primaryPath, '/', read), null, term.id);
  for (const anchor of ['cabinet-repairs', 'shelf-installation', 'sliding-door-repairs', 'clothesline-repairs']) assert.equal(resolveLocalLink(hm + 'handymen/#' + anchor, '/', read), null, anchor);
  assert.deepEqual(issues, []);
});
