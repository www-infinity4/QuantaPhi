const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const actions=require('../bubbles-brain-actions.js');
const worker=fs.readFileSync('workers/infinity-brain-clock/worker.js','utf8');
const start=worker.indexOf('export async function ownerTickets('),end=worker.indexOf('\nasync function ownerAuthorized(',start);
if(start<0||end<start)throw Error('ownerTickets is missing');
const isolated=worker.slice(start,end).replace('export async function ownerTickets','async function ownerTickets');
const aggregate=jobs=>{
 const done=new Set(jobs.filter(j=>j.status==='complete'||j.status==='deployed_verified').map(j=>j.id));
 if(jobs.every(j=>done.has(j.id)))return 'complete';
 if(jobs.some(j=>['working','committed_unverified','merged_verified'].includes(j.status)))return 'working';
 if(jobs.some(j=>['queued','ready'].includes(j.status)&&(j.dependencies||[]).every(id=>done.has(id))))return 'ready';
 return jobs.some(j=>j.status==='blocked')?'blocked':'working';
};
const ownerTickets=vm.runInNewContext(isolated+'\nownerTickets;', {ticketStatusFromJobs:aggregate,Date,JSON});
const ui='Reader blocker: owner_input_required: Owner must approve the exact enrollment UI button/dialog wording styling and IndexedDB vs localStorage.';
const security='Reader blocker: owner_input_required: Owner approval for the wallet payment UI security permission is needed.';
const mixed=ui+'; excluded_path_required: Cannot write protected Android paths.';
function ticket(id,status,jobs){
 const context={kind:'robot-directions',color_jobs:jobs};
 return {id:'IW-20261017-'+id,title:'Saved ticket '+id,status,context_json:JSON.stringify(context)};
}
const job=(status,summary='',id='TASK-1')=>({id,status,repository:'www-infinity4/QuantaPhi',instructions:'Fix user-requested UI',dependencies:[],progress:{summary}});
function database(rows){
 let edits=0,failAll=false;
 const prepare=(sql)=>({bind(...params){return{
  async all(){assert.match(sql,/SELECT id,title,status,context_json/);return {results:rows}},
  async run(){
   assert.match(sql,/UPDATE work_tickets SET context_json/);
   if(failAll)return {meta:{changes:0}};
   const row=rows.find(r=>r.id===params[3]);
   if(!row||row.context_json!==params[5])return {meta:{changes:0}};
   row.context_json=params[0];row.status=params[1];edits++;
   return {meta:{changes:1}};
  }
 }}});return {db:{prepare},get edits(){return edits},set failAll(value){failAll=value}};
}
const env=db=>({WORK_DB:db,WRITER_OWNER_HASH:'a'.repeat(64)});
test('a single click approves eligible UI choices and leaves technical/security blockers untouched',async()=>{
 const rows=[
  ticket('AAAA1111','ready',[job('queued'),job('queued','','TASK-2')]),
  ticket('BBBB2222','blocked',[job('blocked',ui)]),
  ticket('CCCC3333','blocked',[job('blocked',mixed)]),
  ticket('DDDD4444','blocked',[job('blocked',security)]),
  ticket('EEEE5555','working',[job('working','Authentic runner lease running')])
 ];
 const store=database(rows);
 const before=actions.bulkRunPreview(rows.map(r=>({id:r.id,status:r.status,context:JSON.parse(r.context_json)})));
 assert.equal(before.ready,2);assert.equal(before.ui,1);assert.equal(before.retryableWorking,1);
 const r=await ownerTickets(env(store.db),'/work/tickets/approve-all',{});
 assert.equal(r.status,200);assert.equal(r.result.ok,true);
 assert.equal(r.result.summary.alreadyRunnable,2);
 assert.equal(r.result.summary.uiApproved,1);
 assert.equal(r.result.summary.stillBlocked,2);
 assert.equal(r.result.summary.alreadyWorking,1);
 assert.equal(r.result.summary.retryableWorking,1);
 assert.equal(r.result.summary.changedTickets,1);
 assert.deepEqual(JSON.parse(JSON.stringify(r.result.runnerTarget)),{ticketId:rows[0].id,jobId:'TASK-1'});
 assert.equal(r.result.runner_verified,false);
 assert.equal(JSON.parse(rows[1].context_json).color_jobs[0].status,'queued');
 assert.match(JSON.parse(rows[1].context_json).color_jobs[0].instructions,/Verified owner bulk UI decision/);
 assert.equal(JSON.parse(rows[1].context_json).owner_approval_receipts.length,1);
 assert.equal(JSON.parse(rows[2].context_json).color_jobs[0].status,'blocked');
 assert.equal(JSON.parse(rows[3].context_json).color_jobs[0].status,'blocked');
 assert.equal(JSON.parse(rows[4].context_json).color_jobs[0].status,'working');
 assert.equal(store.edits,1);
 const again=await ownerTickets(env(store.db),'/work/tickets/approve-all',{});
 assert.equal(again.result.summary.uiApproved,0,'repeat must not double-approve');
 assert.equal(store.edits,1);
});
test('stale working jobs can receive a runner retry request without rewriting receipts',async()=>{
 const rows=[ticket('11223344','working',[job('working','Last runner attempt timed out')])];
 const before=rows[0].context_json,store=database(rows);
 const r=await ownerTickets(env(store.db),'/work/tickets/approve-all',{});
 assert.equal(r.status,200);
 assert.equal(r.result.summary.retryableWorking,1);
 assert.deepEqual(JSON.parse(JSON.stringify(r.result.runnerTarget)),{ticketId:rows[0].id,jobId:'TASK-1'});
 assert.equal(r.result.summary.changedTickets,0);
 assert.equal(rows[0].context_json,before);
 assert.equal(store.edits,0);
});
test('recent verified runner attempt is left alone',async()=>{
 const recent=new Date().toISOString();
 const current=job('working','running now');current.progress={runUrl:'https://github.com/workflow',attemptedAt:recent};
 const rows=[ticket('55667788','working',[current])];const store=database(rows);
 const r=await ownerTickets(env(store.db),'/work/tickets/approve-all',{});
 assert.equal(r.result.summary.retryableWorking,0);
 assert.equal(r.result.runnerTarget,null);
 assert.equal(r.result.summary.alreadyWorking,1);
});
test('failed CAS is not claimed as a saved bulk UI approval',async()=>{
 const rows=[ticket('FFFFFF66','blocked',[job('blocked',ui)])];
 const store=database(rows);store.failAll=true;
 const r=await ownerTickets(env(store.db),'/work/tickets/approve-all',{});
 assert.equal(r.result.summary.uiApproved,0);
 assert.equal(r.result.summary.changedTickets,0);
 assert.equal(r.result.summary.errors,1);
 assert.equal(r.result.runnerTarget,null);
 assert.equal(JSON.parse(rows[0].context_json).color_jobs[0].status,'blocked');
});
test('UI and Worker accept only a verified owner bulk request, and do not claim completed work',()=>{
 const chat=fs.readFileSync('bubbles-ai.js','utf8');
 assert.doesNotMatch(chat,/runAllButton/);
 assert.match(chat,/start_immediately:true/);
 assert.match(chat,/verifiedOwnerHeaders\(\)/);
 assert.match(chat,/BRAIN\+'\/work\/tickets\/approve-all'/);
 assert.match(chat,/verifiedOwnerHeaders\(\)/);
 assert.match(chat,/resolveRoutineNow.addEventListener\('click'/);
 assert.doesNotMatch(chat,/void resolveRoutineOwnerDecisions\(result.tickets\)/);
 assert.match(worker,/path==='\/work\/tickets\/approve-all'/);
 assert.match(worker,/if\(!await ownerAuthorized\(env,token\)\)/);
 assert.match(chat,/result.execution/);
});
