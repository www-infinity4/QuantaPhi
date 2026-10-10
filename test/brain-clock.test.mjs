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
test('stable state avoids repeated inference; provider failure backs off and keeps clock alive',async()=>{
 const oldFetch=globalThis.fetch,memory=new Map();let alarm=0,modelCalls=0;
 const storage={get:async k=>memory.get(k),put:async(k,v)=>{memory.set(k,v)},getAlarm:async()=>alarm,setAlarm:async v=>{alarm=v}};
 globalThis.fetch=async()=>new Response('<section id="quantaAgentIterations"></section><section id="robotDirections"></section>');
 const env={WORK_DB:{prepare:()=>({all:async()=>({results:[]})})},MODELS:{plan:async()=>{modelCalls++;return {provider:'gemini',model:'mock',instruction:{target_element:'robotDirections',action:'idle',payload:{reason:'unchanged'}}}}}};
 try{
  const clock=new BrainClock({storage},env);await clock.alarm();await clock.alarm();
  assert.equal(modelCalls,1);assert.equal(memory.get('state').status,'idle');assert.ok(alarm>Date.now());
  env.MODELS.plan=async()=>{throw Error('quota')};memory.delete('state');await clock.alarm();
  assert.equal(memory.get('state').status,'blocked');assert.ok(alarm>Date.now()+50000);
 }finally{globalThis.fetch=oldFetch}
});
