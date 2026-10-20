const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('cheerio');
const {sourceFiles}=require('../scripts/lib/locales');
const root=path.resolve(__dirname,'..');
// Restoring any of the seven removed destinations must fail this regression test.
test('published bilingual pages retain only approved clickable external destinations',()=>{
 const allowed=new Set(['abr.business.gov.au','maps.app.goo.gl','www.google.com','www.instagram.com','www.linkedin.com','www.facebook.com']);
 const unexpected=[];const found=new Set();
 for(const file of sourceFiles(root))for(const prefix of ['','zh/']){
  const dom=load(fs.readFileSync(path.join(root,'dist',prefix,file),'utf8'));
  dom('a[href]').each((_,e)=>{const url=new URL(dom(e).attr('href'),'https://www.perthhandymate.com.au');if(!/^https?:$/.test(url.protocol)||['www.perthhandymate.com.au','perthhandymate.com.au'].includes(url.hostname))return;if(!allowed.has(url.hostname))unexpected.push({file:prefix+file,url:url.href});else found.add(url.hostname);});
  assert.equal(dom('main p').toArray().filter(e=>!dom(e).closest('form').length&&!dom(e).text().trim()&&!dom(e).find('img').length&&!dom(e).attr('id')).length,0,prefix+file+' has empty content paragraph');
 }
 assert.deepEqual(unexpected,[]);assert.equal(found.size,6,'approved destination categories remain present');
});
