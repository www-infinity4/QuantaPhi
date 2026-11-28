'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const brain=require('../bubbles-brain-actions.js');
const ui=fs.readFileSync('bubbles-ai.js','utf8');

test('owner X / Bubbles repairs identify QuantaPhi without a magic prompt',()=>{
 for(const instruction of [
  'Fix the Twitter Quick Card inside the Infinity carousel',
  'Please finish Bubbles chat wiring so it runs owner jobs',
  'Bubbles, repair the X posting controls',
  'Connect Bubbles wallet to the real Robot Brain work receipts',
  'Could you wire the Twitter quick card to the real X feed?'
 ]) assert.equal(brain.firstPartyRepairTarget(instruction),'www-infinity4/QuantaPhi',instruction);
});
test('rock radio and Steve Miller quick card repairs auto-route to QuantaPhi',()=>{
 for(const instruction of [
  'Fix the rock music player buttons; they play Infinity Music instead',
  'Repair Steve Miller radio in the Quick Card',
  'Fix Pink Floyd radio button on the page',
  'Bubbles, repair Classic Rock player in the Infinity carousel',
  'Please fix Infinity Radio Quick Card playback'
 ]) assert.equal(brain.firstPartyRepairTarget(instruction),'www-infinity4/QuantaPhi',instruction);
 for(const instruction of [
  'How does Steve Miller radio work?',
  'Do not fix Pink Floyd radio',
  'Fix Pink Floyd radio in www-infinity4/Alien-Radio',
  'Repair Classic Rock player across both repositories'
 ]) assert.equal(brain.firstPartyRepairTarget(instruction),null,instruction);
});

test('questions, refusals, read-only checks and named other repos never authorize QuantaPhi repair',()=>{
 for(const instruction of [
  'How can I repair Bubbles?',
  'Please do not fix Bubbles chat',
  'Explain the X Quick Card',
  'Check Twitter Spaces live status',
  'Fix Twitter quick card in www-infinity4/WidgetPhi',
  'Fix Moltnook robot brain service',
  'Fix Twitter Quick Card across both repositories',
  'Open the Twitter Quick Card'
 ]) assert.equal(brain.firstPartyRepairTarget(instruction),null,instruction);
});
test('known owner repairs use the shared authenticated engineering route before general GitHub intent',()=>{
 assert.match(ui,/const knownQuantaRepair=/);
 assert.match(ui,/if\(knownQuantaRepair\)directCoding=false;/);
 assert.match(ui,/else if\(!embedded&&knownQuantaRepair\)\{/);
 const special=ui.indexOf('else if(!embedded&&knownQuantaRepair)');
 const direct=ui.indexOf('else if(!embedded&&!ownerGithubNonAction&&(directRequest||githubCheck||createRepository||coderRequest||directCoding))');
 assert.ok(special>0&&special<direct,'first-party repository resolution remains authoritative');
 assert.match(ui.slice(special,direct),/performRepositoryRepair\(/);
 assert.match(ui,/submitWork\(request,'explicit-user-command',imageWorkEvidence\)/);
 assert.match(ui,/verifiedOwnerHeaders\(\)/);
 assert.match(ui,/start_immediately:true/);
 assert.match(ui,/result\.ticket\?\.id/);
});

function engineeringFixture({verified=true,result={ok:true,status:'working'},timeout=false}={}){
 const calls=[],queued=[],watched=[],notes=[];
 const scope={embedded:false,activeThread:'chat_fixture',crypto,
  verifiedOwnerHeaders:async()=>{if(!verified)throw Error('owner_authorization_required');return {Authorization:'Bearer fixture-owner'};},
  BRAIN:'https://brain.fixture',rememberRecentGithubWork(){},
  bubblesFetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});if(timeout)throw Error('response_missing');return {ok:true,json:async()=>result};},
  watchDirectGithubReceipt:(...args)=>watched.push(args),
  maybeDelegateDirectOverflow:async()=>null,
  submitRepositoryWork:async(...args)=>{queued.push(args);return {id:'IW-20261128-12345678',repository:args[2],status:'ready'};},
  humanReplies:async()=>({githubReply:r=>'GitHub state: '+r.status,workReply:t=>'Ticket state: '+t.status}),
  recordBrainNotice:message=>notes.push(message),
  workStatus:{},workText:{value:'existing draft'},tools:{open:false},
  repositorySelectionExplicit:false,repositorySelection:new Set(['www-infinity4/WidgetPhi']),
  activeCardEvidence:null,imageWorkEvidence:'',requestsAgents:false,request:'Fix the Bubbles send button',knownQuantaRepair:true,
  workEvidence:'',submitWork:async(...args)=>{queued.push(args);return {id:'IW-20261128-ABCDEF12',repository:'www-infinity4/QuantaPhi',status:'ready'};}};
 vm.createContext(scope);
 const start=ui.indexOf('async function directGithubOperation('),end=ui.indexOf("\ninput.addEventListener('keydown'",start);
 vm.runInContext(ui.slice(start,end),scope);
 const repairStart=ui.indexOf('async function performRepositoryRepair(');
 assert.ok(repairStart>0,'shared engineering route must exist');
 vm.runInContext(ui.slice(repairStart,ui.indexOf('async function submitWork(',repairStart)),scope);
 return {scope,calls,queued,watched,notes};
}

