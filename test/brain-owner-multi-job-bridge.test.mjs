import test from 'node:test';
import assert from 'node:assert/strict';
import {submitApprovedBridgeWork} from '../workers/infinity-brain-clock/runner-request.mjs';

const claims={run_id:'424242'};
const sourceSha='a'.repeat(40);
const body={repository:'www-infinity4/QuantaPhi',request:'Complete the signed Bubbles continuous handoff for #1921.',
 orderId:'avatar-1921-session-02',sourceSha,
 jobs:[
  {id:'TASK-1',instructions:'Inspect signed Bubbles handoff receipts and correct any source failures.',dependencies:[]},
  {id:'TASK-2',instructions:'After TASK-1 has verified completion, continue durable runner integration.',dependencies:['TASK-1']}
 ]};
function harness(options={}){
 const calls=[];
 const request=new Request('https://brain/owner/bridge-work',{headers:{Authorization:'Bearer synthetic'}});
 const run=(payload=body)=>submitApprovedBridgeWork({
  request,claims,body:payload,
  fetcher:async(url,args)=>{calls.push({type:'grant',url,body:JSON.parse(args.body)});return Response.json(
   options.grant??{ok:true,jobId:'chatgpt_runner_424242'},{status:options.http??200});},
  submit:async packet=>{calls.push({type:'submit',packet});return options.saved??{
   status:200,result:{ok:true,deduplicated:false,startRequested:true,
    ticket:{id:'IW-test',repository:packet.repository,request:packet.request,context:packet.context,status:'ready'}}};},
  dispatch:async id=>{calls.push({type:'dispatch',id});return {status:'queued_for_runner'};}
 });
 return {run,calls};
}
test('two owner-approved jobs enter the existing D1 ticket with a real dependency edge',async()=>{
 const h=harness();const receipt=await h.run();
 assert.equal(receipt.status,200);
 assert.equal(receipt.result.completed,false);
 assert.equal(receipt.result.jobCount,2);
 const submitted=h.calls.find(x=>x.type==='submit').packet;
 assert.equal(submitted.context.submission_id,'gpt-owner-order-avatar-1921-session-02');
 assert.equal(submitted.context.source_sha,sourceSha);
 assert.deepEqual(submitted.context.color_jobs.map(x=>[x.id,x.dependencies]),[
  ['TASK-1',[]],['TASK-2',['TASK-1']]]);
 assert.ok(submitted.context.color_jobs.every(x=>x.executor==='repository-engine'));
 assert.equal(h.calls.filter(x=>x.type==='dispatch').length,1);
});
test('same signed order retries idempotently and does not dispatch a second time',async()=>{
 let ticket;
 const first=harness();await first.run();
 ticket=first.calls.find(x=>x.type==='submit').packet;
 const replay=harness({saved:{status:200,result:{ok:true,deduplicated:true,startRequested:false,
  ticket:{id:'IW-test',repository:ticket.repository,request:ticket.request,context:ticket.context,status:'working'}}}});
 const response=await replay.run();
 assert.equal(response.status,200);
 assert.equal(response.result.deduplicated,true);
 assert.equal(replay.calls.filter(x=>x.type==='dispatch').length,0);
});
test('an order ID cannot be replayed with altered steps or source SHA',async()=>{
 const first=harness();await first.run();
 const p=first.calls.find(x=>x.type==='submit').packet;
 const saved={status:200,result:{ok:true,deduplicated:true,startRequested:false,
  ticket:{id:'IW-test',repository:p.repository,request:p.request,context:p.context,status:'ready'}}};
 const replay=harness({saved});
 const changed={...body,jobs:[body.jobs[0],{...body.jobs[1],instructions:'Changed work order'}]};
 assert.equal((await replay.run(changed)).status,409);
 assert.equal((await replay.run({...body,sourceSha:'b'.repeat(40)})).status,409);
 assert.equal(replay.calls.filter(x=>x.type==='dispatch').length,0);
});
test('invalid chains fail before consent or D1 access',async()=>{
 const cases=[
  {...body,jobs:[body.jobs[0],{...body.jobs[0]}]},
  {...body,jobs:[body.jobs[0],{...body.jobs[1],dependencies:['TASK-3']}]},
  {...body,jobs:[{...body.jobs[0],dependencies:['TASK-2']},body.jobs[1]]},
  {...body,sourceSha:'head'},
  {...body,orderId:'../../secret'},
  {...body,jobs:[{...body.jobs[0],instructions:'x'.repeat(1801)},body.jobs[1]]}
 ];
 for(const candidate of cases){
  const h=harness();
  const r=await h.run(candidate);
  assert.equal(r.status,400);
  assert.equal(h.calls.length,0);
 }
});
test('revoked or expired grant blocks an entire chain before persistence',async()=>{
 for(const opts of [{http:403,grant:{ok:false}},{grant:{ok:false}},{grant:{ok:true,jobId:'chatgpt_runner_other'}}]){
  const h=harness(opts);const r=await h.run();
  assert.equal(r.status,403);
  assert.deepEqual(h.calls.map(x=>x.type),['grant']);
 }
});
