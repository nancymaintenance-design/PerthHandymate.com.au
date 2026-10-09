// Render approved local content using existing page structure. Never publishes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),origin='https://www.perthhandymate.com.au/';
const source='C:/Users/UFTR/Desktop/Entry/4、perthhandymate/Perth_Handyman_AI_Keyword_Map.md';
const data=JSON.parse(fs.readFileSync(path.join(root,'data/keyword-content-round.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/service-catalog.json'),'utf8'));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const write=(file,h)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),h)};
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const url=slug=>{const item=catalog.canonicalServices.find(s=>s.slug===slug);assert.ok(item,slug);return item.url};
const primary=c=>c.slug==='home'?'index.html':c.slug==='contact'?'contact/index.html':url(c.slug)+'index.html';
const terms=[];let owner,type;const lines=fs.readFileSync(source,'utf8').split(/\r?\n/);
for(let i=0;i<lines.length;i++){const o=lines[i].match(/^### (O\d+) /),t=lines[i].match(/^#### (.+)/),k=lines[i].match(/^- `([^`]+)`/),id=lines[i+1]?.match(/ID: (HM\d+)/);if(o)owner=o[1];if(t)type=t[1];if(k&&id&&owner)terms.push({id:id[1],owner,type,term:k[1]})}
assert.equal(terms.length,527);assert.equal(new Set(terms.map(t=>t.id)).size,527);
const detail=(q,a)=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`;
const guideFor={O03:'sticking-doors-windows-repair-guide',O04:'sticking-doors-windows-repair-guide',O06:'sticking-doors-windows-repair-guide',O07:'cupboard-hinges-drawer-runners-repair-guide',O08:'wall-patching-paint-touch-ups-guide',O10:'wall-patching-paint-touch-ups-guide',O18:'shower-silicone-grout-waterproofing-guide',O19:'shower-silicone-grout-waterproofing-guide',O31:'shower-silicone-grout-waterproofing-guide',O02:'seasonal-home-maintenance-australia',O05:'seasonal-home-maintenance-australia',O09:'seasonal-home-maintenance-australia',O20:'seasonal-home-maintenance-australia',O21:'seasonal-home-maintenance-australia',O22:'seasonal-home-maintenance-australia',O23:'seasonal-home-maintenance-australia',O24:'seasonal-home-maintenance-australia',O25:'property-manager-maintenance-coordination',O27:'property-manager-maintenance-coordination',O30:'when-home-maintenance-needs-a-licensed-trade',O28:'when-home-maintenance-needs-a-licensed-trade',O26:'home-repair-priorities'};
const guideSlug=c=>guideFor[c.owner]||'prepare-before-home-repair-quote';
Object.assign(guideFor,{O01:'how-to-find-the-right-home-repairer',O11:'prepare-before-home-repair-quote',O12:'photos-and-clear-scope-for-home-repairs',O13:'photos-and-clear-scope-for-home-repairs',O14:'seasonal-home-maintenance-australia',O15:'seasonal-home-maintenance-australia',O16:'sticking-doors-windows-repair-guide',O17:'photos-and-clear-scope-for-home-repairs',O29:'prepare-before-home-repair-quote'});
const groups=new Map();
const headings={
 'carpenters':'Carpentry & Timber Repairs in Perth',
 'window-repairs':'Timber Window & Window Frame Repairs in Perth',
 'blinds-and-curtains':'Blind Installation & Curtain Repairs in Perth',
 'tiling':'Tile Repairs, Regrouting & Tiling in Perth',
 'timber-fencing':'Timber Fence & Gate Repairs in Perth',
 'deck-builders':'Deck Repairs, Maintenance & Deck Building in Perth',
 'waterproofing':'Shower & Balcony Waterproofing Repairs in Perth'
};
for(const c of data.clusters){const f=primary(c);if(!groups.has(f))groups.set(f,[]);groups.get(f).push(c)}
for(const [file,clusters] of groups){let h=read(file);h=h.replace(/<section class="section shell" id="keyword-repair-questions">[\s\S]*?<\/section>/,'');
 const heading=headings[clusters[0].slug];if(heading)h=h.replace(/<h1>.*?<\/h1>/,`<h1>${esc(heading)}</h1>`).replace(/<title>.*?<\/title>/,`<title>${esc(heading.replace(' in Perth',' Perth'))} | Ellis</title>`);
 const prefix=path.relative(path.dirname(path.join(root,file)),root).replaceAll('\\','/')||'.';
 h=h.replace(/<section class="section shell" id="repair-planning-guides">[\s\S]*?<\/section>/,'');
 h=h.replace(/<li><a href="#keyword-repair-questions">[\s\S]*?<\/a><\/li>/,'');
 if(file.endsWith('/handymen/index.html'))h=h.replace(/(<section[^>]*id="confirmed-handyman-services">)([\s\S]*?)(<\/section>)/,(_,start,body,end)=>start+body.replace(/<div class="accordion-list">[\s\S]*?<\/div>/g,'')+end);
 const slugs=[...new Set(clusters.map(guideSlug))];
 const block=`<section class="section shell" id="repair-planning-guides"><h2>Repair Planning Guides</h2><p>Read practical advice and answers to detailed repair questions before booking.</p><ul>${slugs.map(slug=>`<li><a href="${prefix}/guides/${slug}/">${esc(clean(read(`guides/${slug}/index.html`).match(/<h1>(.*?)<\/h1>/s)[1]))}</a></li>`).join('')}</ul></section>`;
 h=h.replace('</main>',block+'</main>');
 write(file,h);
}
const template=read('guides/prepare-before-home-repair-quote/index.html');
for(const g of data.guides){const route=`guides/${g.slug}/`,canonical=origin+route;
 const related=g.links.map(([p,label])=>{if(p.startsWith('services/')){const slug=p.replace(/\/$/,'').split('/').at(-1);if(!slug.includes('#')&&catalog.canonicalServices.some(s=>s.slug===slug))p=url(slug);}assert.ok(fs.existsSync(path.join(root,p.split('#')[0],p.split('#')[0].endsWith('/')?'index.html':'')),p);return `<li><a href="../../${p}">${esc(label)}</a></li>`}).join('');
 const crumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:origin},{'@type':'ListItem',position:2,name:'Guides & Advice',item:origin+'guides/'},{'@type':'ListItem',position:3,name:g.title,item:canonical}]};
 const faq={'@context':'https://schema.org','@type':'FAQPage',mainEntity:g.qa.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))};
 let h=template.replace(/<title>.*?<\/title>/,`<title>${esc(g.title)} | Ellis</title>`).replace(/(<meta name="description" content=")[^"]*/,`$1${esc(g.description)}`).replace(/(<link rel="canonical" href=")[^"]*/,`$1${canonical}`);
 h=h.replace(/<script type="application\/ld\+json">(.*?)<\/script>/gs,(all,json)=>{const obj=JSON.parse(json);return obj['@type']==='FAQPage'?`<script type="application/ld+json">${JSON.stringify(faq)}</script>`:obj['@type']==='BreadcrumbList'?`<script type="application/ld+json">${JSON.stringify(crumb)}</script>`:all});
 const main=`<main id="main"><article class="article"><header class="page-hero"><div class="article-shell"><nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="../../">Home</a></li><li><a href="../../guides/">Guides &amp; Advice</a></li><li><span aria-current="page">${esc(g.title)}</span></li></ol></nav><p class="eyebrow">Perth home repair guide</p><h1>${esc(g.title)}</h1><p class="lede">${esc(g.intro)}</p><p><a href="../../contact/">Contact Ellis Services Group</a> to arrange an on-site assessment in Perth, identify the cause and confirm the repair plan and quote.</p><p class="article-meta">Updated 2026-10-09</p></div></header><div class="article-shell article-body"><aside class="article-caution"><strong>Before attempting repairs</strong><p>This guide helps you describe a fault and plan an assessment. It does not diagnose your property or replace task-specific safety and trade requirements.</p></aside>${g.sections.map(([heading,p])=>`<section><h2>${esc(heading)}</h2><p>${esc(p)}</p></section>`).join('')}<section><h2>Common Repair Questions</h2><div class="accordion-list">${g.qa.map(([q,a])=>detail(q,a)).join('')}</div></section><section><h2>Related Repair Services &amp; Guides</h2><ul>${related}</ul></section><p><a class="text-link" href="../../contact/">Discuss the fault with Ellis Perth →</a></p></div></article></main>`;
 write(route+'index.html',h.replace(/<main\b[\s\S]*?<\/main>/,main));
}
// Existing guides get distinct practical sections, not a repeated keyword list.
const additions={
 'home-repair-priorities':['Home Maintenance To-do List & Pre-sale Repair Checklist','Separate immediate hazards and active damage from lower-priority cosmetic work. A door that will not close, loose shelf or unstable handrail needs its functional condition recorded; a wall mark before photography is a different priority. List each location, fault, preferred outcome and person approving the job. Group compatible small repairs, but do not assume plumbing, electrical or structural work belongs to the same general repair scope.'],
 'how-to-find-the-right-home-repairer':['Choosing Local Handyman Services for Small Repair Jobs','Explain the fault before choosing a trade label. Cupboard hinges, flat-pack assembly and picture hanging are different from a new power point, persistent shower leak or unstable roof component. Ask what the assessment covers, what work is included and who will confirm changes. Check the business details and credentials relevant to the task rather than treating a business name or advertisement as proof of every trade capability.'],
 'photos-and-clear-scope-for-home-repairs':['Fault Photos, Supplied Parts & Completion Records','A wide photo identifies the item and location; a close-up can show the hinge, damaged mesh or fixing hole. Photograph only what you can reach safely, without moving unstable panels or opening concealed services. Include supplied product details, missing parts and existing repair notes. Discuss the completion photos or handover record you need before booking, especially where an owner cannot attend. Keep the approved scope with any agreed changes.'],
 'prepare-before-home-repair-quote':['Itemised Handyman Quotes & Customer-supplied Materials','Ask whether labour is charged by time or by the job and whether any minimum, attendance or assessment charge applies. Identify materials you will supply, the proposed product and any missing hardware. The scope should distinguish labour, materials, removal, disposal and separate trade work. Bundling repairs may reduce duplicated setup, but the total depends on the tasks; it is not a guaranteed discount. Agree how extra damage changes the quote before authorising additional work.'],
 'property-manager-maintenance-coordination':['Vacate Repair Lists, Strata Repairs & Office Access','Keep wall holes, torn screens, cabinet faults and loose fittings as separate items in the approved repair list. Name the contact who can approve cost and confirm tenant or building access. For strata, distinguish lot work from common property; for offices and shops, include trading hours, noise limits and mounting locations. Agree any completion-photo requirements before work. A completion record documents agreed repairs, not a bond decision, statutory inspection or guarantee that concealed defects are absent.'],
 'seasonal-home-maintenance-australia':['Gutters, Flyscreens, Deck Boards & Outdoor Fixings','Record torn mesh, windows that stick after rain, overflowing gutters and loose deck fixings as observable faults. A cleaned gutter that still overflows may need drainage assessment. A deck needing oil may first need damaged boards or supports checked. Gates that drop and fences that keep leaning need support considered, not just latch adjustment. Avoid pressure cleaning fragile or unidentified older materials. Tree work, hazardous materials and structural damage require their own assessment rather than an ordinary garden tidy-up.'],
 'understanding-service-areas-and-postcode-checks':['Apartment Access & Suburb Details for Repair Visits','Provide the actual suburb and postcode together with lifts, parking, stairs, gates and the person arranging entry. A nearby team cannot infer those details from the suburb name. Describe an urgent deadline when calling, then confirm the appointment directly with Ellis. Availability and safe access determine the arrangement; a service-area page does not promise a fixed travel time to every property.'],
 'when-home-maintenance-needs-a-licensed-trade':['Mixed Repair Lists, Grab Rails & Wet-area Work','A TV bracket and a new power point require separate work scopes. A cupboard repair and a leaking sink should also be identified separately. Fire doors, security components, wet-area waterproofing and structural repairs need their specific requirements checked. For a grab rail, the position, product and supporting wall matter; a towel rail is not a substitute. Ordinary maintenance is not automatically a funded home modification. Confirm any plan or funding approval separately before agreeing work.']
};
for(const [slug,[heading,p]] of Object.entries(additions)){const file=`guides/${slug}/index.html`;let h=read(file);h=h.replace(/<section id="keyword-planning-details">[\s\S]*?<\/section>/,'');h=h.replace('<div class="article-shell article-body">',`<div class="article-shell article-body"><section id="keyword-planning-details"><h2>${esc(heading)}</h2><p>${esc(p)}</p></section>`);h=h.replace(/Updated \d{4}-\d{2}-\d{2}/,'Updated 2026-10-09');write(file,h)}
let hub=read('guides/index.html');hub=hub.replace(/<section class="section shell" id="repair-topic-guides">[\s\S]*?<\/section>/,'');
// Put detailed scenarios in the existing FAQ section of each relevant guide.
// Rebuild the generated subset on each run, keeping original editorial questions.
const guideGroups=new Map();
for(const c of data.clusters){const slug=guideSlug(c);if(!guideGroups.has(slug))guideGroups.set(slug,[]);guideGroups.get(slug).push(c)}
for(const [slug,clusters] of guideGroups){const file=`guides/${slug}/index.html`;let h=read(file);
 h=h.replace(/<!-- keyword-scenario-start -->[\s\S]*?<!-- keyword-scenario-end -->/g,'');
 const existing=new Set([...h.matchAll(/<summary>(.*?)<\/summary>/gs)].map(m=>clean(m[1]).toLowerCase()));
 let rendered=clusters.map(c=>{const intents=terms.filter(t=>t.owner===c.owner&&t.type==='意向提问词'&&!/[\u4e00-\u9fff]/.test(t.term));const q=intents[c.owner==='O01'||c.owner==='O30'?1:0].term;
  const answer=c.owner==='O30'?'A power point replacement is electrical work, separate from TV bracket fitting. Tell Ellis what needs changing so we can confirm the electrical work, applicable licensing requirements and quote before work starts.':c.answer;
  const pairs=[[q,answer],c.scenario].filter(([question])=>{const key=question.toLowerCase();if(existing.has(key))return false;existing.add(key);return true});
  return pairs.length?`<div class="repair-question-topic"><h3>${esc(c.heading)}</h3>${pairs.map(([q,a])=>detail(q,a)).join('')}<p><a href="../../${primary(c).replace(/index\.html$/,'')}">View ${esc(c.slug==='home'?'Perth handyman services':c.slug==='contact'?'booking details':catalog.canonicalServices.find(s=>s.slug===c.slug).name||c.heading)}</a></p></div>`:'';
 }).join('');
 const supplementary={
  'seasonal-home-maintenance-australia':[['Can you replace a damaged laminate board or vinyl plank?','Yes, where the flooring system and available replacement material allow a local repair. Click-lock boards and glued flooring need different access and preparation. Ellis checks how much surrounding flooring must be lifted and whether spare matching material is available before quoting.']],
  'sticking-doors-windows-repair-guide':[['Can you install a pet door in glass or a security screen?','Ellis checks the panel type and safety or security requirements before agreeing the installation. Some glass installations need a purpose-made replacement pane. We confirm the appropriate installation method, components and price before work begins.']],
  'when-home-maintenance-needs-a-licensed-trade':[['What should I confirm before requesting an NDIS-funded home repair?','Confirm funding eligibility, invoicing, registration requirements and approval with your plan contact before booking. Then share the approved repair list and any installation plan with Ellis. We confirm the work and access directly; funding approval is a separate step from the property assessment.']]
 };
 for(const [q,a] of supplementary[slug]||[])if(!existing.has(q.toLowerCase()))rendered+=detail(q,a);
 let inserted=false;
 h=h.replace(/<section\b[^>]*>[\s\S]*?<\/section>/g,section=>{if(inserted||!section.includes('<details>'))return section;inserted=true;return section.replace('</section>',`<!-- keyword-scenario-start -->${rendered}<!-- keyword-scenario-end --></section>`)});
 assert.ok(inserted,`Missing existing FAQ section: ${slug}`);
 const pairs=[...h.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/gs)].map(m=>[clean(m[1]),clean(m[2])]);
 const faq={'@context':'https://schema.org','@type':'FAQPage',mainEntity:pairs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))};
 h=h.replace(/<script type="application\/ld\+json">(.*?)<\/script>/gs,(all,json)=>JSON.parse(json)['@type']==='FAQPage'?`<script type="application/ld+json">${JSON.stringify(faq)}</script>`:all);
 write(file,h);
}
const guideCards=`<section class="section shell" id="repair-topic-guides"><h2>Repair or Replace? Practical Home Repair Guides</h2><div class="card-grid">${data.guides.map(g=>`<article class="service-card"><h3><a href="../guides/${g.slug}/">${esc(g.title)}</a></h3><p>${esc(g.description)}</p><a class="text-link" href="../guides/${g.slug}/">Read the repair guide →</a></article>`).join('')}</div></section>`;
hub=hub.replace('<section class="section shell">',guideCards+'<section class="section shell">');write('guides/index.html',hub);
let sitemap=read('sitemap.xml');for(const slug of [...data.guides.map(g=>g.slug),...Object.keys(additions)]){const canonical=origin+`guides/${slug}/`;if(!sitemap.includes(`<loc>${canonical}</loc>`))sitemap=sitemap.replace('</urlset>',`  <url><loc>${canonical}</loc><lastmod>2026-10-09</lastmod></url>\n</urlset>`)}write('sitemap.xml',sitemap);
const policy=JSON.parse(read('data/indexing-policy.json'));
for(const slug of [...data.guides.map(g=>g.slug),...Object.keys(additions)]){const route=`guides/${slug}/`;if(!policy.indexableSitemapRoutes.includes(route))policy.indexableSitemapRoutes.push(route)}
write('data/indexing-policy.json',JSON.stringify(policy,null,2));
const handymanFile='services/handyman-interiors-appliance-repairs/handymen/index.html';
write(handymanFile,require('./compact-handyman-page')(read(handymanFile)));
const placement={'核心词':'H1','意向提问词':'FAQ','场景使用词':'FAQ','蒸馏词':'H2/H3','问题科普词':'Guides & Advice'};
const coverage=terms.map(t=>{const c=data.clusters.find(c=>c.owner===t.owner);const page=['问题科普词','意向提问词','场景使用词'].includes(t.type)?`guides/${guideSlug(c)}/index.html`:primary(c),h=read(page);const blocks=t.type==='核心词'?[...h.matchAll(/<h1[^>]*>(.*?)<\/h1>/gs)]:t.type==='蒸馏词'?[...h.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gs)]:t.type==='问题科普词'?[[null,h.match(/<main[\s\S]*?<\/main>/)?.[0]||'']]:[...h.matchAll(/<details>(.*?)<\/details>/gs)];const exact=blocks.some(m=>clean(m[1]).toLowerCase().includes(t.term.toLowerCase()));return {...t,page,placement:placement[t.type],exact,status:exact?'目标位置字面匹配':'主题已承接；仍需逐词语义复核',note:/ndis|licensed|insured|cheap|best|Mandurah/i.test(t.term)?'不得据候选词新增注册、资质、最低价、排名或地区承诺':'同义词合并到主要页面，不按词逐一新建URL'}});
const out='docs/keyword-content-round';write(out+'/coverage.json',JSON.stringify(coverage,null,2));
const csv=x=>'"'+String(x).replaceAll('"','""')+'"';write(out+'/527词条页面与位置覆盖表.csv','\uFEFF'+['ID,Owner,词类,词条,本地主页面,目标位置,状态,说明',...coverage.map(t=>[t.id,t.owner,t.type,t.term,t.page,t.placement,t.status,t.note].map(csv).join(','))].join('\n'));
console.log(JSON.stringify({owners:data.clusters.length,modifiedLandingPages:groups.size,newGuides:data.guides.length,deepenedExistingGuides:Object.keys(additions).length,terms:coverage.length,literalMatches:coverage.filter(t=>t.exact).length,semanticReviewRemaining:coverage.filter(t=>!t.exact).length}));