async function knownRepair(scope){
 const start=ui.indexOf('else if(!embedded&&knownQuantaRepair)'),end=ui.indexOf('else if(!embedded&&!ownerGithubNonAction',start);
 return vm.runInContext('(async()=>{'+ui.slice(start+5,end)+'; return workEvidence;})()',scope);
}

test('ordinary known repairs submit to existing GitHub builder without any D1 ticket request',async()=>{
 const {scope,calls,queued,watched}=engineeringFixture();
 const reply=await knownRepair(scope);
 assert.equal(calls.length,1);assert.equal(queued.length,0);assert.equal(watched.length,1);
 assert.equal(calls[0].url,'https://brain.fixture/work/github');
 assert.equal(calls[0].body.action,'assist');assert.equal(calls[0].body.mode,'write');
 assert.equal(calls[0].body.repository,'www-infinity4/QuantaPhi');
 assert.equal(calls[0].body.request,scope.request);
 assert.equal(calls[0].body.sessionId,'chat_fixture');
 assert.equal(scope.workText.value,'existing draft','do not replace a draft with a second queued copy');
 assert.match(reply,/working/);assert.doesNotMatch(reply,/complete|merged|deployed/);
});

test('ordinary named repository write uses the same direct builder and original explicit scope',async()=>{
 const {scope,calls,queued}=engineeringFixture();
 Object.assign(scope,{request:'Fix README.md in www-infinity4/RecordB',ownerGithubNonAction:false,
  directRequest:false,githubCheck:false,createRepository:false,coderRequest:null,directCoding:true,
  workflowIntent:false,runCommand:false,namedWorkflow:'',neuralCoding:false,
  contextualPluralRepair:false,contextualRepairQuery:'',status:{}});
 const start=ui.indexOf('else if(!embedded&&!ownerGithubNonAction'),end=ui.indexOf('else if(!embedded&&(isOwnerWorkRequest',start);
 await vm.runInContext('(async()=>{'+ui.slice(start+5,end)+'})()',scope);
 assert.equal(calls.length,1);assert.equal(queued.length,0);
 assert.equal(calls[0].body.mode,'write');assert.equal(calls[0].body.repository,'www-infinity4/RecordB');
 assert.equal(calls[0].body.request,scope.request);
});

test('non-action intent and visitors cannot enter ordinary repository write routing',async()=>{
 for(const guard of [{embedded:true,ownerGithubNonAction:false},{embedded:false,ownerGithubNonAction:true}]){
  const {scope,calls,queued}=engineeringFixture();
  Object.assign(scope,{...guard,directRequest:false,githubCheck:false,createRepository:false,coderRequest:null,directCoding:true});
  const start=ui.indexOf('else if(!embedded&&!ownerGithubNonAction'),end=ui.indexOf('else if(!embedded&&(isOwnerWorkRequest',start);
  await vm.runInContext('(async()=>{'+ui.slice(start+5,end)+'})()',scope);
  assert.equal(calls.length,0);assert.equal(queued.length,0);
 }
});

test('explicit repository selection is retained and multiple selections keep the existing batch path',async()=>{
 const one=engineeringFixture();one.scope.repositorySelectionExplicit=true;
 await knownRepair(one.scope);
 assert.equal(one.calls[0].body.repository,'www-infinity4/WidgetPhi');
 const many=engineeringFixture();many.scope.repositorySelectionExplicit=true;
 many.scope.repositorySelection.add('www-infinity4/QuantaPhi');
 await knownRepair(many.scope);
 assert.equal(many.calls.length,0);assert.equal(many.queued.length,1);
 assert.equal(many.scope.workText.value,many.scope.request);
});

