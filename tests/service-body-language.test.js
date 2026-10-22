const test=require('node:test');
const assert=require('node:assert/strict');
const {serviceBodyCopy}=require('../scripts/lib/service-body-language');
const route='/services/handyman-interiors-appliance-repairs/furniture-assembly/';
const old='Any unresolved parts or fixing requirement is explained. Wall anchoring is not an unqualified promise for every wall or product; the supporting surface and instructions determine the suitable approach.';
const paragraph="After assembly we check the furniture's operation, fittings and agreed position. "+old;
function page(url){return `<link rel="canonical" href="https://www.perthhandymate.com.au${url}"><body><main><h2>${paragraph}</h2><p class="keep">${paragraph}</p><blockquote>${paragraph}</blockquote><p><a href="/contact/?q=assembly#request">Contact Us</a></p></main><script type="application/ld+json">${JSON.stringify({'@type':'FAQPage',mainEntity:[{'@type':'Question',name:'Anchoring?',acceptedAnswer:{'@type':'Answer',text:paragraph}}]})}</script></body>`;}
test('body review is canonical-route scoped and leaves questions, quotes, links and attributes intact',()=>{
 const html=page(route),result=serviceBodyCopy(html,false);
 assert.ok(result.includes(`<h2>${paragraph}</h2>`));
 assert.ok(result.includes(`<blockquote>${paragraph}</blockquote>`));
 assert.ok(result.includes('class="keep"'));
 assert.ok(result.includes('href="/contact/?q=assembly#request"'));
 assert.ok(result.includes('Whether and how the furniture can be anchored depends on the supporting wall and the product instructions.'));
 assert.equal(serviceBodyCopy(page('/about/'),false),page('/about/'));
 assert.equal(serviceBodyCopy('<p>'+paragraph+'</p>',false),'<p>'+paragraph+'</p>');
});
test('FAQ answer edits match visible prose and remain stable on repeated application',()=>{
 const first=serviceBodyCopy(page(route),false),second=serviceBodyCopy(first,false);
 assert.equal(first,second);
 const visible=first.match(/<p class="keep">([^<]+)<\/p>/)[1];
 const schema=JSON.parse(first.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
 assert.equal(schema.mainEntity[0].acceptedAnswer.text,visible);
 assert.ok(visible.includes('depends on the supporting wall and the product instructions'));
});
