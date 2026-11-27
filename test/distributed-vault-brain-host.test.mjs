import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createServer,request} from 'node:http';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,chmodSync,rmSync,symlinkSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {pathToFileURL} from 'node:url';
import {register} from 'node:module';
import {openPortableBrainState} from '../distributed-vault/portable-brain-state.mjs';
import {loadBrainHostBindings} from '../distributed-vault/brain-host-bindings.mjs';
import {createConfiguredBrain} from '../distributed-vault/sqlite-brain-runtime.mjs';

const owner='a'.repeat(64),supervisor=fileURLToPath(new URL('../distributed-vault/brain-supervisor.py',import.meta.url));
const runtime=fileURLToPath(new URL('../distributed-vault/sqlite-brain-runtime.mjs',import.meta.url));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const digest=value=>createHash('sha256').update(value).digest('hex');
async function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'brain-host-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const work=join(root,'work.sqlite'),statePath=join(root,'state.sqlite'),modulePath=join(root,'bindings.mjs');
 const db=new DatabaseSync(work);db.exec('CREATE TABLE work_tickets(id TEXT PRIMARY KEY,owner_hash TEXT,context_json TEXT,request TEXT,created_at INTEGER,updated_at INTEGER,status TEXT)');db.close();chmodSync(work,0o600);
 const state=openPortableBrainState(statePath);await state.put('owner-session:fixture',{expires:42,tokenHash:'preserve-existing-session'});await state.close();
 writeFileSync(modulePath,"const marker='private-fixture-marker'; export const WRITER_AI={marker,async run(model,input){if(this.marker!==marker)throw Error('lost receiver');return {response:'fixture answer',model,input};}};",{mode:0o600});
 const env={...process.env,BRAIN_WORK_DB:work,BRAIN_STATE_DB:statePath,WRITER_OWNER_HASH:owner,BRAIN_SQLITE_WRITER_ENABLED:'0',BRAIN_BINDINGS_MODULE:modulePath,BRAIN_SUPERVISOR_DB:join(root,'supervisor.sqlite'),BRAIN_STOP_FILE:join(root,'stop')};
 delete env.BRAIN_BINDINGS_SHA256;delete env.BOT_WORK_SECRET;
 return {root,work,statePath,modulePath,env};
}
async function unusedPort(){const s=createServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port;}
function http(url,method='GET'){
 return new Promise((resolve,reject)=>{const req=request(url,{method},res=>{let body='';res.on('data',part=>body+=part);res.on('end',()=>resolve({status:res.statusCode,body}));});req.on('error',reject);req.setTimeout(1000,()=>req.destroy(Error('timeout')));req.end(method==='POST'?'{}':undefined);});
}
function launch(env,program=supervisor){
 const child=spawn(program===runtime?process.execPath:'python3',[program],{env,stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',part=>output+=part);child.stderr.on('data',part=>output+=part);
 const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve({code,signal,output}));});
 return {child,done,output:()=>output};
}
async function waitForHealth(url,process){
 const deadline=Date.now()+12000;
 while(Date.now()<deadline){
  if(process.child.exitCode!==null)throw Error(process.output());
  try{const result=await http(url+'/local/health');if(result.status===200)return JSON.parse(result.body);}catch{}
  await delay(100);
 }
 throw Error('local host health deadline exceeded: '+process.output());
}
async function stop(process,env){
 if(process.child.exitCode===null){writeFileSync(env.BRAIN_STOP_FILE,'stop',{mode:0o600});}
 let timer;
 try{return await Promise.race([process.done,new Promise((resolve,reject)=>{timer=setTimeout(()=>{if(process.child.exitCode===null)process.child.kill('SIGTERM');reject(Error('supervisor did not stop'));},12000);})]);}
 finally{clearTimeout(timer);}
}
function starts(env){const db=new DatabaseSync(env.BRAIN_SUPERVISOR_DB,{readOnly:true});try{return db.prepare('SELECT * FROM brain_starts ORDER BY id').all();}finally{db.close();}}

