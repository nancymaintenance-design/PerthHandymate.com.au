const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const facts = JSON.parse(fs.readFileSync(path.join(root, 'data/business-facts.json'), 'utf8'));
const origin = 'https://www.perthhandymate.com.au/';
const organizationId = `${origin}#organization`;
const officeId = `${origin}#perth-office`;
const sentence = "Regulated work is completed by Ellis's own appropriately licensed team.";
const identityTypes = new Set(['Organization', 'LocalBusiness', 'HomeAndConstructionBusiness']);
const scriptPattern = /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
const directories = ['about', 'areas', 'contact', 'faq', 'guides', 'privacy', 'projects', 'services'];
const regulatedPages = new Set([
  'services/electrical-plumbing-gas-air-conditioning/index.html',
  'services/electrical-plumbing-gas-air-conditioning/electricians/index.html',
  'services/electrical-plumbing-gas-air-conditioning/plumbers/index.html',
  'services/electrical-plumbing-gas-air-conditioning/gas-fitters/index.html',
  'services/electrical-plumbing-gas-air-conditioning/air-conditioning/index.html',
  'services/cleaning-removals-pest-hazard/asbestos-removal/index.html',
  'services/building-renovation-structural/index.html',
  'services/building-renovation-structural/builders/index.html',
  'services/building-renovation-structural/home-renovators/index.html',
  'services/building-renovation-structural/restumping/index.html',
  'services/building-renovation-structural/demolition/index.html',
  'services/planning-inspection-compliance/structural-engineers/index.html',
]);

function nodes(block) {
  return block['@graph'] || [block];
}

const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const existingOffice = [...homepage.matchAll(scriptPattern)]
  .flatMap(match => nodes(JSON.parse(match[1])))
  .find(node => ['LocalBusiness', 'HomeAndConstructionBusiness'].includes(node['@type']));
if (!existingOffice) throw new Error('Homepage must contain the verified Perth office facts.');
const office = { ...existingOffice, '@type': 'HomeAndConstructionBusiness', '@id': officeId,
  parentOrganization: { '@id': organizationId } };
delete office['@context'];
delete office.openingHours;
office.openingHoursSpecification = facts.openingHoursSpecification;
office.sameAs = facts.sameAs;
const organization = { '@type': 'Organization', '@id': organizationId,
  name: existingOffice.name, url: existingOffice.url, logo: existingOffice.logo };
organization.sameAs = facts.sameAs;
const graph = { '@context': 'https://schema.org', '@graph': [organization, office] };

function collect(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? collect(file) : entry.name.endsWith('.html') ? [file] : [];
  });
}

function normalizeReferences(value) {
  if (!value || typeof value !== 'object') return;
  if (value['@id'] === `${origin}#business`) value['@id'] = organizationId;
  if (value['@type'] === 'Service') {
    delete value.brand;
    value.provider = { '@id': officeId };
  }
  for (const [key, child] of Object.entries(value)) {
    if (child && identityTypes.has(child['@type']) &&
        [`${origin}#business`, organizationId, officeId].includes(child['@id'])) {
      value[key] = { '@id': child['@id'] === officeId ? officeId : organizationId };
    } else if (Array.isArray(child)) child.forEach(normalizeReferences);
    else normalizeReferences(child);
  }
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function refreshVisibleFacts(html) {
  // The existing footer retains the previous fact, so repeated updates can find
  // the matching office paragraph without touching other paragraphs in that section.
  const previous = html.match(/<p class="footer-office-hours">([^<]*)<\/p>/)?.[1];
  const schedule = escapeHtml(facts.officeReception.replace(/^Office reception:\s*/, ''));
  const previousSchedule = previous?.replace(/^Office reception:\s*/, '');
  html = html.replace(/<section\b[^>]*\bid="office-reception"[^>]*>[\s\S]*?<\/section>/g, section => {
    let refreshed = false;
    return section.replace(/(<p\b[^>]*>)([^<]*)(<\/p>)/g, (raw, open, text, close) => {
      if (refreshed || (text !== previousSchedule && text !== schedule)) return raw;
      refreshed = true;
      return open + schedule + close;
    });
  });
  const reception = escapeHtml(facts.officeReception);
  if (previous !== undefined) html = html.replace(/(<p class="footer-office-hours">)[^<]*(<\/p>)/g, (_, open, close) => open + reception + close);
  else html = html.replace(/(<p class="footer-hours">)/, (_, open) => `<p class="footer-office-hours">${reception}</p>${open}`);
  return html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, anchor => {
    const classes = anchor.match(/\bclass="([^"]*)"/)?.[1].split(/\s+/) || [];
    let href;
    if (classes.some(cls => ['hero-reviews', 'footer-google-reviews'].includes(cls)) ||
        (classes.includes('text-link') && /^Read our Google reviews(?:\s|<)/.test(anchor.slice(anchor.indexOf('>') + 1)))) href = facts.googleReviews;
    else if (classes.includes('footer-instagram')) href = facts.sameAs[0];
    else if (classes.includes('footer-linkedin')) href = facts.sameAs[1];
    else if (classes.includes('footer-facebook')) href = facts.sameAs[2];
    return href ? anchor.replace(/\bhref="[^"]*"/, () => `href="${escapeHtml(href)}"`) : anchor;
  });
}

const files = ['index.html', '404.html'].map(file => path.join(root, file))
  .filter(file => fs.existsSync(file));
for (const directory of directories) files.push(...collect(path.join(root, directory)));
let changed = 0;
for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let inserted = false;
  let html = original.replace(scriptPattern, (raw, json) => {
    const block = JSON.parse(json);
    const entries = nodes(block);
    if (entries.some(node => identityTypes.has(node['@type']))) {
      const remaining = entries.filter(node => !identityTypes.has(node['@type']));
      remaining.forEach(normalizeReferences);
      const replacement = inserted ? remaining : [...graph['@graph'], ...remaining];
      inserted = true;
      return replacement.length ? `<script type="application/ld+json">${JSON.stringify({ ...graph, '@graph': replacement })}</script>` : '';
    }
    normalizeReferences(block);
    return JSON.stringify(block) === JSON.stringify(JSON.parse(json)) ? raw
      : raw.replace(json, JSON.stringify(block));
  });
  if (!inserted) {
    if (!html.includes('</head>')) throw new Error(`Missing head: ${file}`);
    html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(graph)}</script></head>`);
  }
  html = refreshVisibleFacts(html);
  const route = path.relative(root, file).split(path.sep).join('/');
  if (regulatedPages.has(route) && !html.includes(`<p class="licensed-team-scope">${sentence}</p>`)) {
    if (!/<p class="lede">[\s\S]*?<\/p>/.test(html)) throw new Error(`Missing scope insertion point: ${file}`);
    html = html.replace(/(<p class="lede">[\s\S]*?<\/p>)/, `$1<p class="licensed-team-scope">${sentence}</p>`);
  }
  if (html !== original) {
    fs.writeFileSync(file, html);
    changed++;
  }
}
console.log(`Normalized entity graph: ${changed} of ${files.length} pages updated.`);
