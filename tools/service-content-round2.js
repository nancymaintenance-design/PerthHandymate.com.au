'use strict';
const { requests, faqEdits, categories } = require('./service-content-round2-copy');
const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#(?:0?39|x27);/gi,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
function replaceOnce(html, from, to, label) {
  const count = html.split(from).length - 1;
  if (count === 1) return html.replace(from, to);
  if (!count && html.includes(to)) return html;
  throw new Error(`${count ? 'Ambiguous' : 'Missing'} ${label}`);
}
function replaceSectionCta(html, sectionPattern, from, to, label) {
  let sections = 0;
  const result = html.replace(sectionPattern, section => {
    sections++;
    const targets = [...section.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)]
      .filter(([anchor]) => anchor.endsWith(from) || anchor.endsWith(to));
    if (targets.length !== 1) throw new Error(`${targets.length ? 'Ambiguous' : 'Missing'} ${label}`);
    return replaceOnce(section, from, to, label);
  });
  if (sections !== 1) throw new Error(`${sections ? 'Ambiguous' : 'Missing'} ${label} container`);
  return result;
}
function replaceFaq(html, question, answer) {
  let count = 0;
  html = html.replace(/<details\b[^>]*><summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g, (block, q) => {
    if (text(q) !== question) return block;
    count++;
    return `<details><summary>${q}</summary><p>${answer}</p></details>`;
  });
  if (count !== 1) throw new Error(`${count ? 'Ambiguous' : 'Missing'} FAQ question: ${question}`);
  // Current service pages have no FAQPage. Keep parity if one is subsequently added.
  return html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (block, open, source, close) => {
    const json = JSON.parse(source), entries = json['@graph'] || [json];
    let changed = false;
    for (const faq of entries.filter(x => x['@type'] === 'FAQPage')) {
      for (const q of faq.mainEntity || []) if (q.name === question && q.acceptedAnswer?.text !== text(answer)) {
        q.acceptedAnswer.text = text(answer); changed = true;
      }
    }
    return changed ? open + JSON.stringify(json) + close : block;
  });
}
function editServiceHtml(html, spec) {
  if (!spec || !['detail','category','hub'].includes(spec.kind)) throw new Error('Unknown page kind');
  if (spec.kind === 'detail' && !requests[spec.slug]) throw new Error('Unknown service: '+spec.slug);
  if (spec.kind === 'category' && !categories[spec.slug]) throw new Error('Unknown category: '+spec.slug);
  const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
  if (!main) throw new Error('Missing main content');
  let edited = main;
  if (spec.kind === 'detail') {
    if (!main.includes('id="service-work-options"') || !main.includes('service-questions')) throw new Error('Missing service content sections');
    if (spec.slug !== 'handymen') {
      const label = esc('Discuss '+requests[spec.slug]);
      edited = replaceSectionCta(edited, /<section\b[^>]*class="[^"]*\bservice-hero\b[^"]*"[^>]*>[\s\S]*?<\/section>/g, '>Describe this request</a>', '>'+label+'</a>', 'hero assessment CTA');
      edited = replaceSectionCta(edited, /<section\b[^>]*id="service-work-options"[^>]*>[\s\S]*?<\/section>/g, '>Arrange an assessment with Ellis</a>', '>'+label+'</a>', 'scope assessment CTA');
      edited = edited.replace(/<h3>Arrange Your ([\s\S]*?) Assessment<\/h3>/, '<h3>$1: On-site Checks &amp; Optional Details</h3>');
    }
    if (['carpenters','fly-screens','plasterers','house-painters','window-repairs'].includes(spec.slug)) {
      edited = edited.replace(/<section class="section shell" id="keyword-map-repair-scenes">[\s\S]*?<\/section>/, '');
    }
    if (spec.slug === 'carpenters') {
      const old = '<a href="../../../guides/seasonal-home-maintenance-australia/">A Seasonal Home Maintenance Plan for Australian Properties</a></li>';
      const addition = '<li><a href="../../../services/handyman-interiors-appliance-repairs/handymen/#eaves-patio-repairs">Local eaves, patio and pergola repairs</a></li>';
      if (!edited.includes(addition)) edited = replaceOnce(edited,old,old+addition,'carpentry outdoor repair link');
    }
    if (spec.slug === 'handymen') {
      const labels = [
        ['Cupboard Repairs, Furniture Assembly: repair advice →','Cupboard hinge and drawer advice →'],
        ['Door: repair advice →','Door and sliding-door repair advice →'],
        ['Clothesline Repairs: repair advice →','Planning outdoor maintenance →'],
        ['Letterbox: repair advice →','Seasonal checks for outdoor fittings →'],
        ['Pet Door Installation: repair advice →','Assessing doors and moving panels →'],
        ['Laminate: repair advice →','Floor condition and maintenance →'],
        ['Pressure Cleaning for Patios: repair advice →','Planning surface maintenance →'],
        ['Grab Rail Installation: repair advice →','Safety-critical repairs and qualifications →'],
        ['Eaves, Patio: repair advice →','Checking exposed timber and eaves →']
      ];
      for (const [from,to] of labels) edited = replaceOnce(edited,from,to,'handyman advice anchor');
      edited = replaceFaq(edited,'What happens if my repair needs a specialist trade?', "Ellis identifies electrical, plumbing, gas, structural and other specialist requirements during assessment. Our own appropriately licensed personnel complete regulated work within the agreed scope. Fixed wiring, wet-area waterproofing and structural changes are separate from ordinary small repairs.");
    }
    for (const [question,answer] of faqEdits[spec.slug] || []) edited = replaceFaq(edited,question,answer);
    html = html.replace(main,edited);
    // Synchronise an existing FAQ graph outside main, without reserialising other entities.
    for (const [question,answer] of faqEdits[spec.slug] || []) html = replaceFaq(html,question,answer);
  } else if (spec.kind === 'category') {
    const copy = categories[spec.slug];
    edited = edited.replace(/<h1>[\s\S]*?<\/h1>/,`<h1>${esc(copy.h1)}</h1>`);
    const section = edited.match(/<div class="section-heading">[\s\S]*?<\/div><p>[\s\S]*?<\/p><\/div>/)?.[0];
    if (!section) throw new Error('Missing category directory introduction');
    const next = section.replace(/<h2>[\s\S]*?<\/h2>/,`<h2>${esc(copy.heading)}</h2>`).replace(/<\/div><p>[\s\S]*?<\/p><\/div>$/,`</div><p>${esc(copy.intro)}</p></div>`);
    edited = edited.replace(section,next);
    const faq = edited.match(/<section class="section shell"><p class="eyebrow">Service questions<\/p>[\s\S]*?<\/section>/)?.[0];
    if (!faq) throw new Error('Missing category FAQ');
    edited = edited.replace(faq,faq.replace(/<div class="accordion-list">[\s\S]*?<\/div>/,`<div class="accordion-list">${copy.qa.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join('')}</div>`));
    edited = replaceOnce(edited,'>Describe your request</a>','>Arrange a site assessment</a>','category assessment CTA');
    html = html.replace(main,edited).replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(copy.title)}</title>`);
  } else {
    edited = edited.replace(/<h1>[\s\S]*?<\/h1>/,'<h1>Perth Home Repair &amp; Maintenance Services</h1>');
    edited = edited.replace(/<p class="lede">[\s\S]*?<\/p>/,'<p class="lede">Choose the service for the part of your property that needs attention. Ellis handles small handyman repairs, specialist maintenance and larger property work, with an on-site assessment and written scope and quote. Regulated work is completed by our own appropriately licensed personnel.</p>');
    edited = replaceOnce(edited,'<h2>Tell us what needs attention</h2>','<h2>Arrange an Assessment for Your Repair List</h2>','hub assessment heading');
    edited = replaceOnce(edited,'<p>Share the task and location to start your service request.</p>','<p>Tell Ellis what is damaged or not working and your suburb. You can combine several tasks in one request; photos and measurements are optional. We confirm the appropriate services, access and written quote after assessment.</p>','hub booking explanation');
    html = html.replace(main,edited).replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="Explore Perth handyman repairs, interior maintenance, garden care and specialist property services. Ellis assesses the work on site and provides a written quote.">');
  }
  return html;
}
module.exports = { editServiceHtml, replaceFaq, text };
