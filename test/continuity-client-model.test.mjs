import test from 'node:test';
import assert from 'node:assert/strict';
import {projectLegacyTickets,projectLegacyJob} from '../continuity/owner/client-model.mjs';
const ticket=(id,job)=>({id,title:'Keep Bubbles working',repository:'www-infinity4/QuantaPhi',
 status:'blocked',updated_at:180,context:{color_jobs:[job]}});
test('saved work remains visible with original ticket IDs',()=>{
 const rows=[ticket('IW-20261024-ABCD1234',{id:'TASK-9',status:'blocked',progress:{blocker:'repository_adapter_not_connected'}})];
 const p=projectLegacyTickets(rows);
 assert.equal(p.tickets[0].ticketId,rows[0].id);
 assert.equal(p.tickets[0].jobs[0].phase,'blocked_recoverable');
 assert.equal(p.readOnly,true);assert.equal(p.executionStarted,false);
});
test('a job cannot be complete from a model status or commit alone',()=>{
 const v=projectLegacyJob({status:'complete',progress:{commitSha:'a'.repeat(40)}});
 assert.equal(v.verifiedDelivery,false);
 assert.ok(v.missingEvidence.includes('deployment readback'));
});
test('security holds remain owner decisions',()=>{
 const v=projectLegacyJob({status:'blocked',progress:{blocker:'security_hold'}});
 assert.equal(v.approvalRequired,true);assert.equal(v.phase,'owner_decision_required');
});
test('a stale working job is not silently marked as failed',()=>{
 const v=projectLegacyJob({status:'working',progress:{attemptedAt:'2026-10-01T00:00:00Z'}},Date.parse('2026-10-25T00:00:00Z'));
 assert.equal(v.phase,'stale_working');assert.equal(v.status,'working');
});
test('legacy 100-ticket query never claims complete inventory',()=>{
 const one=ticket('IW-20261024-ABCD1234',{id:'TASK-1',status:'queued'});
 const rows=Array.from({length:100},(_,i)=>({...one,id:'IW-20261024-'+String(i).padStart(8,'0')}));
 const p=projectLegacyTickets(rows);
 assert.equal(p.tickets.length,100);
 assert.equal(p.inventoryCoverage,'potentially_truncated_at_100');
 assert.equal(p.hasMore,false);
});
test('untrusted URLs and unknown repositories do not become links',()=>{
 const t=ticket('IW-20261024-ABCD1234',{id:'TASK-4',status:'complete',progress:{runUrl:'javascript:alert(1)'}});
 assert.equal(projectLegacyTickets([t]).tickets[0].jobs[0].runUrl,null);
 assert.equal(projectLegacyTickets([{...t,repository:'elsewhere/private'}]).tickets.length,0);
});
