const {test}=require('node:test');
const assert=require('node:assert/strict');
const {speechText,notificationPreference,ProgressTracker}=require('../bubbles-brain-actions.js');
const runUrl='https://github.com/www-infinity4/QuantaPhi/actions/runs/123';
const sha='a'.repeat(40);
const ticket=(jobs,title='Repair Bubbles UI')=>({id:'ticket',title,status:'working',context:{color_jobs:jobs}});
const job=(status,progress={},id='TASK-1')=>({id,status,progress});
const started=()=>job('working',{runUrl,claimedAt:'2026-10-17T19:00:00Z'});
const merged=()=>job('merged_verified',{mergeSha:sha});
const finished=()=>job('deployed_verified',{runUrl,commitSha:sha,testsPassed:true,browserPassed:true,deployedFilesMatched:true,reviewApproved:true});

test('voice retains link label but never reads web addresses or markup',()=>{
 assert.equal(speechText('Check [its page](https://quantaphi.org/bubbles.html) or www.example.com/path and example.org/test for updates.'),'Check its page or and for updates.');
 assert.equal(speechText('*UI job* finished.'),'UI job finished.');
});
test('single job speaks one authenticated start and one verified completion',()=>{
 const p=new ProgressTracker();
 assert.deepEqual(p.update([ticket([job('queued')])]),[]);
 assert.deepEqual(p.update([ticket([started()])]),['UI job started.']);
 assert.deepEqual(p.update([ticket([started()])]),[]);
 assert.deepEqual(p.update([ticket([merged()])]),[]);
 assert.deepEqual(p.update([ticket([finished()])]),['UI job finished.']);
 assert.deepEqual(p.update([ticket([finished()])]),[]);
});
test('already completed and claimed jobs never replay on first poll',()=>{
 const p=new ProgressTracker();
 assert.deepEqual(p.update([ticket([finished()])]),[]);
 assert.deepEqual(p.update([ticket([finished()])]),[]);
 const q=new ProgressTracker();
 assert.deepEqual(q.update([ticket([started()])]),[]);
});
test('unverified completion cannot claim a finished job',()=>{
 const p=new ProgressTracker();p.update([ticket([job('queued')])]);
 assert.deepEqual(p.update([ticket([job('complete',{runUrl,commitSha:sha})])]),[]);
 assert.deepEqual(p.update([ticket([job('complete',{runUrl,commitSha:sha,testsPassed:false})])]),[]);
 assert.deepEqual(p.update([ticket([job('complete',{runUrl,commitSha:sha,testsPassed:true})])]),[]);
 assert.deepEqual(p.update([ticket([finished()])]),['UI job finished.']);
});
test('multiple claimed jobs are quiet until each completion receipt arrives',()=>{
 const p=new ProgressTracker();
 p.update([ticket([job('queued',{},'J1'),job('queued',{},'J2')])]);
 assert.deepEqual(p.update([ticket([{...started(),id:'J1'},{...started(),id:'J2'}])]),[]);
 assert.deepEqual(p.update([ticket([{...finished(),id:'J1'},{...started(),id:'J2'}])]),['UI job finished.']);
 assert.deepEqual(p.update([ticket([{...finished(),id:'J1'},{...finished(),id:'J2'}])]),['UI job finished.']);
});
test('source telemetry does not speak routine alarm and dispatch retries',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync('bubbles-ai.js','utf8');
 const region=source.slice(source.indexOf('async function syncRedSectors(){'),source.indexOf('const ownerApprovalCards='));
 assert.ok(region.includes('redAckRevision=event.revision'));
 assert.ok(!region.includes('The bot network recorded a work update'));
 assert.ok(!region.includes('Robot Brain alarm retried the queued job'));
});
test('actual poller speaks verified completions while outages stay in the notice deck',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fs.readFileSync('bubbles-ai.js','utf8');
 let tickets=[ticket([job('queued')])],failed=false,calls=0;
 const displayed=[],voice=[];
 const context={memoryClient:'android_fixture',notificationPreferences:{mode:'brief'},brainInboxInitialized:false,brainConnectionState:()=>{},recordBrainNotice:()=>{},showOwnerApprovalRequests:()=>{},refreshBulkOwnerRun:()=>{},brainTools:{ProgressTracker},embedded:false,ownerReady:true,ownerHeaders:{Authorization:'Bearer fixture'},nativeOverlay:true,busy:false,speaking:false,config:{voice:true},messages:[],progressVoiceQueue:voice,BRAIN:'https://brain.invalid',verifiedOwnerHeaders:async()=>({Authorization:'Bearer fixture'}),bubblesFetch:async(url,options)=>{calls++;assert.equal(options.method,'POST');if(url.endsWith('/owner/conversation')){const body=JSON.parse(options.body);assert.equal(body.mode,'notification-claim');assert.equal(body.client,'android_fixture');assert.deepEqual(body.events,[{ticketId:'ticket',jobId:'TASK-1',transition:'finished'}]);return {ok:true,json:async()=>({ok:true,notices:['UI job finished.'],preferences:{mode:'brief'}})};}assert.ok(url.endsWith('/work/tickets/list'));if(failed)throw Error('offline');return {ok:true,json:async()=>({ok:true,notificationScope:'a'.repeat(64),tickets})}},display:text=>displayed.push(text),persistChat:()=>{},setInterval:()=>{},speakText:()=>{}};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('let progressStorage;'),source.indexOf('async function readBrainReport(){')),context);
 await new Promise(r=>setImmediate(r));assert.equal(displayed.length,0);
 tickets=[ticket([merged()])];
 await context.pollBrainProgress();assert.equal(displayed.length,0);
 tickets=[ticket([finished()])];
 await context.pollBrainProgress();assert.equal(displayed[0],'UI job finished.');assert.equal(voice.length,1);
 await context.pollBrainProgress();assert.equal(displayed.length,1);
 failed=true;await context.pollBrainProgress();await context.pollBrainProgress();
 assert.equal(displayed.length,1);assert.equal(voice.length,1);
 failed=false;await context.pollBrainProgress();assert.equal(displayed.length,1);assert.equal(voice.length,1);assert.ok(calls>=6);
});

