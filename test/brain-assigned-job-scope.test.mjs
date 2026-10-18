import test from 'node:test';
import assert from 'node:assert/strict';
import {scopedRepositoryJob,scopeOwnerContext} from '../workers/infinity-brain-clock/assigned-job-scope.mjs';
const parent='Charge 1 star coin per new physics card and design a J.S. Miller carton trading card for each buyer';
const webhook={id:'TASK-2',title:'Cloudflare Configuration',agent:'layout-router',
 instructions:'Configure Cloudflare for the application, ensuring webhooks require signature verification and deduplication.',
 acceptance:['webhook verification','deduplication setup'],ownerRequest:parent};
const cards={id:'TASK-1',title:'Physics Card Design and Minting',
 instructions:'Create a J.S. Miller carton trading card design for each new physics card with a unique number for each buyer.',
 acceptance:['design submission','verified buyer count'],ownerRequest:parent};
test('unrelated physics-card parent goals do not become webhook job requirements',()=>{
 assert.equal(scopeOwnerContext(webhook).related,false);
 const j=scopedRepositoryJob(webhook,{ticketId:'ticket',jobId:'TASK-2',repository:'www-infinity4/QuantaPhi'});
 assert.equal(j.id,'TASK-2');assert.equal(j.ticketId,'ticket');assert.equal(j.scope,'single_assigned_color_job');
 assert.deepEqual(j.acceptance,['webhook verification','deduplication setup']);
 assert.equal(j.instructions,webhook.instructions);
 assert.equal(j.ownerContextRelated,false);
 assert.equal(Object.hasOwn(j,'relatedOwnerContext'),false);
 assert.equal(Object.hasOwn(j,'ownerRequest'),false);
});
test('related physics card context remains visible to its assigned job, never as another job',()=>{
 const j=scopedRepositoryJob(cards,{ticketId:'ticket',jobId:'TASK-1'});
 assert.equal(j.ownerContextRelated,true);
 assert.equal(j.relatedOwnerContext,parent);
 assert.deepEqual(j.acceptance,['design submission','verified buyer count']);
 assert.equal(j.parentTicketIsNotThisJobAcceptance,true);
});
test('malformed or absent subtask instructions never fall back to an entire ticket',()=>{
 assert.throws(()=>scopedRepositoryJob({ownerRequest:parent}),/instructions_missing/);
 assert.throws(()=>scopedRepositoryJob({...webhook,instructions:'  '}),/instructions_missing/);
 assert.throws(()=>scopedRepositoryJob(null),/assigned_job_missing/);
 const oversized={...webhook,instructions:'a'.repeat(17000),acceptance:['a'.repeat(900)]};
 const bounded=scopedRepositoryJob(oversized);
 assert.equal(bounded.instructions.length,9500);
 assert.equal(bounded.acceptance[0].length,800);
});
