const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
function html(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory()
    ? (['dist','docs','tools','tests','.git','node_modules'].includes(e.name) ? [] : html(path.join(dir,e.name)))
    : (e.name.endsWith('.html') ? [path.join(dir,e.name)] : []));
}
test('public text and image descriptions use concrete wording instead of retired abstract copy', () => {
  const failures = [];
  for (const file of html(root)) {
    const s = fs.readFileSync(file,'utf8').replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'');
    const visible = [...s.matchAll(/>([^<>]+)</g)].map(m=>m[1]).join('\n');
    const descriptions = [...s.matchAll(/(?:alt|content)="([^"]*)"/g)].map(m=>m[1]).join('\n');
    const matches = (visible+'\n'+descriptions).match(/[^\n]*\b(?:context|pathways?|scoping|constraints|routing)\b[^\n]*/gi);
    if (matches) failures.push(`${path.relative(root,file)}: ${matches.join('; ')}`);
  }
  assert.deepEqual(failures,[]);
});
test('all ten case pages invite direct assessment and make photos optional', () => {
  const cases = fs.readdirSync(path.join(root,'projects'),{withFileTypes:true}).filter(e=>e.isDirectory());
  assert.equal(cases.length,10);
  for (const entry of cases) {
    const s = fs.readFileSync(path.join(root,'projects',entry.name,'index.html'),'utf8');
    const band = s.match(/<section class="cta-band">[\s\S]*?<\/section>/)?.[0] || '';
    assert.ok(band.includes('Contact Ellis directly to arrange an on-site assessment.'),entry.name);
    assert.ok(band.includes('Existing photos and approximate measurements are optional;'),entry.name);
    assert.match(band,/data-preserve-search href="\.\.\/\.\.\/contact\/\?service=/);
    assert.equal((s.match(/>Arrange an on-site assessment<\/a>/g)||[]).length,2,entry.name);
  }
});
