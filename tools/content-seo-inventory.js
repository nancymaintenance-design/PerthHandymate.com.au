// Read-only source inventory. CLI prints artifacts; callers save them with their chosen file tool.
// Does not run legacy content generators, access the research attachment, or fetch external metrics.
const fs = require('node:fs');
const path = require('node:path');
const ORIGIN = 'https://www.perthhandymate.com.au';

function parseKeywordMap(markdown) {
  const owners = [], terms = [];
  let owner, category;
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\| O\d{2} \|/.test(line)) {
      const cells = line.split('|').slice(1, -1).map(x => x.trim());
      if (cells.length !== 9) throw new Error(`Malformed owner directory row at line ${i + 1}`);
      owners.push({ owner: cells[0], topic: cells[1], candidatePath: cells[2], pageLevel: cells[3], termCount: Number(cells[4]), priority: cells[5], representativeTerms: cells[6], routeLogic: cells[7], publishingGate: cells[8] });
    }
    const heading = line.match(/^### (O\d{2})\s/);
    if (heading) { owner = heading[1]; category = undefined; }
    if (line.startsWith('## ')) { owner = undefined; category = undefined; }
    const kind = line.match(/^#### (.+)/);
    if (kind) category = kind[1].trim();
    if (!line.startsWith('- `')) continue;
    const term = line.match(/^- `([^`]+)`(?:\s|$)/);
    if (!term) throw new Error(`Malformed keyword at line ${i + 1}`);
    if (!owner) throw new Error(`Missing keyword owner at line ${i + 1}`);
    if (!category) throw new Error(`Missing keyword category at line ${i + 1}`);
    const metadata = lines[++i] || '';
    const fields = Object.fromEntries(metadata.replace(/^\s*-\s*/, '').split(';').map(item => { const colon = item.indexOf(':'); return [item.slice(0, colon).trim(), item.slice(colon + 1).trim()]; }));
    if (!/^HM\d{4}$/.test(fields.ID || '')) throw new Error(`Missing or malformed ID at line ${i + 1}`);
    for (const required of ['theme', 'intent', 'priority', 'audience']) if (!fields[required]) throw new Error(`Missing ${required} for ${fields.ID}`);
    const numeric = key => { if (!fields[key]) return null; const value = Number(fields[key]); if (!Number.isFinite(value) || value < 0) throw new Error(`Malformed ${key} for ${fields.ID}`); return value; };
    terms.push({ id: fields.ID, owner, category, term: term[1], theme: fields.theme, intent: fields.intent, priority: fields.priority, audience: fields.audience, auMonthlyEstimate: numeric('AU monthly estimate'), semrushKD: numeric('Semrush KD') });
  }
  const snapshot = { owners, terms };
  validateKeywordSnapshot(snapshot);
  return snapshot;
}

function validateKeywordSnapshot(snapshot, expected = {}) {
  if (!Array.isArray(snapshot.terms) || !Array.isArray(snapshot.owners)) throw new Error('Missing keyword records or owners');
  const owners = new Set();
  for (const item of snapshot.owners) {
    if (!/^O\d{2}$/.test(item.owner) || owners.has(item.owner)) throw new Error(`Malformed or duplicate owner ${item.owner}`);
    owners.add(item.owner);
  }
  const ids = new Set(), terms = new Set();
  for (const item of snapshot.terms) {
    if (!owners.has(item.owner)) throw new Error(`Unknown keyword owner ${item.owner}`);
    if (!/^HM\d{4}$/.test(item.id || '')) throw new Error('Missing or malformed keyword ID');
    if (ids.has(item.id)) throw new Error(`Duplicate keyword ID ${item.id}`);
    ids.add(item.id);
    for (const field of ['category', 'term', 'theme', 'intent', 'priority', 'audience']) if (!item[field]) throw new Error(`Missing ${field} for ${item.id}`);
    if (terms.has(item.term)) throw new Error(`Duplicate keyword term ${item.term}`);
    terms.add(item.term);
    for (const field of ['auMonthlyEstimate', 'semrushKD']) if (item[field] !== null && (!Number.isFinite(item[field]) || item[field] < 0)) throw new Error(`Malformed ${field} for ${item.id}`);
  }
  for (const key of ['terms', 'owners']) if (expected[key] !== undefined && snapshot[key].length !== expected[key]) throw new Error(`Expected ${expected[key]} ${key}, received ${snapshot[key].length}`);
  for (const item of snapshot.owners) if (snapshot.terms.filter(term => term.owner === item.owner).length !== item.termCount) throw new Error(`Owner ${item.owner} term count mismatch`);
  if (expected.terms) for (let i = 1; i <= expected.terms; i++) if (!ids.has(`HM${String(i).padStart(4, '0')}`)) throw new Error(`Missing sequential ID HM${String(i).padStart(4, '0')}`);
  return snapshot;
}

function decode(text) {
  return text.replace(/&#(x[\da-f]+|\d+);/gi, (_, value) => String.fromCodePoint(value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp|ndash|mdash|rsquo|lsquo|ldquo|rdquo);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' }[entity]));
}
function clean(html) { return decode(html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim(); }
function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3])]));
}
function pageType(route) {
  const parts = route.split('/').filter(Boolean);
  if (route === '/') return 'home';
  if (route === '/404.html') return 'not-found';
  if (parts[0] === 'services') return parts.length === 1 ? 'services-hub' : parts.length === 2 ? 'service-category' : 'service-detail';
  if (['guides', 'areas', 'projects'].includes(parts[0])) return parts.length === 1 ? `${parts[0]}-hub` : ({ guides: 'guide', areas: 'area', projects: 'project' }[parts[0]]);
  return parts[0];
}
function extractPage(html, route) {
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const rawMain = mainMatch?.[1] || '';
  const main = rawMain.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '').replace(/<(script|style|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const mainText = clean(main);
  const headings = [...main.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(match => ({ level: Number(match[1]), text: clean(match[2]) }));
  const links = [...main.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(match => ({ href: attrs(match[1]).href || '', text: clean(match[2]) })).filter(link => link.href);
  const internal = links.flatMap(link => { try { const url = new URL(link.href, ORIGIN + route); return url.origin === ORIGIN ? [{ ...link, path: url.pathname, hash: url.hash }] : []; } catch { return []; } });
  const contextualInternalLinks = internal.filter(link => link.path !== route && !['/', '/contact/'].includes(link.path));
  const faqCount = [...main.matchAll(/<summary\b/g)].length;
  let structuredFaqCount = 0;
  const schemaErrors = [];
  const scanFaq = value => {
    if (Array.isArray(value)) return value.forEach(scanFaq);
    if (!value || typeof value !== 'object') return;
    if ([value['@type']].flat().includes('FAQPage')) structuredFaqCount += (value.mainEntity || []).length;
    if (value['@graph']) scanFaq(value['@graph']);
  };
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) if (attrs(script[1]).type === 'application/ld+json') { try { scanFaq(JSON.parse(script[2])); } catch { schemaErrors.push('Malformed JSON-LD; review before relying on FAQ count.'); } }
  const type = pageType(route), findings = [...schemaErrors];
  if (!mainMatch) findings.push('Missing main content element.');
  const h1 = headings.filter(item => item.level === 1).map(item => item.text);
  if (h1.length !== 1) findings.push(`Expected one main H1; found ${h1.length}.`);
  for (let i = 1; i < headings.length; i++) if (headings[i].level > headings[i - 1].level + 1) findings.push(`Heading level jumps H${headings[i - 1].level} to H${headings[i].level}: ${headings[i].text}`);
  if (faqCount !== structuredFaqCount) findings.push(`Visible/structured FAQ count differs: ${faqCount}/${structuredFaqCount}; review applicability and parity.`);
  const paragraphs = [...main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(match => clean(match[1])).filter(text => text.split(/\s+/).length >= 12);
  const duplicates = [...new Set(paragraphs.filter((text, index) => paragraphs.indexOf(text) < index))];
  if (duplicates.length) findings.push(`Consolidate ${duplicates.length} repeated substantive paragraph(s) while retaining useful scope.`);
  const legacyBlocks = [...rawMain.matchAll(/\bid="(keyword-[^"]+|repair-depth[^"]*|deep-[^"]*|seo-[^"]*)"/g)].map(match => match[1]);
  if (legacyBlocks.length) findings.push(`Review inserted blocks for overlap and coherent reading order: ${legacyBlocks.join(', ')}.`);
  const photoImperatives = [...mainText.matchAll(/\b(?:attach|send|provide|take|include)\b[^.!?]{0,90}\bphotos?\b[^.!?]*/gi)].map(match => match[0]);
  if (photoImperatives.length && !['privacy', 'not-found'].includes(type)) findings.push('Review photo-request wording in context; explicitly keep photos optional and on-site assessment available.');
  if (!['privacy', 'not-found'].includes(type) && !contextualInternalLinks.length) findings.push('Consider a useful descriptive service, guide or photographed-case link for this page intent.');
  const genericHeadings = headings.filter(item => item.level > 1 && /^(?:what we do|why choose|frequently asked|common questions|our process|service overview)/i.test(item.text)).map(item => item.text);
  if (genericHeadings.length) findings.push(`Check heading specificity for this intent: ${genericHeadings.join('; ')}.`);
  if (!findings.length) findings.push(['privacy', 'not-found'].includes(type) ? 'Keep purpose-specific copy unless editorial review finds a usability problem; no commercial word target.' : 'No structural defect detected; editorially verify unique scope, answer usefulness and supporting evidence.');
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => attrs(match[0])).find(tag => tag.rel === 'canonical');
  return { path: route, url: ORIGIN + route, type, title: clean(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''), canonical: canonicalTag?.href || null, h1, headings, mainWordCount: (mainText.match(/[\p{L}\p{N}]+(?:['’/-][\p{L}\p{N}]+)*/gu) || []).length, faqCount, structuredFaqCount, contextualInternalLinks, conversion: { contactLinks: internal.filter(link => link.path === '/contact/').length, telephoneLinks: links.filter(link => link.href.startsWith('tel:')).length, emailLinks: links.filter(link => link.href.startsWith('mailto:')).length, forms: [...main.matchAll(/<form\b/g)].length, onSiteAssessment: /on[ -]site assessment/i.test(mainText), writtenQuote: /written quote/i.test(mainText), optionalPhotos: /(?:photos?[^.!?]{0,80}optional|optional[^.!?]{0,60}photos?)/i.test(mainText) }, evidence: { images: [...main.matchAll(/<img\b[^>]*>/gi)].map(match => { const tag = attrs(match[0]); return { src: tag.src || '', alt: tag.alt ?? null }; }), projectLinks: contextualInternalLinks.filter(link => link.path.startsWith('/projects/') && link.path !== '/projects/').length, licenceWording: /licen[cs]ed|qualified|registration/i.test(mainText), visibleDates: [...mainText.matchAll(/\b20\d{2}-\d{2}-\d{2}\b/g)].map(match => match[0]) }, photoImperatives, legacyBlocks, duplicateParagraphs: duplicates, findings, mainText };
}
function fileForRoute(root, route) { return path.join(root, route === '/' ? 'index.html' : route.replace(/^\//, '') + (route.endsWith('/') ? 'index.html' : '')); }
function inventorySite(root) {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(decode(match[1])).pathname);
  routes.push('/404.html');
  if (new Set(routes).size !== routes.length) throw new Error('Duplicate sitemap route');
  return routes.map(route => ({ file: path.relative(root, fileForRoute(root, route)).replaceAll('\\', '/'), ...extractPage(fs.readFileSync(fileForRoute(root, route), 'utf8'), route) }));
}
function mapOwners(root) {
  const clusters = JSON.parse(fs.readFileSync(path.join(root, 'data/keyword-content-round.json'), 'utf8')).clusters;
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/service-catalog.json'), 'utf8')).canonicalServices;
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'docs/seo/content-round2/keyword-source.json'), 'utf8'));
  return snapshot.owners.map(owner => {
    const cluster = clusters.find(item => item.owner === owner.owner);
    if (!cluster) throw new Error(`Missing approved cluster ${owner.owner}`);
    const route = cluster.slug === 'home' ? '/' : cluster.slug === 'contact' ? '/contact/' : '/' + catalog.find(item => item.slug === cluster.slug)?.url;
    if (!fs.existsSync(fileForRoute(root, route))) throw new Error(`Missing primary owner URL: ${owner.owner} ${route}`);
    return { ...owner, primaryPath: route, routingRole: 'Default commercial destination only; term-routing.json is authoritative for individual terms and informational intent.', approvedHeading: cluster.heading, constraints: 'Research only; use existing scope, optional photos and on-site written quote. AU estimates are not Perth demand. No new URLs, coverage, prices, credentials, availability or funding promises.', scopeNote: owner.owner === 'O30' ? 'Legacy research label says referral; Ellis uses its own appropriately licensed personnel. Route plumbing to plumbers, electrical work to electricians, and security/licensing or mixed-trade information to the existing licensed-trade guide.' : owner.owner === 'O19' ? 'Tile terms use tiling; laminate/vinyl/transition-strip terms use the existing handyman minor-floor-repairs anchor. Research owner remains O19.' : owner.owner === 'O24' ? 'Pressure cleaning uses handyman; dedicated garden tidying uses garden-clean-up, routine garden care uses gardeners, and substantial tree work uses tree-arborists.' : owner.owner === 'O28' ? 'No NDIS registration, funding or reimbursement claim; suitable product, supporting wall and placement plan require assessment.' : 'Protect existing specialist scope; informational terms may use existing supporting guides rather than this commercial default.' };
  });
}
const md = value => String(value).replaceAll('|', '\\|').replace(/\r?\n/g, ' ');
function mapKeywordTerms(root) {
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'docs/seo/content-round2/keyword-source.json'), 'utf8'));
  const owners = new Map(mapOwners(root).map(owner => [owner.owner, owner]));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/service-catalog.json'), 'utf8')).canonicalServices;
  const service = slug => {
    const item = catalog.find(item => item.slug === slug);
    if (!item) throw new Error(`Unknown routing service: ${slug}`);
    return '/' + item.url;
  };
  const guide = slug => `/guides/${slug}/`;
  const licensed = guide('when-home-maintenance-needs-a-licensed-trade');
  const quote = guide('prepare-before-home-repair-quote');
  const ownerGuides = {
    O01: 'how-to-find-the-right-home-repairer', O02: 'seasonal-home-maintenance-australia',
    O03: 'sticking-doors-windows-repair-guide', O04: 'sticking-doors-windows-repair-guide',
    O05: 'seasonal-home-maintenance-australia', O06: 'sticking-doors-windows-repair-guide',
    O07: 'cupboard-hinges-drawer-runners-repair-guide', O08: 'wall-patching-paint-touch-ups-guide',
    O09: 'seasonal-home-maintenance-australia', O10: 'wall-patching-paint-touch-ups-guide',
    O11: 'prepare-before-home-repair-quote', O12: 'photos-and-clear-scope-for-home-repairs',
    O13: 'photos-and-clear-scope-for-home-repairs', O14: 'seasonal-home-maintenance-australia',
    O15: 'seasonal-home-maintenance-australia', O16: 'sticking-doors-windows-repair-guide',
    O17: 'photos-and-clear-scope-for-home-repairs', O18: 'shower-silicone-grout-waterproofing-guide',
    O19: 'shower-silicone-grout-waterproofing-guide', O20: 'seasonal-home-maintenance-australia',
    O21: 'seasonal-home-maintenance-australia', O22: 'seasonal-home-maintenance-australia',
    O23: 'seasonal-home-maintenance-australia', O24: 'seasonal-home-maintenance-australia',
    O25: 'property-manager-maintenance-coordination', O26: 'home-repair-priorities',
    O27: 'property-manager-maintenance-coordination', O28: 'when-home-maintenance-needs-a-licensed-trade',
    O29: 'prepare-before-home-repair-quote', O30: 'when-home-maintenance-needs-a-licensed-trade',
    O31: 'shower-silicone-grout-waterproofing-guide'
  };
  // Reviewed exceptions precede category defaults. IDs identify supplied research, never public copy.
  const overrides = new Map();
  const assign = (ids, destination, reason) => ids.split(' ').forEach(id => overrides.set(id, { primaryPath: destination, routingReason: reason }));
  assign('HM0452 HM0455 HM0459', service('plumbers'), 'Plumbing is the controlling task; cabinet work remains a separate approved scope.');
  assign('HM0453 HM0456 HM0460 HM0176', service('electricians'), 'Fixed electrical or new power-point work has its existing electrical service owner.');
  assign('HM0011 HM0143 HM0241 HM0242 HM0253 HM0297 HM0318 HM0329 HM0330 HM0352 HM0407 HM0417 HM0440 HM0451 HM0454 HM0457 HM0458 HM0461 HM0462 HM0523 HM0525 HM0526', licensed, 'Safety, licensing, security, hazardous-material or mixed-trade boundary information; no new credential or legal threshold claim.');
  assign('HM0004 HM0362', guide('how-to-find-the-right-home-repairer'), 'Informational choice of repairer or service scope.');
  assign('HM0018 HM0439', guide('home-repair-priorities'), 'Prioritising a household repair list rather than booking a synonym service.');
  assign('HM0016 HM0021 HM0022 HM0164 HM0187 HM0209 HM0445 HM0509', quote, 'Preparation, quote comparison or supplied-item information.');
  assign('HM0252 HM0257 HM0264 HM0466', guide('shower-silicone-grout-waterproofing-guide'), 'Wet-area cause, surface repair and waterproofing scope distinction.');
  assign('HM0308', service('pool-fence-installers'), 'Pool barrier and gate requirements belong with the existing specialist pool-fence service.');
  assign('HM0341', service('gutter-services'), 'Roof drainage assessment belongs with gutters rather than general household plumbing.');
  assign('HM0354 HM0357 HM0359 HM0360 HM0361', service('garden-clean-up'), 'Defined garden tidying, accessible edges and green-waste handling have an existing service owner.');
  assign('HM0353 HM0358', service('gardeners'), 'Routine garden care rather than pressure cleaning.');
  assign('HM0363', service('tree-arborists'), 'Tree work has an existing specialist arborist service owner.');
  assign('HM0441 HM0442 HM0444', service('handymen'), 'Existing handyman page contains the approved service price range; no invented pricing.');
  return snapshot.terms.map(term => {
    let routing = overrides.get(term.id);
    if (!routing && term.owner === 'O19' && term.theme.startsWith('H26 ')) routing = { primaryPath: service('handymen') + '#minor-floor-repairs', routingReason: 'Laminate, vinyl and transition-strip repair is explicitly covered by the existing handyman flooring section; research cluster O19 is retained.' };
    if (!routing && term.category === '问题科普词') routing = { primaryPath: guide(ownerGuides[term.owner]), routingReason: 'Informational cause, preparation or repair-boundary query uses the existing topic guide, supporting the commercial service owner.' };
    if (!routing) routing = { primaryPath: owners.get(term.owner).primaryPath, routingReason: 'Commercial task matches the existing approved cluster service; no new competing landing page.' };
    const destination = new URL(routing.primaryPath, ORIGIN);
    const file = fileForRoute(root, destination.pathname);
    if (!fs.existsSync(file)) throw new Error(`Missing term destination for ${term.id}: ${routing.primaryPath}`);
    if (destination.hash && !fs.readFileSync(file, 'utf8').includes(`id="${destination.hash.slice(1)}"`)) throw new Error(`Missing term anchor for ${term.id}: ${routing.primaryPath}`);
    return { ...term, ...routing };
  });
}
function keywordMatrix(snapshot, mapping, termMapping) {
  if (!termMapping || termMapping.length !== snapshot.terms.length) throw new Error('Complete term-specific routing is required for the keyword matrix.');
  return '# Keyword-to-existing-page matrix — internal research only\n\nAll 527 IDs retain their research owner labels and have one intent-appropriate existing primary destination. Research owners are grouping metadata, not a requirement that every term share one URL. Commercial terms use existing service scopes; informational questions may use supporting guides. Candidate paths in supplied research remain unapproved drafts. Categories and non-English terms remain research data, never public keyword lists. AU estimates are nationwide estimates, not Perth demand; blank is unknown, zero is retained, synonyms must not be summed. Current approved company scope takes precedence over historical research labels.\n\n## Research owner defaults and constraints\n\nThe URL below is the commercial default only. The complete term-specific routing table and term-routing.json take precedence for mixed scopes and informational intent.\n\n| Owner | Research topic | Commercial default URL | Terms | Scope constraints |\n| --- | --- | --- | --- | --- |\n' + mapping.map(owner => `| ${owner.owner} | ${md(owner.topic)} | ${owner.primaryPath} | ${owner.termCount} | ${md(owner.scopeNote + ' ' + owner.constraints)} |`).join('\n') + '\n\n## Complete term-specific routing\n\n| ID | Research owner | Category | Term | Primary URL | AU estimate | KD | Routing reason |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n' + termMapping.map(term => `| ${term.id} | ${term.owner} | ${md(term.category)} | ${md(term.term)} | ${term.primaryPath} | ${term.auMonthlyEstimate ?? ''} | ${term.semrushKD ?? ''} | ${md(term.routingReason)} |`).join('\n') + '\n';
}
function inventoryMarkdown(pages) {
  return '# Baseline public-page content inventory\n\nSource HTML only, 113 sitemap routes plus 404. Verification HTML excluded. Main words exclude scripts, styles and navigation; this is a coverage diagnostic, never a quality score or target. FAQ counts compare visible summary elements with FAQPage entries, not answer semantics. Contextual links exclude breadcrumbs, navigation, same-page anchors, home and booking links. Evidence fields record presence, not authenticity, qualifications or reputation verification. Every finding is a review lead, not a ranking claim.\n\n' + pages.map(page => `## ${page.path}\n\n- Type: ${page.type}; source: ${page.file}\n- Title: ${page.title}\n- H1: ${page.h1.join('; ')}\n- Main words: ${page.mainWordCount}; FAQ visible/schema: ${page.faqCount}/${page.structuredFaqCount}\n- Heading hierarchy: ${page.headings.map(heading => `H${heading.level} ${heading.text}`).join(' → ')}\n- Contextual internal links (${page.contextualInternalLinks.length}): ${page.contextualInternalLinks.map(link => `[${link.text}](${link.path}${link.hash})`).join('; ') || 'none'}\n- Conversion: ${JSON.stringify(page.conversion)}\n- Evidence: ${page.evidence.images.length} main images; ${page.evidence.projectLinks} case links; licence wording ${page.evidence.licenceWording}; visible dates ${page.evidence.visibleDates.join(', ') || 'none'}. Image metadata in JSON.\n- Actionable review: ${page.findings.join(' ')}\n`).join('\n');
}

