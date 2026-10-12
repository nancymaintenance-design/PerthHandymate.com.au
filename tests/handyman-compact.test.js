const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('handyman landing offers six coherent sections instead of stacked repair descriptions',()=>{
 const h=fs.readFileSync(path.join(root,'services/handyman-interiors-appliance-repairs/handymen/index.html'),'utf8');
 const main=h.match(/<main\b[\s\S]*?<\/main>/)[0];
 assert.equal([...main.matchAll(/<section\b/g)].length,6);
 // Accepted gap work adds distinct scopes; preserve the compact navigation and six
 // booking questions rather than enforcing the previous round's arbitrary word limit.
 const cards=main.match(/<div class="handyman-task-grid">[\s\S]*?<\/div>/)[0];
 for(const card of cards.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)) {
  assert.equal([...card[0].matchAll(/<h3>/g)].length,1,'one task heading per summary');
  assert.match(card[0],/<p>[^<]+/,'a task answer rather than only links');
  assert.doesNotMatch(card[0],/<details\b/,'detailed accordion content stays out of task cards');
 }
 assert.match(cards,/id="shelf-installation"/,'shelving has its own task summary');
 assert.equal([...main.matchAll(/<details\b/g)].length,6);
 for(const topic of ['Sliding Door Repairs','Clothesline Repairs','Pet Door Installation','Laminate &amp; Vinyl Floor Repairs','Pressure Cleaning','Grab Rail Installation'])assert.ok(main.includes(topic),topic);
 assert.ok(main.indexOf('price-guide')<main.indexOf('service-questions'));
 assert.ok(!main.includes('id="keyword-map-repair-scenes"'));
});
test('every compact service topic has a working advice destination and booking retains location',()=>{
 const h=fs.readFileSync(path.join(root,'services/handyman-interiors-appliance-repairs/handymen/index.html'),'utf8');
 const cards=h.match(/<div class="handyman-task-grid">[\s\S]*?<\/div>/)?.[0];assert.ok(cards);
 const links=[...cards.matchAll(/href="([^"]+)"/g)];
 for(const card of cards.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)) assert.match(card[0],/href="[^"]+"/,'each task has a contextual next step');
 for(const [,href] of links){const target=new URL(href,'https://www.perthhandymate.com.au/services/handyman-interiors-appliance-repairs/handymen/');assert.ok(fs.existsSync(path.join(root,target.pathname,'index.html')),target.pathname);}
 const band=h.match(/<section class="section shell city-service-band">[\s\S]*?<\/section>/)[0];
 const regions=[...band.matchAll(/href="([^"]*suburb[^"]*)"/g)];assert.equal(regions.length,7);
 for(const [,href] of regions)assert.match(href,/contact\/\?service=/);
});
