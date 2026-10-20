// Final editorial boundary: retain useful service content, one FAQ location and a final CTA.
const fs:typeof import('node:fs')=require('node:fs');
const path:typeof import('node:path')=require('node:path');
const root=path.resolve(__dirname,'..');
const sections=/<section\b[^>]*>[\s\S]*?<\/section>/g;
const esc=(s:string):string=>s.replaceAll('&','&amp;').replaceAll('"','&quot;');
function divEnd(source:string,start:number):{end:number;close:number}{
 const tags=/<\/?div\b[^>]*>/g;tags.lastIndex=start;let depth=0;
 for(let m;(m=tags.exec(source));){depth+=m[0].startsWith('</')?-1:1;if(depth===0)return {end:tags.lastIndex,close:m.index};}
 throw new Error('Unclosed FAQ container');
}
function joinDetailQuestions(section:string,extra:string):string{
 const start=section.search(/<div class="accordion-list"/);if(start<0)throw new Error('Missing primary accordion');
 const range=divEnd(section,start);let suffix=section.slice(range.end);
 // Upgrade already consolidated pages too; original fragment wrappers stay around their answers.
 for(const id of ['assessment-questions','maintenance-task-questions']){
  const at=suffix.indexOf(`<div id="${id}">`);if(at<0)continue;
  const group=divEnd(suffix,at);extra+=suffix.slice(at,group.end);suffix=suffix.slice(0,at)+suffix.slice(group.end);
 }
 // One list owns all questions. Fragment wrappers need no additional panel or accordion borders.
 extra=extra.replace(/ class="accordion-list"/g,'');
 return section.slice(0,range.close)+extra+section.slice(range.close,range.end)+suffix;
}
function syncFaq(html:string):string{
 const plain=(s:string):string=>s.replace(/<[^>]*>/g,' ').replaceAll('&amp;','&').replaceAll('&#39;',"'").replaceAll('&quot;','"').replace(/\s+/g,' ').trim();
 const main=html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0]||'';
 const questions=[...main.matchAll(/<details\b[^>]*><summary>(.*?)<\/summary>(.*?)<\/details>/gs)].map(m=>({'@type':'Question',name:plain(m[1]),acceptedAnswer:{'@type':'Answer',text:plain(m[2])}}));
 return html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g,(all:string,a:string,json:string,b:string)=>{
  const data=JSON.parse(json);let changed=false;for(const node of data['@graph']||[data])if(node['@type']==='FAQPage'){node.mainEntity=questions;changed=true;}return changed?a+JSON.stringify(data)+b:all;
 });
}
function cleanup(html:string):string{
 const route=html.match(/rel="canonical" href="https:\/\/www\.perthhandymate\.com\.au(\/services\/[^"?#]*)"/)?.[1];
 if(!route||/\/(handymen|property-maintenance)\/$/.test(route))return html;
 const original=html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];if(!original)return html;
 let main=original;
 const category=route.split('/').filter(Boolean).length===2;
 const additions:string[]=[];
 if(category){
  // The catalogue already lists the tasks. Keep the important safety note visible, without a second task list.
  main=main.replace(/<section class="section shell detail-grid">([\s\S]*?)<\/section>/g,(_all:string,body:string)=>{
   const note=body.match(/<aside class="note">[\s\S]*?<\/aside>/)?.[0];
   if(!note)throw new Error('Missing category safety note: '+route);
   return `<section class="section shell" data-service-scope-note>${note}</section>`;
  });
  // Existing authoritative category inventory also restores a previously omitted note, without inventing copy.
  if(!main.includes('data-service-scope-note')){
   const source=fs.readFileSync(path.join(root,'data/content.js'),'utf8').match(/window\.ELLIS_CONTENT\s*=\s*([\s\S]*);\s*$/)?.[1];
   if(!source)throw new Error('Missing category inventory');
   const data: {services:{slug:string;note:string}[]}=JSON.parse(source);
   const item=data.services.find(s=>route===`/services/${s.slug}/`);
   if(item){
    const note=`<section class="section shell" data-service-scope-note><aside class="note"><h2>Service Scope &amp; Licensed Trade Requirements</h2><p>${esc(item.note)}</p></aside></section>`;
    const marker='<section class="section shell city-service-band">';
    if(!main.includes(marker))throw new Error('Missing category area section: '+route);
    main=main.replace(marker,note+marker);
   }
  }
  // Request details already belong to the category booking answer and the final contact action.
  main=main.replace(sections,(s:string)=>s.includes('class="process-grid compact"')?'':s);
  if(route==='/services/doors-windows-glass-screens/'){
   main=main.replace(sections,(s:string)=>/^<section[^>]*id="door-repair-or-installation"|^<section[^>]*><h2>A sliding door that drags or will not latch<\/h2>|^<section[^>]*><h2>Door adjustment and hardware repairs<\/h2>/.test(s)?'':s);
   if(!main.includes('<details id="door-repair-or-installation">'))additions.push('<details id="door-repair-or-installation"><summary>Door Repairs or New Door Installation?</summary><p>For a sound hinged door that rubs, drops or will not latch, choose <a href="../../services/doors-windows-glass-screens/door-repairs/">door repairs</a> for hinge, frame and hardware assessment. Choose <a href="../../services/doors-windows-glass-screens/door-installation/">new door installation</a> when supplying and fitting a replacement. For a heavy patio glass panel that drags, choose <a href="../../services/doors-windows-glass-screens/sliding-door-repairs/">sliding door repairs</a> for rollers, tracks and alignment. Compatible parts and safe glass-panel handling are checked before the repair quote is agreed.</p></details>');
  }
  if(route==='/services/handyman-interiors-appliance-repairs/'){
   main=main.replace(sections,(s:string)=>{
    if(/^<section[^>]*id="confirmed-small-job-range"/.test(s)){
     const title=s.match(/<h2>(.*?)<\/h2>/s)?.[1];
     additions.push(`<details id="confirmed-small-job-range"><summary>${title}</summary>${s.replace(/^<section[^>]*>|<\/section>$/g,'').replace(/<h2>.*?<\/h2>/s,'')}</details>`);return '';
    }
    if(s.includes('<h2>Assembly and wall installation tasks</h2>')){
     additions.push('<details><summary>Assembly and wall installation tasks</summary>'+s.replace(/^<section[^>]*>|<\/section>$/g,'').replace(/<h2>.*?<\/h2>/s,'')+'</details>');return '';
    }
    // These links already exist in the catalogue. Retain the useful cross-category door owner in the FAQ.
    if(s.includes('<h2>Focused repair and installation services</h2>')){
     additions.push('<details><summary>Door adjustment and hardware repairs</summary><p>For ordinary hinged doors that rub, drop or will not latch, choose <a href="../../services/doors-windows-glass-screens/door-repairs/">door repairs</a>. Supplied products, compatible parts and any removal are confirmed in the quote.</p></details>');return '';
    }
    return s;
   });
  }
 }
 // Preserve each FAQ group's fragment and full answer markup, but remove its repeated section heading.
 const faqSections=[...main.matchAll(sections)].map(m=>m[0]).filter(s=>s.includes('class="accordion-list"')&&s.includes('<details'));
 if(faqSections.length){
  const primary=faqSections[0];let revised=primary;
  const extra=faqSections.slice(1).map(s=>{
   const id=s.match(/^<section[^>]*\bid="([^"]+)"/)?.[1];
   const body=s.replace(/^<section[^>]*>|<\/section>$/g,'').replace(/<p class="eyebrow">.*?<\/p>/s,'').replace(/<h2>.*?<\/h2>/s,'');
   main=main.replace(s,'');return `<div${id?` id="${esc(id)}"`:''}>${body}</div>`;
  }).join('')+(additions.length?`<div class="accordion-list">${additions.join('')}</div>`:'');
  if(!category)revised=joinDetailQuestions(revised,extra);
  else if(extra){
   if(revised.includes('<div class="service-scope-panel">'))revised=revised.replace('<div class="service-scope-panel">',extra+'<div class="service-scope-panel">');
   else revised=revised.replace(/<\/section>$/,extra+'</section>');
  }
  main=main.replace(primary,revised);
 }else if(additions.length)throw new Error('Missing category FAQ: '+route);
 // A contact band is the terminal action, never an interruption between explanatory sections.
 const bands=[...main.matchAll(/<section class="cta-band"[^>]*>[\s\S]*?<\/section>/g)];
 const last=bands.at(-1);if(last&&main.slice(last.index!+last[0].length).replace('</main>','').trim())main=main.replace(last[0],'').replace('</main>',last[0]+'</main>');
 return syncFaq(html.replace(original,main));
}
function apply():number{
 let changed=0;
 const walk=(dir:string):void=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(e.name==='index.html'){const before=fs.readFileSync(f,'utf8'),after=cleanup(before);if(after!==before){fs.writeFileSync(f,after);changed++;}}}};
 walk(path.join(root,'services'));return changed;
}
module.exports={cleanup,apply};
if(require.main===module)console.log(JSON.stringify({serviceContentCleanup:apply()}));
