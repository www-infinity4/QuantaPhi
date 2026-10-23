import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transferOwnerHistory} from '../bubbles-brain-history-bridge.mjs';

const row=i=>({id:'historical_'+String(i).padStart(7,'0'),role:'user',text:'Fix the old recording problem '+i,at:100000+Math.floor(i/3)});
function adapter(total=55){
 const archive=Array.from({length:total},(_,i)=>row(i+1)),saved=new Set(),packets=[];
 const getBatch=async({afterAt,afterId,limit})=>archive.filter(r=>r.at>afterAt||(r.at===afterAt&&r.id>afterId)).slice(0,limit);
 const sendBatch=async messages=>{packets.push(messages);for(const m of messages)saved.add(m.id);return messages.map(m=>m.id)};
 return {saved,packets,getBatch,sendBatch};
}
test('owner history travels in <=20-message batches, with source IDs and dedicated session',async()=>{
 const a=adapter(55),progress=[];
 const result=await transferOwnerHistory({...a,onProgress:x=>progress.push(x)});
 assert.deepEqual({status:result.status,count:result.messages,batches:result.batches,complete:result.complete},
  {status:'history_import_verified',count:55,batches:3,complete:true});
 assert.equal(a.saved.size,55);
 assert.deepEqual(a.packets.map(x=>x.length),[20,20,15]);
 assert.ok(a.packets.every(x=>x.every(m=>m.sessionId==='imported_owner_history_v1'&&m.role==='user')));
 assert.equal(result.workDispatched,false);assert.equal(result.approvalGranted,false);assert.equal(result.repositoryChanged,false);
 assert.equal(progress.length,3);assert.equal(progress[0].messages,20);
});
test('resume only replays unacknowledged messages after a bounded scan',async()=>{
 const a=adapter(73);
 const first=await transferOwnerHistory({...a,maxMessages:40});
 assert.equal(first.status,'history_import_page_verified');
 assert.equal(first.messages,40);
 const next=await transferOwnerHistory({...a,startCursor:first.cursor,maxMessages:40});
 assert.equal(next.messages,33);assert.equal(next.complete,true);
 assert.equal(a.saved.size,73);
 assert.deepEqual(a.packets.map(p=>p.length),[20,20,20,13]);
});
test('unacknowledged or fabricated receipts do not move a persistent cursor',async()=>{
 const a=adapter(21),persist=[];
 await assert.rejects(transferOwnerHistory({...a,sendBatch:async messages=>
  messages[0].id?[messages[0].id]:[],onProgress:p=>persist.push(p.cursor)}),/history_transfer_receipt_unverified/);
 assert.equal(persist.length,0);
 const bad=adapter(21);
 await assert.rejects(transferOwnerHistory({...bad,sendBatch:async()=>{throw Error('network_offline');},
  onProgress:p=>persist.push(p.cursor)}),/network_offline/);
 assert.equal(persist.length,0);
});
test('cancel/revoked owner session stops future private batches and never submits a job',async()=>{
 const a=adapter(60);let connected=true;
 await assert.rejects(transferOwnerHistory({...a,authorize:()=>connected,
  onProgress:()=>{connected=false;}}),/cancelled_or_disconnected/);
 assert.equal(a.saved.size,20);
 assert.equal(a.packets.length,1);
});
test('assistant turns and nonmonotonic source IDs are rejected before sending',async()=>{
 let invoked=false;
 await assert.rejects(transferOwnerHistory({getBatch:async()=>[{
  ...row(1),role:'assistant'}],sendBatch:async()=>{invoked=true;return[];}}),/history_transfer_row_invalid/);
 assert.equal(invoked,false);
 await assert.rejects(transferOwnerHistory({getBatch:async()=>[row(2),row(1)],
  sendBatch:async()=>{invoked=true;return[];}}),/history_transfer_row_invalid/);
 assert.equal(invoked,false);
 await assert.rejects(transferOwnerHistory({startCursor:{afterAt:123,afterId:'../unsafe'},
  getBatch:async()=>[],sendBatch:async()=>[]}),/history_transfer_row_invalid|history_transfer_cursor_invalid/);
});
test('source UI requires explicit consent, live owner token, private synced wallet, and imported-user-only paging',()=>{
 const client=readFileSync('bubbles-ai.js','utf8');
 const memory=readFileSync('bubbles-memory.js','utf8');
 assert.match(client,/window\.confirm\('Copy your saved USER conversation turns/);
 assert.match(client,/!cloudChat\|\|!longMemory\?\.cloudConnected/);
 assert.match(client,/ownerReady&&ownerHeaders===headers/);
 assert.match(client,/longMemory\.ownerUserBatch\(page\)/);
 assert.match(client,/ownerHistoryTransferCancelled=true/);
 assert.match(client,/result\.saved/);
 assert.match(memory,/index\('byTime'\)/);
 assert.match(memory,/item\.role==='user'/);
 assert.match(memory,/item\.scope\|\|'guest'/);
 assert.match(memory,/get profileScope\(\)/);
});
