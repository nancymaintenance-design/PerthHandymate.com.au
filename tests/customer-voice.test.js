'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{load}=require('cheerio');
const root=path.resolve(__dirname,'..'),{sourceFiles}=require('../scripts/lib/locales');
test('published bilingual pages omit blanket availability disclaimers and conditional 30-minute claims',()=>{
 const failures=[];
 for(const file of sourceFiles(root))for(const prefix of ['','zh/']){
  const $=load(fs.readFileSync(path.join(root,'dist',prefix,file),'utf8')),text=$('body').text();
  if(/circumstances outside our control|subject to location|30 minutes|30 分钟|不可控因素|无法控制的情况/.test(text))failures.push(prefix+file);
 }
 assert.deepEqual(failures,[],'Publish direct service copy, not disclaimer footnotes or an unsupported arrival-time promise');
});
test('public copy keeps real safety instructions, company identity, links and image sources',()=>{
 const {publicCopy}=require('../scripts/lib/customer-voice');
 const before='<main><h1>Window repairs</h1><p>Tell Ellis about broken glass. Keep people clear of broken or loose glass.</p><a href="/contact/?service=Ellis">Contact Ellis</a><img src="/assets/images/ellis.webp" alt="Ellis Services Group logo"></main>';
 const after=publicCopy(before,false),a=load(before),b=load(after);
 assert.match(b('main').text(),/Tell us about broken glass/);assert.match(b('main').text(),/Keep people clear of broken or loose glass/);
 assert.equal(b('a').attr('href'),a('a').attr('href'));assert.equal(b('img').attr('src'),a('img').attr('src'));assert.equal(b('img').attr('alt'),a('img').attr('alt'));
 assert.equal(publicCopy(after,false),after);
});
test('Chinese first-person cleanup follows the same meaning without strengthening guarantees',()=>{
 const {publicCopy}=require('../scripts/lib/customer-voice');
 const input='<main><p>告诉 Ellis 门窗问题。Ellis 会安排现场评估。</p><p>请远离破损玻璃。</p></main>';
 const after=publicCopy(input,true);assert.match(after,/告诉我们/);assert.match(after,/我们会安排/);assert.match(after,/请远离破损玻璃/);assert.doesNotMatch(after,/保证|必定|永久免费/);
});
test('first-person text remains grammatical in mid-sentence and raw script content stays unchanged',()=>{
 const {publicCopy}=require('../scripts/lib/customer-voice');
 assert.match(publicCopy('<p>Tell Ellis the task and Ellis confirms the appointment.</p>'),/Tell us the task and we confirm the appointment/);
 const script='<script>const note="Tell Ellis about the job";</script>';
 assert.ok(publicCopy(script+'<p>Contact Ellis</p>').includes(script));
});
test('company action clauses keep coordinated verbs and pronouns in first person',()=>{
 const {publicCopy}=require('../scripts/lib/customer-voice');
 assert.equal(publicCopy('<p> Ellis cleans, repairs and replaces gutters. Ellis also provides repairs with its own appropriately licensed personnel.</p>'),'<p> We clean, repair and replace gutters. We also provide repairs with our own appropriately licensed personnel.</p>');
 assert.equal(publicCopy('<p>Ellis confirms access, assesses the property and provides a written quote.</p>'),'<p>We confirm access, assess the property and provide a written quote.</p>');
 assert.equal(publicCopy('<p>Tell Ellis who approves the work. Ellis assesses the property.</p>'),'<p>Tell us who approves the work. We assess the property.</p>');
});
test('private editorial rules are not published as a public data file',()=>{
 assert.equal(fs.existsSync(path.join(root,'dist/data/customer-voice.json')),false);
});
test('copy cleanup preserves empty enquiry validation and live-status elements',()=>{
 const {publicCopy}=require('../scripts/lib/customer-voice');
 const input='<body><p class="field-error" id="name-error"></p><p class="form-status" aria-live="polite"></p><p class="footer-note">*Subject to location, safe access and circumstances outside our control.</p></body>';
 const $=load(publicCopy(input));assert.equal($('.field-error').length,1);assert.equal($('.form-status[aria-live=polite]').length,1);assert.equal($('.footer-note').length,0);
});
