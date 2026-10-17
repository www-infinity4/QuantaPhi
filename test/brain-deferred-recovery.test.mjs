import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceRecoveryEligibility,namedSourcePaths,inspectDeferredSources,recoveryDecision,
 MAX_RECOVERIES_PER_REVISION} from '../workers/infinity-brain-clock/deferred-recovery.mjs';
import {ticketAdmission} from '../workers/infinity-brain-clock/ticket-selector.mjs';
import {checkOwnerRunnerRequest} from '../workers/infinity-brain-clock/runner-request.mjs';
const now=Date.parse('2026-10-17T23:00:00Z'),sha='a'.repeat(40),day=86400000;
const task=(progress={})=>({
 id:'TASK-4',status:'blocked',queue_priority:95,repository:'www-infinity4/QuantaPhi',
 instructions:'Repair Quant AI source routing. Read production/quant-ai-commercial.json v2 and cinema-reel-core.js. Keep the 44 cue order. Do not invent public API.',
 progress:{summary:'Reader blocker: owner_input_required: Owner must specify concrete UI files, the exact exported function signatures from cinema-reel-core.js and full JSON schema for production/quant-ai-commercial.json.',...progress}
});
const sources={
 'production/quant-ai-commercial.json':JSON.stringify({schema:'quant-ai-commercial/v2',cue_schema_path:'production/quant-ai-commercial.schema.json',scenes:Array.from({length:44},(_,i)=>({id:'CUE-'+(i+1)}))}),
 'cinema-reel-core.js':'root.PhiCinemaTimeline=Object.freeze({seconds,captions,matches,clip,finalizeWebM});',
 'production/quant-ai-commercial.schema.json':JSON.stringify({title:'Cue schema',properties:{scenes:{minItems:44,maxItems:44}}})
};
function mockGithub(pathContent=sources){
 const called=[];
 const request=async(url,options)=>{
  called.push(String(url));
  assert.equal(options.redirect,'error');
  if(String(url).endsWith('/commits/main'))return Response.json({sha});
  const prefix='https://raw.githubusercontent.com/www-infinity4/QuantaPhi/'+sha+'/';
  assert.ok(String(url).startsWith(prefix),'host/commit is pinned to the verified owner repository');
  const path=decodeURI(String(url).slice(prefix.length));
  return Object.hasOwn(pathContent,path)?new Response(pathContent[path]):new Response('missing',{status:404});
 };
 return {request,called};
}
test('blocked legacy Quant AI gets actual public source proofs and enough facts to reattempt Green',async()=>{
 const job=task(),{request,called}=mockGithub();
 assert.equal(sourceRecoveryEligibility(job,{now}).eligible,true);
 assert.deepEqual(namedSourcePaths(job),['production/quant-ai-commercial.json','cinema-reel-core.js']);
 const inspection=await inspectDeferredSources(job,{request,now});
 assert.equal(inspection.status,'inspected');
 assert.equal(inspection.pinnedCommit,sha);
 assert.equal(inspection.sources.length,3,'manifest schema path is discovered without guessing');
 assert.deepEqual(inspection.required,[
  'production/quant-ai-commercial.json','cinema-reel-core.js','production/quant-ai-commercial.schema.json']);
 assert.equal(called.length,4,'one immutable commit read and exactly three bounded source reads');
 const decision=recoveryDecision(job,inspection,{now});
 assert.equal(decision.requeue,true);
 assert.equal(decision.recovery.requeueCount,1);
 assert.equal(decision.recovery.status,'requeued_for_verified_source_build');
 assert.match(decision.instructions,/Verified deferred recovery source/);
 assert.match(decision.instructions,/Do not invent APIs, audio timing or assets/);
 assert.ok(decision.recovery.sourceReceipts.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
 const requeued={...job,status:'queued',instructions:decision.instructions,queue_priority:0,
  progress:{...job.progress,summary:'Verified source contract',blocker:'',deferredRecovery:decision.recovery}};
 assert.equal(ticketAdmission({ticket:{id:'LEGACY',created_at:now-20*day},job:requeued},{now}).eligible,true);
 assert.equal(checkOwnerRunnerRequest(requeued,{now}).eligible,true,'normal runner gates still apply');
 assert.equal(checkOwnerRunnerRequest(requeued,{now,deps:[{status:'blocked'}]}).eligible,false);
 assert.equal(checkOwnerRunnerRequest(requeued,{now,lease:{leaseUntil:now+1000}}).eligible,false);
 assert.equal(job.status,'blocked','pure decision never mutates owner tickets');
});
test('a partial or unreachable source scan stays deferred with explicit next action, not abandoned',async()=>{
 const job=task(),{request}=mockGithub({'cinema-reel-core.js':sources['cinema-reel-core.js']});
 const evidence=await inspectDeferredSources(job,{request,now}),decision=recoveryDecision(job,evidence,{now});
 assert.equal(decision.requeue,false);
 assert.equal(decision.recovery.status,'needs_source_evidence');
 assert.equal(decision.recovery.nextEligibleAt,now+6*60*60*1000);
 assert.equal(sourceRecoveryEligibility({...job,progress:{...job.progress,deferredRecovery:decision.recovery}},{now:now+1000}).reason,'recovery_cooldown');
 const noNetwork=await inspectDeferredSources(job,{request:async()=>{throw Error('offline');},now});
 assert.equal(noNetwork.status,'pinned_commit_unavailable');
 assert.equal(recoveryDecision(job,noNetwork,{now}).requeue,false);
});
test('a real approval, permission or security hold cannot be rehabilitated as a technical guess',()=>{
 for(const blocker of ['security_hold','permission_denied','owner_authorization_required','biometric verification required','payment consent required']){
  const job=task({summary:'Owner action: '+blocker+'; source files are known'});
  assert.equal(sourceRecoveryEligibility(job,{now}).eligible,false,blocker);
 }
 assert.equal(sourceRecoveryEligibility({...task(),status:'complete'},{now}).eligible,false);
 assert.equal(sourceRecoveryEligibility({...task(),repository:'foreign/Other'},{now}).eligible,false);
});
test('retries do not replay indefinitely on the same immutable commit',async()=>{
 const job=task();const {request}=mockGithub(),inspection=await inspectDeferredSources(job,{request,now});
 const prior={pinnedCommit:sha,requeueCount:MAX_RECOVERIES_PER_REVISION,
  lastCheckedAt:now-25*60*60*1000,status:'review_exhausted'};
 const blocked=task({deferredRecovery:prior});
 const decision=recoveryDecision(blocked,inspection,{now});
 assert.equal(decision.requeue,false);
 assert.equal(decision.recovery.status,'review_exhausted');
 assert.equal(sourceRecoveryEligibility(blocked,{now}).eligible,true);
 assert.equal(sourceRecoveryEligibility(task({deferredRecovery:{...prior,lastCheckedAt:now-1000}}),{now}).reason,
  'recovery_budget_exhausted_until_daily_review');
});
test('untrusted or invalid source paths are not read and previous source addenda cannot accumulate',async()=>{
 const job=task();job.instructions+=' ../.env ./../../key.json https://example.com/outside.json';
 assert.ok(namedSourcePaths(job).every(p=>!p.includes('..')&&!p.includes('env')));
 const {request}=mockGithub();const evidence=await inspectDeferredSources(job,{request,now});
 const original=recoveryDecision(job,evidence,{now});
 assert.equal(original.requeue,true);
 const after={...job,instructions:original.instructions,progress:{...job.progress,deferredRecovery:original.recovery}};
 const second=recoveryDecision(after,evidence,{now:now+6*60*60*1000+1});
 assert.equal(second.requeue,true);
 assert.equal(second.instructions.split('[Verified deferred recovery source]').length,2,'only one pinned evidence addendum');
 assert.equal(second.recovery.requeueCount,2);
});