test('attempt timestamps and retry bounces cannot narrate a second claim',()=>{
 const p=new ProgressTracker();p.update([ticket([job('queued')])]);
 assert.deepEqual(p.update([ticket([job('working',{runUrl,attemptedAt:'2026-10-17T19:00:00Z'})])]),[]);
 assert.deepEqual(p.update([ticket([started()])]),['UI job started.']);
 p.update([ticket([job('blocked')])]);p.update([]);
 assert.deepEqual(p.update([ticket([started()])]),[]);
});
test('bulk queued siblings suppress sequential starts and coalesce verified completions',()=>{
 const p=new ProgressTracker();p.update([ticket([job('queued',{},'J1'),job('queued',{},'J2')])]);
 assert.deepEqual(p.update([ticket([{...started(),id:'J1'},job('queued',{},'J2')])]),[]);
 assert.deepEqual(p.update([ticket([{...finished(),id:'J1'},{...finished(),id:'J2'}])]),['2 UI jobs finished.']);
});
test('owner-scoped durable checkpoints suppress replay after reload without retaining job text',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 const scope='a'.repeat(64),other='b'.repeat(64);
 const p=new ProgressTracker({storage});p.setScope(scope);p.update([ticket([job('queued')])]);
 assert.deepEqual(p.update([ticket([started()])]),['UI job started.']);
 const q=new ProgressTracker({storage});q.setScope(scope);q.update([ticket([job('queued')])]);
 assert.deepEqual(q.update([ticket([started()])]),[]);
 assert.deepEqual(q.update([ticket([finished()])]),['UI job finished.']);
 q.update([ticket([job('blocked')])]);assert.deepEqual(q.update([ticket([finished()])]),[]);
 q.setScope(other);q.update([ticket([job('queued')])]);
 assert.deepEqual(q.update([ticket([started()])]),['UI job started.']);
 const saved=[...values.values()].join('');assert.ok(!saved.includes('Repair Bubbles UI'));assert.ok(!saved.includes(runUrl));
});
test('bad or unavailable storage cannot create speech or crash polling',()=>{
 const p=new ProgressTracker({storage:{getItem:()=>'{bad',setItem:()=>{throw Error('full')}}});
 p.setScope('c'.repeat(64));assert.deepEqual(p.update([ticket([finished()])]),[]);
});

test('only explicit short owner corrections change notification preferences',()=>{
 assert.equal(notificationPreference('Bubbles, less detail.'),'brief');
 assert.equal(notificationPreference('only tell me when finished'),'finished');
 assert.equal(notificationPreference('more detail!'),'detailed');
 for(const text of ['The screen says more detail','Does less detail mean fewer messages?','Tell the job to use more detail','"only tell me when finished"'])assert.equal(notificationPreference(text),null);
});
