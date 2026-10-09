const fs=require('node:fs');
const root='https://www.perthhandymate.com.au/';
const clean=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
(async()=>{
const sitemap=await(await fetch(root+'sitemap.xml')).text();
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
const pages=[];let next=0;
await Promise.all(Array.from({length:6},async()=>{while(next<urls.length){const url=urls[next++];try{const r=await fetch(url,{signal:AbortSignal.timeout(20000)}),html=await r.text();const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';pages.push({url,status:r.status,title:clean(html.match(/<title>(.*?)<\/title>/is)?.[1]||''),description:html.match(/<meta name="description" content="([^"]*)"/i)?.[1]||'',h1:[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>clean(m[1])),words:clean(main).split(/\s+/).length,text:clean(main),images:[...html.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]),jsonld:[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>{try{return JSON.parse(m[1])}catch{return null}}),analytics:html.includes('G-QDLBD5EN3B'),scripts:[...html.matchAll(/<script\b[^>]*src="([^"]*)"/gi)].map(m=>m[1])});}catch(e){pages.push({url,error:e.message})}}}));
fs.writeFileSync('docs/seo-followup-live-2026-10-09.json',JSON.stringify(pages,null,2));
const dup=k=>Object.entries(Object.groupBy(pages,p=>p[k])).filter(([k,v])=>v.length>1).map(([key,v])=>({key,urls:v.map(p=>p.url)}));
console.log(JSON.stringify({total:pages.length,errors:pages.filter(p=>p.error||p.status!==200),duplicateTitles:dup('title'),duplicateDescriptions:dup('description'),titleOver65:pages.filter(p=>p.title?.length>65).map(p=>({url:p.url,title:p.title,length:p.title.length})),missingAnalytics:pages.filter(p=>!p.analytics).map(p=>p.url),thin:pages.filter(p=>p.words<350).map(p=>({url:p.url,words:p.words})),badH1:pages.filter(p=>p.h1?.length!==1).map(p=>p.url)},null,2));
for(const suffix of ['/','/about/','/contact/','/areas/north-perth-stirling/']){const p=pages.find(p=>suffix==='/'?p.url===root:p.url.endsWith(suffix));console.log('SAMPLE '+JSON.stringify(p));}
for(const p of pages.filter(p=>p.url.includes('/projects/')).slice(0,3))console.log('PROJECT '+JSON.stringify(p));
})().catch(e=>{console.error(e);process.exit(1)});
