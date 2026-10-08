const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const replacements = [
  ['Make the scope visible', 'Confirm the Repairs and Written Quote'],
  ['Our local team confirms the practical scope, access and next step directly with you.', 'Our local team checks the repairs needed, how to access the property and the appointment time directly with you.'],
  ['From first contact to the next step', 'From Your Enquiry to the Site Assessment'],
  ['Clarify the property and scope', 'Check the Property and Repairs Needed'],
  ['We may ask about condition, access, quantities, photos or other practical details.', 'Tell us which item is damaged and how we can enter the property. Existing photos and measurements are optional; our team checks the work on site.'],
  ['The Ellis Perth team, scope and any relevant next steps are made clear before the booking moves ahead.', 'Before your appointment, Ellis confirms who will attend, what will be assessed and when the team will arrive.'],
  ['For properties that need practical attention', 'Home Repairs, Rental Maintenance and Business Premises'],
  ['For repairs, maintenance and improvement ideas that need a practical first conversation.', 'For household repairs, scheduled maintenance and improvements: tell Ellis what you need fixed, installed or replaced.'],
  ['For clearly scoped property work where the address, access and decision path matter.', 'For rental repairs: tell Ellis the property address, tenant access contact and who can approve the work and quote.'],
  ['For business premises where site rules, access and the proposed scope need to be understood early.', 'For business premises: tell Ellis what needs repairing, permitted work hours, building entry instructions and any site safety requirements.'],
  ['A useful request', 'Tell Ellis What Needs Repairing'],
  ['This photographed project shows a defined roof and gutter maintenance scope. It is a useful starting point for describing accessible gutters, visible debris or an exterior maintenance list.', 'This project shows roofline, gutter and downpipe maintenance. Contact Ellis if your gutters overflow, leak or collect debris; we inspect the affected sections and confirm the cleaning or repairs needed.'],
  ['the route to the work area', 'access to the work area'],
  ['Assess drainage and excavation constraints.', 'Check drainage, buried services and access for excavation.'],
  ['Review the layout, adjoining walls and site constraints.', 'Check the fence line, adjoining walls, sloping ground and gate access.'],
  ['We encourage a clear brief, including location, photos where safe, approximate measurements and timing constraints, so the next decision is based on useful information.', 'Tell us what needs repairing, your suburb and when you need the work done. Existing photos and approximate measurements are optional; Ellis can inspect the property and confirm the repair plan and quote.'],
  ['Include the desired outcome, current condition, location, quantities, approximate dimensions, materials if known, safe photos and access constraints.', 'Tell us what needs repairing, the property location and any locked gates, stairs or restricted work areas. If available, include quantities, approximate dimensions and safe existing photos.'],
  ['State the approval pathway and limit in the brief.', 'Tell Ellis who can approve the work and the authorised spending limit.'],
  ['Tell the coordinator about vulnerable occupants or access constraints without sharing unnecessary personal information.', 'Tell Ellis if a household member needs priority assistance or if stairs, locked gates or occupied rooms affect access. Only share personal information needed to arrange the visit.'],
  ['Take context, detail and access photos', 'Photograph the damaged area, close-up details and access'],
  ['Send enough to show context, detail and access. Quality and relevance matter more than a fixed number.', 'If you already have photos, include a wider view of the damaged area, a close-up of the fault and the route to the work area. Photos are optional; there is no minimum number.'],
  ['gives Ellis Perth team better context', 'helps the Ellis Perth team identify new damage and previous repairs'],
  ['Use this home maintenance to-do list to record the authorised contact, access process and approval pathway for each address.', 'Use this home maintenance to-do list to record who can approve repairs, how Ellis can enter the property and the spending limit for each address.'],
  ['Occupancy, access, staging and major constraints', 'Whether the property is occupied, entry arrangements and rooms that must remain usable'],
  ['Known asbestos reports, structural information and disposal constraints', 'Existing asbestos reports, structural plans and requirements for removing demolition waste'],
  ['Share the renovation goals, rooms and available plans to establish the next scoping step.', 'Tell Ellis which rooms you want to renovate and what you want changed. Existing plans are optional; we inspect the property and confirm the work and quote.'],
  ['Each option opens a focused page with useful scoping details. Tell Ellis Perth what you have noticed, even if you do not know the service name. We assess the work on site and confirm the scope and quote.', 'Open a service below to see the repairs available, common faults and factors that affect the quote. If you are unsure which service to choose, describe the problem directly to Ellis Perth. We inspect the property and confirm the work and written quote.'],
  ['Describe stairs, lifts, parking, entry widths and any travel constraints at pickup and delivery.', 'Tell Ellis about stairs, lifts, parking, doorway widths and vehicle access at both pickup and delivery.'],
  ['Stairs, lifts, parking, travel constraints and assembly needs', 'Stairs, lifts, parking, vehicle access and furniture assembly needed at pickup or delivery'],
  ['These examples cover visible timber door work and replacement door hardware. They are useful references when describing the symptom, material and access constraints of a door request.', 'These examples show timber door repairs and replacement door hardware. Tell Ellis whether your door sticks, sags or has damaged hinges or locks, and where it is fitted.'],
  ['Shower-area repair context', 'Shower Screen, Tile & Grout Repairs'],
  ['This project shows an exterior timber window and door repair context. It helps explain how weathering, timber condition and the affected opening can influence the right next step.', 'This project shows repairs to an exterior timber window and door. Ellis checks weathered timber, damaged frames and how the opening operates before recommending repair or replacement.'],
  ['Stains, protruding nails, loose boards, furniture and access constraints', 'Stains, protruding nails, loose boards, furniture to move and entry arrangements'],
  ['This photographed bathroom project provides context for enquiries involving damaged tiles, grout or a shower-area finish. The correct pathway still depends on the substrate, water exposure and condition found on site.', 'This bathroom project shows damaged tiles, grout and shower-area finishes. Ellis checks the surface beneath the tiles and signs of water damage before confirming the repairs required.'],
  ['Clarify the approval pathway and documentation required', 'Identify the approvals, inspection records and documents required for the building work'],
  ['Required deliverable, project stage and site-access constraints', 'Survey or plans required, the building stage and access to the land'],
  ['Known material type, age and access constraints', 'Cladding material and age, building height and access to the affected wall'],
  ['Gutter services bring cleaning, repair and replacement under one pathway for gutters and downpipes that are blocked, leaking, rusted, loose or poorly draining.', 'Ellis cleans, repairs and replaces blocked, leaking, rusted or loose gutters and downpipes in Perth. We check the cause of overflow or poor drainage and confirm which sections need cleaning, resealing or replacement.'],
];
const caseHeadings = {
  'bathroom-tile-shower-repair': 'Shower Leaks, Damaged Tiles & Grout',
  'decking-refinishing-maintenance': 'Deck Board Repairs & Refinishing',
  'door-lock-replacement-installation': 'Door Hardware & Smart Lock Fitting',
  'exterior-timber-window-door-repair': 'Timber Window Frame & Door Repairs',
  'garden-clean-up': 'Garden Tidy-ups & Green Waste Removal',
  'interior-wall-repair-painting': 'Gyprock Patching & Painting',
  'kitchen-cabinet-hinge-repair': 'Kitchen Cabinet Door & Hinge Repairs',
  'roof-and-gutter-maintenance': 'Blocked Gutters, Overflow & Roofline Repairs',
  'sliding-door-flyscreen-repair': 'Torn Mesh & Flyscreen Door Repairs',
  'timber-fence-repair': 'Timber Fence & Gate Repairs',
};
const invitation = 'Contact Ellis directly to arrange an on-site assessment. Tell us what needs repairing and your Perth suburb or postcode. Existing photos and approximate measurements are optional; we inspect the property and confirm the repair plan and written quote.';
const escape = s => s.replaceAll('&', '&amp;');
function clean(s) {
  for (const [before, after] of replacements) {
    s = s.replaceAll(before, after).replaceAll(escape(before), escape(after));
  }
  return s.replaceAll('the route to the work area', 'access to the work area').replace(/service context within/g, 'services:').replace(/\bcontext(?=\s*(?:image|for|of)\b)/gi, 'details');
}
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory()
    ? (['dist', 'tools', 'tests', 'docs', '.git', 'node_modules'].includes(e.name) ? [] : walk(path.join(dir,e.name)))
    : [path.join(dir,e.name)]);
}
let changed = 0;
for (const file of walk(root).filter(f => f.endsWith('.html') || /[/\\]data[/\\](?:content\.js|service-catalog\.json)$/.test(f))) {
  const old = fs.readFileSync(file,'utf8');
  let s = clean(old);
  const slug = path.basename(path.dirname(file));
  if (caseHeadings[slug] && path.basename(path.dirname(path.dirname(file))) === 'projects' && file.endsWith('.html')) {
    s = s.replace(/(<aside class="note"><h2>)[\s\S]*?(<\/h2>)/, `$1${escape(caseHeadings[slug])}$2`);
    s = s.replace(/(<div class="project-actions"><a class="button"[^>]*>)[^<]*(<\/a>)/, '$1Arrange an on-site assessment$2');
    s = s.replace(/<section class="cta-band">[\s\S]*?<\/section>/, band => {
      const href = band.match(/href="([^"]*contact[^\"]*)"/)?.[1];
      if (!href) throw new Error(`Missing case contact: ${slug}`);
      return `<section class="cta-band"><div class="shell split"><div><p class="eyebrow">Contact Ellis Perth</p><h2>${escape(caseHeadings[slug])} in Perth</h2><p>${invitation}</p></div><a class="button button-light" data-preserve-search href="${href}">Arrange an on-site assessment</a></div></section>`;
    });
    if (slug === 'roof-and-gutter-maintenance') s = s.replace('For gutter cleaning or a roofline concern, show the affected area, property access details and whether leaves, overflow or drainage issues are visible.', 'Tell Ellis where the gutter overflows or leaks, whether leaves or rust are visible and how we can access the property. Existing photos are optional. We inspect the gutters and downpipes to identify the blockage or damage before quoting.');
  }
  if (s !== old) { fs.writeFileSync(file,s); changed++; }
}
for (const name of ['index.html','404.html','about','areas','contact','faq','guides','privacy','projects','services','data']) {
  const source = path.join(root,name);
  if (fs.existsSync(source)) fs.cpSync(source,path.join(root,'dist',name),{recursive:true});
}
console.log(`Public copy files updated: ${changed}; 10 case invitations standardised; dist refreshed.`);
module.exports = {invitation, caseHeadings};
