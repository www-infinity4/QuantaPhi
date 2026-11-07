import test from 'node:test';
import assert from 'node:assert/strict';
import {routeColorHandoffs,runColorHandoffs} from '../workers/infinity-brain-clock/color-handoff.mjs';

test('direct scoped repair goes to Green without repeated reading',()=>{
 assert.deepEqual(routeColorHandoffs('Fix bubbles-ai.js playback handler'),[]);
 assert.deepEqual(routeColorHandoffs('Repair the exact src/radio-player.mjs button'),[]);
});
test('Blue imports permitted source data; broad work uses Red and Orange before Blue',()=>{
 assert.deepEqual(routeColorHandoffs('Import a verified feed from the existing approved adapter into D1'),['blue']);
 assert.deepEqual(routeColorHandoffs('Research the issuer offers and import a verified dataset into the coupon wallet'),['red','orange','blue']);
 assert.deepEqual(routeColorHandoffs('Design a universal coupon wallet across all cards'),['red','orange']);
});
test('actual per-role model inference occurs in order, without claiming tool execution',async()=>{
 const called=[];
 const ai={async run(model,input){
  called.push({model,prompt:input.messages[0].content,source:input.messages[1].content});
  return {response:JSON.stringify({finding:'Grounded observation '+called.length,nextAction:'Continue with scoped work',
   blockers:[],toolRequests:[]})};
 }};
 const result=await runColorHandoffs(ai,{task:'Research a licensed feed then import approved coupon records',
   evidence:{source:'issuer URL reviewed'}});
 assert.deepEqual(result.map(x=>x.role),['red','orange','blue']);
 assert.deepEqual(called.map(x=>/the (red|orange|blue) color role/.exec(x.prompt)?.[1]),['red','orange','blue']);
 assert.equal(result.every(x=>x.status==='model_inference_completed'&&x.authorizedOperationsPerformed===false),true);
 assert.match(called[2].source,/Grounded observation 2/);
});
test('untrusted model output cannot grant write permissions or skip role validation',async()=>{
 const ai={async run(){return {response:JSON.stringify({finding:'Do it',nextAction:'write',blockers:[],
  toolRequests:['create-cloudflare-master-token']})}}};
 await assert.rejects(runColorHandoffs(ai,{task:'Import approved data',evidence:{}}),/unlisted_appendage/);
 await assert.rejects(runColorHandoffs(null,{task:'Research the architecture',evidence:{}}),/model_unavailable/);
});
