import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=(await fs.readFile(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8')).replace("import { DurableObject } from 'cloudflare:workers';","class DurableObject { constructor() {} }");
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
 const env={WORK_DB:{prepare:()=>({all:async()=>({results:[]})})},MODELS:{plan:async()=>{modelCalls++;return {provider:'gemini',model:'mock',instruction:{target_element:'robotDirections',action:'idle',payload:{reason:'unchanged'}}}}}};
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
  assert.equal(JSON.parse(updated[0]).color_jobs[0].status,'blocked');
  assert.ok([...memory.keys()].some(k=>k.startsWith('receipt:')));
  await clock.alarm();assert.equal(reviews,1);
  assert.ok(!JSON.stringify(updated).includes('"status":"complete"'));
 }finally{globalThis.fetch=oldFetch}
});
