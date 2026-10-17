const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {ownerApprovalRequests}=require('../bubbles-brain-actions.js');

const ticketId='IW-20261017-AB12CD34';
const blocker='Reader blocker: owner_input_required. Approve enrollment button/dialog placement, wording, styling and storage mechanism IndexedDB vs localStorage.';
function ticket(summary=blocker,status='blocked'){
 return {id:ticketId,title:'Add enrollment UI',status,context:{kind:'robot-directions',color_jobs:[
  {id:'TASK-1',repository:'www-infinity4/QuantaPhi',status:'blocked',instructions:'Implement enrollment UI',progress:{summary}}
 ]}};
}
test('only authenticated ticket-shaped, blocked UI requests get an approval button',()=>{
 assert.deepEqual(ownerApprovalRequests([ticket()]).map(x=>x.jobId),['TASK-1']);
 assert.equal(ownerApprovalRequests([ticket('Invalid redirect value: runner unavailable')]).length,0);
 assert.equal(ownerApprovalRequests([ticket('owner_input_required: review missing GitHub credential')]).length,0);
 assert.equal(ownerApprovalRequests([ticket(blocker,'complete')]).length,0);
 const forged=ticket();forged.id='chat-message';assert.equal(ownerApprovalRequests([forged]).length,0);
 const notBlocked=ticket();notBlocked.context.color_jobs[0].status='working';
 assert.equal(ownerApprovalRequests([notBlocked]).length,0);
});

const source=fs.readFileSync('workers/infinity-brain-clock/worker.js','utf8');
const start=source.indexOf('export async function ownerTickets(');
const end=source.indexOf('\nasync function ownerAuthorized(',start);
if(start<0||end<start)throw Error('Cannot locate worker ownerTickets');
const isolated=source.slice(start,end).replace('export async function ownerTickets','async function ownerTickets');
const ownerTickets=vm.runInNewContext(isolated+'\nownerTickets;',{
 crypto:globalThis.crypto,Date,JSON,
 ticketStatusFromJobs:jobs=>jobs.some(x=>x.status==='queued')?'ready':'blocked'
});
function mockDb(initial){
 const row={...initial,context_json:JSON.stringify(initial.context)};
 delete row.context;
 const calls=[];
 const db={prepare(sql){return{bind(...params){return {
  async first(){return sql.startsWith('SELECT')?row:null},
  async run(){
   calls.push({sql,params});
   if(sql.startsWith('UPDATE work_tickets SET context_json=')){
    if(params[5]!==row.context_json)return {meta:{changes:0}};
    row.context_json=params[0];row.status=params[1];row.updated_at=params[2];
    return {meta:{changes:1}};
   }
   throw Error('unexpected SQL '+sql);
  }
 }}}}};
 return {row,db,calls};
}
test('server records scoped owner approval and makes the previously blocked job eligible for retry',async()=>{
 const {row,db,calls}=mockDb(ticket());
 const env={WRITER_OWNER_HASH:'a'.repeat(64),WORK_DB:db};
 const r=await ownerTickets(env,'/work/tickets/approve',{id:ticketId,jobId:'TASK-1'});
 assert.equal(r.status,200);assert.equal(r.result.ok,true);
 assert.equal(calls.length,1);
 assert.equal(row.status,'ready');
 assert.equal(r.result.ticket.context.color_jobs[0].status,'queued');
 assert.match(r.result.ticket.context.color_jobs[0].instructions,/Verified owner UI approval/);
 assert.match(r.result.ticket.context.color_jobs[0].instructions,/IndexedDB/);
 assert.equal(r.result.ticket.context.owner_approval_receipts.length,1);
 assert.equal(r.result.runner_verified,false);
 const again=await ownerTickets(env,'/work/tickets/approve',{id:ticketId,jobId:'TASK-1'});
 assert.equal(again.status,409,'second click must not create another approval');
 assert.equal(calls.length,1);
});
test('server rejects non-UI, generic tech failures and security-sensitive blockers',async()=>{
 for(const message of ['Invalid redirect value','owner_input_required: GitHub permissions missing','owner_input_required: approve UI payment wallet dialog']){
  const {row,db,calls}=mockDb(ticket(message));
  const r=await ownerTickets({WRITER_OWNER_HASH:'a'.repeat(64),WORK_DB:db},'/work/tickets/approve',{id:ticketId,jobId:'TASK-1'});
  assert.equal(r.status,409);assert.equal(calls.length,0);
  assert.equal(row.status,'blocked');
 }
});
test('UI calls the separately owner-authorized approval endpoint from the chat, not a model message',()=>{
 const chat=fs.readFileSync('bubbles-ai.js','utf8');
 assert.match(chat,/function showOwnerApprovalRequests\(tickets\)/);
 assert.match(chat,/BRAIN\+'\/work\/tickets\/approve'/);
 assert.match(chat,/showOwnerApprovalRequests\(result.tickets\)/);
 assert.match(chat,/Explain this choice/);
 assert.match(source,/if\(\['\/work\/tickets\/create'.*'\/work\/tickets\/approve'/);
 assert.match(source,/if\(!await ownerAuthorized\(env,token\)\)/);
});
