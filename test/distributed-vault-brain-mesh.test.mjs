import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createServer,request} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,chmodSync,rmSync,linkSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {openPortableBrainState} from '../distributed-vault/portable-brain-state.mjs';
import {packFile,restoreFile} from '../distributed-vault/vault-core.mjs';
import {createMeshServer} from '../distributed-vault/mesh-server.mjs';
import {createConfiguredMeshHost} from '../distributed-vault/mesh-runner.mjs';

const owner='a'.repeat(64),meshToken='synthetic-existing-mesh-owner-'.padEnd(48,'Q');
const supervisor=fileURLToPath(new URL('../distributed-vault/brain-supervisor.py',import.meta.url));
function http(url,method='GET',body,token,{chunked=false}={}){
 return new Promise((resolve,reject)=>{
  const req=request(url,{method,headers:{'Content-Type':'application/json',...(chunked?{'Transfer-Encoding':'chunked'}:{}),...(token?{Authorization:'Bearer '+token}:{})}},res=>{
   let text='';res.on('data',part=>text+=part);res.on('end',()=>{let data;try{data=JSON.parse(text);}catch{}resolve({status:res.statusCode,text,data,headers:res.headers});});
  });req.on('error',reject);req.setTimeout(5000,()=>req.destroy(Error('timeout on '+new URL(url).pathname)));req.end(body===undefined?undefined:JSON.stringify(body));
 });
}
async function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'brain-mesh-')),cleanup=[];
 t.after(async()=>{for(const fn of cleanup.reverse())await fn();rmSync(root,{recursive:true,force:true});});
 const meshPath=join(root,'mesh.sqlite'),work=join(root,'work.sqlite'),statePath=join(root,'state.sqlite'),modulePath=join(root,'bindings.mjs'),calls=join(root,'model-calls');
 const db=new DatabaseSync(work);db.exec('CREATE TABLE work_tickets(id TEXT PRIMARY KEY,owner_hash TEXT,context_json TEXT,request TEXT,created_at INTEGER,updated_at INTEGER,status TEXT)');
 const job={id:'TASK-1',repository:'www-infinity4/QuantaPhi',agent:'greenbeans',executor:'repository-engine',instructions:'Repair the fixture source and test it.',acceptance:['Test actual behavior.'],dependencies:[],status:'queued'};
 db.prepare('INSERT INTO work_tickets VALUES(?,?,?,?,?,?,?)').run('IW-cohost-fixture-1',owner,JSON.stringify({kind:'robot-directions',color_jobs:[job]}),'Synthetic fixture',Date.now(),Date.now(),'ready');db.close();chmodSync(work,0o600);
 const state=openPortableBrainState(statePath);await state.put('owner-session:fixture',{expires:42,tokenHash:'original-session'});await state.close();
 writeFileSync(modulePath,"import {appendFileSync} from 'node:fs';export const WRITER_AI={async run(model,input){appendFileSync("+JSON.stringify(calls)+",JSON.stringify({model,max_tokens:input.max_tokens})+'\\n',{mode:0o600});return {response:JSON.stringify({summary:'Fixture adapter reached',requirements:[],subtasks:[],files:[],acceptance:[],blockers:[],notes:[]})};}};",{mode:0o600});
 const mesh=createMeshServer({dbPath:meshPath,ownerToken:meshToken,replicas:1}),url=await mesh.listen();
 let node,packed;
 const plain=Buffer.from('Existing encrypted mesh storage must survive Brain work.');
 try{
  node=(await http(url+'/v1/owner/nodes','POST',{capacityBytes:4096},meshToken)).data;
  packed=packFile(plain,{shards:2});
  assert.equal((await http(url+'/v1/owner/manifests','POST',packed.manifest,meshToken)).status,201);
  for(const part of packed.fragments)assert.equal((await http(url+`/v1/owner/shards/${packed.manifest.fileId}/${part.index}`,'PUT',part,meshToken)).status,201);
 }finally{await mesh.close();}
 const env={...process.env,BRAIN_HOST_MODE:'mesh',MESH_DB:meshPath,MESH_OWNER_TOKEN:meshToken,MESH_HOST:'127.0.0.1',MESH_REPLICAS:'1',MESH_PORT:'18789',BRAIN_WORK_DB:work,BRAIN_STATE_DB:statePath,WRITER_OWNER_HASH:owner,BRAIN_SQLITE_WRITER_ENABLED:'0',BRAIN_BINDINGS_MODULE:modulePath,BRAIN_SUPERVISOR_DB:join(root,'supervisor.sqlite'),BRAIN_STOP_FILE:join(root,'stop')};
 for(const key of ['BRAIN_BINDINGS_SHA256','BOT_WORK_SECRET','MESH_TLS_KEY','MESH_TLS_CERT'])delete env[key];
 return {root,work,statePath,meshPath,modulePath,calls,env,node,packed,plain,cleanup};
}
async function signer(t){
 const original=globalThis.fetch;
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'brain-mesh-fixture'};
 globalThis.fetch=async url=>{assert.equal(String(url),'https://token.actions.githubusercontent.com/.well-known/jwks');return Response.json({keys:[jwk]});};
 t.after(()=>{globalThis.fetch=original;});
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url'),now=Math.floor(Date.now()/1000);
 const unsigned=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({iss:'https://token.actions.githubusercontent.com',aud:'infinity-brain-writer',repository:'www-infinity4/Moltnook',repository_id:'1188306316',workflow_ref:'www-infinity4/Moltnook/.github/workflows/moltnook-repository-engine.yml@refs/heads/main',ref:'refs/heads/main',event_name:'schedule',run_id:'88',run_attempt:'1',exp:now+300,nbf:now-1});
 return unsigned+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(unsigned))).toString('base64url');
}
async function checkStorage(url,f){
 assert.deepEqual((await http(url+'/health')).data,{ok:true,service:'infinity-mesh-local-v1'});
 assert.equal((await http(url+'/v1/owner/status')).status,401);
 assert.equal((await http(url+'/v1/owner/status','GET',undefined,meshToken)).status,200);
 assert.equal((await http(url+'/v1/node/next','GET',undefined,f.node.token)).status,200);
 const archive=await http(url+'/v1/owner/files/'+f.packed.manifest.fileId,'GET',undefined,meshToken);
 assert.equal(archive.status,200);assert.deepEqual(restoreFile(archive.data.manifest,archive.data.fragments,f.packed.key),f.plain);
}

