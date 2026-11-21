import test from 'node:test';
import assert from 'node:assert/strict';
import {checkOwnerBridgeClaims,authenticateOwnerBridge,checkClaims} from '../workers/infinity-brain-clock/runner-auth.mjs';
import {submitApprovedBridgeWork} from '../workers/infinity-brain-clock/runner-request.mjs';
const now=Date.now()/1000;
const claims={iss:'https://token.actions.githubusercontent.com',aud:'bubbles-owner-message-bridge',
 repository:'www-infinity4/Moltnook',repository_id:'1188306316',
 workflow_ref:'www-infinity4/Moltnook/.github/workflows/bubbles-owner-message.yml@refs/heads/main',
 ref:'refs/heads/main',event_name:'push',run_id:'1234',iat:now-10,nbf:now-10,exp:now+300};
test('only the existing signed bridge workflow can submit; it cannot claim writer authority',()=>{
 assert.equal(checkOwnerBridgeClaims(claims,now),claims);
 for(const patch of [{aud:'infinity-brain-writer'},{repository_id:'other'},{ref:'refs/heads/other'},
  {workflow_ref:'other'},{event_name:'pull_request'},{exp:now},{iat:now-601},{nbf:now+60},{run_id:'../1'}])
  assert.throws(()=>checkOwnerBridgeClaims({...claims,...patch},now));
 // Prevent the intake identity from becoming a general-purpose owner key.
 const old=console.error;console.error=()=>{};
 try{assert.throws(()=>checkClaims(claims,now));}finally{console.error=old;}
});
test('intake verifies the actual JWT signature and rejects tampered claims',async()=>{
 const key=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',key.publicKey);jwk.kid='test';
 const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const message=enc({alg:'RS256',kid:'test'})+'.'+enc(claims);
 const signature=Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key.privateKey,new TextEncoder().encode(message))).toString('base64url');
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{assert.equal(url,'https://token.actions.githubusercontent.com/.well-known/jwks');return Response.json({keys:[jwk]});};
 try{
  assert.equal((await authenticateOwnerBridge(new Request('https://brain/owner/bridge-work',{headers:{Authorization:'Bearer '+message+'.'+signature}}))).run_id,'1234');
  const altered=enc({alg:'RS256',kid:'test'})+'.'+enc({...claims,run_id:'999'});
  await assert.rejects(authenticateOwnerBridge(new Request('https://brain/owner/bridge-work',{headers:{Authorization:'Bearer '+altered+'.'+signature}})),/signature_rejected/);
 }finally{globalThis.fetch=original;}
});
function harness(options={}){
 const calls=[],request=new Request('https://brain/owner/bridge-work',{headers:{Authorization:'Bearer synthetic'}});
 const body={repository:'www-infinity4/QuantaPhi',request:'Repair Bubbles card controls using actual DOM receipts.'};
 return {calls,body,run:patch=>submitApprovedBridgeWork({request,claims,body,
  fetcher:async(url,args)=>{calls.push('approval');assert.equal(url,'https://bubbles-cloud-browser.marvaseater.workers.dev/v1/browser/chatgpt/runner');assert.deepEqual(JSON.parse(args.body),{operation:'status'});return Response.json(options.approval??{ok:true,jobId:'chatgpt_runner_1234'},{status:options.status??200});},
  submit:async packet=>{calls.push(packet);return options.saved??{status:200,result:{ok:true,startRequested:true,ticket:{id:'IW-test',repository:body.repository,request:body.request,status:'ready'}}};},
  dispatch:async id=>{calls.push(['dispatch',id]);if(options.dispatchFails)throw Error('offline');return options.dispatchResponse??{status:'queued_for_runner'};},...patch})};
}
test('active consent produces a real ticket and dispatch receipt, never completion',async()=>{
 const h=harness(),r=await h.run();assert.equal(r.status,200);assert.equal(r.result.ticketId,'IW-test');
 assert.equal(r.result.completed,false);assert.equal(r.result.productionVerified,false);
 assert.deepEqual(r.result.execution,{status:'queued_for_runner'});
 const packet=h.calls[1];assert.equal(packet.context.color_jobs[0].executor,'repository-engine');
 assert.equal(packet.context.color_jobs[0].instructions,h.body.request);
 assert.equal(packet.context.submission_id,'gpt-owner-work-1234');
 assert.ok(!JSON.stringify(r).includes('Bearer'));assert.ok(!JSON.stringify(packet).includes('synthetic'));
});
test('revoked, expired, unavailable or mismatched approval never creates work',async()=>{
 for(const options of [{status:403,approval:{ok:false}},{approval:{ok:true,jobId:'different'}},{approval:{ok:false}}]){
  const h=harness(options);assert.equal((await h.run()).status,403);assert.deepEqual(h.calls,['approval']);
 }
 const h=harness();await assert.rejects(h.run({fetcher:async()=>{throw Error('offline')}}));assert.deepEqual(h.calls,[]);
});
test('scope and payload validation precede all remote calls',async()=>{
 for(const body of [{repository:'someone/QuantaPhi',request:'fix'},{repository:'www-infinity4/Other',request:'fix'},
  {repository:'www-infinity4/QuantaPhi',request:'fix',approveAll:true},
  {repository:'www-infinity4/QuantaPhi',request:'x'.repeat(1801)}]){
  const h=harness();assert.equal((await h.run({body})).status,400);assert.deepEqual(h.calls,[]);
 }
});
test('existing tickets are not redispatched, changed run content fails closed, and dispatch failure remains saved',async()=>{
 const saved={status:200,result:{ok:true,deduplicated:true,startRequested:false,ticket:{id:'IW-test',repository:'www-infinity4/QuantaPhi',request:'Repair Bubbles card controls using actual DOM receipts.',status:'blocked'}}};
 const h=harness({saved});const r=await h.run();assert.equal(r.result.status,'blocked');assert.equal(h.calls.length,2);
 saved.result.ticket.request='different';assert.equal((await harness({saved}).run()).status,409);
 const offline=await harness({dispatchFails:true}).run();assert.equal(offline.result.ticketId,'IW-test');assert.equal(offline.result.execution.status,'scheduled_fallback');
});

test('signed owner bridge preserves safe runner blocker reason without inventing execution',async()=>{
 const blocked=await harness({dispatchResponse:{ok:true,status:'job_not_dispatchable',reason:'dependency_pending'}}).run();
 assert.equal(blocked.status,200);
 assert.deepEqual(blocked.result.execution,{status:'job_not_dispatchable',reason:'dependency_pending'});
 assert.equal(blocked.result.completed,false);
 assert.equal(blocked.result.productionVerified,false);
 const accepted=await harness({dispatchResponse:{ok:true,status:'queued_for_runner',reason:'dispatch_accepted_execution_unverified'}}).run();
 assert.equal(accepted.result.execution.reason,'dispatch_accepted_execution_unverified');
});
test('owner bridge drops unsafe upstream reason text and never leaks private data',async()=>{
 for(const reason of ['Authorization: Bearer secret', 'owner_decision_required\\nprivate value', 'x'.repeat(120)]){
  const receipt=await harness({dispatchResponse:{status:'job_not_dispatchable',reason}}).run();
  assert.deepEqual(receipt.result.execution,{status:'job_not_dispatchable'});
  assert.equal(JSON.stringify(receipt.result).includes(reason),false);
 }
});
