'use strict';
// Approved 17 October cleanup: guide labels carry the scenario, not repeated city text.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {sourceFiles,clean}=require('../scripts/lib/locales');
const strip=title=>title.replace(/\s+in Perth\b/gi,'').replace(/\s+for Perth\b/gi,'').replace(/\bPerth\s+/g,'').trim();
const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function apply(){
  const maps=[JSON.parse(fs.readFileSync(path.join(root,'locales/zh-Hans.json'),'utf8')),...fs.readdirSync(path.join(root,'locales/parts')).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(fs.readFileSync(path.join(root,'locales/parts',f),'utf8'))),JSON.parse(fs.readFileSync(path.join(root,'locales/editorial-overrides.json'),'utf8'))];
  const dictionary=Object.assign({},...maps),pairs=require('../data/guide-library').guides.map(g=>[g.title,strip(g.title)]);
  pairs.push(['Our Perth Handyman & Maintenance Office','Our Handyman & Maintenance Office']);
  const translations={};
  for(const [old,next]of pairs){if(!dictionary[old])throw new Error('Missing reviewed title '+old);translations[next]=dictionary[old].replaceAll('珀斯','');}
  // Apply exact full titles, never strip place names from prose, addresses or scope.
  for(const relative of [...sourceFiles(root),'data/guide-library.js','data/content.js','data/keyword-content-round.json','data/heading-keyword-policy.json']){
    const file=path.join(root,relative),before=fs.readFileSync(file,'utf8');let after=before;
    for(const [old,next]of pairs){after=after.split(old).join(next).split(esc(old)).join(esc(next));}
    if(relative==='about/index.html')after=after.replace(/(<main\b[\s\S]*?<\/main>)/,main=>main.replace(/<a\b[^>]*href="https:\/\/maps\.app\.goo\.gl\/iqNh8cGNbaZhBuP17"[^>]*>[\s\S]*?<\/a>/g,''));
    if(after!==before)fs.writeFileSync(file,after);
  }
  fs.writeFileSync(path.join(root,'locales/parts/revision-guide-titles.json'),JSON.stringify(translations,null,2)+'\n');
}
module.exports={apply,strip};if(require.main===module)apply();
