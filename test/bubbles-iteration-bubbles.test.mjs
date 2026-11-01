import test from 'node:test';
import assert from 'node:assert/strict';
import {newIterationState,applyIterationEvent,BUBBLE_ROLES} from '../bubbles-iteration-bubbles.mjs';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Bubbles has distinct observable thinking, memory, research, build and verify roles',()=>{
 assert.deepEqual(BUBBLE_ROLES.map(x=>x.id),['listen','think','memory','research','build','verify','speak']);
 const state=newIterationState();
 for(const id of BUBBLE_ROLES.map(x=>x.id))assert.equal(state[id].status,'idle');
 assert.equal(applyIterationEvent(state,{type:'orb',state:'thinking'}).think.status,'active');
 assert.equal(applyIterationEvent(state,{type:'orb',state:'idle'}).think.status,'idle');
});
test('memory retrieval is observed but not mistaken for authorization or stored as a transcript',()=>{
 const a=applyIterationEvent(newIterationState(),{type:'memory',state:'retrieved',related:[{text:'private secret'}]});
 assert.equal(a.memory.status,'verified');
 assert.ok(!JSON.stringify(a).includes('private secret'));
 const b=applyIterationEvent(a,{type:'memory',state:'unavailable'});
 assert.equal(b.memory.status,'blocked');
});
test('research is only verified from a real completed tool receipt',()=>{
 const a=applyIterationEvent(newIterationState(),{type:'tool_receipt',tool:'web.search',status:'complete'});
 assert.equal(a.research.status,'verified');
 const b=applyIterationEvent(a,{type:'tool_receipt',tool:'web.search',status:'failed'});
 assert.equal(b.research.status,'blocked');
 assert.equal(applyIterationEvent(b,{type:'tool_receipt',tool:'totally.fake',status:'complete'}).research.status,'blocked');
});
test('work queue never becomes a completed build without a verified receipt',()=>{
 const a=applyIterationEvent(newIterationState(),{type:'job',status:'queued',repository:'www-infinity4/QuantaPhi'});
 assert.equal(a.build.status,'queued');assert.equal(a.verify.status,'idle');
 const b=applyIterationEvent(a,{type:'job',status:'working',repository:'www-infinity4/QuantaPhi'});
 assert.equal(b.build.status,'active');
 const c=applyIterationEvent(b,{type:'job',status:'committed_unverified',repository:'www-infinity4/QuantaPhi'});
 assert.equal(c.build.status,'review');assert.equal(c.verify.status,'review');
 const d=applyIterationEvent(c,{type:'job',status:'deployed_verified',repository:'www-infinity4/QuantaPhi'});
 assert.equal(d.build.status,'verified');assert.equal(d.verify.status,'verified');
});
test('untrusted tool metadata and URLs do not enter labels or links',()=>{
 const a=applyIterationEvent(newIterationState(),{type:'job',status:'working',repository:'https://evil.example/?token=supersecret',url:'javascript:alert(1)'});
 assert.ok(!JSON.stringify(a).includes('supersecret'));
 const b=applyIterationEvent(a,{type:'job',status:'merged_verified',repository:'www-infinity4/QuantaPhi',url:'https://github.com/www-infinity4/QuantaPhi/pull/100'});
 assert.equal(b.verify.status,'verified');
 assert.equal(b.verify.url,'https://github.com/www-infinity4/QuantaPhi/pull/100');
});
test('existing Bubbles app includes an in-panel activity surface without a second floating assistant or wallet modifications',()=>{
 const js=src('bubbles-ai.js'),css=src('bubbles-ai.css');
 assert.match(js,/mountBubbleIterations/);
 assert.match(js,/bubbles:iteration/);
 assert.match(css,/\.ba-iteration-bubbles/);
 for(const file of ['index.html','bubbles.html'])assert.match(src(file),/bubbles-ai\.js/);
 assert.doesNotMatch(src('bubbles-iteration-bubbles.mjs'),/localStorage|wallet|fetch\(|innerHTML|credentials/);
});