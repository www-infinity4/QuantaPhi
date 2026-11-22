import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { packFile, restoreFile, planPlacement } from '../distributed-vault/vault-core.mjs';

test('encrypted fragments restore original bytes independently of arrival order', () => {
 const plain=Buffer.from('owner-consented data: ' + 'ab'.repeat(11000));
 const {manifest,fragments,key}=packFile(plain,{shards:9});
 assert.equal(manifest.scheme,'encrypted-n-of-n/v1');
 assert.equal(manifest.requiredShards,9);
 assert.equal(fragments.length,9);
 assert.deepEqual(restoreFile(manifest,[...fragments].reverse(),key),plain);
 assert.equal('key' in manifest,false);
 assert.equal(JSON.stringify(fragments).includes(key.toString('base64')),false);
 assert.equal(JSON.stringify(fragments).includes('owner-consented data:'),false);
});

test('one thousand fragments of small file remain nonempty and all one thousand are required',()=>{
 const {manifest,fragments,key}=packFile(Buffer.from('hi'),{shards:1000});
 assert.equal(fragments.length,1000);
 assert.ok(fragments.every(x=>Buffer.from(x.data,'base64').length>0));
 assert.deepEqual(restoreFile(manifest,fragments,key),Buffer.from('hi'));
 assert.throws(()=>restoreFile(manifest,fragments.slice(1),key),/missing shard/);
});

test('detects missing, duplicate, altered and mismatched fragments; wrong key never decrypts',()=>{
 const {manifest,fragments,key}=packFile(randomBytes(2048),{shards:5});
 assert.throws(()=>restoreFile(manifest,fragments.slice(0,4),key),/missing shard/);
 assert.throws(()=>restoreFile(manifest,[...fragments.slice(0,4),fragments[0]],key),/duplicate shard/);
 assert.throws(()=>restoreFile(manifest,[{...fragments[0],data:'AAAA'},...fragments.slice(1)],key),/integrity/);
 assert.throws(()=>restoreFile(manifest,[{...fragments[0],fileId:'not-this-file'},...fragments.slice(1)],key),/fileId mismatch/);
 assert.throws(()=>restoreFile(manifest,fragments,randomBytes(32)),/authentication failed/);
});

test('encryption is randomized for repeated plaintext and does not expose owner name',()=>{
 const one=packFile(Buffer.from('confidential'),{shards:3});
 const two=packFile(Buffer.from('confidential'),{shards:3});
 assert.notEqual(one.manifest.ciphertextSha256,two.manifest.ciphertextSha256);
 assert.notEqual(one.manifest.fileId,two.manifest.fileId);
 assert.equal('filename' in one.manifest,false);
});

test('randomized placement uses only app cache instances reporting available capacity, one fragment per device',()=>{
 const {manifest}=packFile(Buffer.from('hello'),{shards:5});
 const peers=Array.from({length:15},(_,i)=>({id:'app-'+i,appCacheReady:i<10,maxShardBytes:1000}));
 const plan=planPlacement(manifest,peers,{replicas:2});
 const recipients=plan.assignments.flatMap(x=>x.deviceIds);
 assert.equal(plan.assignments.length,5);
 assert.equal(recipients.length,10);
 assert.equal(new Set(recipients).size,10);
 assert.ok(recipients.every(s=>s.startsWith('app-')));
 assert.ok(plan.assignments.every(x=>x.deviceIds.length===2));
 assert.equal('fileContent' in plan,false);
});

test('placement rejects non-app devices, insufficient or duplicate app instances, and invalid replica count',()=>{
 const {manifest}=packFile(Buffer.from('hello'),{shards:4});
 assert.throws(()=>planPlacement(manifest,Array.from({length:4},(_,i)=>({id:'p'+i,appCacheReady:false,maxShardBytes:1000}))),/not enough app-cache/);
 assert.throws(()=>planPlacement(manifest,[{id:'same',appCacheReady:true,maxShardBytes:1000},{id:'same',optIn:true,maxShardBytes:1000}]),/duplicate device/);
 const ok=Array.from({length:4},(_,i)=>({id:'p'+i,appCacheReady:true,maxShardBytes:1000}));
 assert.throws(()=>planPlacement(manifest,ok,{replicas:2}),/not enough opted-in/);
 assert.throws(()=>planPlacement(manifest,ok,{replicas:0}),/replicas/);
});

test('rejects unsafe shard counts and invalid manifest instead of silently accepting corrupted setup',()=>{
 assert.throws(()=>packFile(Buffer.from('a'),{shards:1}),/shards/);
 assert.throws(()=>packFile(Buffer.from('a'),{shards:4097}),/shards/);
 const {manifest,fragments,key}=packFile(Buffer.from('a'),{shards:2});
 assert.throws(()=>restoreFile({...manifest,requiredShards:1},fragments,key),/manifest/);
 assert.throws(()=>restoreFile({...manifest,algorithm:'none'},fragments,key),/manifest/);
});

test('works for a medium binary file with zero bytes',()=>{
 const plain=randomBytes(1024*384);plain.fill(0,40,900);
 const {manifest,fragments,key}=packFile(plain,{shards:257});
 assert.deepEqual(restoreFile(manifest,fragments,key),plain);
});
