const fs=require('node:fs'),path=require('node:path');
const origin='https://www.perthhandymate.com.au/';
async function main(){
 const sm=await fetch(origin+'sitemap.xml');const xml=await sm.text();const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 let next=0;const rows=[];
 await Promise.all(Array.from({length:8},async()=>{while(next<urls.length){const url=urls[next++];const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(30000)}),s=await r.text();const canon=s.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];const links=[...s.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>{try {return new URL(m[1].replaceAll('&amp;','&'),url).href.split(/[?#]/)[0]}catch{return null}}).filter(u=>u&&u.startsWith(origin));
 rows.push({url,status:r.status,xRobots:r.headers.get('x-robots-tag'),robots:s.match(/<meta[^>]*name="robots"[^>]*content="([^"]+)"/)?.[1],canonical:canon,selfCanonical:canon===url,links:[...new Set(links)]});
 }}));
 const inbound=new Map;for(const row of rows)for(const link of row.links)inbound.set(link,(inbound.get(link)||0)+1);
 const distances=new Map([[origin,0]]);let todo=[origin];while(todo.length){const u=todo.shift(),row=rows.find(x=>x.url===u);if(!row)continue;for(const link of row.links)if(!distances.has(link)){distances.set(link,distances.get(u)+1);todo.push(link);}}
 for(const row of rows){row.inboundPages=inbound.get(row.url)||0;row.clickDepth=distances.get(row.url)??null;delete row.links;}
 const lastmods=[...new Set([...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m=>m[1]))];
 const summary={at:new Date().toISOString(),sitemapStatus:sm.status,sitemapUrls:urls.length,lastmods,non200:rows.filter(r=>r.status!==200),noindex:rows.filter(r=>/noindex/i.test((r.robots||'')+(r.xRobots||''))),badCanonical:rows.filter(r=>!r.selfCanonical),unreachable:rows.filter(r=>r.clickDepth===null),core:rows.filter(r=>/\/(handymen|carpenters|gutter-services|door-installation|ikea-kitchens)\/$/.test(r.url)),rows};
 fs.writeFileSync(path.resolve(__dirname,'../docs/gsc-live-audit-2026-10-09.json'),JSON.stringify(summary,null,2));const {rows:all,...short}=summary;console.log(JSON.stringify(short,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
