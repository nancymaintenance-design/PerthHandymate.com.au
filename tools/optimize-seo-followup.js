// Local candidate only. No network mutations or deployment commands.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),origin='https://www.perthhandymate.com.au/';
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const files=[];function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){if(['dist','docs','tools','tests','node_modules','.git'].includes(e.name))continue;const f=path.join(p,e.name);if(e.isDirectory())walk(f);else if(e.name.endsWith('.html')&&!e.name.startsWith('google'))files.push(f)}}walk(root);
const titles={
 'services/':'Perth Home Repair & Maintenance Services | Ellis',
 'areas/':'Handyman Near Me in Perth | Local Service Areas | Ellis',
 'services/handyman-interiors-appliance-repairs/handymen/':'Odd Jobs & Handyman Repairs Perth | Ellis',
 'services/handyman-interiors-appliance-repairs/carpenters/':'Carpentry Repairs & Joinery Perth | Ellis',
 'services/doors-windows-glass-screens/door-installation/':'Internal & External Door Installation Perth | Ellis',
 'services/handyman-interiors-appliance-repairs/':'Handyman, Interior & Appliance Repairs Perth | Ellis',
 'services/electrical-plumbing-gas-air-conditioning/':'Electrical, Plumbing & Air Conditioning Perth | Ellis',
 'areas/cockburn-rockingham-southern-corridor/':'Handyman Repairs Cockburn & Rockingham | Ellis Perth',
 'areas/eastern-suburbs-midland-swan/':'Handyman Repairs Midland & Swan | Ellis Perth',
 'areas/joondalup-northern-suburbs/':'Handyman Joondalup & Northern Suburbs | Ellis Perth'
};
const descriptions={
 'services/electrical-plumbing-gas-air-conditioning/':'Electrical, plumbing, gas and air conditioning services in Perth. Contact Ellis to assess faults, confirm the required trade and arrange a written quote.',
 'services/handyman-interiors-appliance-repairs/':'Handyman, interior and appliance repairs in Perth. Speak directly with Ellis about household repairs, assembly, fitting and property maintenance.',
 'services/doors-windows-glass-screens/':'Door, window, glass and flyscreen repairs in Perth. Ellis assesses damaged fittings, frames and screens before confirming repairs and a written quote.',
 'services/roofing-gutters-exterior/':'Roof, gutter and exterior repairs in Perth. Contact Ellis about leaks, blocked downpipes and weathered surfaces for an assessment and written quote.',
 'services/building-renovation-structural/':'Building and renovation services in Perth. Ellis assesses the property, confirms the required work and relevant approvals, and provides a written quote.',
 'services/gardens-landscaping/':'Garden care and landscaping in Perth. Ask Ellis about clean-ups, lawn care, pruning and outdoor improvements. We assess access and provide a written quote.',
 'services/outdoor-structures-fencing-pools/':'Deck, fence and outdoor structure services in Perth. Contact Ellis to assess damaged timber, boundaries and pool surrounds and confirm the work required.',
 'services/planning-inspection-compliance/':'Property inspections and planning services in Perth. Discuss your project with Ellis to confirm assessment, documentation and approval requirements.',
 'services/cleaning-removals-pest-hazard/':'Cleaning, removals, pest and hazard enquiries in Perth. Speak directly with Ellis to arrange an assessment and confirm suitable work and safety requirements.',
 'areas/cockburn-rockingham-southern-corridor/':'Handyman repairs in Cockburn, Rockingham and nearby southern suburbs. Contact Ellis Perth for an on-site assessment and written repair quote.',
 'services/roofing-gutters-exterior/cladding/':'Cladding repairs in Perth for loose, damaged or weathered panels. Ellis checks the material, wall condition and access before quoting the repair.',
 'services/electrical-plumbing-gas-air-conditioning/insulation/':'Insulation enquiries in Perth for ceilings, walls and underfloors. Ellis assesses coverage, condition and safe access before confirming the work and quote.',
 'services/electrical-plumbing-gas-air-conditioning/plumbers/':'Plumbing services in Perth for leaking taps, toilets and pipework. Contact Ellis to arrange a qualified assessment and a written repair quote.',
 'services/roofing-gutters-exterior/gutter-services/':'Gutter cleaning and repairs in Perth. Speak with Ellis about blocked, leaking or damaged gutters and downpipes. We assess access and confirm a written quote.',
 'services/roofing-gutters-exterior/house-painters/':'House painting and touch-ups in Perth. Ellis assesses rooms, exterior surfaces, preparation and the selected finish before providing a written quote.',
 'services/roofing-gutters-exterior/roofing/':'Roof repairs in Perth for leaks, damaged tiles, sheets and flashing. Ellis assesses safe access and water entry before confirming the repair and quote.',
 'services/roofing-gutters-exterior/renderers/':'Render repairs in Perth for cracked, hollow or damaged surfaces. Ellis checks the masonry, moisture and finish before providing a written repair quote.',
 'services/handyman-interiors-appliance-repairs/ikea-kitchens/':'IKEA kitchen installation in Perth. Discuss your confirmed plan, cabinet assembly and fitting with Ellis to arrange an assessment and written quote.'
};
const regionalLinks={
 'perth-central':['handyman-interiors-appliance-repairs/handymen','handyman-interiors-appliance-repairs/plasterers','doors-windows-glass-screens/door-installation'],
 'north-perth-stirling':['handyman-interiors-appliance-repairs/handymen','handyman-interiors-appliance-repairs/carpenters','doors-windows-glass-screens/window-repairs'],
 'joondalup-northern-suburbs':['roofing-gutters-exterior/gutter-services','gardens-landscaping/garden-clean-up','outdoor-structures-fencing-pools/timber-fencing'],
 'south-perth-canning':['handyman-interiors-appliance-repairs/handymen','handyman-interiors-appliance-repairs/plasterers','roofing-gutters-exterior/house-painters'],
 'fremantle-coastal-south':['doors-windows-glass-screens/window-repairs','doors-windows-glass-screens/fly-screens','handyman-interiors-appliance-repairs/carpenters'],
 'eastern-suburbs-midland-swan':['handyman-interiors-appliance-repairs/handymen','handyman-interiors-appliance-repairs/carpenters','roofing-gutters-exterior/house-painters'],
 'cockburn-rockingham-southern-corridor':['handyman-interiors-appliance-repairs/handymen','doors-windows-glass-screens/fly-screens','outdoor-structures-fencing-pools/timber-fencing']
};
const labels={'handymen':'Small handyman repairs','plasterers':'Wall and ceiling patching','door-installation':'Door repairs and installation','carpenters':'Carpentry and timber repairs','window-repairs':'Window repairs','gutter-services':'Gutter cleaning and repairs','garden-clean-up':'Garden clean-up','timber-fencing':'Timber fence repairs','house-painters':'Painting and touch-ups','fly-screens':'Flyscreen repairs'};
let changed=0;
for(const file of files){let h=fs.readFileSync(file,'utf8'),before=h;const relative=path.relative(root,file).replaceAll('\\','/'),route=relative.replace(/index\.html$/,'');
 const base=path.relative(path.dirname(file),root).replaceAll('\\','/')||'.';
 const canonical=h.match(/rel="canonical" href="([^"]+)"/)?.[1];if(!canonical)continue;
 let title=decode(h.match(/<title>(.*?)<\/title>/s)[1]);
 title=titles[route]||title.replace(/\| Ellis Services Group$/,'| Ellis');
 if(title!==decode(h.match(/<title>(.*?)<\/title>/s)[1]))h=h.replace(/<title>.*?<\/title>/s,`<title>${esc(title)}</title>`);
 if(descriptions[route])h=h.replace(/(<meta name="description" content=")[^"]*(">)/,`$1${esc(descriptions[route])}$2`);
 h=h.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(all,json)=>{const obj=JSON.parse(json);
   if(obj['@type']==='Organization'||obj['@type']==='LocalBusiness'){obj['@id']=origin+'#business';obj.logo=origin+'assets/images/ellis-services-group-logo.png';}
   if(obj['@type']==='LocalBusiness'){obj.sameAs=['https://www.instagram.com/elliservices_group/'];obj.areaServed={ '@type':'AdministrativeArea',name:'Perth metropolitan area'};}
   for(const k of ['brand','publisher'])if(obj[k]?.name==='Ellis Services Group')obj[k]['@id']=origin+'#business';
   return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
 });
 const nav=h.match(/<nav class="breadcrumbs"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 if(nav&&!h.includes('"@type":"BreadcrumbList"')){const items=[...nav.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m,i)=>({ '@type':'ListItem',position:i+1,name:decode(m[1].replace(/<[^>]+>/g,'').trim()),item:m[1].includes('href=')?new URL(m[1].match(/href="([^"]+)"/)[1],canonical).href:canonical}));if(items.length>=2)h=h.replace('</head>',`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items})}</script></head>`);}
 if(!h.includes('/analytics.js'))h=h.replace(/<script src="([^"]*assets\/js\/site\.js)"( defer)?><\/script>/,`<script src="${base}/assets/js/analytics.js"$2></script>$&`);
 h=h.replace("gtag('config','G-QDLBD5EN3B');", "if(['www.perthhandymate.com.au','perthhandymate.com.au'].includes(location.hostname)){gtag('config','G-QDLBD5EN3B',{page_location:location.origin+location.pathname,page_referrer:document.referrer.split('?')[0].split('#')[0]});}");
 if(route.endsWith('/handymen/')){
   h=h.replace(/<h1>(.*?)<\/h1>/, '<h1>Odd Jobs &amp; Handyman Repairs in Perth</h1>');
   if(!h.includes('class="service-toc"')){let n=0;const entries=[];h=h.replace(/<h2([^>]*)>(.*?)<\/h2>/g,(all,attrs,label)=>{if(['Explore','Important'].includes(label))return all;const id=attrs.match(/id="([^"]*)"/)?.[1]||`repair-section-${++n}`;entries.push({id,label});return attrs.includes('id=')?all:`<span class="repair-anchor" id="${id}"></span>${all}`;});const toc=`<nav class="service-toc" aria-label="Handyman repair topics"><strong>Find the repair you need</strong><ul>${entries.map(e=>`<li><a href="#${e.id}">${e.label}</a></li>`).join('')}</ul></nav>`;h=h.replace('<section class="section shell" id="service-work-options">',`<section class="section shell">${toc}</section><section class="section shell" id="service-work-options">`);}
 }
 const region=route.match(/^areas\/([^/]+)\/$/)?.[1];
 if(regionalLinks[region]){const suburb=h.match(/\?suburb=([^"&]+)/)?.[1]||'';const links=regionalLinks[region].map(p=>`<a data-preserve-search href="../../services/${p}/${suburb?'?suburb='+suburb:''}">${labels[p.split('/').at(-1)]}</a>`).join(', ');h=h.replace(/<p>Explore [\s\S]*?Select the actual service to read what can be assessed before contacting Ellis\.<\/p>/,`<p>Explore ${links}. Open the service that matches your repair to see the work Ellis can assess and what affects the quote.</p>`);}
 if(h!==before){fs.writeFileSync(file,h);changed++;}
}
console.log(`Updated ${changed} existing pages locally; URLs and indexing directives unchanged.`);
