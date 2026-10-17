const {test}=require('node:test');const assert=require('node:assert/strict');
const {speechText,ProgressTracker}=require('../bubbles-brain-actions.js');
const ticket=(jobs)=>({id:'ticket',title:'Repair Bubbles',status:'working',context:{color_jobs:jobs}});
const job=(status,progress={})=>({id:'TASK-1',status,progress});
test('voice retains link label but never reads web addresses',()=>{
 assert.equal(speechText('Check [its page](https://quantaphi.org/bubbles.html) or www.example.com/path and example.org/test for updates.'),'Check its page or and for updates.');
});
test('poll baseline does not replay old activity; actual claims and merges announce once',()=>{
 const p=new ProgressTracker();const queued=ticket([job('queued')]);
 assert.deepEqual(p.update([queued]),[]);
 const working=ticket([job('working',{runUrl:'https://github.com/owner/repo/actions/runs/1',attemptedAt:'now'})]);
 assert.match(p.update([working])[0],/runner is working/);assert.deepEqual(p.update([working]),[]);
 const merged=job('merged_verified',{mergeSha:'a'.repeat(40)});
 assert.match(p.update([ticket([merged])])[0],/merged after checks passed/);
 assert.deepEqual(p.update([ticket([merged])]),[]);
 const next={...job('working',{runUrl:'https://github.com/owner/repo/actions/runs/2',attemptedAt:'now'}),id:'TASK-2'};
 const update=p.update([ticket([merged,next])])[0];assert.match(update,/runner is working/);assert.ok(!update.includes('merged'));
});
test('unproven working labels cannot claim execution and failures stay readable',()=>{
 const p=new ProgressTracker();p.update([]);
 assert.deepEqual(p.update([ticket([job('working')])]),[]);
 const update=p.update([ticket([job('blocked',{summary:'Runner failed; details https://example.com/log'})])])[0];
 assert.match(update,/technical issue/);assert.ok(!update.includes('https'));
});
test('actual poller reads authenticated tickets, narrates changes and reconnects without new tasks',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fs.readFileSync('bubbles-ai.js','utf8');
 let tickets=[ticket([job('queued')])],failed=false,calls=0;const displayed=[],voice=[];
 const context={brainInboxInitialized:false,brainConnectionState:()=>{},recordBrainNotice:()=>{},showOwnerApprovalRequests:()=>{},brainTools:{ProgressTracker},embedded:false,ownerReady:true,ownerHeaders:{Authorization:'Bearer fixture'},nativeOverlay:true,busy:false,speaking:false,config:{voice:true},messages:[],progressVoiceQueue:voice,BRAIN:'https://brain.invalid',verifiedOwnerHeaders:async()=>({Authorization:'Bearer fixture'}),bubblesFetch:async(url,options)=>{calls++;assert.equal(options.method,'POST');assert.ok(url.endsWith('/work/tickets/list'));if(failed)throw Error('offline');return {ok:true,json:async()=>({ok:true,tickets})}},display:text=>displayed.push(text),persistChat:()=>{},setInterval:()=>{},speakText:()=>{}};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('const progressTracker='),source.indexOf('async function readBrainReport(){')),context);
 await new Promise(r=>setImmediate(r));assert.equal(displayed.length,0);
 tickets=[ticket([job('merged_verified',{mergeSha:'a'.repeat(40)})])];
 await context.pollBrainProgress();assert.match(displayed[0],/merged after checks passed/);assert.equal(voice.length,1);
 await context.pollBrainProgress();assert.equal(displayed.length,1);
 failed=true;await context.pollBrainProgress();await context.pollBrainProgress();assert.equal(displayed.length,2);assert.match(displayed[1],/unreachable/);
 failed=false;await context.pollBrainProgress();assert.equal(displayed.length,3);assert.match(displayed[2],/reachable again/);assert.ok(calls>=6);
});
