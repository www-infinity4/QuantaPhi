import test from 'node:test';
import assert from 'node:assert/strict';
import {readRunnerQueue} from '../workers/infinity-brain-clock/runner-candidate-page.mjs';

function fixture(count=135){
 const tickets=Array.from({length:count},(_,i)=>({
  id:'IW-'+String(i).padStart(5,'0'),
  owner_hash:'owner-A',created_at:1700000000000+i,
  status:'blocked',
  context_json:JSON.stringify({kind:'robot-directions',color_jobs:[{id:'TASK-1',status:'blocked'}]})
 }));
 // Exact tied timestamps must not cause duplicate or missing rows.
 tickets[112].created_at=tickets[111].created_at;
 tickets.push({id:'OTHER-OWNER',owner_hash:'owner-B',created_at:9999999999999,
  status:'ready',context_json:'{"kind":"robot-directions"}'});
 tickets.push({id:'DRAFT',owner_hash:'owner-A',created_at:9999999999998,
  status:'draft',context_json:'{"kind":"robot-directions"}'});
 tickets.push({id:'OTHER-KIND',owner_hash:'owner-A',created_at:9999999999997,
  status:'ready',context_json:'{"kind":"unrelated"}'});
 const calls=[];
 const db={prepare(sql){return{bind(...args){return{
   async all(){
    calls.push({sql,args});
    assert.match(sql,/owner_hash=\?/);
    assert.match(sql,/status IN \('ready','working','blocked'\)/);
    assert.match(sql,/robot-directions/);
    const descending=sql.includes('ORDER BY created_at DESC');
    const selected=tickets.filter(t=>t.owner_hash===args[0]&&
     ['ready','working','blocked'].includes(t.status)&&
     JSON.parse(t.context_json).kind==='robot-directions');
    selected.sort((a,b)=>descending?b.created_at-a.created_at||b.id.localeCompare(a.id):
     a.created_at-b.created_at||a.id.localeCompare(b.id));
    const limit=args.at(-1);
    const after=args.length===5?{created_at:args[1],id:args[3]}:null;
    return {results:selected.filter(t=>!after||(descending?
     t.created_at<after.created_at||(t.created_at===after.created_at&&t.id<after.id):
     t.created_at>after.created_at||(t.created_at===after.created_at&&t.id>after.id))
    ).slice(0,limit)};
   },
   async first(){
    calls.push({sql,args,exact:true});
    assert.match(sql,/owner_hash=\?/);
    return tickets.find(t=>t.id===args[0]&&t.owner_hash===args[1]&&
     ['ready','working','blocked'].includes(t.status)&&JSON.parse(t.context_json).kind==='robot-directions')||null;
   }
  };}};}};
 return {db,tickets,calls};
}
test('signed claim can inspect eligible owner tickets beyond the newest 100 without deleting the log',async()=>{
 const {db,tickets,calls}=fixture();
 const snapshot=JSON.stringify(tickets);
 const found=await readRunnerQueue(db,{ownerHash:'owner-A',order:'newest'});
 assert.equal(found.results.length,135);
 assert.equal(new Set(found.results.map(t=>t.id)).size,135);
 assert.equal(found.results[0].id,'IW-00134');
 assert.equal(found.results.at(-1).id,'IW-00000');
 assert.equal(found.scanLimited,false);
 assert.equal(calls.filter(c=>!c.exact).length,2);
 assert.equal(JSON.stringify(tickets),snapshot);
});
test('alarm selects old eligible tickets beyond the first 100 while preserving oldest-first order',async()=>{
 const {db}=fixture();
 const found=await readRunnerQueue(db,{ownerHash:'owner-A',order:'oldest'});
 assert.equal(found.results.length,135);
 assert.equal(found.results[0].id,'IW-00000');
 assert.equal(found.results.at(-1).id,'IW-00134');
 assert.equal(new Set(found.results.map(x=>x.id)).size,135);
});
test('an explicitly owner-selected older ticket is added by exact partitioned read when pagination budget is exhausted',async()=>{
 const {db,calls}=fixture(450);
 const found=await readRunnerQueue(db,{ownerHash:'owner-A',order:'newest',
  requestedTicketId:'IW-00000'});
 assert.equal(found.results.length,401);
 assert.equal(found.scanLimited,true);
 assert.equal(found.results[0].id,'IW-00000');
 assert.equal(found.results.filter(t=>t.id==='IW-00000').length,1);
 assert.equal(calls.filter(x=>x.exact).length,1);
 const absent=await readRunnerQueue(db,{ownerHash:'owner-A',order:'newest',
  requestedTicketId:'OTHER-OWNER'});
 assert.equal(absent.results.some(x=>x.id==='OTHER-OWNER'),false);
});
test('hard page cap leaves overflow honestly marked and never claims an empty queue',async()=>{
 const {db,calls}=fixture(550);
 const rows=await readRunnerQueue(db,{ownerHash:'owner-A',order:'oldest'});
 assert.equal(rows.results.length,400);
 assert.equal(rows.scanLimited,true);
 assert.equal(calls.length,4);
});
test('a database read failure does not silently become an empty, apparently completed work log',async()=>{
 const db={prepare(){return {bind(){return {all:async()=>{throw Error('D1 unavailable')}}}}}};
 await assert.rejects(readRunnerQueue(db,{ownerHash:'owner-A'}),/D1 unavailable/);
});

test('all four signed Brain recovery paths use owner-partitioned paging instead of burying recent errors',async()=>{
 const {readFile}=await import('node:fs/promises');
 const worker=await readFile(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 for(const method of ['reconcilePendingWork','recoverDeferredWork','retryPendingWork']){
  const start=worker.indexOf('async '+method+'(');
  assert.ok(start>=0,'expected '+method+' method');
  const end=method==='reconcilePendingWork'?worker.indexOf('async recoverDeferredWork',start):
   method==='recoverDeferredWork'?worker.indexOf('async retryPendingWork',start):
    worker.indexOf('async directGithub',start);
  assert.ok(end>start,'method region '+method);
  assert.match(worker.slice(start,end),/readRunnerQueue\(this\.env\.WORK_DB/);
 }
 const claim=worker.slice(worker.indexOf("if(path==='/runner/claim')"),worker.indexOf("if(path==='/runner/event')"));
 assert.match(claim,/readRunnerQueue\(this\.env\.WORK_DB/);
 assert.equal((worker.match(/readRunnerQueue\(this\.env\.WORK_DB/g)||[]).length,4);
});