test('one existing mesh listener hosts signed Brain work while storage, identities and receipts survive restart',async t=>{
 const f=await fixture(t),token=await signer(t);f.env.BRAIN_SQLITE_WRITER_ENABLED='1';
 let host=await createConfiguredMeshHost(f.env),url=await host.listen(0);
 try{
  await checkStorage(url,f);
  const health=await http(url+'/local/health');assert.equal(health.data.writerEnabled,true);assert.equal(health.data.modelConfigured,true);assert.equal(health.data.productionVerified,false);
  for(const auth of [undefined,meshToken,f.node.token])assert.equal((await http(url+'/runner/claim','POST',{},auth)).status,401);
  assert.equal((await http(url+'/v1/owner/status','GET',undefined,token)).status,401);
  for(const chunked of [false,true]){
   const rejected=await http(url+'/runner/build','POST',{source:'x'.repeat(3*1024*1024)},token,{chunked});
   assert.equal(rejected.status,413);assert.equal(rejected.data.error,'runner_body_too_large');assert.equal(rejected.headers.connection,'close');
   assert.equal((await http(url+'/local/health')).status,200,'a rejected upload must not stall later requests');
  }
  assert.equal(existsSync(f.calls),false,'oversized requests must not invoke the model');
  for(const path of ['/start','/owner/pair-create','/github','/phone/command'])assert.equal((await http(url+path,'POST',{},meshToken)).status,404);
  const claim=await http(url+'/runner/claim','POST',{},token);assert.equal(claim.status,200);assert.equal(claim.data.lease.ticketId,'IW-cohost-fixture-1');
  const {key,leaseId}=claim.data.lease,body={key,leaseId:'wrong',evidence:{colorFindings:{},runtime:{baseSha:'c'.repeat(40)}}};
  assert.equal((await http(url+'/runner/plan','POST',body,token)).status,409);assert.equal(existsSync(f.calls),false);
  body.leaseId=leaseId;const plan=await http(url+'/runner/plan','POST',body,token);assert.equal(plan.status,200);assert.equal(plan.data.summary,'Fixture adapter reached');
  assert.deepEqual(JSON.parse(readFileSync(f.calls,'utf8').trim()),{model:'@cf/openai/gpt-oss-120b',max_tokens:5000});
  await host.close();host=await createConfiguredMeshHost(f.env);url=await host.listen(0);
  const replay=await http(url+'/runner/claim','POST',{},token);assert.equal(replay.data.idle.code,'runner_attempt_already_claimed');
  assert.equal((await http(url+'/runner/result','POST',{key,leaseId,status:'blocked',message:'Synthetic fixture only; production execution unverified.'},token)).status,200);
  await host.close();host=await createConfiguredMeshHost(f.env);url=await host.listen(0);
  const receipt=await http(url+'/runner/quant-receipt','POST',{key,leaseId},token);assert.equal(receipt.data.status,'blocked');assert.equal(receipt.data.durableReadback,true);
  await checkStorage(url,f);
 }finally{await host.close();}
 const state=openPortableBrainState(f.statePath);assert.deepEqual(await state.get('owner-session:fixture'),{expires:42,tokenHash:'original-session'});await state.close();
});
test('legacy mesh stays storage-only unless explicitly enabled; disabled cohost never claims work',async t=>{
 const f=await fixture(t);delete f.env.BRAIN_HOST_MODE;delete f.env.BRAIN_WORK_DB;delete f.env.BRAIN_STATE_DB;delete f.env.BRAIN_BINDINGS_MODULE;
 let host=await createConfiguredMeshHost(f.env),url=await host.listen(0);
 try{await checkStorage(url,f);assert.equal((await http(url+'/local/health')).status,404);assert.equal((await http(url+'/runner/claim','POST',{},meshToken)).status,404);}finally{await host.close();}
 f.env.BRAIN_HOST_MODE='mesh';f.env.BRAIN_WORK_DB=f.work;f.env.BRAIN_STATE_DB=f.statePath;
 host=await createConfiguredMeshHost(f.env);url=await host.listen(0);
 try{assert.equal((await http(url+'/runner/claim','POST',{},meshToken)).status,503);assert.equal((await http(url+'/local/health')).data.writerEnabled,false);await checkStorage(url,f);}finally{await host.close();}
});
test('cohost rejects missing, wrong-schema and aliased databases before adding mesh tables or changing their bytes',async t=>{
 const f=await fixture(t),before=new Map([f.work,f.statePath,f.meshPath].map(path=>[path,readFileSync(path)]));
 for(const overrides of [{MESH_DB:f.work},{MESH_DB:f.statePath},{BRAIN_WORK_DB:f.statePath},{MESH_DB:join(f.root,'missing.sqlite')},{BRAIN_WORK_DB:join(f.root,'missing-work.sqlite')},{BRAIN_HOST_MODE:'arbitrary-command'}]){
  await assert.rejects(createConfiguredMeshHost({...f.env,...overrides}));
  for(const [path,bytes] of before)assert.deepEqual(readFileSync(path),bytes);
 }
 const hard=join(f.root,'hardlink.sqlite');linkSync(f.work,hard);await assert.rejects(createConfiguredMeshHost({...f.env,MESH_DB:hard}));
 await assert.rejects(createConfiguredMeshHost({...f.env,BRAIN_STATE_DB:hard}));
 const blank=join(f.root,'blank.sqlite');writeFileSync(blank,'',{mode:0o600});await assert.rejects(createConfiguredMeshHost({...f.env,MESH_DB:blank}),/existing_mesh_schema_required/);assert.equal(readFileSync(blank).length,0);
 await assert.rejects(createConfiguredMeshHost({...f.env,BRAIN_SQLITE_WRITER_ENABLED:'1',BRAIN_BINDINGS_MODULE:undefined}),/existing_model_binding_required/);
 for(const [path,bytes] of before)assert.deepEqual(readFileSync(path),bytes);
});
test('mesh dispatch streams runner bodies under the original Brain limits and never owns the Brain lifecycle',async t=>{
 let seen,closed=false;const brain={async fetch(req){seen=await req.text();return Response.json({bytes:seen.length});},close(){closed=true;}};
 const mesh=createMeshServer({dbPath:':memory:',ownerToken:meshToken,brain}),url=await mesh.listen();
 try{const body={source:'x'.repeat(1_500_000)};const response=await http(url+'/runner/build','POST',body,'synthetic');assert.equal(response.status,200);assert.equal(response.data.bytes,JSON.stringify(body).length);assert.equal(seen,JSON.stringify(body));}
 finally{await mesh.close();}assert.equal(closed,false);
 assert.throws(()=>createMeshServer({dbPath:':memory:',ownerToken:meshToken,brain:{}}),/brain_fetch_required/);
});