test('private model binding forwards the original model/options and preserves its receiver',async t=>{
 const f=await fixture(t),bindings=await loadBrainHostBindings({modulePath:f.modulePath,expectedSha256:digest(readFileSync(f.modulePath))});
 const input={messages:[{role:'user',content:'Synthetic check'}],max_tokens:128};
 const reply=await bindings.WRITER_AI.run('@cf/openai/gpt-oss-120b',input);
 assert.equal(reply.model,'@cf/openai/gpt-oss-120b');assert.deepEqual(reply.input,input);assert.equal(reply.response,'fixture answer');
 assert.doesNotMatch(JSON.stringify(bindings),/private-fixture-marker|preserve-existing-session/);
 assert.deepEqual(await loadBrainHostBindings(),{});
});
test('binding source rejects public, symlink, wrong-pin and invalid modules without disclosing source',async t=>{
 const f=await fixture(t);
 await assert.rejects(loadBrainHostBindings({modulePath:'relative.mjs'}));
 await assert.rejects(loadBrainHostBindings({modulePath:f.modulePath,expectedSha256:'0'.repeat(64)}),/source_mismatch/);
 chmodSync(f.modulePath,0o644);await assert.rejects(loadBrainHostBindings({modulePath:f.modulePath}),/private/);chmodSync(f.modulePath,0o600);
 const linked=join(f.root,'linked.mjs');symlinkSync(f.modulePath,linked);await assert.rejects(loadBrainHostBindings({modulePath:linked}),/private/);
 for(const [index,source] of ['export const WRITER_AI={};','export const WORK_DB={}; export const WRITER_AI={run(){}};',"throw Error('private-module-canary'); export const WRITER_AI={run(){}};"].entries()){
  const path=join(f.root,'invalid-'+index+'.mjs');writeFileSync(path,source,{mode:0o600});
  await assert.rejects(loadBrainHostBindings({modulePath:path}),error=>{assert.doesNotMatch(error.stack,/private-module-canary/);return true;});
 }
});
test('adapter executes the checked bytes after a file swap while sibling imports retain their original base',async t=>{
 const f=await fixture(t),helper=join(f.root,'existing-model.mjs');
 writeFileSync(helper,"export const value='original-A';",{mode:0o600});
 const before="import {value} from './existing-model.mjs';export const WRITER_AI={run(){return value}};";
 const after="export const WRITER_AI={run(){return 'changed-after-pin'}};";
 writeFileSync(f.modulePath,before);
 const hash=digest(before),entry=pathToFileURL(f.modulePath).href+'?source='+hash;
 const loader=new URL('../distributed-vault/brain-host-binding-loader.mjs?binding='+digest(entry),import.meta.url).href;
 const swap=join(f.root,'swap-loader.mjs');
 writeFileSync(swap,"import {writeFileSync} from 'node:fs';let d;export function initialize(data){d=data}export async function resolve(s,c,next){if(s===d.entry||s===d.loader)writeFileSync(d.path,d.after);return next(s,c);}",{mode:0o600});
 register(pathToFileURL(swap),import.meta.url,{data:{entry,loader,path:f.modulePath,after}});
 const bindings=await loadBrainHostBindings({modulePath:f.modulePath,expectedSha256:hash});
 assert.equal(readFileSync(f.modulePath,'utf8'),after,'fixture changed the file after checksum validation');
 assert.equal(await bindings.WRITER_AI.run(),'original-A','the changed entrypoint must never execute');
});
test('configured original Brain invokes the existing model adapter only after signed claim and lease checks',async t=>{
 const f=await fixture(t),calls=join(f.root,'model-calls');
 const db=new DatabaseSync(f.work);
 const job={id:'TASK-1',repository:'www-infinity4/QuantaPhi',agent:'greenbeans',executor:'repository-engine',instructions:'Repair the existing fixture source and verify its tests.',acceptance:['Use the actual source.'],dependencies:[],status:'queued'};
 db.prepare('INSERT INTO work_tickets VALUES(?,?,?,?,?,?,?)').run('IW-host-fixture-1',owner,JSON.stringify({kind:'robot-directions',color_jobs:[job]}),'Synthetic fixture',Date.now(),Date.now(),'ready');db.close();
 writeFileSync(f.modulePath,"import {appendFileSync} from 'node:fs';export const WRITER_AI={async run(model,input){appendFileSync("+JSON.stringify(calls)+",JSON.stringify({model,max_tokens:input.max_tokens})+'\\n',{mode:0o600});return {response:JSON.stringify({summary:'Fixture adapter reached',requirements:[],subtasks:[],files:[],acceptance:[],blockers:[],notes:[]})};}};",{mode:0o600});
 f.env.BRAIN_SQLITE_WRITER_ENABLED='1';
 const brain=await createConfiguredBrain(f.env),originalFetch=globalThis.fetch;
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'host-adapter-fixture'};
 globalThis.fetch=async url=>{assert.equal(String(url),'https://token.actions.githubusercontent.com/.well-known/jwks');return Response.json({keys:[jwk]});};
 try{
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url'),now=Math.floor(Date.now()/1000);
  const unsigned=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({iss:'https://token.actions.githubusercontent.com',aud:'infinity-brain-writer',repository:'www-infinity4/Moltnook',repository_id:'1188306316',workflow_ref:'www-infinity4/Moltnook/.github/workflows/moltnook-repository-engine.yml@refs/heads/main',ref:'refs/heads/main',event_name:'schedule',run_id:'77',run_attempt:'1',exp:now+300,nbf:now-1});
  const token=unsigned+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(unsigned))).toString('base64url');
  const req=(auth,step,body={})=>new Request('https://owner-host.test/runner/'+step,{method:'POST',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await brain.fetch(req('invalid','plan'))).status,401);assert.equal(existsSync(calls),false);
  const claim=await (await brain.fetch(req(token,'claim'))).json();assert.equal(claim.lease.ticketId,'IW-host-fixture-1');
  const body={key:claim.lease.key,leaseId:'wrong',evidence:{colorFindings:{},runtime:{baseSha:'c'.repeat(40)}}};
  assert.equal((await brain.fetch(req(token,'plan',body))).status,409);assert.equal(existsSync(calls),false);
  body.leaseId=claim.lease.leaseId;
  const response=await brain.fetch(req(token,'plan',body));assert.equal(response.status,200);
  assert.equal((await response.json()).summary,'Fixture adapter reached');
  assert.deepEqual(JSON.parse(readFileSync(calls,'utf8').trim()),{model:'@cf/openai/gpt-oss-120b',max_tokens:5000});
 }finally{globalThis.fetch=originalFetch;await brain.close();}
});
test('enabled CLI refuses a missing model adapter before opening the original databases',async t=>{
 const f=await fixture(t),before=readFileSync(f.statePath);delete f.env.BRAIN_BINDINGS_MODULE;f.env.BRAIN_SQLITE_WRITER_ENABLED='1';
 const result=await launch(f.env,runtime).done;
 assert.equal(result.code,78);assert.match(result.output,/existing_model_binding_required/);assert.deepEqual(readFileSync(f.statePath),before);
});
test('supervisor holds one process, respects manual stop and preserves the original session',async t=>{
 const f=await fixture(t);f.env.BRAIN_PORT=String(await unusedPort());const url='http://127.0.0.1:'+f.env.BRAIN_PORT;
 const first=launch(f.env);t.after(()=>stop(first,f.env));
 const health=await waitForHealth(url,first);assert.equal(health.modelConfigured,true);assert.equal(health.writerEnabled,false);
 const second=await launch(f.env).done;assert.equal(second.code,73);assert.equal(starts(f.env).length,1);
 assert.equal((await http(url+'/runner/claim','POST')).status,503);assert.equal(starts(f.env).length,1,'HTTP service errors must not restart the child');
 assert.equal((await stop(first,f.env)).code,0);
 const state=openPortableBrainState(f.statePath);assert.deepEqual(await state.get('owner-session:fixture'),{expires:42,tokenHash:'preserve-existing-session'});await state.close();
 assert.equal(starts(f.env).length,1);assert.doesNotMatch(first.output(),/preserve-existing-session|private-fixture-marker/);
});
test('unexpected child failures recover with the same databases and a persisted attempt budget',async t=>{
 const f=await fixture(t),counter=join(f.root,'counter');
 writeFileSync(f.modulePath,"import {readFileSync,writeFileSync} from 'node:fs'; const file="+JSON.stringify(counter)+"; let n=0;try{n=Number(readFileSync(file,'utf8'))}catch{};writeFileSync(file,String(n+1));if(n<2)process.exit(1);export const WRITER_AI={async run(){return {response:'fixture'}}};",{mode:0o600});
 f.env.BRAIN_PORT=String(await unusedPort());const process=launch(f.env);t.after(()=>stop(process,f.env));
 await waitForHealth('http://127.0.0.1:'+f.env.BRAIN_PORT,process);
 assert.equal(readFileSync(counter,'utf8'),'3');assert.deepEqual(starts(f.env).map(x=>x.exit_code),[1,1,null]);
 await stop(process,f.env);
 const state=openPortableBrainState(f.statePath);assert.equal((await state.get('owner-session:fixture')).expires,42);await state.close();
 rmSync(f.env.BRAIN_STOP_FILE);
 const again=await launch(f.env).done;assert.equal(again.code,75);assert.equal(readFileSync(counter,'utf8'),'3','restarting the supervisor must not reset the budget');
});
test('configuration and occupied ports stop without retrying or killing the existing service',async t=>{
 const f=await fixture(t),existing=createServer((req,res)=>res.end('existing preserved'));
 await new Promise(resolve=>existing.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>existing.close(resolve)));
 f.env.BRAIN_PORT=String(existing.address().port);
 const result=await launch(f.env).done;assert.equal(result.code,78);assert.equal(starts(f.env).length,1);
 assert.equal((await http('http://127.0.0.1:'+f.env.BRAIN_PORT)).body,'existing preserved');
});
test('an intentional stop before launch spends no budget and protected databases cannot be supervisor ledgers',async t=>{
 const f=await fixture(t);writeFileSync(f.env.BRAIN_STOP_FILE,'stop',{mode:0o600});
 assert.equal((await launch(f.env).done).code,0);assert.equal(existsSync(f.env.BRAIN_SUPERVISOR_DB),false);
 rmSync(f.env.BRAIN_STOP_FILE);const before=readFileSync(f.work);f.env.BRAIN_SUPERVISOR_DB=f.work;
 assert.equal((await launch(f.env).done).code,78);assert.deepEqual(readFileSync(f.work),before);
});
