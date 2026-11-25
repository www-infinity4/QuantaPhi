import test from 'node:test';
import assert from 'node:assert/strict';
import {buildUserArchive,sealUserArchive,openUserArchive,toGeminiText,verifyWalletBinding,readVerifiedWalletSearches} from '../distributed-vault/google-gemini-handoff.mjs';
const OWNER='a'.repeat(64),OTHER='b'.repeat(64);
const chats=[
 {scope:OWNER,id:'chat1',role:'user',text:'How do stars work?',at:1740000000000},
 {scope:OWNER,id:'chat2',role:'assistant',text:'Stars fuse hydrogen.',at:1740000000100},
 {scope:OWNER,id:'chat1',role:'user',text:'How do stars work?',at:1740000000000}
];
const searches=[{scope:OWNER,id:'search1',query:'stellar nucleosynthesis',at:1740000002000,balance:500,token:'private'}];
test('per-account handoff deduplicates chats/searches without exposing balances or tokens',async t=>{
 // A valid export timestamp can contain the same digits as a private balance.
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-24T23:34:55.500Z')});
 const archive=await buildUserArchive({ownerScope:OWNER,consent:true,chats,searches});
 assert.equal(archive.format,'quantaphi-personal-archive/v1');
 assert.equal(archive.chats.length,2);
 assert.equal(archive.searches.length,1);
 assert.equal(archive.chats[0].text,'How do stars work?');
 assert.equal(archive.searches[0].query,'stellar nucleosynthesis');
 assert.equal(JSON.stringify(archive).includes('private'),false);
 assert.equal(archive.exportedAt,'2026-11-24T23:34:55.500Z');
 assert.deepEqual(Object.keys(archive).sort(),['accountBinding','chats','exportedAt','format','searches','sourceScope']);
 assert.deepEqual(archive.chats,[
  {id:'chat1',role:'user',text:'How do stars work?',at:1740000000000},
  {id:'chat2',role:'assistant',text:'Stars fuse hydrogen.',at:1740000000100}
 ]);
 assert.deepEqual(archive.searches,[{id:'search1',query:'stellar nucleosynthesis',at:1740000002000}]);
 assert.equal(JSON.stringify(archive).includes(OWNER),false,'do not publish wallet owner identity');
 assert.match(archive.accountBinding,/^[a-f0-9]{64}$/);
});
test('cannot silently export or combine records across different verified user accounts',async()=>{
 await assert.rejects(buildUserArchive({ownerScope:OWNER,consent:false,chats,searches}),/explicit consent/i);
 await assert.rejects(buildUserArchive({ownerScope:OWNER,consent:true,chats:[...chats,{...chats[0],scope:OTHER}],searches}),/account scope/i);
 await assert.rejects(buildUserArchive({ownerScope:OWNER,consent:true,chats,searches:[{...searches[0],scope:OTHER}]}),/account scope/i);
 await assert.rejects(buildUserArchive({ownerScope:'guest',consent:true,chats,searches}),/verified account/i);
});
test('private backup is encrypted with random AES-GCM, roundtrips and wrong passphrase fails',async()=>{
 const archive=await buildUserArchive({ownerScope:OWNER,consent:true,chats,searches});
 const one=await sealUserArchive(archive,'a user-chosen private passphrase 123456');
 const two=await sealUserArchive(archive,'a user-chosen private passphrase 123456');
 assert.equal(one.format,'quantaphi-encrypted-backup/v1');
 assert.notEqual(one.ciphertext,two.ciphertext);
 assert.equal(JSON.stringify(one).includes('How do stars work'),false);
 assert.deepEqual(await openUserArchive(one,'a user-chosen private passphrase 123456'),archive);
 await assert.rejects(openUserArchive(one,'wrong long secret phrase'),/decrypt|passphrase|integrity/i);
 await assert.rejects(openUserArchive({...one,ciphertext:'AAAA'},'a user-chosen private passphrase 123456'),/decrypt|integrity|invalid/i);
});
test('Gemini handoff text contains only selected first-party data and does not claim automatic import',async()=>{
 const archive=await buildUserArchive({ownerScope:OWNER,consent:true,chats,searches});
 const txt=toGeminiText(archive);
 assert.match(txt,/Bubbles chats/i);
 assert.match(txt,/QuantaPhi searches/i);
 assert.match(txt,/How do stars work\?/);
 assert.match(txt,/stellar nucleosynthesis/);
 assert.match(txt,/manual/i);
 assert.doesNotMatch(txt,/already synced|automatically saved to Gemini/i);
 assert.doesNotMatch(txt,/private|balance|token/);
});
test('wallet search retrieval requires matching verified owner identity before fetching searches',async()=>{
 const calls=[];
 const memory={cloudConnected:true,profileScope:OWNER};
 const connection={resolveDeviceToken:async()=> 'r_test_wallet_token'};
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});
  if(url.includes('bubbles-memory'))return {ok:true,json:async()=>({ok:true,profile:OWNER})};
  return {ok:true,json:async()=>({ok:true,searches:[{search_id:'search1',query_text:'search about blue stars',created_at:1740000000000}]})};
 };
 const result=await readVerifiedWalletSearches({memory,connection,fetchImpl});
 assert.deepEqual(result.map(x=>x.query),['search about blue stars']);
 assert.equal(result[0].scope,OWNER);
 assert.equal(calls.length,2);
 assert.equal(calls[0].options.headers.Authorization,calls[1].options.headers.Authorization);
 assert.ok(calls.every(x=>x.options.cache==='no-store'));
});
test('wallet search mismatched identity fails without exposing searches across accounts',async()=>{
 const calls=[];
 await assert.rejects(readVerifiedWalletSearches({
  memory:{cloudConnected:true,profileScope:OWNER},
  connection:{resolveDeviceToken:async()=> 'private-token'},
  fetchImpl:async url=>{calls.push(url);return{ok:true,json:async()=>({ok:true,profile:OTHER})}}
 }),/account mismatch/i);
 assert.equal(calls.length,1);
 await assert.rejects(readVerifiedWalletSearches({
  memory:{cloudConnected:false,profileScope:OWNER},
  connection:{resolveDeviceToken:async()=> 'private-token'},fetchImpl:async()=>{throw Error('should not call')}
 }),/verified wallet/i);
});
test('refuses excess data rather than silently omitting history that users expect to be backed up',async()=>{
 const oversized=Array.from({length:10001},(_,i)=>({scope:OWNER,id:'x'+i,role:'user',text:'valid',at:1740000000000+i}));
 await assert.rejects(buildUserArchive({ownerScope:OWNER,consent:true,chats:oversized,searches:[]}),/too many/i);
 await assert.rejects(buildUserArchive({ownerScope:OWNER,consent:true,chats:[{...chats[0],text:'x'.repeat(7000)}],searches:[]}),/too long/i);
});

test('even chats-only export requires rechecking that active bearer still matches wallet profile',async()=>{
 const calls=[];
 const binding=await verifyWalletBinding({
  memory:{cloudConnected:true,profileScope:OWNER},
  connection:{resolveDeviceToken:async()=> 'account-token'},
  fetchImpl:async url=>{calls.push(url);return {ok:true,json:async()=>({ok:true,profile:OWNER})}}
 });
 assert.equal(binding.scope,OWNER);
 assert.equal(calls.length,1);
 await assert.rejects(verifyWalletBinding({
  memory:{cloudConnected:true,profileScope:OWNER},
  connection:{resolveDeviceToken:async()=> 'other-account-token'},
  fetchImpl:async()=>({ok:true,json:async()=>({ok:true,profile:OTHER})})
 }),/account mismatch/i);
});

// The established vault workflow also covers the local session catalog.
import './distributed-vault-session-catalog.test.mjs';