module.exports = { parseKeywordMap, validateKeywordSnapshot, extractPage, inventorySite, mapOwners, mapKeywordTerms, keywordMatrix, inventoryMarkdown };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'docs/seo/content-round2/keyword-source.json'), 'utf8'));
  validateKeywordSnapshot(snapshot, { terms: 527, owners: 31 });
  const pages = inventorySite(root), mapping = mapOwners(root);
  const mode = process.argv[2] || 'summary';
  if (mode === 'inventory-json') process.stdout.write(JSON.stringify({ analyzedAt: new Date().toISOString(), source: 'local source HTML', limitations: ['No GSC, GA4, rankings, backlink, external reputation or live search metrics accessed.', 'Presence signals and automated findings require editorial review; no score inferred from word count.'], pages: pages.map(({ mainText, ...page }) => page) }, null, 2) + '\n');
  else if (mode === 'inventory-md') process.stdout.write(inventoryMarkdown(pages));
  else if (mode === 'matrix-md') process.stdout.write(keywordMatrix(snapshot, mapping, mapKeywordTerms(root)));
  else if (mode === 'term-routing-json') process.stdout.write(JSON.stringify(mapKeywordTerms(root), null, 2) + '\n');
  else if (mode === 'mapping-json') process.stdout.write(JSON.stringify(mapping, null, 2) + '\n');
  else if (mode === 'summary') console.log(JSON.stringify({ pages: pages.length, terms: snapshot.terms.length, owners: mapping.length, types: Object.fromEntries([...new Set(pages.map(page => page.type))].map(type => [type, pages.filter(page => page.type === type).length])) }, null, 2));
  else throw new Error(`Unknown output mode: ${mode}`);
}
