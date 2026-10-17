const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('about contact card removes its review link without removing directions or footer reviews',()=>{
  for(const prefix of ['','zh/']){
    const html=fs.readFileSync(path.join(root,'dist',prefix,'about/index.html'),'utf8');
    const main=html.match(/<main\b[\s\S]*?<\/main>/)[0];
    assert.ok(!main.includes('https://maps.app.goo.gl/iqNh8cGNbaZhBuP17'));
    assert.ok(main.includes('https://www.google.com/maps/place/'));
    assert.ok(html.match(/<footer[\s\S]*?<\/footer>/)[0].includes('https://maps.app.goo.gl/iqNh8cGNbaZhBuP17'));
  }
});
test('guide card titles and destination H1 are aligned without redundant Perth',()=>{
  for(const prefix of ['','zh/']){
    const index=fs.readFileSync(path.join(root,'dist',prefix,'guides/index.html'),'utf8');
    const cards=[...index.matchAll(/<h3[^>]*>\s*<a href="([^"]+)">([^<]+)<\/a>/g)];
    assert.equal(cards.length,12);
    for(const [,href,label]of cards){
      assert.doesNotMatch(label,/Perth|珀斯/i);
      const target=new URL(href,'https://www.perthhandymate.com.au/'+prefix+'guides/').pathname;
      const html=fs.readFileSync(path.join(root,'dist',target,'index.html'),'utf8');
      assert.equal(html.match(/<h1[^>]*>(.*?)<\/h1>/)[1],label);
    }
  }
});
