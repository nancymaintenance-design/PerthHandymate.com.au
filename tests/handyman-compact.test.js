const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('handyman landing offers six coherent sections instead of stacked repair descriptions',()=>{
 const h=fs.readFileSync(path.join(root,'services/handyman-interiors-appliance-repairs/handymen/index.html'),'utf8');
 const main=h.match(/<main\b[\s\S]*?<\/main>/)[0];
 assert.equal([...main.matchAll(/<section\b/g)].length,6);
 const words=main.replace(/<[^>]+>/g,' ').trim().split(/\s+/).filter(Boolean).length;
 assert.ok(words<=1100,`page still overloaded: ${words} words`);
 assert.ok(words>=650,'service scope must not be reduced to a thin link list');
 assert.equal([...main.matchAll(/<details\b/g)].length,6);
 for(const topic of ['Sliding Door Repairs','Clothesline Repairs','Pet Door Installation','Laminate &amp; Vinyl Floor Repairs','Pressure Cleaning','Grab Rail Installation'])assert.ok(main.includes(topic),topic);
 assert.ok(main.indexOf('price-guide')<main.indexOf('service-questions'));
 assert.ok(!main.includes('id="keyword-map-repair-scenes"'));
});
test('every compact service topic has a working advice destination and booking retains location',()=>{
 const h=fs.readFileSync(path.join(root,'services/handyman-interiors-appliance-repairs/handymen/index.html'),'utf8');
 const cards=h.match(/<div class="handyman-task-grid">[\s\S]*?<\/div>/)?.[0];assert.ok(cards);
 const links=[...cards.matchAll(/href="([^"]+)"/g)];assert.equal(links.length,9);
 for(const [,href] of links){const target=new URL(href,'https://www.perthhandymate.com.au/services/handyman-interiors-appliance-repairs/handymen/');assert.ok(fs.existsSync(path.join(root,target.pathname,'index.html')),target.pathname);}
 const band=h.match(/<section class="section shell city-service-band">[\s\S]*?<\/section>/)[0];
 const regions=[...band.matchAll(/href="([^"]*suburb[^"]*)"/g)];assert.equal(regions.length,7);
 for(const [,href] of regions)assert.match(href,/contact\/\?service=/);
});
