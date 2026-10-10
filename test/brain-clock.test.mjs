import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const authUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/runner-auth.mjs',import.meta.url))).toString('base64');
const previewUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/preview-contract.mjs',import.meta.url))).toString('base64');
const source=(await fs.readFile(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8')).replace("import { DurableObject } from 'cloudflare:workers';","class DurableObject { constructor() {} }").replace("./runner-auth.mjs",authUrl).replace("./preview-contract.mjs",previewUrl);
const {BrainClock,validateInstruction}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('gate rejects executable, extra and misdirected actions',()=>{
 assert.throws(()=>validateInstruction({target_element:'robotDirections',action:'eval',payload:{reason:'x'}}));
 assert.throws(()=>validateInstruction({target_element:'other',action:'idle',payload:{reason:'x'}}));
 assert.throws(()=>validateInstruction({target_element:'robotDirections',action:'inspect_repository',payload:{reason:'x',code:'alert(1)'}}));
 assert.equal(validateInstruction({target_element:'robotDirections',action:'idle',payload:{reason:'unchanged'}}).action,'idle');
});
test('stable state avoids repeated inference; provider failure backs off Gemini while the mechanical clock keeps working',async()=>{
 const oldFetch=globalThis.fetch,memory=new Map();let alarm=0,modelCalls=0;
 const storage={get:async k=>memory.get(k),put:async(k,v)=>{memory.set(k,v)},getAlarm:async()=>alarm,setAlarm:async v=>{alarm=v}};
 globalThis.fetch=async()=>new Response('<section id="quantaAgentIterations"></section><section id="robotDirections"></section>');
 const env={WORK_DB:{prepare:()=>({bind(){return this},all:async()=>({results:[]})})},MODELS:{plan:async()=>{modelCalls++;return {provider:'gemini',model:'mock',instruction:{target_element:'robotDirections',action:'idle',payload:{reason:'unchanged'}}}}}};
 try{
  const clock=new BrainClock({storage},env);await clock.alarm();await clock.alarm();
  assert.equal(modelCalls,1);assert.equal(memory.get('state').status,'idle');assert.ok(alarm>Date.now());
  env.MODELS.plan=async()=>{throw Error('quota')};memory.delete('state');await clock.alarm();
  assert.equal(memory.get('state').status,'watching');assert.ok(memory.get('geminiRetryAt')>Date.now()+800000);assert.ok(alarm>Date.now());
 }finally{globalThis.fetch=oldFetch}
});

test('queued owner job gets real inspection and Purple review once without fabricated completion',async()=>{
 const oldFetch=globalThis.fetch,memory=new Map();let alarm=0,reviews=0,updated=null;
 const context={kind:'robot-directions',color_jobs:[{id:'TASK-1',repository:'www-infinity4/QuantaPhi',instructions:'Fix brain input',acceptance:['Input clears'],status:'queued'}]};
 const initial=JSON.stringify(context),ticket={id:'test-ticket',context_json:initial,request:'Fix brain input'};
 const db={prepare:sql=>({all:async()=>({results:[ticket]}),bind(...args){this.args=args;return this},first:async()=>({context_json:initial}),async run(){updated=this.args;return {success:true}}})};
 const storage={get:async k=>memory.get(k),put:async(k,v)=>{memory.set(k,v)},getAlarm:async()=>alarm,setAlarm:async v=>{alarm=v}};
 globalThis.fetch=async()=>new Response('<section id="quantaAgentIterations"></section>source evidence');
 const env={WORK_DB:db,MODELS:{plan:async()=>{throw Error('429')},review:async evidence=>{reviews++;assert.ok(evidence.receipts.length);return {provider:'cloudflare-workers-ai',model:'mock-review',review:{approved:true,summary:'Source inspected; repair not implemented',next:'Connect repository writer'}}}}};
 try{
  const clock=new BrainClock({storage},env);await clock.alarm();
  assert.equal(reviews,1);assert.ok(updated);
  assert.equal(JSON.parse(updated[0]).color_jobs[0].status,'queued');
  assert.ok([...memory.keys()].some(k=>k.startsWith('receipt:')));
  await clock.alarm();assert.equal(reviews,1);
  assert.ok(!JSON.stringify(updated).includes('"status":"complete"'));
 }finally{globalThis.fetch=oldFetch}
});

test('repository engine claims any owner repository while honoring leases and job dependencies',async()=>{
 const memory=new Map();const context={color_jobs:[
  {id:'dependent',repository:'www-infinity4/Project401',instructions:'Build page',dependencies:['base'],status:'queued'},
  {id:'base',repository:'www-infinity4/Project401',instructions:'Build new component',dependencies:[],status:'queued'},
  {id:'outside',repository:'other/Project401',instructions:'Build',status:'queued'}
 ]};
 const storage={get:async k=>memory.get(k),put:async(k,v)=>memory.set(k,v)};
 const clock=new BrainClock({storage},{WORK_DB:{prepare:()=>({bind(){return this},all:async()=>({results:[{id:'ticket',request:'Build my project',context_json:JSON.stringify(context)}]})})}});
 const request=()=>new Request('https://clock/runner/claim',{method:'POST',body:JSON.stringify({runId:'42',runnerRepository:'www-infinity4/Moltnook'})});
 const first=await (await clock.runner(request())).json();assert.equal(first.lease.jobId,'base');assert.equal(first.lease.job.ownerRequest,'Build my project');
 const second=await (await clock.runner(request())).json();assert.equal(second.lease,null);
});

test('GPT Purple cannot approve absent tests and immutable patch evidence',async()=>{
 const memory=new Map([['key',{key:'key',leaseId:'lease',runId:'42',engine:true,leaseUntil:Date.now()+60000,job:{instructions:'Build'}}]]);
 const clock=new BrainClock({storage:{get:async k=>memory.get(k),put:async(k,v)=>memory.set(k,v)}},{WRITER_AI:{run:async()=>({response:JSON.stringify({decision:'approve',reason:'looks good'})})}});
 const request=new Request('https://clock/runner/arbitrate',{method:'POST',body:JSON.stringify({runId:'42',runnerRepository:'www-infinity4/Moltnook',key:'key',leaseId:'lease',evidence:{tests:{passed:false},review:{approved:true},baseSha:'a'.repeat(40),patched:{'index.html':'hello'}}})});
 await assert.rejects(clock.runner(request),/arbitration_evidence_required/);assert.equal(memory.has('engine-review:key'),false);
});

