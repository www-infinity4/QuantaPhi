import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {packFile,restoreFile} from '../distributed-vault/vault-core.mjs';
import {AppShardCache,createMemoryShardStore} from '../distributed-vault/app-cache.mjs';
import {createMeshServer} from '../distributed-vault/mesh-server.mjs';

const OWNER='local-test-secret-'.padEnd(48,'Q');
async function fixture(t,{replicas=2}={}){
 const path=mkdtempSync(join(tmpdir(),'qp-mesh-'));
 const dbPath=join(path,'control.sqlite');
 t.after(()=>rmSync(path,{recursive:true,force:true}));
 const mesh=createMeshServer({dbPath,ownerToken:OWNER,replicas});
 const url=await mesh.listen();
 t.after(async()=>{await mesh.close();});
 const call=async(method,route,body,token=OWNER)=>{
  const res=await fetch(url+route,{method,headers:token?{Authorization:'Bearer '+token,'Content-Type':'application/json'}:{'Content-Type':'application/json'},
   body:body===undefined?undefined:JSON.stringify(body)});
  const payload=await res.json();
  return {status:res.status,...payload};
 };
 return {mesh,url,path,dbPath,call};
}
async function provision(call,count,capacityBytes=4096){
 return Promise.all(Array.from({length:count},()=>call('POST','/v1/owner/nodes',{capacityBytes})));
}
async function upload(call,plain,{shards=4}={}){
 const packed=packFile(plain,{shards});
 const fileId=packed.manifest.fileId;
 assert.equal((await call('POST','/v1/owner/manifests',packed.manifest)).status,201);
 for(const shard of packed.fragments)
  assert.equal((await call('PUT',`/v1/owner/shards/${fileId}/${shard.index}`,shard)).status,201);
 return packed;
}
test('repository server binds only loopback without explicit HTTPS and never accepts anonymous writes',async t=>{
 assert.throws(()=>createMeshServer({dbPath:':memory:',ownerToken:OWNER,host:'0.0.0.0'}),/TLS|loopback/i);
 const {call}=await fixture(t);
 assert.equal((await call('GET','/health',undefined,null)).status,200);
 assert.equal((await call('POST','/v1/owner/nodes',{capacityBytes:4096},'wrong')).status,401);
 assert.equal((await call('GET','/v1/owner/status',undefined,null)).status,401);
 assert.equal((await call('POST','/v1/owner/nodes',{capacityBytes:4096})).status,201);
});
test('server stores only owner-encrypted fragments, issues app credentials, and tracks verified receipts',async t=>{
 const {call}=await fixture(t);
 const nodes=await provision(call,8);
 assert.ok(nodes.every(n=>n.status===201&&n.token&&n.nodeId));
 const plain=Buffer.from('owned data, untrusted phones hold ciphertext only'.repeat(12));
 const {manifest,fragments,key}=await upload(call,plain,{shards:4});
 const inventory=new Map();
 for(const n of nodes){
  const local=new AppShardCache({store:createMemoryShardStore()});
  const work=await call('GET','/v1/node/next',undefined,n.token);
  assert.equal(work.status,200);
  if(work.fragment){
   assert.equal('key' in work.fragment,false);
   await local.put(work.fragment);
   const ack=await call('POST','/v1/node/ack',{fileId:manifest.fileId,index:work.fragment.index,sha256:work.fragment.sha256},n.token);
   assert.equal(ack.status,200);
   inventory.set(n.nodeId,local);
  }
 }
 assert.equal(inventory.size,8);
 const status=await call('GET','/v1/owner/status');
 assert.equal(status.status,200);
 assert.equal(status.files[0].ackedReplicas,8);
 assert.equal(status.files[0].underReplicated,0);
 const archive=await call('GET',`/v1/owner/files/${manifest.fileId}`);
 assert.equal(archive.status,200);
 assert.deepEqual(restoreFile(archive.manifest,archive.fragments,key),plain);
 assert.equal(JSON.stringify(archive).includes(plain.toString()),false);
 assert.equal(JSON.stringify(archive).includes(key.toString('base64')),false);
});
test('when app cache is cleared, next heartbeat releases its receipt and another app receives replacement',async t=>{
 const {call}=await fixture(t,{replicas:2});
 const peers=await provision(call,5);
 const {manifest}=await upload(call,Buffer.from('cache loss recovery test'),{shards:2});
 const cached=new Map();
 for(const p of peers.slice(0,4)){
  const job=await call('GET','/v1/node/next',undefined,p.token);
  if(!job.fragment)continue;
  cached.set(p.nodeId,job.fragment);
  assert.equal((await call('POST','/v1/node/ack',{fileId:manifest.fileId,index:job.fragment.index,sha256:job.fragment.sha256},p.token)).status,200);
 }
 assert.equal(cached.size,4);
 const lost=peers[0];
 const lostIndex=cached.get(lost.nodeId).index;
 const report=await call('POST','/v1/node/heartbeat',{inventory:[]},lost.token);
 assert.equal(report.status,200);
 assert.ok(report.invalidated>=1);
 const replacement=await call('GET','/v1/node/next',undefined,peers[4].token);
 assert.equal(replacement.status,200);
 assert.equal(replacement.fragment.index,lostIndex);
 assert.equal(replacement.fragment.fileId,manifest.fileId);
 assert.equal((await call('POST','/v1/node/ack',{fileId:manifest.fileId,index:lostIndex,sha256:replacement.fragment.sha256},peers[4].token)).status,200);
 assert.equal((await call('GET','/v1/owner/status')).files[0].underReplicated,0);
});
test('offline device expiry triggers repair; a node holds at most one index per file',async t=>{
 let now=10000;
 const base=mkdtempSync(join(tmpdir(),'qp-mesh-clock-'));
 t.after(()=>rmSync(base,{recursive:true,force:true}));
 const mesh=createMeshServer({dbPath:join(base,'data.sqlite'),ownerToken:OWNER,replicas:2,now:()=>now,peerTtlMs:5000});
 const url=await mesh.listen();
 t.after(async()=>mesh.close());
 const call=async(method,route,body,token=OWNER)=>{
  const res=await fetch(url+route,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:res.status,...await res.json()};
 };
 const peers=await provision(call,9);
 const {manifest}=await upload(call,Buffer.from('three shard replication'),{shards:3});
 for(const p of peers.slice(0,6)){
  const job=await call('GET','/v1/node/next',undefined,p.token);
  if(job.fragment)await call('POST','/v1/node/ack',{fileId:manifest.fileId,index:job.fragment.index,sha256:job.fragment.sha256},p.token);
 }
 now+=6000;
 assert.equal((await call('POST','/v1/owner/repair',{})).status,200);
 const st=await call('GET','/v1/owner/status');
 assert.equal(st.files[0].underReplicated,6,'no live eligible phones after expiry');
 // One phone reports it is live; no hidden background wake on other phones.
 const check=await call('POST','/v1/node/heartbeat',{inventory:[]},peers[6].token);
 assert.equal(check.status,200);
 const task=await call('GET','/v1/node/next',undefined,peers[6].token);
 assert.ok(task.fragment);
 const next=await call('GET','/v1/node/next',undefined,peers[6].token);
 assert.equal(next.fragment.index,task.fragment.index,'same phone is not assigned a second fragment for same file');
});
test('rejects malformed shards, changed hashes, forged phone claims and duplicate uploads',async t=>{
 const {call}=await fixture(t);
 const {manifest,fragments}=packFile(Buffer.from('a small dataset'),{shards:2});
 assert.equal((await call('POST','/v1/owner/manifests',manifest)).status,201);
 const id=manifest.fileId;
 assert.equal((await call('PUT',`/v1/owner/shards/${id}/0`,{...fragments[0],data:'AAAA'})).status,422);
 assert.equal((await call('PUT',`/v1/owner/shards/${id}/0`,fragments[0])).status,201);
 assert.equal((await call('PUT',`/v1/owner/shards/${id}/0`,fragments[0])).status,200);
 const peer=(await provision(call,1))[0];
 assert.equal((await call('POST','/v1/node/ack',{fileId:id,index:0,sha256:fragments[0].sha256},peer.token)).status,409);
 assert.equal((await call('POST','/v1/node/heartbeat',{inventory:[{fileId:'fake',index:0,sha256:fragments[0].sha256}]},peer.token)).status,422,'reject forged file identifiers');
 const status=await call('GET','/v1/owner/status');
 assert.equal(status.files[0].underReplicated,4);
});
test('database and encrypted copies remain after a clean server restart',async t=>{
 const base=mkdtempSync(join(tmpdir(),'qp-mesh-restart-'));
 t.after(()=>rmSync(base,{recursive:true,force:true}));
 const dbPath=join(base,'data.sqlite');
 let server=createMeshServer({dbPath,ownerToken:OWNER,replicas:1});
 let url=await server.listen();
 const call=async(method,route,body)=>{const res=await fetch(url+route,{method,headers:{Authorization:'Bearer '+OWNER,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,...await res.json()};};
 const {manifest,key}=await upload(call,Buffer.from('durable encrypted shard data'),{shards:3});
 await server.close();
 server=createMeshServer({dbPath,ownerToken:OWNER,replicas:1});
 t.after(async()=>server.close());
 url=await server.listen();
 const recovered=await call('GET',`/v1/owner/files/${manifest.fileId}`);
 assert.equal(recovered.status,200);
 assert.deepEqual(restoreFile(recovered.manifest,recovered.fragments,key),Buffer.from('durable encrypted shard data'));
});
