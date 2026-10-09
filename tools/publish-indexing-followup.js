const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),repo='repos/nancymaintenance-design/PerthHandymate.com.au',baseline='34bc11597f8a31052524fa35638e372334c64a50';
const record=path.join(root,'docs/gsc-followup-release.json');
function api(e,m='GET',body){const a=['api',repo+(e?'/'+e:''),'--method',m];if(body)a.push('--input','-');const r=cp.spawnSync('gh',a,{input:body?JSON.stringify(body):undefined,encoding:'utf8',timeout:60000,maxBuffer:40*1024*1024});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
const hash=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
assert.equal(api('git/ref/heads/main').object.sha,baseline);assert.ok(!fs.existsSync(record),'Existing publication record; inspect before retry');
const parent=api('git/commits/'+baseline),tree=api('git/trees/'+parent.tree.sha+'?recursive=1');assert.equal(tree.truncated,false);
const inventory=new Map(tree.tree.filter(e=>e.type!=='tree').map(e=>[e.path,e]));
const names=['vercel.json','sitemap.xml','favicon.ico','favicon-192.png','favicon-32.png','apple-touch-icon.png','tests/favicon-packaging.test.js'];
const changed=names.map(p=>({path:p,bytes:fs.readFileSync(path.join(root,p))})).filter(x=>hash(x.bytes)!==inventory.get(x.path)?.sha);
if(process.argv[2]!=='publish'){console.log(JSON.stringify({baseline,files:changed.map(x=>x.path)}));process.exit();}
const r=cp.spawnSync(process.execPath,['--test','--test-reporter=dot',...fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.js')).map(f=>'tests/'+f)],{cwd:root,stdio:'inherit'});assert.equal(r.status,0);
const state={baseline,paths:changed.map(x=>x.path),stage:'STARTED'},save=()=>fs.writeFileSync(record,JSON.stringify(state,null,2));save();
const entries=[];for(const x of changed){const b=api('git/blobs','POST',{content:x.bytes.toString('base64'),encoding:'base64'});assert.equal(b.sha,hash(x.bytes));entries.push({path:x.path,mode:inventory.get(x.path)?.mode||'100644',type:'blob',sha:b.sha});}
const createdTree=api('git/trees','POST',{base_tree:parent.tree.sha,tree:entries});state.tree=createdTree.sha;save();
const actual=api('git/trees/'+createdTree.sha+'?recursive=1');assert.equal(actual.truncated,false);const expected=new Map(inventory);for(const e of entries)expected.set(e.path,e);const leaves=actual.tree.filter(e=>e.type!=='tree');assert.equal(leaves.length,expected.size);for(const e of leaves){const want=expected.get(e.path);assert.ok(want);for(const k of ['sha','mode','type'])assert.equal(e[k],want[k],e.path);}
const commit=api('git/commits','POST',{message:'Fix root favicon packaging and publish accurate service content lastmod dates',tree:createdTree.sha,parents:[baseline]});state.commit=commit.sha;state.stage='COMMIT_CREATED';save();assert.equal(api('git/ref/heads/main').object.sha,baseline);
const input={repositoryId:api('').node_id,refUpdates:[{name:'refs/heads/main',beforeOid:baseline,afterOid:commit.sha,force:false}]};state.stage='REF_UPDATE_ATTEMPTED';save();
const ref=cp.spawnSync('gh',['api','graphql','--method','POST','--input','-'],{input:JSON.stringify({query:'mutation($input: UpdateRefsInput!) { updateRefs(input: $input) { clientMutationId } }',variables:{input}}),encoding:'utf8',timeout:60000});assert.equal(ref.status,0,ref.stderr);const outcome=JSON.parse(ref.stdout);assert.ok(!outcome.errors,JSON.stringify(outcome.errors));assert.ok(outcome.data.updateRefs);assert.equal(api('git/ref/heads/main').object.sha,commit.sha);state.stage='GITHUB_VERIFIED';save();console.log(JSON.stringify(state));
