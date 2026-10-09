const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/service-catalog.json'),'utf8'));
test('67 service area bands link directly to Contact with service and suburb',()=>{
  let total=0;
  for(const s of catalog.canonicalServices){
    const html=fs.readFileSync(path.join(root,s.url,'index.html'),'utf8');
    const band=html.match(/<section class="section shell city-service-band">[\s\S]*?<\/section>/)[0];
    const areaLinks=s.slug==='handymen'?band.match(/<div class="chip-list">[\s\S]*?<\/div>/)[0]:band;
    const links=[...areaLinks.matchAll(/href="([^"]+)"/g)];assert.equal(links.length,7,s.slug);
    for(const [,href] of links){const url=new URL(href,new URL(s.url,'https://www.perthhandymate.com.au/'));assert.equal(url.pathname,'/contact/');for(const key of ['service','q','suburb'])assert.ok(url.searchParams.get(key),s.slug+': '+key);total++;}
    assert.match(band,/on-site assessment/);
  }
  assert.equal(total,469);
});
test('seven area pages keep 63 service-category links with suburb context',()=>{
  let total=0;
  for(const e of fs.readdirSync(path.join(root,'areas'),{withFileTypes:true}).filter(e=>e.isDirectory())){
    const html=fs.readFileSync(path.join(root,'areas',e.name,'index.html'),'utf8');
    const chips=html.match(/<div class="chip-list">[\s\S]*?<\/div>/)[0];
    const links=[...chips.matchAll(/href="([^"]+)"/g)];assert.equal(links.length,9);
    for(const [,href] of links){const url=new URL(href,'https://www.perthhandymate.com.au/areas/'+e.name+'/');assert.match(url.pathname,/^\/services\/[^/]+\/$/);assert.ok(url.searchParams.get('suburb'));assert.ok(fs.existsSync(path.join(root,url.pathname,'index.html')));total++;}
  }
  assert.equal(total,63);
});
