const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),file=path.join(root,'services/index.html');
let h=fs.readFileSync(file,'utf8');
if(!h.includes('services-overview-layout')){
 const support=h.match(/<section class="section shell support-feature">([\s\S]*?)<\/section>/);
 const cards=h.match(/<section class="section shell"><div class="card-grid">([\s\S]*?)<\/div><\/section>/);
 assert.ok(support&&cards,'Expected existing service cards and team introduction');
 assert.equal((cards[1].match(/<article /g)||[]).length,9);
 const copy=support[1].match(/<div class="support-copy">[\s\S]*?<\/div>/)[0];
 const figure=support[1].match(/<figure>[\s\S]*?<\/figure>/)[0];
 const cardHtml=cards[1].replace(/<article class="service-card">[\s\S]*?<\/article>/g,card=>{
  const href=card.match(/<h3><a href="([^"]+)"/)[1];
  return card.replace('<span class="text-link">Explore service <span aria-hidden="true">→</span></span>',`<a class="text-link" href="${href}">Explore service <span aria-hidden="true">→</span></a>`);
 });
 h=h.replace(support[0],'').replace(cards[0],`<section class="section shell services-overview-layout" id="service-groups"><div class="card-grid services-overview-cards">${cardHtml}</div><aside class="services-team-panel" aria-label="Our local Perth team">${figure}${copy}</aside></section>`);
 fs.writeFileSync(file,h);
}
console.log('Local services overview: nine cards plus one compact team sidebar.');
