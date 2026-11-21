import test from 'node:test';
import assert from 'node:assert/strict';
import {newTask,updateTask,addReceipt,checkpoint,recover,mergeTasks,stats,suggestNext,safeUrl,handoff} from '../continuity/engine.mjs';
test('cannot complete with claim or merged-only report',()=>{
 const a=newTask({title:'Fix Bubbles',project:'Brain',status:'blocked'});
 assert.match(suggestNext(a),/Resolve blocker|Identify/);
 assert.throws(()=>updateTask(a,{status:'complete'}),/independently checked/);
 const b=addReceipt(a,{kind:'merge',label:'Merged PR',url:'https://github.com/a/b/pull/2',status:'success'});
 assert.throws(()=>updateTask(b,{status:'complete'}),/independently checked/);
});
test('verified receipts enable completion but never establish more than that receipt',()=>{
 const a=newTask({title:'Test gateway'});
 const b=addReceipt(a,{kind:'github-actions',label:'API-confirmed successful workflow',url:'https://github.com/a/b/actions/runs/4',provenance:'provider-confirmed',status:'success'});
 const c=updateTask(b,{status:'complete'});
 assert.equal(c.status,'complete');
 assert.equal(c.receipts.length,1);
});
test('safe URLs reject injection; import validation rejects mismatched schemas',()=>{
 assert.equal(safeUrl('javascript:alert(1)'),'');
 assert.equal(safeUrl('https://github.com/a/b'),'https://github.com/a/b');
 assert.throws(()=>recover({schema:2,items:[]}),/Unsupported/);
});
test('snapshots round-trip, dedupe and create actionable handoffs',()=>{
 const a=newTask({id:'ticket-1',title:'Restore X',project:'Bubbles',acceptance:['live read']});
 const b=updateTask(a,{status:'blocked',blocker:'reader unavailable'});
 assert.equal(stats([a,b]).unfinished,2);
 const restored=recover(checkpoint([a,b]));
 assert.equal(restored.length,1);
 assert.equal(restored[0].status,'blocked');
 assert.equal(mergeTasks([a],[b])[0].status,'blocked');
 assert.match(handoff(b),/Do not duplicate/);
});