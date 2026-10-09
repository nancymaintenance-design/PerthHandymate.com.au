const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),release=JSON.parse(fs.readFileSync(path.join(root,'docs/seo-production-release.json'),'utf8'));
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(['dist','docs','tools','tests','.git'].includes(e.name)?[]:walk(path.join(d,e.name))):[path.join(d,e.name)]);}
const files=walk(root).filter(f=>/[/\\](?:index|404)\.html$/.test(f));
files.push(path.join(root,'assets/css/global.css'),path.join(root,'data/service-catalog.json'),path.join(root,'data/content.js'));
async function run(){
  let next=0;const rows=[];
  await Promise.all(Array.from({length:6},async()=>{while(next<files.length){const file=files[next++],rel=path.relative(root,file).replaceAll('\\','/'),route='/'+rel.replace(/index\.html$/,'');
    const res=await fetch('https://www.perthhandymate.com.au'+route+'?release='+release.commit,{signal:AbortSignal.timeout(30000)});
    const source=await res.text(),expected=fs.readFileSync(file,'utf8');
    rows.push({route,status:res.status,exact:source.replaceAll('\r\n','\n')===expected.replaceAll('\r\n','\n')});
  }}));
  fs.writeFileSync(path.join(root,'docs/seo-live-verification.json'),JSON.stringify({commit:release.commit,checkedAt:new Date().toISOString(),rows},null,2));
  assert.equal(rows.length,113);const failed=rows.filter(r=>r.status!==200||!r.exact);assert.deepEqual(failed,[]);
  const redirects=[];
  for(const [from,to] of [['https://www.perthhandymate.com.au/index.html','https://www.perthhandymate.com.au/'],['https://www.perthhandymate.com.au/services/roofing-gutters-exterior/gutter-services/index.html','https://www.perthhandymate.com.au/services/roofing-gutters-exterior/gutter-services/']]){
    const res=await fetch(from,{redirect:'manual',signal:AbortSignal.timeout(20000)});assert.ok([301,308].includes(res.status));assert.equal(new URL(res.headers.get('location'),from).href,to);redirects.push({from,status:res.status,to});
  }
  const endpoint=await fetch('https://www.perthhandymate.com.au/api/contact',{signal:AbortSignal.timeout(20000)});assert.equal(endpoint.status,405);
  console.log(JSON.stringify({commit:release.commit,htmlPages:110,assetAndDataFiles:3,matched:rows.length,redirectsChecked:redirects.length,contactGetStatus:endpoint.status,success:true}));
}
run().catch(e=>{console.error(e);process.exitCode=1});
