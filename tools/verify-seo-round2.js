const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const base=path.resolve(root,'../phm-pending-release-2026-10-08/candidate');
const {mergeContactHref}=require('../assets/js/site.js');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/service-catalog.json'),'utf8'));
function html(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>['dist','tools','tests','.git'].includes(e.name)?[]:e.isDirectory()?html(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);}
async function main(){
 let compared=0,changed=0;
 for(const f of html(root)){
  const rel=path.relative(root,f),old=path.join(base,rel);if(!fs.existsSync(old))continue;
  const h=fs.readFileSync(f,'utf8'),b=fs.readFileSync(old,'utf8');
  assert.equal(h.match(/<footer[\s\S]*?<\/footer>/)?.[0],b.match(/<footer[\s\S]*?<\/footer>/)?.[0],rel+' footer changed');
  assert.equal(h.match(/<link rel="canonical"[^>]*>/)?.[0],b.match(/<link rel="canonical"[^>]*>/)?.[0],rel+' canonical changed');
  compared++;if(h!==b)changed++;
 }
 for(const s of catalog.canonicalServices){
  const h=fs.readFileSync(path.join(root,s.url,'index.html'),'utf8');
  assert.ok(!/covered by this service\?|What can change the recommended approach\?/.test(h),s.slug+' generic FAQ remains');
 }
 const checks=[['/areas/north-perth-stirling/','local-repair-jobs'],['/services/handyman-interiors-appliance-repairs/handymen/','small-repair-services'],['/services/doors-windows-glass-screens/','door-repair-or-installation'],['/contact/','repair-quote-process']];
 for(const [url,id] of checks){const r=await fetch('http://127.0.0.1:4175'+url);assert.equal(r.status,200);assert.ok((await r.text()).includes('id="'+id+'"'),url);}
 const category=fs.readFileSync(path.join(root,'services/handyman-interiors-appliance-repairs/index.html'),'utf8');
 const anchor=category.match(/<a data-preserve-search[^>]+href="([^\"]*\/handymen\/[^\"]*)"/);
 assert.ok(anchor,'category link must retain search context');
 const detail=mergeContactHref(anchor[1],'?suburb=North%20Perth&q=Loose%20hinge');
 const detailParams=new URL(detail,'http://127.0.0.1:4175/services/handyman-interiors-appliance-repairs/').search;
 const h=fs.readFileSync(path.join(root,'services/handyman-interiors-appliance-repairs/handymen/index.html'),'utf8');
 const contact=h.match(/data-preserve-search href="([^\"]*contact\/\?service=[^\"]*)"/)[1];
 const final=new URL(mergeContactHref(contact,detailParams),'http://127.0.0.1:4175/');
 assert.equal(final.searchParams.get('suburb'),'North Perth');
 assert.equal(final.searchParams.get('q'),'Loose hinge');
 console.log(JSON.stringify({footerAndCanonicalUnchanged:compared,changedHtmlSinceRelease:changed,serviceBoilerplateChecked:catalog.canonicalServices.length,previewRoutesPassed:checks.length,locationThroughCategoryDetailContact:'passed'},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
