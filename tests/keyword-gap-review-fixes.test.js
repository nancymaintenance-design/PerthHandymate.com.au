const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {extractPage}=require('../tools/content-seo-inventory');
const root=path.resolve(__dirname,'..');
const read=route=>fs.readFileSync(path.join(root,route.slice(1),'index.html'),'utf8');

test('timber repair guidance keeps internal page ownership terminology out of visible customer copy',()=>{
 const route='/services/outdoor-structures-fencing-pools/timber-fencing/';
 const page=extractPage(read(route),route);
 assert.doesNotMatch(page.mainText,/\bthis page\b[^.]*\bowner\b/i);
 assert.ok(page.contextualInternalLinks.some(link=>link.path.endsWith('/fence-builders/')),'new fence choice remains usable');
 assert.ok(page.contextualInternalLinks.some(link=>link.path.endsWith('/fencing-contractors/')),'project coordination choice remains usable');
});

test('TV shelving and wall-fixing guidance leads to the separate shelf assessment rather than cupboard repair',()=>{
 const route='/services/handyman-interiors-appliance-repairs/tv-wall-mounting/';
 const page=extractPage(read(route),route);
 const link=page.contextualInternalLinks.find(link=>link.text==='small repair and wall-fixing service');
 assert.ok(link,'related wall-fixing guidance is discoverable');
 assert.equal(link.path,'/services/handyman-interiors-appliance-repairs/handymen/');
 assert.equal(link.hash,'#shelf-installation');
 const target=read(link.path).match(/<article id="shelf-installation">[\s\S]*?<\/article>/)?.[0];
 assert.ok(target,'the destination is an existing task answer');
 assert.match(extractPage(`<main>${target}</main>`,link.path).mainText,/load.*wall|wall.*load/i,'destination explains the relevant support decision');
});