test('explicit bot-team work retains the requested job pipeline instead of a plain direct repair',async()=>{
 const known=engineeringFixture();known.scope.requestsAgents=true;
 known.scope.request='Fix Bubbles using all my bots';
 await knownRepair(known.scope);
 assert.equal(known.calls.length,0);assert.equal(known.queued.length,1);
 const ordinary=engineeringFixture();
 await ordinary.scope.performRepositoryRepair('Fix RecordB with a bot team','www-infinity4/RecordB','',null,true);
 assert.equal(ordinary.calls.length,0);assert.equal(ordinary.queued.length,1);
 assert.equal(ordinary.queued[0][2],'www-infinity4/RecordB');
});

test('image/card evidence and oversized requests retain their original ticket payloads',async()=>{
 for(const [request,image,card] of [['Fix it','Image 1: observed defect',null],['Fix it','',{cardId:'radio'}],['x'.repeat(5001),'',null]]){
  const {scope,calls,queued}=engineeringFixture();
  await scope.performRepositoryRepair(request,'www-infinity4/QuantaPhi',image,card);
  assert.equal(calls.length,0);assert.equal(queued.length,1);
  assert.equal(queued[0][0],request);assert.equal(queued[0][1],'explicit-user-command');
  assert.equal(queued[0][2],'www-infinity4/QuantaPhi');
  assert.equal(queued[0][3],card);assert.equal(queued[0][4],image);
 }
 const boundary=engineeringFixture();
 await boundary.scope.performRepositoryRepair('x'.repeat(5000),'www-infinity4/QuantaPhi');
 assert.equal(boundary.calls.length,1);assert.equal(boundary.queued.length,0);
});

test('revoked owner authorization and visitor embedding stop before network or queue operations',async()=>{
 const denied=engineeringFixture({verified:false});
 await assert.rejects(denied.scope.performRepositoryRepair('Fix it','www-infinity4/QuantaPhi'),/owner_authorization_required/);
 assert.equal(denied.calls.length,0);assert.equal(denied.queued.length,0);
 const embedded=engineeringFixture();embedded.scope.embedded=true;
 await assert.rejects(embedded.scope.performRepositoryRepair('Fix it','www-infinity4/QuantaPhi'),/owner_tools_unavailable_in_embed/);
 assert.equal(embedded.calls.length,0);assert.equal(embedded.queued.length,0);
});

test('missing direct response follows the same receipt without resubmitting through tickets',async()=>{
 const {scope,calls,queued,watched}=engineeringFixture({timeout:true});
 const reply=await scope.performRepositoryRepair('Fix it','www-infinity4/QuantaPhi');
 assert.equal(calls.length,1);assert.equal(queued.length,0);assert.equal(watched.length,1);
 assert.equal(watched[0][0],calls[0].body.requestId);
 assert.match(reply,/unconfirmed/);assert.doesNotMatch(reply,/complete|merged|deployed/);
});
test('unambiguous QuantaPhi repair auto-selects the correct repo and still requires server submission',async()=>{
 const submitted=[],scope={
  activeCardEvidence:null,repositorySelectionExplicit:false,
  repositorySelection:new Set(['www-infinity4/WidgetPhi']),
  brainTools:{firstPartyRepairTarget:brain.firstPartyRepairTarget},
  repositoryPicker:{dataset:{}},workStatus:{},
  suggestRepositoryTargets:async()=>{throw Error('Should not need a chooser for a known first-party site')},
  submitRepositoryWork:async(request,approval,repository)=>{
   submitted.push({request,approval,repository});return {id:'signed-ticket-test',repository,status:'ready'};
  }
 };
 vm.createContext(scope);
 vm.runInContext(ui.slice(ui.indexOf('async function submitWork('),ui.indexOf('async function submitRepositoryWork(')),scope);
 const work='Fix the Twitter Quick Card inside the Infinity carousel';
 const result=await scope.submitWork(work,'explicit-user-command');
 assert.equal(result.repository,'www-infinity4/QuantaPhi');
 assert.equal(submitted.length,1);
 assert.deepEqual(submitted[0],{request:work,approval:'explicit-user-command',repository:'www-infinity4/QuantaPhi'});
 assert.equal(scope.repositoryPicker.dataset.submitting,undefined);
});
