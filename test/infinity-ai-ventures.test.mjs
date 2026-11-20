import test from 'node:test';
import assert from 'node:assert/strict';
import {AI_VENTURES} from '../infinity-ai-ventures.mjs';

test('six source-backed Infinity AI ventures have distinct routes and honest product state',()=>{
 assert.equal(AI_VENTURES.length,6);
 assert.deepEqual(AI_VENTURES.map(v=>v.id),['quant-ai-business','cosmo-starquest','creator-quick-cards','complete-me-ai','media-star-network','code-phi-studio']);
 assert.equal(new Set(AI_VENTURES.map(v=>v.id)).size,AI_VENTURES.length);
 for(const v of AI_VENTURES){
  assert.equal(v.venture,true);
  assert.match(v.businessModel,/\S/);
  assert.match(v.focus,/\S/);
  assert.match(v.details,/(not|require|planned|subject to|independent)/i);
  assert.match(v.readiness,/^(prototype|source-built|existing-workflow)$/);
  for(const key of ['official','featureUrl']){
   const url=new URL(v[key]);
   assert.equal(url.protocol,'https:');
   assert.equal(url.hostname,'quantaphi.org');
  }
 }
});
test('Quant AI and Cosmo route to actual distinct original QuantaPhi experiences',()=>{
 assert.match(AI_VENTURES.find(v=>v.id==='quant-ai-business').featureUrl,/quant-ai-presentation\.html$/);
 assert.match(AI_VENTURES.find(v=>v.id==='cosmo-starquest').featureUrl,/\?card=infinityStarQuestCard$/);
 assert.doesNotMatch(AI_VENTURES.map(v=>v.details).join(' '),/already (selling|charging|deployed)/i);
});
