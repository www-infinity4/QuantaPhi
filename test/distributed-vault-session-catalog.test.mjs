import test from 'node:test';
import assert from 'node:assert/strict';
import {buildUserArchive} from '../distributed-vault/google-gemini-handoff.mjs';
import {appendSession,verifySessionCatalog,sealSessionArchive,openSessionArchive} from '../distributed-vault/session-catalog.mjs';
const passphrase='synthetic private archive passphrase only';
const owner='a'.repeat(64);
async function archive(scope=owner){
 return buildUserArchive({ownerScope:scope,consent:true,chats:[
  {scope,id:'m1',role:'user',text:'First synthetic chat',at:1740000000000},
  {scope,id:'m2',role:'assistant',text:'Second synthetic chat',at:1740000000100}
 ]});
}
const first={sessionId:'session1',source:'local-export-A',recordIds:['m1']};
const second={sessionId:'session2',source:'local-export-B',recordIds:['m2']};
test('explicitly selected session context appends without changing old catalog entries',async()=>{
 const a=await archive();
 const one=await appendSession(a,{...first,consent:true});
 const two=await appendSession(one,{...second,consent:true});
 const entries=two.sessionCatalog.entries;
 assert.deepEqual(entries[0],one.sessionCatalog.entries[0]);
 assert.equal(entries[0].label,'1');
 assert.equal(entries[1].label,'2');
 assert.equal(entries[1].previous,entries[0].digest);
 assert.equal(await verifySessionCatalog(two),entries[1].digest);
 assert.equal(a.sessionCatalog,undefined);
 assert.deepEqual(await appendSession(two,{...second,consent:true}),two);
});
test('rejects cross-account, altered, missing, and unconsented records',async()=>{
 const a=await archive(),one=await appendSession(a,{...first,consent:true});
 await assert.rejects(appendSession(a,{...first,consent:false}),/consent/);
 await assert.rejects(appendSession(a,{...first,recordIds:['missing'],consent:true}),/record/);
 await assert.rejects(appendSession(a,{...first,source:'https://example.com',consent:true}),/source/);
 await assert.rejects(verifySessionCatalog({...await archive('b'.repeat(64)),sessionCatalog:one.sessionCatalog}),/binding/);
 await assert.rejects(verifySessionCatalog({...one,chats:[{...one.chats[0],text:'changed'},one.chats[1]]}),/integrity/);
 await assert.rejects(appendSession(one,{...first,source:'different',consent:true}),/conflict/);
});
test('encrypted catalog roundtrip and wrong secret, tampering and stale checkpoint fail closed',async()=>{
 const one=await appendSession(await archive(),{...first,consent:true});
 const two=await appendSession(one,{...second,consent:true});
 const head=await verifySessionCatalog(two);
 const sealed=await sealSessionArchive(two,passphrase);
 assert.doesNotMatch(JSON.stringify(sealed),/local-export-A|First synthetic chat/);
 assert.deepEqual(await openSessionArchive(sealed,passphrase,head),two);
 await assert.rejects(openSessionArchive(sealed,'wrong synthetic passphrase'),/decrypt|integrity/);
 const old=await sealSessionArchive(one,passphrase);
 await assert.rejects(openSessionArchive(old,passphrase,head),/checkpoint/);
 await assert.rejects(verifySessionCatalog({...two,sessionCatalog:{...two.sessionCatalog,entries:[two.sessionCatalog.entries[1],two.sessionCatalog.entries[0]]}}),/integrity/);
});