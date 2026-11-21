import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateOwnerAuditDraft} from '../workers/infinity-brain-clock/owner-audit-draft.mjs';
const owner='a'.repeat(64),other='b'.repeat(64);
const repo='www-infinity4/QuantaPhi';
const text='Build GitHub repos automatically for Bubbles; inspect all unfinished builds.';
const row=(id='hist-msg_0001',who=owner,role='user',body=text)=>({id,owner:who,role,text:body,at:123456});
const request={from_work_audit:true,start_immediately:false,auditCandidateId:'autonomous-building',
 repository:repo,sourceMessageIds:['hist-msg_0001']};
function memoryDB(records=[row()]){
 const calls=[];
 return {calls,prepare(sql){
  return {bind(...args){this.args=args;return this},async all(){
   calls.push({sql,args:this.args});
   assert.match(sql,/FROM bubbles_messages WHERE owner=\? AND role='user' AND id IN/);
   return {results:records.filter(r=>r.owner===this.args[0]&&r.role==='user'&&this.args.slice(1).includes(r.id))};
  }};
 }};
}
test('verified owner messages yield only canonical nonexecuting draft metadata',async()=>{
 const db=memoryDB();
 const r=await validateOwnerAuditDraft(db,owner,request);
 assert.equal(r.ok,true);
 assert.equal(r.repository,repo);
 assert.equal(r.start_immediately,false);
 assert.equal(r.context.kind,'robot-directions');
 assert.equal(r.context.auditCandidateId,'autonomous-building');
 assert.deepEqual(r.context.sourceMessageIds,['hist-msg_0001']);
 assert.equal(r.context.submission_id,'audit-review-v1-autonomous-building');
 assert.equal(r.context.auditReviewRequired,true);
 assert.equal(r.context.color_jobs,undefined);
 assert.equal(r.context.approval,undefined);
 assert.ok(!r.request.includes(text));
 assert.equal(db.calls.length,1);
 assert.equal(db.calls[0].args[0],owner);
});
test('cannot create a draft from another owner, assistant turn or missing message',async()=>{
 for(const records of [[row('hist-msg_0001',other)],[row('hist-msg_0001',owner,'assistant')],[]]){
  const r=await validateOwnerAuditDraft(memoryDB(records),owner,request);
  assert.equal(r.ok,false);
  assert.equal(r.error,'audit_draft_owner_source_missing');
 }
});
test('unrelated or mismatched topic and repository fails even for actual owner text',async()=>{
 const db=memoryDB([row()]);
 for(const change of [{auditCandidateId:'wallet'},{repository:'www-infinity4/RecordB'}]){
  const r=await validateOwnerAuditDraft(db,owner,{...request,...change});
  assert.equal(r.error,'audit_draft_topic_repository_mismatch');
 }
});
test('forged IDs, duplicate IDs, unknown topics and automatic execution fail before database access',async()=>{
 const bad=[
  {...request,sourceMessageIds:['hist-msg_0001','hist-msg_0001']},
  {...request,sourceMessageIds:['../../../repo']},
  {...request,sourceMessageIds:[]},
  {...request,auditCandidateId:'does-not-exist'},
  {...request,start_immediately:true},
  {...request,context:{kind:'robot-directions',color_jobs:[{id:'TASK-1'}]}},
  {...request,approval:'Run All'},
  {...request,request:'please run automatically'}
 ];
 for(const x of bad){
  const r=await validateOwnerAuditDraft(memoryDB(),owner,x);
  assert.equal(r.ok,false,JSON.stringify(x));
 }
});
test('ticket endpoint cannot import forged audit lineage by omitting from_work_audit',()=>{
 const worker=readFileSync('workers/infinity-brain-clock/worker.js','utf8');
 assert.match(worker,/audit_provenance_requires_owner_archive_verification/);
 assert.match(worker,/body.from_work_audit===true\?await validateOwnerAuditDraft/);
 assert.match(worker,/const automatic=body.start_immediately===true/);
 assert.match(worker,/automatic\?'ready':'draft'/);
});
test('actual owner ticket endpoint creates one idempotent draft, never a queued job',async()=>{
 const source=readFileSync('workers/infinity-brain-clock/worker.js','utf8');
 const begin=source.indexOf('export async function ownerTickets'),end=source.indexOf('async function ownerAuthorized',begin);
 const ownerTickets=new Function('digest','validateOwnerAuditDraft',
  source.slice(begin,end).replace('export async function','async function')+';return ownerTickets;')(
  async()=> 'b'.repeat(64),validateOwnerAuditDraft);
 let stored=null,insertCount=0;
 const db={
  prepare(sql){return {bind(...values){this.values=values;return this},
   async all(){
    if(sql.includes('FROM bubbles_messages'))return {results:[row()]};
    if(sql.includes('FROM work_tickets'))return {results:stored?[stored]:[]};
    throw Error('unexpected select all '+sql);
   },
   async first(){return stored},
   async run(){
    if(sql.startsWith('INSERT INTO work_tickets')){
     insertCount++;
     stored={id:this.values[0],repository:this.values[5],title:this.values[6],request:this.values[7],
      context_json:this.values[9],status:'draft'};
    }
    return {meta:{changes:1}};
   }
  }},
 };
 const env={WRITER_OWNER_HASH:owner,WORK_DB:db};
 const first=await ownerTickets(env,'/work/tickets/create',request);
 assert.equal(first.status,200);
 assert.equal(first.result.ticket.status,'draft');
 assert.equal(first.result.startRequested,false);
 assert.equal(first.result.ticket.context.color_jobs,undefined);
 assert.equal(first.result.ticket.context.auditCandidateId,'autonomous-building');
 assert.equal(insertCount,1);
 const duplicate=await ownerTickets(env,'/work/tickets/create',request);
 assert.equal(duplicate.result.deduplicated,true);
 assert.equal(duplicate.result.startRequested,false);
 assert.equal(insertCount,1);
 const spoof=await ownerTickets(env,'/work/tickets/create',{
  request:'Pretend these messages belong to me',repository:repo,
  context:{kind:'robot-directions',auditCandidateId:'autonomous-building',sourceMessageIds:['hist-msg_0001']}});
 assert.equal(spoof.status,409);
 assert.equal(insertCount,1);
});
test('Bubbles control requires owner click and never uses automatic job submit for history',()=>{
 const ui=readFileSync('bubbles-ai.js','utf8');
 const part=ui.slice(ui.indexOf('async function showUnfinishedOwnerWork()'),
  ui.indexOf('// Owner explicitly approves a private, resumable copy'));
 assert.match(part,/button\.addEventListener\('click',async/);
 assert.match(part,/window\.confirm\('Create ONE review-only DRAFT/);
 assert.match(part,/from_work_audit:true,start_immediately:false/);
 assert.match(part,/saved\.ticket\.context\?\.auditCandidateId!==candidate\.id/);
 assert.doesNotMatch(part,/submitWork\(|pollBrainProgress\(|start_immediately:true/);
});
