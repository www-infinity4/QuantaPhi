import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileCandidateTickets,reconcileOwnerBacklog} from '../workers/infinity-brain-clock/conversation-ticket-reconcile.mjs';
import {readFileSync} from 'node:fs';

const owner='a'.repeat(64),other='b'.repeat(64);
const origin='oldowner-msg_0001',repo='www-infinity4/QuantaPhi';
const candidate={id:'autonomous-building',title:'Autonomous repository build and verification',
  status:'candidate_needs_repository_inspection',repositorySuggestion:repo,mentions:7,
  evidence:[{messageId:origin,at:123456,excerpt:'Build Bubbles autonomously'}]};
const ticket=(id,context={},repository=repo,status='ready')=>({
 id:'IW-20261022-'+id,repository,status,context_json:JSON.stringify(context)
});
test('only explicit candidate or exact source message provenance links an existing ticket',()=>{
 const rows=[
  ticket('AA001122',{auditCandidateId:'autonomous-building'}),
  ticket('BB001122',{sourceMessageIds:[origin]}),
  ticket('CC001122',{auditCandidateId:'voice'}),
  ticket('DD001122',{}),
  ticket('EE001122',{auditCandidateId:'autonomous-building'},'www-infinity4/Elsewhere'),
  ticket('FF001122',{sourceMessageIds:['unrelated-msg-000']}),
  {id:'bad',repository:repo,context_json:'{}',status:'complete'}
 ];
 const c=reconcileCandidateTickets([candidate],rows)[0];
 assert.deepEqual(c.linkedTickets.map(t=>t.ticketId),['IW-20261022-AA001122','IW-20261022-BB001122']);
 assert.deepEqual(c.linkedTickets.map(t=>t.linkage),['explicit_candidate_id','source_message_id']);
 assert.equal(c.sameRepositoryTicketCount,5);
 assert.equal(c.relatedWorkVerified,false);
 assert.equal(c.featureCompleted,false);
 assert.equal(c.executionAuthorized,false);
 assert.equal(c.status,'candidate_needs_repository_inspection');
});
test('completed ticket and shared repository are not proof requested feature is complete',()=>{
 const c=reconcileCandidateTickets([candidate],[ticket('AA001122',{},repo,'complete')])[0];
 assert.equal(c.sameRepositoryTicketCount,1);
 assert.equal(c.sameRepositoryStatusCounts.complete,1);
 assert.deepEqual(c.linkedTickets,[]);
 assert.equal(c.featureCompleted,false);
});
test('malformed ticket data is ignored and private context never leaves result',()=>{
 const rows=[ticket('AA001122',{auditCandidateId:candidate.id,secret:'NEVER_PRINT_THIS',sourceMessageIds:[origin]}),
  {id:'IW-20261022-BB001122',repository:repo,context_json:'{bad',status:'working'}];
 const x=reconcileCandidateTickets([candidate],rows);
 assert.equal(x[0].linkedTickets.length,1);
 assert.ok(!JSON.stringify(x).includes('NEVER_PRINT_THIS'));
 assert.equal(x[0].sameRepositoryTicketCount,2);
 assert.equal(x[0].sameRepositoryStatusCounts.working,1);
});
test('read-only owner query partitions both archive and tickets and stays bounded',async()=>{
 const prepared=[];
 const db={prepare(sql){
  const q={bind(...args){this.args=args;return this},async all(){
   prepared.push({sql,args:this.args});
   if(sql.includes('FROM bubbles_messages'))return {results:[
    {id:origin,role:'user',text:'Build GitHub repos automatically for Bubbles',at:123456}
   ]};
   if(sql.includes('FROM work_tickets'))return {results:[ticket('AA001122',{auditCandidateId:'autonomous-building'})]};
   throw Error('unexpected_sql');
  }};return q;
 }};
 const out=await reconcileOwnerBacklog(db,owner,{limit:50,pages:1});
 assert.equal(out.ok,true);assert.equal(out.readOnly,true);
 assert.equal(out.executionStarted,false);
 assert.equal(out.ownerApprovalInferred,false);
 assert.equal(out.ticketsScanned,1);
 assert.equal(out.ticketInventoryTruncated,false);
 const matched=out.candidates.find(c=>c.id==='autonomous-building');
 assert.equal(matched.linkedTickets[0].ticketId,'IW-20261022-AA001122');
 assert.equal(prepared.length,2);
 assert.match(prepared[0].sql,/WHERE owner=\? AND role='user'/);
 assert.match(prepared[1].sql,/WHERE owner_hash=\?/);
 assert.equal(prepared[0].args[0],owner);
 assert.equal(prepared[1].args[0],owner);
 assert.equal(prepared[1].args[1],121);
 await assert.rejects(reconcileOwnerBacklog(db,'owner-a',{}),/verified_owner_hash_required/);
});
test('ticket inventory truncation is visible rather than pretending no duplicates exist',async()=>{
 const rows=Array.from({length:121},(_,i)=>ticket(String(i).padStart(8,'0')));
 const db={prepare(sql){
  const q={bind(...args){this.args=args;return this},async all(){
    if(sql.includes('bubbles_messages'))return {results:[{id:origin,role:'user',text:'Build GitHub repos automatically for Bubbles',at:123456}]};
    if(sql.includes('work_tickets'))return {results:rows};
    throw Error('unexpected query');
   }};return q;
 }};
 const result=await reconcileOwnerBacklog(db,owner,{pages:1});
 assert.equal(result.ticketInventoryTruncated,true);
 assert.equal(result.ticketsScanned,120);
 assert.equal(result.candidates.find(c=>c.id==='autonomous-building').sameRepositoryTicketCount,120);
});
test('the authenticated owner API exposes comparison without a new work dispatch route',()=>{
 const s=readFileSync('workers/infinity-brain-clock/conversation-memory.mjs','utf8');
 const t=readFileSync('workers/infinity-brain-clock/conversation-ticket-reconcile.mjs','utf8');
 assert.match(s,/body.mode==='work-audit-reconcile'/);
 assert.match(t,/WHERE owner_hash=\?/);
 assert.doesNotMatch(t,/\.run\(|\.put\(|\.fetch\(/);
});
