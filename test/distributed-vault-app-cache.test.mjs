import test from 'node:test';
import assert from 'node:assert/strict';
import {packFile} from '../distributed-vault/vault-core.mjs';
import {AppShardCache,createMemoryShardStore} from '../distributed-vault/app-cache.mjs';

const make=(bytes=250,shards=3)=>{
 const b=Buffer.alloc(bytes,0x9f);
 return packFile(b,{shards});
};
test('normal app-cache storage accepts encrypted fragment without per-fragment permission',async()=>{
 const store=createMemoryShardStore();
 const cache=new AppShardCache({store,limitBytes:1024});
 const {fragments}=make();
 const result=await cache.put(fragments[0]);
 assert.equal(result.stored,true);
 assert.deepEqual(await cache.get(fragments[0].fileId,fragments[0].index),fragments[0]);
 const usage=await cache.usage();
 assert.equal(usage.entries,1);
 assert.ok(usage.bytes>0&&usage.bytes<1024);
 const raw=await store.list();
 assert.equal('key' in raw[0],true,'store record has only a lookup key, never an encryption secret');
 assert.equal('privateKey' in raw[0],false);
 assert.equal('plaintext' in raw[0],false);
});
test('app cache can be disabled or cleared using ordinary app controls',async()=>{
 const store=createMemoryShardStore();
 const cache=new AppShardCache({store,enabled:false,limitBytes:1024});
 const {fragments}=make();
 assert.equal((await cache.put(fragments[0])).stored,false);
 assert.equal((await cache.usage()).entries,0);
 cache.enabled=true;
 await cache.put(fragments[0]);
 assert.equal((await cache.usage()).entries,1);
 await cache.clear();
 assert.equal((await cache.usage()).entries,0);
});
test('cache integrity prevents corrupt fragments or accidental private-key fields',async()=>{
 const cache=new AppShardCache({store:createMemoryShardStore(),limitBytes:1024});
 const {fragments}=make();
 await assert.rejects(cache.put({...fragments[0],data:'AAAA'}),/integrity/i);
 await assert.rejects(cache.put({...fragments[0],privateKey:'secret'}),/unexpected field/i);
 await assert.rejects(cache.put({...fragments[0],filename:'private.txt'}),/unexpected field/i);
 await assert.rejects(cache.put({...fragments[0],index:-1}),/invalid/i);
});
test('app cache evicts older fragments at explicit per-app capacity',async()=>{
 const store=createMemoryShardStore(); let now=1000;
 const cache=new AppShardCache({store,limitBytes:210,now:()=>now,retentionMs:5000});
 const {fragments}=make(300,4);
 await cache.put(fragments[0]);
 now+=50;
 await cache.put(fragments[1]);
 now+=50;
 await cache.put(fragments[2]);
 const usage=await cache.usage();
 assert.ok(usage.bytes<=210);
 assert.equal(await cache.get(fragments[0].fileId,fragments[0].index),null);
 assert.ok(await cache.get(fragments[2].fileId,fragments[2].index));
});
test('expiration removes stale app fragments and no scheduled background work is required',async()=>{
 let now=200;
 const cache=new AppShardCache({store:createMemoryShardStore(),now:()=>now,retentionMs:1000});
 const {fragments}=make();
 await cache.put(fragments[0]);
 now=2200;
 assert.equal(await cache.get(fragments[0].fileId,fragments[0].index),null);
 assert.equal((await cache.usage()).entries,0);
});
test('conflicting duplicate indices are refused and identical retry is idempotent',async()=>{
 const cache=new AppShardCache({store:createMemoryShardStore(),limitBytes:1024});
 const a=make();
 const b=make();
 await cache.put(a.fragments[0]);
 assert.equal((await cache.put(a.fragments[0])).stored,true);
 await assert.rejects(cache.put({...b.fragments[0],fileId:a.fragments[0].fileId}),/conflict/i);
});
