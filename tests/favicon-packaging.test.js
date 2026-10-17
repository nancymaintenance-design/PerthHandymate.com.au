const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createBuildFixture,buildLocal}=require('./helpers/local-build');
const root=path.resolve(__dirname,'..');
test('production build publishes the four legacy root icon URLs as valid image files',t=>{
 const fixture=createBuildFixture(t);
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8')).buildCommand,'node scripts/build-local.js');
 const result=buildLocal(fixture);
 assert.equal(result.status,0,result.stderr||result.stdout);
 const temporary=path.join(fixture,'dist');
  for(const name of ['favicon.ico','favicon-192.png','favicon-32.png','apple-touch-icon.png']){
   const output=path.join(temporary,name);assert.ok(fs.existsSync(output),`${name} is missing from production build`);
   const bytes=fs.readFileSync(output);assert.ok(bytes.length>100);
   assert.ok(name.endsWith('.ico')?bytes.subarray(0,4).equals(Buffer.from([0,0,1,0])):bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),`${name} is not an image`);
  }
});
