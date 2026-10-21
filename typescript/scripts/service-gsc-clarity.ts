// Bounded owner for the approved October GSC service revision. No layout or URL changes.
const fs: typeof import('node:fs') = require('node:fs');
const path: typeof import('node:path') = require('node:path');
const root=path.resolve(__dirname,'..');
const escape=(s:string):string=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const plain=(s:string):string=>s.replace(/<[^>]+>/g,' ').replaceAll('&amp;','&').replaceAll('&#39;',"'").replaceAll('&quot;','"').replace(/\s+/g,' ').trim();
interface Copy { articles: [string,string[]][]; h1?:string; groupId?:string }
const copy:Record<string,Copy>=JSON.parse(fs.readFileSync(path.join(root,'data/service-gsc-clarity.json'),'utf8'));
const scoped=(html:string):string|undefined=>{
 const route=html.match(/<link rel="canonical" href="https:\/\/www.perthhandymate.com.au\/services\/doors-windows-glass-screens\/([^/]+)\/"/)?.[1];
 return route&&Object.hasOwn(copy,route)?route:undefined;
};
function required(source:string,pattern:RegExp,label:string):string {
 const matches=[...source.matchAll(new RegExp(pattern.source,pattern.flags.includes('g')?pattern.flags:pattern.flags+'g'))];
 if(matches.length!==1)throw new Error(`Missing or ambiguous ${label}: ${matches.length}`);
 return matches[0][0];
}
function syncFaq(html:string):string {
 const main=html.match(/<main\b[\s\S]*?<\/main>/)?.[0]||'';
 const questions=[...main.matchAll(/<details\b[^>]*><summary>(.*?)<\/summary>(.*?)<\/details>/gs)].map(m=>({'@type':'Question',name:plain(m[1]),acceptedAnswer:{'@type':'Answer',text:plain(m[2])}}));
 return html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g,(all:string,a:string,json:string,b:string)=>{
  const data=JSON.parse(json);let changed=false;for(const node of data['@graph']||[data])if(node['@type']==='FAQPage'){node.mainEntity=questions;changed=true;}return changed?a+JSON.stringify(data)+b:all;
 });
}
function combineFaq(html:string,keep:string[]):string {
 const items=new Map([...html.matchAll(/<details\b[^>]*><summary>(.*?)<\/summary>[\s\S]*?<\/details>/gs)].map(m=>[plain(m[1]),m[0]]));
 for(const q of keep)if(!items.has(q))throw new Error(`Missing retained question: ${q}`);
 const section=required(html,/<section class="section shell service-questions">[\s\S]*?<\/section>/,'primary FAQ');
 const revised=section.replace(/<div class="accordion-list"[^>]*>[\s\S]*?<\/div>/,`<div class="accordion-list" id="assessment-questions">${keep.map(q=>items.get(q)).join('')}</div>`);
 return html.replace(section,revised).replace(/<section\b[^>]*id="assessment-questions"[\s\S]*?<\/section>/g,'');
}
function reviseService(html:string):string {
 const slug=scoped(html);if(!slug)return html;
 let main=required(html,/<main\b[^>]*>[\s\S]*?<\/main>/,'service main');
 const spec=copy[slug];
 if(slug==='window-repairs'){
  const article=required(main,/<article id="timber-window-moisture-and-hardware">[\s\S]*?<\/article>/,'timber decisions')
   .replace('<h3>Timber windows: moisture, sills and stays</h3>','<h3>Sticking sashes and worn hardware</h3>')
   .replace(/(?:<h3>Local frame and sill repairs<\/h3>)*<p>A rotten sill needs/,'<h3>Local frame and sill repairs</h3><p>A rotten sill needs')
   .replace(/(?:<h3>Repair the window or replace the unit\?<\/h3>)*<div id="timber-window-moisture-and-hardware-timber-and-glazing-scopes">/,'<h3>Repair the window or replace the unit?</h3><div id="timber-window-moisture-and-hardware-timber-and-glazing-scopes">');
  const original=required(main,/<section\b[^>]*id="service-work-options"[\s\S]*?<\/section>/,'window scope');
  const quote=required(original,/<div class="service-quote-factors">[\s\S]*?<\/div>/,'quote factors');
  const cta=required(original,/<p><a class="text-link"[^>]*>Discuss window repairs<\/a><\/p>/,'scope CTA');
  const related='<div class="service-related-links"><h3>Related Services for This Job</h3><ul class="service-link-cards"><li><a data-preserve-search href="../../../services/doors-windows-glass-screens/window-installation/">Window installation and replacement</a></li><li><a data-preserve-search href="../../../services/doors-windows-glass-screens/glass-glaziers/">Glass replacement assessment</a></li><li><a data-preserve-search href="../../../services/handyman-interiors-appliance-repairs/carpenters/">Timber and carpentry repairs</a></li></ul></div>';
  main=main.replace(original,`<section class="section shell" id="service-work-options"><h2>Window Repairs — Work &amp; Quote Details</h2><div id="repair-assessment-details">${article}</div>${quote}${related}${cta}</section>`)
   .replace(/<section\b[^>]*id="repair-assessment-details"[\s\S]*?<\/section>/g,'');
  main=combineFaq(main,['Can a damaged window frame be repaired instead of replaced?','Do you repair window locks, handles and hinges?','What determines the price, and do I need to send photos?','Why does a timber window keep swelling?','Does my window need carpentry or glazing work?']);
  main=main.replace(/(<section\b[^>]*id="repair-planning-guides"[\s\S]*?<a href=")[^"]*(">)[\s\S]*?(<\/a>)/,'$1../../../guides/sticking-doors-windows-repair-guide/#guide-section-4$2Timber windows swelling after wet weather$3');
 }
 if(slug==='sliding-door-repairs'){
  const article=required(main,/<article id="slider-dragging-and-track-wear">[\s\S]*?<\/article>/,'slider decisions');
  const block=`<section class="section shell" id="service-work-options"><h2>Rollers, tracks and alignment</h2><div id="repair-assessment-details">${article}</div></section>`;
  if(/<section\b[^>]*id="service-work-options"/.test(main))main=main.replace(/<section\b[^>]*id="service-work-options"[\s\S]*?<\/section>/,block);
  else main=main.replace(/<section class="section shell"><h2>Rollers, tracks and closing hardware<\/h2>[\s\S]*?<\/section>/,block);
  main=main.replace(/<section\b[^>]*id="repair-assessment-details"[\s\S]*?<\/section>/g,'');
  main=combineFaq(main,['Can you replace sliding-door rollers without replacing the door?','Do you repair wardrobe sliding doors as well as patio sliders?','What should I prepare before an assessment?','Why is a sliding door difficult to move?','Does a damaged sliding-door track always need replacement?']);
 }
 if(spec.articles.length){
  const original=required(main,/<section\b[^>]*id="service-work-options"[\s\S]*?<\/section>/,'work options');
  const heading=required(original,/<h2>[\s\S]*?<\/h2>/,'scope heading');
  const tail=original.slice(original.indexOf('<div class="service-quote-factors">'));
  if(!tail.startsWith('<div class="service-quote-factors">'))throw new Error('Missing preserved quote factors');
  const tag=spec.groupId?'div':'article';
  const articles=spec.articles.map(([h,paras])=>`<${tag}><h3>${escape(h)}</h3>${paras.map(p=>`<p>${p}</p>`).join('')}</${tag}>`).join('');
  const content=spec.groupId?`<article id="${escape(spec.groupId)}">${articles}${tail.replace(/(?:<\/article>)*<\/section>$/,'')}</article></section>`:articles+tail;
  main=main.replace(original,`<section class="section shell" id="service-work-options">${heading}${content}`);
 }
 if(slug==='door-installation')main=main.replace(/href="(?:\.\.\/\.\.\/\.\.\/|\/)services\/handyman-interiors-appliance-repairs\/handymen\/#sliding-door-repairs"/g,'href="../../../services/doors-windows-glass-screens/door-repairs/"');
 if(slug==='window-installation'){
  const explanation='<p>Once we agree the installation scope, we provide a written quote setting out the materials, labour and work. We explain the arrangements for window supply, old-window removal and disposal, sealing, and internal and external finishing, including what is included and what is priced separately.</p>';
  // Keep pricing writer ownership intact: explanation now belongs in the work-options quote article.
  main=main.replace('<div class="shell">'+explanation+'</div>','');
 }
 if(slug==='shower-screens'){
  main=main.replace('<h2>Shower Screen, Tile &amp; Grout Repairs</h2>','<h2>Related bathroom tile and grout example</h2>')
   .replace('This bathroom repair example shows a shower area with damaged tiles, grout or a worn finish. Contact Ellis for an on-site assessment of the glass, fittings, waterproofing and movement, then confirm the repair scope and quote.','This example shows bathroom tile and grout work, not proof of shower-screen glass replacement or hardware repair. Keep the screen fault separate when asking Ellis to assess the bathroom.');
 }
 if(spec.h1)main=main.replace(/<h1>[\s\S]*?<\/h1>/,`<h1>${escape(spec.h1)}</h1>`);
 return syncFaq(html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/,main));
}
function reviseCategory(html:string):string {
 if(!html.includes('rel="canonical" href="https://www.perthhandymate.com.au/services/doors-windows-glass-screens/"'))return html;
 // Only the label inside the existing shower-screen card changes; layout and destination stay intact.
 return html.replace(/(<h3><a\b[^>]*href="[^"]*shower-screens\/"[^>]*>)[^<]*(<\/a><\/h3>)/,'$1Shower screen repairs &amp; replacement$2');
}
function apply():number {
 let changed=0;for(const slug of [...Object.keys(copy),'']){const file=path.join(root,'services/doors-windows-glass-screens',slug,'index.html');const before=fs.readFileSync(file,'utf8'),after=slug?reviseService(before):reviseCategory(before);if(after!==before){fs.writeFileSync(file,after);changed++;}}return changed;
}
module.exports={reviseService,reviseCategory,scoped,apply};
if(require.main===module)console.log(JSON.stringify({gscServicePages:apply()}));
