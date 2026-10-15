'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const box = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/content.js'), 'utf8'), box);
const areas = box.window.ELLIS_CONTENT.serviceAreas;
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const jobs = [
  ['doors-windows-glass-screens/door-repairs', 'Sticking-door repairs', 'Describe where the door catches, whether the latch closes and any visible frame damage. Adjustment, hardware and replacement needs are checked before the repair is agreed.'],
  ['doors-windows-glass-screens/window-repairs', 'Window opening and latch repairs', 'Tell us whether opening, closing or locking is affected. Keep clear of loose glass; note the room and the condition of the frame and hardware from a safe position.'],
  ['handyman-interiors-appliance-repairs/cabinet-wardrobe-repairs', 'Loose hinges and drawer repairs', 'Identify the cupboard or wardrobe, the number of affected doors or drawers and whether a hinge, runner or panel is loose. Parts and fixing surfaces need assessment.'],
  ['roofing-gutters-exterior/gutter-services', 'Blocked and leaking gutter repairs', 'Report overflowing sections, leaks or visible damage from ground level. Do not climb to inspect; roof access, debris removal and the repair scope are checked separately.'],
  ['handyman-interiors-appliance-repairs/plasterers', 'Wall and ceiling patching', 'Describe the size and location of the damaged area and whether moisture is still present. The cause, surface preparation and finishing work must be understood before patching.'],
  ['doors-windows-glass-screens/fly-screens', 'Torn flyscreen and mesh repairs', 'Tell us whether the screen is on a door or window and whether the mesh, frame or hardware is damaged. Confirm the required material and fit after assessment.'],
];
const themes = {
  'perth-central': ['Sticking doors, cabinet fittings and wall patches in inner-suburb homes', 'Door and window repairs: describe the affected room', 'Cabinet, screen and paint repairs by item', 'Shared doors and surfaces: confirm repair permission'],
  'north-perth-stirling': ['Door, cabinet and plaster repairs on your home repair list', 'Loose fittings and damaged finishes: define the repair list', 'Door hardware, wall patches and paint preparation', 'Agree the repair scope and occupied-room access'],
  'joondalup-northern-suburbs': ['Gutter, screen and outdoor repairs in the northern suburbs', 'Gutters and outdoor fittings: give each outdoor item its own location', 'Match mesh, gate and exterior faults to a service', 'Check access and materials before outdoor repairs'],
  'south-perth-canning': ['Door, wall and cabinet repairs across occupied rooms', 'Wall patches and fittings: separate rooms and responsibilities', 'Choose repair services for the affected surfaces', 'Agree permission and the room repair sequence'],
  'fremantle-coastal-south': ['Window, timber and exterior repairs around Fremantle', 'Assess window, timber and exterior repairs by condition', 'Sticking windows, damaged screens and paint finishes', 'Confirm shared boundaries and repair access'],
  'eastern-suburbs-midland-swan': ['Repair loose fittings, damaged plaster and sticking doors', 'A repair-led property walkthrough', 'Separate door, wall and outdoor repair symptoms', 'Confirm the repair list before materials and access'],
  'cockburn-rockingham-southern-corridor': ['Assembly, door and outdoor repairs in the southern corridor', 'Assembly and fitting repairs: identify supplied products', 'Match screens, cabinet fittings and outdoor work to the fault', 'Confirm installation scope and safe access'],
};
const newGuidance = {
  'western-suburbs-swanbourne': `<p>Swanbourne enquiries can cover a sticking entrance door, a window that will not latch, torn screen mesh or damaged timber finishes. Start with the affected item rather than a broad request to refresh the whole house. Describe whether the fault is constant or changes after rain, which room or side of the property is affected and whether anyone can use the opening safely. These observations help Ellis assess the repair without assuming the cause.</p><h3>Door, window and screen repairs in Swanbourne</h3><p>Keep separate notes for the door leaf, frame, latch and any screen fitted beside it. A catching door and a damaged mesh panel may need different parts and preparation. For a window, explain whether the problem is movement, locking or visible damage. Do not force a stuck opening or touch unstable glass. Tell the team if a fixture is shared with another property or if access requires an owner or building manager to be present.</p><h3>Timber finishes, wall patches and cabinet hardware</h3><p>A loose cabinet hinge should be described alongside the condition of the panel and fixing holes. A damaged wall patch may also need paint preparation, but colour matching depends on the existing finish. If an exterior timber surface is soft, split or flaking, explain what is visible from a safe position. Ellis checks the material condition and repair boundary before discussing replacement, preparation or painting. An enquiry does not establish that a particular treatment will suit the surface.</p><h3>Agree the repair boundary and property access</h3><p>Give the actual Swanbourne address privately when arranging an assessment, together with entry instructions, occupied rooms and the person authorised to approve work. Western suburbs is a broad service-region label, so include the suburb or postcode for enquiries outside Swanbourne. No additional suburb coverage or local office is implied by this page. Ellis confirms the proposed location, work scope, safe access and written quote directly before a booking proceeds.</p><p>Existing product details and photos are useful if already available, but neither is required to start a request. You can describe a fault in plain language and ask for an on-site assessment. Avoid removing fittings, moving heavy furniture or inspecting at height to gather information. Where the work includes a regulated task, the team confirms the appropriate qualified service arrangements before work begins.</p>`,
  'perth-hills-mundaring-kalamunda': `<p>For Mundaring and Kalamunda home maintenance, distinguish the repair symptom from the access needed to inspect it. A gutter overflowing after rain, a door catching on its frame and a damaged flyscreen belong on separate lines of the repair list. Describe what you can observe from a safe position and the part of the property affected. Ellis assesses the condition on site before agreeing the method, materials or written quote.</p><h3>Blocked gutters and exterior repair symptoms in Mundaring</h3><p>For a gutter enquiry, note where water overflows and whether the problem appears near a downpipe, joint or roof edge. Do not climb a ladder or reach onto the roof to clear debris. Explain whether there are visible access restrictions around the building, gates or parking areas. The team confirms how the affected section can be reached and whether the request concerns clearing, repair or investigation of another cause.</p><h3>Sticking doors, damaged screens and wall patches in Kalamunda</h3><p>Tell Ellis which door or window is affected and whether it rubs, sticks or fails to lock. A damaged screen frame and torn mesh are separate observations. For a wall or ceiling patch, mention any recent moisture and whether the source has been addressed. Do not cover an unresolved leak with a cosmetic repair. Interior hardware, patching and finishing can be discussed together while keeping the scope for each item clear.</p><h3>Confirm the approach to the property before the visit</h3><p>Provide the actual Mundaring or Kalamunda address privately during booking and describe the entry route, parking, gates and any known restrictions. Hills properties differ, so this page does not assume every home has a steep driveway, large block or difficult access. If a detail affects tools or materials reaching the repair, tell the team before the assessment. Availability and the accepted repair scope are confirmed for the individual property.</p><p>List the person who can approve the quote and anyone coordinating entry. For external work, note any shared boundaries or permission requirements already known. Ellis checks the proposed repair and qualified service arrangements where required; a region label does not confirm an appointment or travel time. Photos and product labels are optional supporting information, not a condition of asking for an assessment.</p>`,
};
function renderRegion(html, area) {
  if (!html.includes('assets/css/regions.css')) html = html.replace('</head>', '<link rel="stylesheet" href="../../assets/css/regions.css"></head>');
  const heading = themes[area.slug]?.[0] || (area.slug.startsWith('western') ? 'Door, window and timber repairs in Swanbourne' : 'Gutter, door and screen repairs in Mundaring and Kalamunda');
  if (newGuidance[area.slug]) html = html.replace(/<section[^>]*id="local-property-guidance"[\s\S]*?<\/section>/, `<section class="section shell" id="local-property-guidance"><h2>${heading}</h2>${newGuidance[area.slug]}</section>`);
  else html = html.replace(/(<section[^>]*id="local-property-guidance"[^>]*>)([\s\S]*?)(<\/section>)/, (_, start, body, end) => {
    let n = 0;
    body = body.replace(/<h[23]>[\s\S]*?<\/h[23]>/g, match => { const next = themes[area.slug][n++]; return next ? `<${n === 1 ? 'h2' : 'h3'}>${next}</${n === 1 ? 'h2' : 'h3'}>` : match; });
    body = body.replace(/suburb=[^"&]+/g, `suburb=${encodeURIComponent(area.suburbs[0])}`);
    return start + body + end;
  });
  const cards = `<section class="section shell" id="choose-your-suburb"><h2>Choose your suburb</h2><p>Start a repair request for your location, or choose a service below. The same service choices apply across this region; the address and appointment are confirmed directly.</p><div class="city-list">${area.suburbs.map(suburb => `<a href="../../contact/?suburb=${encodeURIComponent(suburb)}">${esc(suburb)}</a>`).join('')}</div></section><section class="section shell" id="suburb-repair-links"><h2>Choose the repair you need</h2><div class="region-services">${jobs.map(([route, label, detail]) => {
    return `<article><h3><a data-preserve-search href="../../services/${route}/?suburb=${encodeURIComponent(area.name)}">${label}</a></h3><p>${detail}</p></article>`;
  }).join('')}</div></section>`;
  html = html.replace(/<section[^>]*id="choose-your-suburb"[\s\S]*?<\/section>/, '');
  html = html.replace(/<section[^>]*id="suburb-repair-links"[\s\S]*?<\/section>/, '');
  html = html.replace('<section class="cta-band">', cards + '<section class="cta-band">');
  html = html.replaceAll('ask our Perth team', 'ask our local team');
  html = html.replaceAll('entry route', 'property entrance');
  html = html.replace(/(?:<p>)+Local areas include [^<]+<\/p>/, `<p>Local areas include ${esc(area.suburbs.join(', '))}. Choose a service group and share your suburb or postcode to get started.</p>`);
  html = html.replace(/(href="\.\.\/\.\.\/contact\/\?location=)[^"]+/, '$1' + encodeURIComponent(area.name));
  return html;
}
function apply() {
  const template = fs.readFileSync(path.join(root, 'areas/perth-central/index.html'), 'utf8');
  for (const area of areas) {
    const file = path.join(root, `areas/${area.slug}/index.html`);
    let html;
    if (fs.existsSync(file)) html = fs.readFileSync(file, 'utf8');
    else {
      html = template.replaceAll('perth-central', area.slug).replaceAll('Perth CBD &amp; Inner Suburbs', esc(area.name)).replaceAll('Perth CBD & Inner Suburbs', area.name).replaceAll('Perth+CBD+%26+Inner+Suburbs', new URLSearchParams({ suburb: area.name }).toString().slice(7));
      html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>Home Repairs in ${esc(area.name)} | Ellis</title>`).replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="Door, window, gutter and home maintenance enquiries in ${esc(area.name)}. Describe your repair and location for an on-site assessment and quote.">`);
      html = html.replace(/<h1>[\s\S]*?<\/h1>/, `<h1>Home Repairs in ${esc(area.name)}</h1>`).replace(/<p class="lede">[\s\S]*?<\/p>/, `<p class="lede">Local repair help for ${esc(area.context)}. Choose a repair symptom, tell Ellis the actual suburb and confirm the assessment arrangements directly.</p>`);
      html = html.replace(/<section[^>]*id="local-repair-jobs"[\s\S]*?<\/section>/, '');
      html = html.replace(/<div class="city-list">[\s\S]*?<\/div>/, `<div class="city-list">${area.suburbs.map(s => `<span>${esc(s)}</span>`).join('')}</div>`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    fs.writeFileSync(file, renderRegion(html, area));
  }
  const hubFile = path.join(root, 'areas/index.html');
  let hub = fs.readFileSync(hubFile, 'utf8');
  const grid = `<div class="area-grid">${areas.map(a => `<article><p class="eyebrow">Local repair coverage</p><h2><a href="${a.slug}/">${esc(a.name)}</a></h2><p>${esc(a.context[0].toUpperCase() + a.context.slice(1))}. Check the confirmed suburbs and choose the repair you need.</p><a class="text-link" href="${a.slug}/">Explore ${esc(a.name)} →</a></article>`).join('')}</div>`;
  hub = hub.replace(/<div class="area-grid">[\s\S]*?<\/div>/, grid).replace('Find the Perth service area closest to your property', 'Find the service area closest to your property').replace('Check a Perth service location', 'Check your repair location').replace('Tell Ellis your Perth suburb or postcode', 'Tell Ellis your suburb or postcode');
  if (!hub.includes('assets/css/regions.css')) hub = hub.replace('</head>', '<link rel="stylesheet" href="../assets/css/regions.css"></head>');
  fs.writeFileSync(hubFile, hub);
  const homeFile = path.join(root, 'index.html');
  let home = fs.readFileSync(homeFile, 'utf8');
  home = home.replace(/(<div class="city-list">)[\s\S]*?(<\/div>)/, (_, start, end) => start + areas.map(a => `<a href="areas/${a.slug}/"><span>${esc(a.name)}</span><small>WA</small></a>`).join('') + end);
  fs.writeFileSync(homeFile, home);
  const sitemapFile = path.join(root, 'sitemap.xml');
  let sitemap = fs.readFileSync(sitemapFile, 'utf8');
  for (const a of areas.slice(7)) if (!sitemap.includes(`/areas/${a.slug}/`)) sitemap = sitemap.replace('</urlset>', `<url><loc>https://www.perthhandymate.com.au/areas/${a.slug}/</loc><lastmod>2026-10-14</lastmod></url></urlset>`);
  fs.writeFileSync(sitemapFile, sitemap);
  const policyFile = path.join(root, 'data/heading-keyword-policy.json');
  const policy = JSON.parse(fs.readFileSync(policyFile, 'utf8'));
  for (const a of areas) {
    const file = `areas/${a.slug}/index.html`;
    const entry = policy.pages[file] ||= { headings: {}, review: 'confirmed region and repair intent' };
    if (newGuidance[a.slug]) entry.h1 = `Home Repairs in ${a.name}`;
  }
  fs.writeFileSync(policyFile, JSON.stringify(policy, null, 2) + '\n');
  const indexingFile = path.join(root, 'data/indexing-policy.json');
  const indexing = JSON.parse(fs.readFileSync(indexingFile, 'utf8'));
  for (const area of areas) {
    const route = `areas/${area.slug}/`;
    if (!indexing.indexableSitemapRoutes.includes(route)) indexing.indexableSitemapRoutes.push(route);
  }
  fs.writeFileSync(indexingFile, JSON.stringify(indexing, null, 2) + '\n');
  console.log(`Rendered ${areas.length} confirmed region destinations and hub/home discovery.`);
}
if (require.main === module) apply();
module.exports = { renderRegion, areas };
