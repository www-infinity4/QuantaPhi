import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isStarContinuation,selectContinuation,continueSavedWork,continuationReply} from '../bubbles-star-continuation.mjs';
const ticket=(id,repository,job,status='ready',updated=2000)=>({
 id,title:'Owner-requested repair',repository,status:status==='queued'?'ready':status,updated_at:updated,
 context:{kind:'robot-directions',color_jobs:[{id:'TASK-1',repository,instructions:'Repair the approved existing app',dependencies:[],status:job.status,...job}]}
});
const a='www-infinity4/QuantaPhi',b='www-infinity4/RecordB';
test('literal star only, not wildcard text, unlocks continuation',()=>{
 assert.equal(isStarContinuation('*'),true);
 assert.equal(isStarContinuation(' * '),true);
 for(const invalid of ['**','start *','* fix it','','  ','continue'])assert.equal(isStarContinuation(invalid),false);
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const send=ui.slice(ui.indexOf('async function sendMessage('),ui.indexOf('input.addEventListener(\'keydown\''));
 assert.match(send,/if\(spoken==='\*'\)/);
 assert.match(send,/module\.continueSavedWork/);
 assert.match(send,/ownerHeaders:verifiedOwnerHeaders/);
});
test('most recent signed owner tickets come first; exclude completed and security holds',()=>{
 const data=[
  ticket('IW-20261025-AAAABBBB',a,{status:'queued'},'ready',300),
  ticket('IW-20261025-BBBBCCCC',b,{status:'blocked',progress:{blocker:'security_hold'}},'blocked',500),
  ticket('IW-20261025-CCCCDDDD',a,{status:'queued'},'ready',400),
  ticket('IW-20261025-DDDDEEEE',a,{status:'complete'},'working',700),
  ticket('IW-20261025-EEEFFFFF','unrelated/repo',{status:'queued'},'ready',800)
 ];
 const selected=selectContinuation(data);
 assert.equal(selected.target.ticketId,'IW-20261025-CCCCDDDD');
 assert.equal(selected.slots[0].repository,b);
 assert.equal(selected.slots[0].stage,'owner_or_security_hold');
 assert.equal(selected.maximum,8);
 assert.equal(selected.dispatchBudget,1);
 assert.equal(selected.counts.finished,undefined);
});
test('commit without a verified release never gets automatically rewritten',()=>{
 const t=ticket('IW-20261025-AAAABBBB',a,{status:'blocked',progress:{commitSha:'a'.repeat(40),blocker:'deployment_not_verified'}},'blocked');
 const r=selectContinuation([t]);
 assert.equal(r.target,null);
 assert.equal(r.slots[0].stage,'verify_receipt');
});
test('up to eight independent project slots, exactly one eligible runner request',async()=>{
 const rows=Array.from({length:10},(_,i)=>ticket('IW-20261025-'+String(i+1).padStart(8,'0'),
  'www-infinity4/Repo'+i,{status:'queued'},'ready',1000+i));
 const requests=[];
 const fetcher=async(url,options,limit)=>{
  requests.push({path:new URL(url).pathname,body:JSON.parse(options.body),limit,authorization:options.headers.Authorization});
  if(url.endsWith('/owner/conversation'))return {ok:true,json:async()=>({ok:true,messagesScanned:400,candidates:[]})};
  if(url.endsWith('/work/tickets/list'))return {ok:true,json:async()=>({ok:true,tickets:rows})};
  if(url.endsWith('/work/run-next'))return {ok:true,json:async()=>({ok:true,status:'queued_for_runner'})};
  throw Error('unknown route');
 };
 const result=await continueSavedWork({fetcher,ownerHeaders:async()=>({Authorization:'Bearer owner-test'}),base:'https://brain.example.test',now:5000});
 assert.equal(result.selected.slots.length,8);
 assert.equal(result.selected.target.repository,'www-infinity4/Repo9');
 assert.deepEqual(requests.map(r=>r.path),['/owner/conversation','/work/tickets/list','/work/run-next']);
 assert.equal(requests[2].body.ticketId,'IW-20261025-00000010');
 assert.equal(requests[2].body.jobId,'TASK-1');
 assert.equal(requests[2].authorization,'Bearer owner-test');
 assert.match(continuationReply(result),/Runner requested/);
 assert.equal(result.executionVerified,false);
});
test('no existing eligible job triggers no GitHub writes, even if archived suggestions exist',async()=>{
 const paths=[];
 const fetcher=async(url)=>{
  paths.push(new URL(url).pathname);
  if(url.endsWith('conversation'))return {ok:true,json:async()=>({ok:true,candidates:[{title:'Unknown imported instruction'}]})};
  return {ok:true,json:async()=>({ok:true,tickets:[]})};
 };
 const result=await continueSavedWork({fetcher,ownerHeaders:async()=>({Authorization:'Bearer owner'}),base:'https://brain.example.test'});
 assert.equal(result.selected.target,null);
 assert.equal(result.archive.unmatched,1);
 assert.deepEqual(paths,['/owner/conversation','/work/tickets/list']);
 assert.match(continuationReply(result),/No eligible existing job/);
});
test('missing owner identity cannot read memories, tickets or dispatch',async()=>{
 let called=0;
 await assert.rejects(continueSavedWork({fetcher:async()=>{called++;throw Error('should not call')},
  ownerHeaders:async()=>({}),base:'https://brain.example.test'}),/owner_authorization_required/);
 assert.equal(called,0);
});
test('private archive error does not invent work; signed tickets remain authoritative',async()=>{
 const paths=[];
 const result=await continueSavedWork({
  fetcher:async(url)=>{
   paths.push(new URL(url).pathname);
   if(url.endsWith('conversation'))throw Error('network unavailable');
   return {ok:true,json:async()=>({ok:true,tickets:[]})};
  },
  ownerHeaders:async()=>({Authorization:'Bearer owner'}),base:'https://brain.example.test'
 });
 assert.equal(result.archive.checked,false);
 assert.equal(result.dispatch,null);
 assert.deepEqual(paths,['/owner/conversation','/work/tickets/list']);
});

test('merged is still unverified until deployment evidence exists',()=>{
 const t=ticket('IW-20261025-ABCDEF12',a,{status:'merged_verified'},'working');
 const selected=selectContinuation([t]);
 assert.equal(selected.target,null);
 assert.equal(selected.slots[0].stage,'verify_receipt');
});
