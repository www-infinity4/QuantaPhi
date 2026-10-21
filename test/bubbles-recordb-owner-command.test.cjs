'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const helpers=require('../bubbles-brain-actions.js');
const site=fs.readFileSync('bubbles-ai.js','utf8');
const gateway=fs.readFileSync('workers/quantaphi-site/worker.js','utf8');

test('RecordB issue #2 is a build command even when it asks for the final report',()=>{
 const phrases=[
  'Build RecordB issue #2, run the bot team, test the recording library, and report the actual results.',
  ': “Build RecordB issue #2, run the bot team, test the recording library, and report the actual results.”',
  'Build RecordB issue #2',
  'RecordB Hook into bubbles make bubbles perform the work'
 ];
 for(const p of phrases){
  assert.equal(helpers.classify(p),'queue',p);
  assert.equal(helpers.repositoryFor(p),'www-infinity4/RecordB',p);
 }
 for(const p of ["Don't build RecordB issue #2",'Start RecordB recording','What is RecordB?'])
  assert.equal(helpers.classify(p),'chat',p);
});

test('named RecordB issue is submitted to its own repository, not stale selection',async()=>{
 const scope={
  activeCardEvidence:null,repositorySelectionExplicit:false,
  repositorySelection:new Set(['www-infinity4/QuantaPhi']),
  repositoryPicker:{dataset:{}},workStatus:{textContent:''},
  submitRepositoryWork:async(request,approval,repository)=>{scope.called.push({request,approval,repository});return{id:'receipt',repository,status:'ready'};},
  called:[],suggestRepositoryTargets:async()=>{throw Error('Named issue should never trigger ambiguous repo suggestion');}
 };
 const slice=site.slice(site.indexOf('async function submitWork('),site.indexOf('async function submitRepositoryWork('));
 assert.ok(slice.length>100);
 vm.createContext(scope);vm.runInContext(slice,scope);
 const result=await scope.submitWork('Build RecordB issue #2, run the bot team, test the recording library, and report the actual results.','explicit-user-command');
 assert.equal(scope.called.length,1);
 assert.equal(scope.called[0].repository,'www-infinity4/RecordB');
 assert.equal(scope.called[0].approval,'explicit-user-command');
 assert.equal(result.repository,'www-infinity4/RecordB');
});

test('explicit RecordB bot-team requests take the authenticated ticket path',()=>{
 assert.match(site,/bot\\s\+team/);
 assert.match(site,/const directCoding=!ownerGithubNonAction&&!requestsAgents&&!namedRecordBIssue&&codeTask;/);
 assert.match(site,/else if\(!embedded&&isOwnerWorkRequest\(request\)\)/);
 assert.match(site,/submitWork\(request,'explicit-user-command'\)/);
 assert.match(site,/Target: '\+ticket.repository/);
 assert.match(site,/completed code, APK recording tests and deployment still require actual runner receipts/);
});

test('every Bubbles entrypoint loads the unpinned fresh action router',()=>{
 const routing=gateway.split('\n').filter(line=>/^  const (?:repairRef|newQuantaRelease|newOctavesRelease|requestFlowRelease|chatRepairRelease|sourceRef) =/.test(line)).join('\n');
 const sourceRef=new Function('route','incoming',routing+';return sourceRef;');
 const version='20261020-owner-clock1';
 for(const path of ['index.html','bubbles.html','bubbles/index.html','bubbles-chrome.html']){
  const html=fs.readFileSync(path,'utf8');
  assert.match(html,new RegExp('bubbles-brain-actions\\.js\\?v='+version));
  assert.match(html,new RegExp('bubbles-ai\\.js\\?v='+version));
 }
 for(const path of ['/bubbles-ai.js','/bubbles-brain-actions.js'])
  assert.equal(sourceRef({repo:'QuantaPhi',sourcePath:path},new URL('https://quantaphi.org/'+path+'?v='+version)),'main');
 assert.equal(sourceRef({repo:'QuantaPhi',sourcePath:'/bubbles-brain-actions.js'},new URL('https://quantaphi.org/bubbles-brain-actions.js?v=20261019-chat-repair1')),'70324fb07090c9e2c15929b4a70c11afa4693c86');
});