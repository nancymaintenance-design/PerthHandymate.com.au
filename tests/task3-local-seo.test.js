const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createBuildFixture } = require('./helpers/local-build');
const root = path.resolve(__dirname, '..');
const read = route => fs.readFileSync(path.join(root, route === '/' ? 'index.html' : route.slice(1) + 'index.html'), 'utf8');
const main = html => html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
const links = (html, route) => [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, label]) => ({url: new URL(href.replaceAll('&amp;', '&'), 'https://www.perthhandymate.com.au' + route), label: label.replace(/<[^>]*>/g, '')}));
const region = '/areas/south-perth-canning/';
const south = '/areas/cockburn-rockingham-southern-corridor/';
const pairs = [[region, '/projects/clothesline-bracket-repair-canning/'], [south, '/projects/shelf-installation-cockburn/'], [south, '/projects/drawer-runner-replacement-southern-corridor/']];

test('Canning repair anchors select repairs separately from new installations', () => {
  const entries = links(main(read(region)), region);
  for (const [label, route] of [['door repairs', '/services/doors-windows-glass-screens/door-repairs/'], ['door installation', '/services/doors-windows-glass-screens/door-installation/'], ['cabinet repairs', '/services/handyman-interiors-appliance-repairs/cabinet-wardrobe-repairs/']]) {
    assert.ok(entries.some(link => link.label === label && link.url.pathname === route), label);
  }
});

test('confirmed regional case evidence is linked in both server-rendered bodies', () => {
  for (const [area, project] of pairs) {
    assert.ok(links(main(read(area)), area).some(link => link.url.pathname === project && /repair|shelf|drawer/i.test(link.label)), area + ': ' + project);
    assert.ok(links(main(read(project)), project).some(link => link.url.pathname === area && /Canning|Cockburn|Southern Corridor/.test(link.label)), project);
  }
});

test('content dates reflect substantive edits and visible guide dates agree with sitemap', () => {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const entries = new Map([...xml.matchAll(/<url><loc>https:\/\/www.perthhandymate.com.au([^<]*)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)].map(([, route, date]) => [route, date]));
  assert.equal(entries.size, 124);
  for (const [route, date] of [['/', '2026-10-13'], ['/services/handyman-interiors-appliance-repairs/handymen/', '2026-10-13'], ['/services/handyman-interiors-appliance-repairs/clothesline-repairs-installation/', '2026-10-13'], ['/guides/cupboard-hinges-drawer-runners-repair-guide/', '2026-10-13'], ['/guides/shower-silicone-grout-waterproofing-guide/', '2026-10-13'], [region, '2026-10-13'], [south, '2026-10-13']]) assert.equal(entries.get(route), date, route);
  assert.equal(entries.get('/areas/perth-central/'), '2026-10-08');
  assert.equal(entries.get('/areas/'), undefined);
  for (const [route, date] of entries) if (route.startsWith('/guides/') && route !== '/guides/' && date) assert.match(main(read(route)), new RegExp('Updated ' + date), route);
});

test('office reception is shown once in the footer, separate from conditional onsite service', () => {
  for (const route of ['/', '/about/', '/contact/']) {
    const visible = main(read(route)).replace(/<[^>]*>/g, ' ');
    assert.doesNotMatch(main(read(route)), /id="office-reception"/, route + ': no duplicated standalone reception block');
    assert.equal((read(route).match(/Office reception:/g) || []).length, 1, route + ': footer is the sole reception display');
    assert.match(visible, /24.hour onsite service|Available 24 hours/i, route);
    assert.match(visible, /subject to location, safe access and circumstances outside our control/i, route);
  }
});

