/* Complete Me AI: one owner-authorized project on the EXISTING Brain ticket
 * intake and Moltnook signed runner. No private state, new scheduler,
 * approval shortcut or autonomous browser-side execution.
 */
const REPOSITORY=/^www-infinity4\/[A-Za-z0-9_.-]{1,100}$/;
const VERIFIED_SHA=/^[a-f0-9]{40}$/i;
const DONE=new Set(['merged_verified','deployed_verified','complete']);
const OWNER_BLOCK=/\b(?:owner_approval_required|owner_decision_required|approval_required|permission_required|security_review_required)\b/i;
const scopeKeys=['repository','issue','goal','first','second','acceptance'];
const trimmed=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';

export function completeMeCommand(input){
 if(typeof input!=='string'||input.length>2200)return null;
 const match=/^complete me ai(?:\s*[—:-]\s*(.*))?$/i.exec(input.trim());
 return match?{goal:trimmed(match[1]||'',1600)}:null;
}

function validateProject(raw){
 const p={
  repository:trimmed(raw?.repository,120),
  issue:trimmed(String(raw?.issue??''),15),
  goal:trimmed(raw?.goal,1600),
  first:trimmed(raw?.first,3000),
  second:trimmed(raw?.second,3000),
  acceptance:trimmed(raw?.acceptance,1600)
 };
 if(!REPOSITORY.test(p.repository))throw Error('An explicit owned repository is required');
 if(!/^[1-9][0-9]{0,8}$/.test(p.issue))throw Error('Existing numbered project issue required');
 if(!p.goal||!p.first||!p.second||!p.acceptance)throw Error('Two scoped jobs and acceptance criteria are required');
 return p;
}
function equalScope(previous,current){
 return previous&&scopeKeys.every(key=>previous[key]===current[key]);
}
async function projectSubmissionId(p){
 if(!crypto?.subtle)throw Error('Authenticated project fingerprint unavailable');
 const data=new TextEncoder().encode(p.repository.toLowerCase()+'|'+p.issue);
 const digest=await crypto.subtle.digest('SHA-256',data);
 return 'complete-me-'+[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,48);
}
function projectJobs(p){
 const common='Use canonical GitHub issue #'+p.issue+
  ' and existing signed owner runner. Write failing regressions before behavior changes. '+
  'Preserve identity, wallets and active leases. Require exact-head CI, independent review '+
  'and expected-head guarded merge before any authorized deployment; never claim live completion without readback.';
 return [
  {id:'TASK-1',agent:'greenbeans',executor:'repository-engine',repository:p.repository,
   title:p.first.slice(0,140),instructions:p.goal+'\nFirst scoped change: '+p.first+'\n'+common,
   dependencies:[],acceptance:[p.acceptance,'Record real first-job source, test, review and merge receipts.']},
  {id:'TASK-2',agent:'greenbeans',executor:'repository-engine',repository:p.repository,
   title:p.second.slice(0,140),instructions:p.goal+'\nDependent change: '+p.second+'\n'+common,
   dependencies:['TASK-1'],acceptance:[p.acceptance,'Start only after the first job has a verified merge/completion; record second-job receipts.']}
 ];
}

export async function startCompleteMe(project,request){
 const p=validateProject(project);
 if(typeof request!=='function')throw Error('Authenticated owner request adapter required');
 // Separate owner-scoped READ is mandatory: model text and a guessed SHA
 // never grant permission to create an engineering ticket.
 const source=await request('/work/github/read',{action:'read_repository',repository:p.repository});
 if(source?.ok!==true||source.repository!==p.repository||!VERIFIED_SHA.test(source.headSha||''))
  throw Error('Source verification failed; no project ticket created');
 const context={
  kind:'robot-directions',project_type:'complete-me-ai',
  submission_id:await projectSubmissionId(p),
  repositories:[p.repository],
  project:{...p},
  pinnedSourceSha:source.headSha,
  color_jobs:projectJobs(p)
 };
 const saved=await request('/work/tickets/create',{
  start_immediately:true,title:'Complete Me AI · '+p.goal.slice(0,125),
  request:'Complete Me AI — '+p.goal,repository:p.repository,context
 });
 if(saved?.ok!==true||!saved.ticket?.id)throw Error('Owner project intake did not confirm a saved ticket');
 if(!equalScope(saved.ticket.context?.project,p))
  throw Error('Project already exists with different scope; original work is preserved');
 return {
  project:{ticketId:saved.ticket.id,issue:p.issue,repository:p.repository,goal:p.goal},
  deduplicated:saved.deduplicated===true,
  execution:saved.execution||{status:'not_confirmed'},
  jobs:completeMeProject(saved.ticket).jobs
 };
}

// Read-only project display. Never infer a verified deployment from a status
// string, a model reply, or a workflow-dispatch acknowledgement.
export function completeMeProject(ticket){
 const jobs=Array.isArray(ticket?.context?.color_jobs)?ticket.context.color_jobs.filter(Boolean):[];
 const byId=new Map(jobs.map(job=>[job.id,job]));
 const project=ticket?.context?.project||{};
 return {
  ticketId:ticket?.id||'',goal:trimmed(project.goal,1600),repository:ticket?.repository||'',
  status:ticket?.status||'unverified',
  jobs:jobs.map(job=>{
   const dependencies=Array.isArray(job.dependencies)?job.dependencies:[];
   const held=dependencies.some(id=>!DONE.has(byId.get(id)?.status));
   const blocker=String(job.progress?.blocker||'');
   const approvalRequired=OWNER_BLOCK.test(blocker);
   const phase=held?'dependency_pending':approvalRequired?'awaiting_owner':
    job.status==='blocked'?'blocked':DONE.has(job.status)?'source_milestone_recorded':
    job.status==='working'?'working':job.status==='queued'?'queued':'unverified';
   return {id:job.id,title:job.title||'',phase,approvalRequired,blocker,
    dependencies:[...dependencies],status:job.status||'unverified',
    runUrl:job.progress?.runUrl||'',commitSha:job.progress?.commitSha||''};
  })
 };
}
