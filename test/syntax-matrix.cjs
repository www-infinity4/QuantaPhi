const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {SyntaxEradicator,validate}=require('../tools/syntax-matrix.cjs');
test('Broken syntax reports exact location; CSS uses its own parser',()=>{assert.equal(validate('const x = {','x.js').ok,false);assert.equal(validate('a {color:red','x.css').ok,false);assert.equal(validate('const x = `hello`;','x.js').ok,true)});
test('Invalid candidates and unsigned runtime changes preserve original buffer',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'syntax-matrix-'));const file=path.join(root,'robot-directions.js');await fs.writeFile(file,'const x = {');const e=new SyntaxEradicator(root);
 assert.equal((await e.execute({file_path:'robot-directions.js'})).status,'blocked');
 assert.equal((await e.execute({file_path:'robot-directions.js',candidate:'const x = {'})).status,'blocked');
 assert.equal((await e.execute({file_path:'robot-directions.js',candidate:'const x = {};'})).status,'blocked');
 assert.equal(await fs.readFile(file,'utf8'),'const x = {');
 assert.equal((await e.execute({file_path:'robot-directions.js',candidate:'const x = {};',verify:async()=>true})).status,'written');
 assert.equal(await fs.readFile(file,'utf8'),'const x = {};');await fs.rm(root,{recursive:true,force:true});
});
