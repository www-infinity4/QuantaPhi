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
test('known owner repairs reach authenticated Brain ticket path before direct GitHub assist',()=>{
 assert.match(ui,/const knownQuantaRepair=/);
 assert.match(ui,/if\(knownQuantaRepair\)directCoding=false;/);
 assert.match(ui,/else if\(!embedded&&knownQuantaRepair\)\{/);
 const special=ui.indexOf('else if(!embedded&&knownQuantaRepair)');
 const direct=ui.indexOf('else if(!embedded&&!ownerGithubNonAction&&(directRequest||githubCheck||createRepository||coderRequest||directCoding))');
 assert.ok(special>0&&special<direct,'existing direct GitHub must not intercept first-party repairs');
 assert.match(ui,/submitWork\(request,'explicit-user-command',imageWorkEvidence\)/);
 assert.match(ui,/verifiedOwnerHeaders\(\)/);
 assert.match(ui,/start_immediately:true/);
 assert.match(ui,/result\.ticket\?\.id/);
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