function launch(env){
 const child=spawn('python3',[supervisor],{env,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',p=>output+=p);child.stderr.on('data',p=>output+=p);
 return {child,output:()=>output,done:new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>resolve({code,output}));})};
}
async function stop(proc,env){
 if(proc.child.exitCode===null&&proc.child.signalCode===null){try{writeFileSync(env.BRAIN_STOP_FILE,'stop',{mode:0o600});}catch(error){proc.child.kill('SIGTERM');throw error;}}let timer;
 try{return await Promise.race([proc.done,new Promise((resolve,reject)=>{timer=setTimeout(()=>{if(proc.child.exitCode===null&&proc.child.signalCode===null)proc.child.kill('SIGTERM');reject(Error('supervisor did not stop'));},30000);})]);}finally{clearTimeout(timer);}
}
test('supervisor selects the fixed mesh entrypoint, uses only MESH_PORT and protects the original mesh ledger',async t=>{
 const f=await fixture(t),unrelated=createServer((req,res)=>res.end('original unrelated listener'));
 await new Promise(resolve=>unrelated.listen(0,'127.0.0.1',resolve));f.cleanup.push(()=>new Promise(resolve=>unrelated.close(resolve)));f.env.BRAIN_PORT=String(unrelated.address().port);
 const reserve=createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));f.env.MESH_PORT=String(reserve.address().port);await new Promise(resolve=>reserve.close(resolve));
 const proc=launch(f.env);f.cleanup.push(()=>stop(proc,f.env));const url='http://127.0.0.1:'+f.env.MESH_PORT;
 let ready=false;const deadline=performance.now()+60000;while(performance.now()<deadline){if(proc.child.exitCode!==null||proc.child.signalCode!==null)throw Error(proc.output());try{ready=(await http(url+'/local/health')).status===200;}catch{}if(ready)break;await new Promise(resolve=>setTimeout(resolve,100));}
 assert.equal(ready,true,proc.output());await checkStorage(url,f);assert.equal((await http('http://127.0.0.1:'+f.env.BRAIN_PORT)).text,'original unrelated listener');
 assert.equal((await stop(proc,f.env)).code,0);assert.doesNotMatch(proc.output(),/original-session|synthetic-existing-mesh-owner/);
 rmSync(f.env.BRAIN_STOP_FILE);const before=readFileSync(f.meshPath);
 assert.equal((await launch({...f.env,BRAIN_SUPERVISOR_DB:f.meshPath}).done).code,78);assert.deepEqual(readFileSync(f.meshPath),before);
 assert.equal((await launch({...f.env,BRAIN_HOST_MODE:'arbitrary-command'}).done).code,78);
});
test('an occupied mesh port is preserved and the supervisor stops after one attempt',async t=>{
 const f=await fixture(t),existing=createServer((req,res)=>res.end('existing mesh listener preserved'));
 await new Promise(resolve=>existing.listen(0,'127.0.0.1',resolve));f.cleanup.push(()=>new Promise(resolve=>existing.close(resolve)));
 f.env.MESH_PORT=String(existing.address().port);
 const result=await launch(f.env).done;assert.equal(result.code,78);assert.match(result.output,/port_in_use_existing_server_preserved/);
 const db=new DatabaseSync(f.env.BRAIN_SUPERVISOR_DB,{readOnly:true});try{assert.equal(db.prepare('SELECT COUNT(*) n FROM brain_starts').get().n,1);}finally{db.close();}
 assert.equal((await http('http://127.0.0.1:'+f.env.MESH_PORT)).text,'existing mesh listener preserved');
 const hard=join(f.root,'ledger-alias.sqlite');linkSync(f.meshPath,hard);const before=readFileSync(f.meshPath);
 assert.equal((await launch({...f.env,BRAIN_SUPERVISOR_DB:hard}).done).code,78);assert.deepEqual(readFileSync(f.meshPath),before);
});
