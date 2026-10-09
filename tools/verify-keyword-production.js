const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),origin='https://www.perthhandymate.com.au';
const release=JSON.parse(fs.readFileSync(path.join(root,'docs/keyword-content-production-release-2026-10-09.json')));
function normalize(h){return h.replaceAll('\r\n','\n').replace(/<a\b[^>]*>/gi,tag=>tag.replace(/\bhref=(["'])([^"']+)\1/i,(a,q,href)=>{if(/^(?:#|mailto:|tel:|javascript:)/i.test(href))return a;const cut=href.search(/[?#]/),p=cut<0?href:href.slice(0,cut),s=cut<0?'':href.slice(cut);if(/^https?:\/\//i.test(p)&&!p.startsWith(origin+'/'))return a;if(!/(?:^|\/)index\.html$/i.test(p))return a;return `href=${q}${p.slice(0,-10)||'./'}${s}${q}`;}));}
async function run(){
 const files=release.paths.filter(p=>!p.startsWith('tools/')&&!p.startsWith('tests/')&&!p.startsWith('data/')&&p!=='vercel.json');
 const rows=[];let next=0;
 await Promise.all(Array.from({length:6},async()=>{while(next<files.length){const p=files[next++],route='/'+p.replace(/index\.html$/,''),r=await fetch(origin+route+'?release='+release.commit,{signal:AbortSignal.timeout(30000)}),b=Buffer.from(await r.arrayBuffer()),local=fs.readFileSync(path.join(root,p)),text=/\.(html|css|js|xml|txt|svg)$/.test(p);rows.push({path:p,status:r.status,match:text?(p.endsWith('.html')?normalize(b.toString())===normalize(local.toString()):b.toString().replaceAll('\r\n','\n')===local.toString().replaceAll('\r\n','\n')):b.equals(local)});}}));
 const contact=await fetch(origin+'/api/contact',{signal:AbortSignal.timeout(20000)});
 const failed=rows.filter(x=>!x.match||x.status!==(x.path==='404.html'?404:200));
 fs.writeFileSync(path.join(root,'docs/keyword-content-live-verification-2026-10-09.json'),JSON.stringify({commit:release.commit,checkedAt:new Date().toISOString(),rows,contactGetStatus:contact.status,failed},null,2));
 console.log(JSON.stringify({commit:release.commit,checked:rows.length,failed,contactGetStatus:contact.status}));assert.deepEqual(failed,[]);assert.equal(contact.status,405);
}
run().catch(e=>{console.error(e);process.exitCode=1});