test('every business page has all seven office days and confirmed identities without ratings', () => {
  const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(x => x.isDirectory() ? walk(path.join(dir,x.name)) : x.name.endsWith('.html') ? [path.join(dir,x.name)] : []);
  const files = ['index.html','404.html'].map(x => path.join(root,x)).concat(...['about','areas','contact','faq','guides','privacy','projects','services'].map(x => walk(path.join(root,x))));
  assert.equal(files.length, 125);
  for (const file of files) {
    const html = fs.readFileSync(file,'utf8');
    const nodes = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(([,s]) => {const b=JSON.parse(s);return b['@graph']||[b];});
    const office = nodes.find(x => x['@id'] === 'https://www.perthhandymate.com.au/#perth-office');
    assert.equal(office.openingHours, undefined, file);
    assert.deepEqual(office.openingHoursSpecification, {'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],opens:'09:00',closes:'21:00'}, file);
    for (const entity of nodes.filter(x => ['Organization','HomeAndConstructionBusiness'].includes(x['@type']))) {
      assert.ok(entity.sameAs.includes('https://www.linkedin.com/in/ellis-services-group-091541266/?isSelfProfile=false'), file);
      assert.ok(entity.sameAs.includes('https://www.facebook.com/p/Ellis-Services-Group-100082926022259/'), file);
      assert.ok(entity.sameAs.includes('https://www.instagram.com/elliservices_group/'), file);
      assert.ok(!entity.sameAs.some(x => /maps.app|share.google/.test(x)), file);
    }
    assert.match(html, /class="footer-office-hours">Office reception: Monday–Sunday, 09:00–21:00 Perth local time/);
    for (const url of ['https://maps.app.goo.gl/iqNh8cGNbaZhBuP17','https://www.linkedin.com/in/ellis-services-group-091541266/?isSelfProfile=false','https://www.facebook.com/p/Ellis-Services-Group-100082926022259/']) assert.ok(html.includes(url), file);
    assert.doesNotMatch(html, /https:\/\/share.google\//, file);
    assert.doesNotMatch(JSON.stringify(nodes), /AggregateRating|ratingValue|reviewCount/);
  }
});

test('maintained date application is idempotent and preserves sitemap membership and page content', t => {
  const fixture = createBuildFixture(t);
  const before = fs.readFileSync(path.join(fixture,'sitemap.xml'),'utf8');
  const home = fs.readFileSync(path.join(fixture,'index.html'),'utf8');
  execFileSync(process.execPath,[path.join(root,'scripts/apply-content-dates.js'),fixture]);
  const first = fs.readFileSync(path.join(fixture,'sitemap.xml'),'utf8');
  assert.deepEqual([...first.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1]), [...before.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1]));
  execFileSync(process.execPath,[path.join(root,'scripts/apply-content-dates.js'),fixture]);
  assert.equal(fs.readFileSync(path.join(fixture,'sitemap.xml'),'utf8'),first);
  assert.equal(fs.readFileSync(path.join(fixture,'index.html'),'utf8'),home);
});

test('legacy project metadata describes verified work rather than a generic photo label', () => {
  const projects = ['bathroom-tile-shower-repair','decking-refinishing-maintenance','door-lock-replacement-installation','exterior-timber-window-door-repair','garden-clean-up','interior-wall-repair-painting','kitchen-cabinet-hinge-repair','roof-and-gutter-maintenance','sliding-door-flyscreen-repair','timber-fence-repair'];
  const descriptions = projects.map(slug => read('/projects/'+slug+'/').match(/name="description" content="([^"]+)"/)[1]);
  assert.equal(new Set(descriptions).size,10);
  for (const description of descriptions) {
    assert.doesNotMatch(description,/^A photo-led|^Examples of/);
    assert.match(description,/Ellis/);
    assert.doesNotMatch(description,/free quote|guarantee/i);
  }
});

test('indexing-policy sitemap regeneration retains recorded and untouched modification dates', t => {
  const fixture = createBuildFixture(t);
  const before = fs.readFileSync(path.join(fixture, 'sitemap.xml'), 'utf8');
  const entries = xml => [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)].map(([,url,date]) => [url,date]).sort(([a],[b]) => a.localeCompare(b));
  execFileSync(process.execPath, [path.join(fixture,'scripts/apply-indexing-policy.js')], {cwd:fixture});
  assert.deepEqual(entries(fs.readFileSync(path.join(fixture,'sitemap.xml'),'utf8')), entries(before));
});
