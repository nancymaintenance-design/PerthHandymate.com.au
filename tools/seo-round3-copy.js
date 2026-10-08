const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/service-catalog.json'), 'utf8'));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const drafts = Object.assign({}, ...['interiors', 'trades', 'outdoors'].map(name => JSON.parse(fs.readFileSync(path.join(__dirname, `seo-drafts-${name}.json`), 'utf8'))));
// Protect already approved primary landing-page metadata; expand their visible questions.
const protectedSlugs = new Set(['gutter-services', 'door-installation', 'ikea-kitchens']);
let changed = 0;
for (const item of catalog.canonicalServices) {
  const draft = drafts[item.slug];
  if (!draft) continue;
  const file = path.join(root, item.url, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  if (!protectedSlugs.has(item.slug)) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(draft.title)}</title>`)
      .replace(/<h1>[\s\S]*?<\/h1>/, `<h1>${esc(draft.h1)}</h1>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(draft.description)}">`);
  }
  const questions = draft.qa.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
  const pattern = /<section class="section shell service-questions">[\s\S]*?<\/section>/;
  if (!pattern.test(html)) throw new Error(`Missing FAQ section: ${item.slug}`);
  let remainder = html.replace(pattern, '');
  // The old generic accordion also held useful assessment information. Keep it once,
  // outside the questions, rather than silently deleting safety or preparation copy.
  const missingInfo = item.customerInfo.filter(text => !remainder.includes(esc(text)));
  const missingTasks = item.commonTasks.filter(text => !remainder.includes(esc(text)));
  const missingSafety = !remainder.includes(esc(item.safetyNote));
  const missingNext = !remainder.includes(esc(item.nextStep));
  const assessment = (missingTasks.length || missingInfo.length || missingSafety || missingNext)
    ? `<h3>Arrange Your ${esc(item.title)} Assessment</h3>${missingInfo.length ? `<ul class="check-list">${missingInfo.map(text => `<li>${esc(text)}</li>`).join('')}</ul>` : ''}${missingSafety ? `<p>${esc(item.safetyNote)}</p>` : ''}${missingNext ? `<p>${esc(item.nextStep)}</p>` : ''}` : '';
  const tasks = missingTasks.length ? `<h3>${esc(item.title)} Work We Assess</h3><ul class="check-list">${missingTasks.map(text => `<li>${esc(text)}</li>`).join('')}</ul>` : '';
  html = html.replace(pattern, `<section class="section shell service-questions"><p class="eyebrow">${esc(item.title)} service guide</p><h2>${esc(item.title)} in Perth: Common Questions</h2><div class="accordion-list">${questions}</div>${tasks}${assessment}</section>`);
  fs.writeFileSync(file, html);
  changed++;
}
// Remove duplicate directory cards, not their searchable aliases or canonical URLs.
let removed = 0;
for (const category of new Set(catalog.canonicalServices.map(item => item.category))) {
  const file = path.join(root, 'services', category, 'index.html');
  const seen = new Set();
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/<article class="service-directory-card">[\s\S]*?<\/article>/g, card => {
    const url = card.match(/href="\.\.\/\.\.\/(services\/[^"?]+)"/)?.[1];
    if (!url) throw new Error(`Missing directory URL in ${category}`);
    if (seen.has(url)) { removed++; return ''; }
    seen.add(url);
    const item = catalog.canonicalServices.find(item => item.url === url);
    if (!item) throw new Error(`Unknown directory URL ${url}`);
    const label = drafts[item.slug]?.h1?.replace(/ in Perth$/i, '') || item.title;
    return card.replace(/(<h3><a[^>]*>)[\s\S]*?(<\/a><\/h3>)/, `$1${esc(label)}$2`);
  });
  fs.writeFileSync(file, html);
}
console.log(JSON.stringify({ expandedServicePages: changed, removedDuplicateCards: removed, remainingCards: catalog.canonicalServices.length }));
const additions = {
  handymen: ['Odd Jobs & Small Home Repairs in Perth', [
    ['Door hinges, handles and frames', 'For a bedroom door that rubs, a loose hinge or damaged non-structural trim around the frame, tell Ellis where it catches and what has changed. We assess the door, hardware and surrounding timber before agreeing an adjustment or local repair. New door installation is a separate scope; security and fire-rated doors need their specific requirements checked.'],
    ['Several small jobs in one visit', 'A home maintenance to-do list can combine cupboard door alignment, drawer runners, flat-pack assembly, picture hanging and bathroom accessory repairs. Identify the items you want repaired, retained or replaced. Our team checks the materials and fixing surfaces before confirming the agreed work and quote.'],
    ['TV brackets, floating shelves and heavy mirrors', 'Tell us the item weight, wall location and supplied mounting hardware. Brick, plasterboard and tiled surfaces need different fixing assessments, including concealed services. A TV bracket installation does not automatically include new power points or concealed electrical wiring.'],
    ['Booking by phone and arranging access', 'You can call Ellis to explain a repair list for yourself or a family member; photos are optional. Confirm who can approve the work and provide access. For strata, offices and shops, include common-area permission, parking and trading-hour restrictions.'],
    ['Handyman rates and written quotes', 'Ask Ellis whether the proposed work is priced by the job or time, what materials are included and whether any minimum charge, attendance charge or assessment charge applies. We confirm the pricing basis before you approve work; extra repairs should have their scope and price agreed first.']
  ]],
  carpenters: ['Skirting Board, Architrave & Timber Repairs in Perth', [
    ['Damaged skirting boards and door trim', 'Tell Ellis about cracked skirting, loose architraves or damaged timber trim after moving furniture or removing flooring. We check the profile, fixings and surrounding surface before agreeing repair or replacement. Matching the existing timber and finish is assessed rather than guaranteed.'],
    ['Rotten timber and recurring damage', 'Soft timber or paint that repeatedly fails may indicate moisture, not just a surface defect. We assess the affected section and the cause before agreeing a local repair. Load-bearing timber, significant movement and suspected asbestos require the appropriate assessment before work proceeds.']
  ]],
  plasterers: ['Gyprock Patching, Wall Holes & Ceiling Repairs in Perth', [
    ['Wall damage before moving out or selling', 'Describe holes, dents, damaged corners or removed wall fittings, and whether painting is also needed. Ellis checks the wall material and patching area before quoting. A local wall patch, matching the finish and repainting a whole wall are different scopes.'],
    ['Cornice cracks and ceiling stains', 'Tell us whether the crack has returned, the ceiling is sagging or water staining is present. Recurring movement or moisture needs assessment before cosmetic patching. Do not treat a swollen or unstable ceiling as an ordinary hole repair.']
  ]],
  'fly-screens': ['Flyscreen Mesh Replacement & Screen Door Repairs in Perth', [
    ['Torn mesh, loose spline or a damaged frame', 'Replacing flyscreen mesh and repairing a bent frame are different jobs. Tell Ellis which windows or doors are affected and whether the screen still fits its opening. We check the mesh, frame and ordinary screen hardware before agreeing the repair.'],
    ['Dragging screen doors versus glass sliding doors', 'Identify whether the light insect screen or heavy glass panel is dragging. Ordinary flyscreen repairs do not establish that a security screen or glass sliding door can use the same repair method. Ellis confirms the correct work and assessment with you.']
  ]],
  'window-repairs': ['Timber Window Frame & Hardware Repairs in Perth', [
    ['Sticking windows and worn hardware', 'Tell Ellis whether the sash sticks, the handle is loose or timber has softened near the sill. We assess the frame and hardware before agreeing adjustment, repair or replacement. Broken glass, security hardware and major frame damage need their own scope checked.'],
    ['Weathered frames and water entry', 'A new coating alone may not fix rotten timber or water entering around a window. Describe where the moisture appears and whether it returns after rain. We inspect the affected material and surrounding area before confirming repair and finishing work.']
  ]],
  'house-painters': ['Painting Touch-ups & Small Painting Jobs in Perth', [
    ['After patching or a trim repair', 'Ask Ellis about painting a repaired door, skirting or patched wall as part of the agreed job. Colour, sheen, surface condition and the area to repaint affect the quote. An exact match to aged paint is not assumed; a whole-wall repaint and a small touch-up are different scopes.']
  ]]
};
for (const [slug, [heading, sections]] of Object.entries(additions)) {
  const item = catalog.canonicalServices.find(item => item.slug === slug);
  const file = path.join(root, item.url, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  const section = `<section class="section shell" id="keyword-map-repair-scenes"><h2>${esc(heading)}</h2>${sections.map(([title, text]) => `<h3>${esc(title)}</h3><p>${esc(text)}</p>`).join('')}</section>`;
  html = html.replace(/<section class="section shell" id="keyword-map-repair-scenes">[\s\S]*?<\/section>/, '');
  html = html.replace('<section class="cta-band">', section + '<section class="cta-band">');
  fs.writeFileSync(file, html);
}
