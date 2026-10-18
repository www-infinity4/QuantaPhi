/**
 * Ticket requests can spawn independent jobs. A model sees its assigned job;
 * the complete owner request remains in durable ticket history.
 */
const STOP=new Set('about after again also already and are before build card cards cloudflare code config configure create data design each ensure every file files from have into job later like make must new only owner project real repository request requested setup source stage task test that the their them these this those through user verified website with work working would your'.split(' '));
const tokens=text=>new Set((String(text||'').toLowerCase().match(/[a-z][a-z0-9]{3,}/g)||[]).filter(w=>!STOP.has(w)).slice(0,500));
const bounded=(text,n)=>typeof text==='string'?text.slice(0,n):'';
export function scopeOwnerContext(job){
 const req=bounded(job?.ownerRequest,3600);
 const task=[job?.title,job?.instructions,...(Array.isArray(job?.acceptance)?job.acceptance:[])].join(' ');
 if(!req.trim()||!task.trim())return {related:false,sharedAnchors:[]};
 const words=tokens(req);
 const anchors=[...tokens(task)].filter(w=>words.has(w)).slice(0,10);
 return {related:anchors.length>=2,sharedAnchors:anchors};
}
export function scopedRepositoryJob(job,{ticketId='',jobId='',repository=''}={}){
 if(!job||typeof job!=='object'||Array.isArray(job))throw Error('assigned_job_missing');
 const instructions=bounded(job.instructions,9500);
 if(!instructions.trim())throw Error('assigned_job_instructions_missing');
 const acceptance=Array.isArray(job.acceptance)?job.acceptance.filter(x=>typeof x==='string'&&x.trim()).slice(0,16).map(x=>x.slice(0,800)):[];
 const related=scopeOwnerContext(job);
 return {
  id:bounded(jobId||job.id,120),ticketId:bounded(ticketId,120),
  repository:bounded(repository||job.repository,240),
  title:bounded(job.title,800),agent:bounded(job.agent,120),instructions,
  acceptance,dependencies:Array.isArray(job.dependencies)?job.dependencies.filter(x=>typeof x==='string').slice(0,12):[],
  scope:'single_assigned_color_job',
  parentTicketIsNotThisJobAcceptance:true,
  ownerContextRelated:related.related,
  ...(related.related?{relatedOwnerContext:bounded(job.ownerRequest,3600)}:{}),
  acceptancePolicy:'Judge only the assigned job instructions and acceptance. Related parent wording can clarify this job, not add obligations from other jobs.'
 };
}
