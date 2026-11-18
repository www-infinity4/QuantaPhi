import test from 'node:test';
import assert from 'node:assert/strict';
import {describeRunnerIdle,noteRunnerSkip,noteRunnerDependencyStatuses} from '../workers/infinity-brain-clock/runner-claim-idle.mjs';

test('empty owner queue cannot masquerade as successful work',()=>{
 assert.deepEqual(describeRunnerIdle({candidateCount:0,admission:{allowed:[],deferred:[]},adapterMatches:0}),
  {code:'owner_queue_empty',examined:0,admitted:0,deferred:0,adapterMatches:0,agedOut:0,scanLimited:false});
});
test('aged-out jobs report admission gate without owner IDs or private text',()=>{
 const x=describeRunnerIdle({candidateCount:3,admission:{allowed:[],deferred:[
   {ticketId:'private',reason:'background_ticket_aged_out'},{ticketId:'private2',reason:'background_ticket_aged_out'},
   {ticketId:'private3',reason:'owner_decision_required'}]},adapterMatches:0});
 assert.deepEqual(x,{code:'admission_deferred',examined:3,admitted:0,deferred:3,adapterMatches:0,agedOut:2,scanLimited:false});
 assert.ok(!JSON.stringify(x).includes('private'));
});
test('adapter mismatch is distinct from a lease or dependency wait',()=>{
 assert.equal(describeRunnerIdle({candidateCount:2,admission:{allowed:[{},{}],deferred:[]},adapterMatches:0}).code,'no_matching_runner_adapter');
 assert.equal(describeRunnerIdle({candidateCount:2,admission:{allowed:[{},{}],deferred:[]},adapterMatches:2}).code,'eligible_but_not_claimed');
});
test('bounded scans and untrusted malformed values remain safe',()=>{
 const x=describeRunnerIdle({candidateCount:2000,admission:{allowed:[],deferred:[{reason:'Bearer private'}]},adapterMatches:-2,scanLimited:true});
 assert.equal(x.scanLimited,true);
 assert.equal(x.examined,500);
 assert.equal(x.agedOut,0);
 assert.ok(!JSON.stringify(x).includes('Bearer'));
});

test('post-admission claim failures are bounded, private-data free and actionable',()=>{
 const claimBlockedBy={};
 noteRunnerSkip(claimBlockedBy,'dependency_pending');
 noteRunnerSkip(claimBlockedBy,'repository_lease_active');
 noteRunnerSkip(claimBlockedBy,'Bearer token from a forged model');
 const idle=describeRunnerIdle({candidateCount:309,
  admission:{allowed:[{},{},{}],deferred:[]},adapterMatches:2,scanLimited:true,claimBlockedBy});
 assert.equal(idle.code,'eligible_but_not_claimed');
 assert.deepEqual(idle.claimBlockedBy,{dependency_pending:1,repository_lease_active:1,other_policy:1});
 assert.ok(!JSON.stringify(idle).includes('Bearer'));
 const overflow=describeRunnerIdle({claimBlockedBy:{runner_backoff:9999,secret:'never report'}});
 assert.deepEqual(overflow.claimBlockedBy,{runner_backoff:500});
});
test('real Brain claim loop annotates every typed post-admission skip',async()=>{
 const {readFileSync}=await import('node:fs');
 const code=readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 assert.match(code,/noteRunnerSkip\(claimBlockedBy,'source_repair_active'\)/);
 assert.match(code,/eligibility.reason==='dependency_pending'.*noteRunnerDependencyStatuses\(dependencyStates,jobs,effectiveDependencies\)/);
 assert.match(code,/noteRunnerSkip\(claimBlockedBy,'repository_lease_active'\)/);
 assert.match(code,/noteRunnerSkip\(claimBlockedBy,eligibility.reason\)/);
 assert.match(code,/claimBlockedBy,dependencyStates,scanLimited:/);
});

test('signaled pending dependencies show bounded statuses, not ticket identities or private prose',()=>{
 const statuses={};
 const jobs=[
  {id:'DEPA',status:'blocked',instructions:'Owner private A'},
  {id:'DEPB',status:'committed_unverified',progress:{source:'Bearer secret'}},
  {id:'DEPC',status:'queued'},
  {id:'DEPD',status:'merged_verified'},
  {id:'DEPE',status:'deployed_verified'}
 ];
 noteRunnerDependencyStatuses(statuses,jobs,['DEPA','DEPB','DEPB','DEPC','DEPD','DEPE','MISSING']);
 assert.deepEqual(statuses,{blocked:1,committed_unverified:1,queued:1,missing:1});
 const report=describeRunnerIdle({candidateCount:2,admission:{allowed:[{},{}],deferred:[]},
  adapterMatches:2,claimBlockedBy:{dependency_pending:1},dependencyStates:statuses});
 assert.deepEqual(report.dependencyStates,statuses);
 assert.ok(!JSON.stringify(report).includes('Owner private'));
 assert.ok(!JSON.stringify(report).includes('Bearer'));
 assert.ok(!JSON.stringify(report).includes('DEPA'));
});
test('dependency classifications fail closed and never surface arbitrary status names',()=>{
 const s={};noteRunnerDependencyStatuses(s,[
  {id:'one',status:'security_hold_Bearer_secret'},
  {id:'two',status:'working'},
  {id:'three',status:'complete'},
  {id:'four',status:'superseded'}
 ],['one','two','three','four']);
 assert.deepEqual(s,{other_policy:1,working:1,superseded:1});
 assert.deepEqual(describeRunnerIdle({dependencyStates:{blocked:9999,secret_code:4,queued:-5}}).dependencyStates,{blocked:500});
});
test('the signed Cloudflare claim loop counts unfinished dependencies before returning idle',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 assert.match(source,/noteRunnerDependencyStatuses\(dependencyStates,jobs,effectiveDependencies\)/);
 assert.match(source,/claimBlockedBy,dependencyStates,scanLimited:/);
});
