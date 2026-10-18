import test from 'node:test';
import assert from 'node:assert/strict';
import {
 COLOR_MODEL,COLOR_SPECTRUM,colorCoreProfile,colorCoreSystemPrompt,
 validateColorThoughtRequest,validateColorThoughtResponse
} from '../workers/infinity-brain-clock/color-core.mjs';

test('every color has exactly one shared GPT reasoning core with inherited layers',()=>{
 const expected={
  red:['red'],yellow:['yellow'],blue:['blue'],
  orange:['red','yellow'],purple:['purple','blue','red'],
  green:['green','yellow','blue','pink','red','white'],
  pink:['pink'],white:['white'],black:['black','pink','white']
 };
 assert.deepEqual(Object.keys(COLOR_SPECTRUM).sort(),Object.keys(expected).sort());
 for(const [color,layers] of Object.entries(expected)){
  const p=colorCoreProfile(color);
  assert.equal(p.sharedGptCore,true);
  assert.equal(p.model,COLOR_MODEL);
  assert.deepEqual(p.layers,layers);
  assert.equal(p.ownerAuthorizationUnchanged,true);
  assert.equal(p.appendagesAreCapabilitiesNotPermissions,true);
  assert.ok(p.appendages.length>0);
  assert.match(colorCoreSystemPrompt(p),/shared GPT reasoning core/);
  assert.match(colorCoreSystemPrompt(p),/not granted tools/);
  assert.match(colorCoreSystemPrompt(p),/Do not execute tools/);
 }
 assert.equal(COLOR_MODEL,'@cf/openai/gpt-oss-120b');
});
test('Yellow extraction is an appendage, Orange is Red and Yellow, Green carries all requested layers',()=>{
 const yellow=colorCoreProfile('yellow');
 const orange=colorCoreProfile('orange');
 const green=colorCoreProfile('green');
 assert.ok(yellow.appendages.includes('data-extraction'));
 assert.ok(orange.appendages.includes('data-extraction'));
 assert.ok(green.appendages.includes('data-extraction'));
 assert.ok(green.appendages.includes('sandbox-tests'));
 assert.ok(!green.appendages.includes('mint-wallet-token'));
});
test('role suggestions may name known appendages but cannot authorize arbitrary tools',()=>{
 const p=colorCoreProfile('yellow');
 const out={finding:'Pinned data is incomplete',nextAction:'Read source and record provenance',
  blockers:['Missing dated source'],toolRequests:['source-reading','data-extraction']};
 assert.deepEqual(validateColorThoughtResponse(out,p),out);
 assert.throws(()=>validateColorThoughtResponse({...out,toolRequests:['create-cloudflare-master-token']},p),/unlisted_appendage/);
 assert.throws(()=>validateColorThoughtResponse({...out,approved:true},p),/schema_invalid/);
 assert.throws(()=>validateColorThoughtResponse({...out,finding:'x'.repeat(1800)},p),/text_invalid/);
});
test('model inputs cannot change own color schema or include unbounded evidence',()=>{
 assert.throws(()=>colorCoreProfile('__proto__'),/unknown_color/);
 assert.throws(()=>validateColorThoughtRequest({color:'orange',task:'',evidence:{}}),/task_invalid/);
 assert.throws(()=>validateColorThoughtRequest({color:'purple',task:'inspect',evidence:{notes:'x'.repeat(14000)}}),/evidence_too_large/);
 assert.throws(()=>validateColorThoughtRequest({color:'pink',task:'check',evidence:{},secrets:'invalid'}),/extra_fields/);
 const p=validateColorThoughtRequest({color:'green',task:'Fix the card',evidence:{sourceDigest:'abc'}});
 assert.deepEqual(p.profile.layers,['green','yellow','blue','pink','red','white']);
});
