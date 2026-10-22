'use strict';
// Card labels are the maintained public names of the nine service categories.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function directory(html){
  html=html.replace(/<section\b[^>]*id="choose-repair-service"[\s\S]*?<\/section>/,'');
  return html.replace(/<section class="section shell"><h2>Maintenance across rooms or properties<\/h2>[\s\S]*?<\/section>/,'');
}
function category(html,slug){
  const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'data/content.js'),'utf8'),sandbox);
  const item=sandbox.window.ELLIS_CONTENT.services.find(item=>item.slug===slug);
  if(!item)throw new Error('Unknown category '+slug);
  const approved=JSON.parse(fs.readFileSync(path.join(root,'data/heading-keyword-policy.json'),'utf8')).pages[`services/${slug}/index.html`];
  const label=approved?.h1||item.title;
  return html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/,`<h1>${esc(label)}</h1>`).replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(label)} | Ellis</title>`);
}
function apply(){
  const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'data/content.js'),'utf8'),sandbox);
  const policyFile=path.join(root,'data/heading-keyword-policy.json'),policy=JSON.parse(fs.readFileSync(policyFile,'utf8'));
  for(const category of sandbox.window.ELLIS_CONTENT.services){
    const file=`services/${category.slug}/index.html`,target=path.join(root,file);
    const before=fs.readFileSync(target,'utf8');
    const label=policy.pages[file]?.h1||category.title;
    const after=before.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/,`<h1>${esc(label)}</h1>`).replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(label)} | Ellis</title>`);
    if(after!==before)fs.writeFileSync(target,after);
    if(policy.pages[file]){policy.pages[file].h1=label;policy.pages[file].title=label+' | Ellis';policy.pages[file].review='2026-10-16: user requested category destination heading to match directory card; retain Perth context in body and metadata description';}
  }
  fs.writeFileSync(policyFile,JSON.stringify(policy,null,2)+'\n');
  const index=path.join(root,'services/index.html');fs.writeFileSync(index,directory(fs.readFileSync(index,'utf8')));
}
module.exports={directory,category,apply};
if(require.main===module)apply();
