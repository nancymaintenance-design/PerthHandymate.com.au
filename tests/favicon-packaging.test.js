const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('production build publishes the four legacy root icon URLs as valid image files',()=>{
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'phm-icon-build-'));
 try {
  const target=temporary.replaceAll('\\','/');
  const command=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8')).buildCommand.replace(/\bdist\b/g,`"${target}"`);
  cp.execFileSync(process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'/bin/bash',['-c',command],{cwd:root,timeout:60000,stdio:'pipe'});
  for(const name of ['favicon.ico','favicon-192.png','favicon-32.png','apple-touch-icon.png']){
   const output=path.join(temporary,name);assert.ok(fs.existsSync(output),`${name} is missing from production build`);
   const bytes=fs.readFileSync(output);assert.ok(bytes.length>100);
   assert.ok(name.endsWith('.ico')?bytes.subarray(0,4).equals(Buffer.from([0,0,1,0])):bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),`${name} is not an image`);
  }
 } finally {
  assert.equal(path.dirname(path.resolve(temporary)),path.resolve(os.tmpdir()));
  assert.ok(path.basename(temporary).startsWith('phm-icon-build-'));
  fs.rmSync(temporary,{recursive:true,force:true});
 }
});
