/* Project real steps from the owner-authenticated Brain ticket-list result.
 * A browser observation is not an independently verified GitHub commit,
 * completed deployment, or spendable Bubble Bit. No network or wallet access. */
const REPO=/^www-infinity4\/[A-Za-z0-9_.-]{1,80}$/;
const JOB=/^[A-Za-z0-9_-]{1,48}$/;
const STATES=new Set(['queued','ready','working','blocked','committed_unverified','merged_verified','deployed_verified','complete','completed','superseded']);
const safeText=(v,limit)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,limit):'';
function safeRunUrl(value,repository){
 try{
  const url=new URL(value);
  if(url.origin!=='https://github.com'||url.search||url.hash||url.username||url.password)return '';
  const encoded=repository.replace(/[.*+?^\x24{}()|[\]\\]/g,'\\\x24&');
  return new RegExp('^/'+encoded+'/(?:actions/runs/[0-9]+|pull/[0-9]+|commit/[0-9a-f]{7,40})$').test(url.pathname)?url.href:'';
 }catch{return ''}
}
export function projectVerifiedJobTransitions(ticket,previous={}){
 if(!ticket||!JOB.test(String(ticket.id||'').replace(/^IW-[0-9]{8}-/,'').slice(0,48))||
  !REPO.test(ticket.repository||'')||!Array.isArray(ticket.context?.color_jobs))
  return {events:[],markers:previous};
 const old=previous.__ticketId===ticket.id?previous:{};
 const markers={__ticketId:ticket.id},events=[];
 for(const job of ticket.context.color_jobs.slice(0,12)){
  if(!JOB.test(job?.id||'')||job.repository!==ticket.repository||!STATES.has(job.status))continue;
  const p=job.progress&&typeof job.progress==='object'?job.progress:{};
  const summary=safeText(p.summary||p.next||p.blocker||'',180);
  const runUrl=safeRunUrl(p.runUrl||p.url||'',ticket.repository);
  const agent=safeText(job.agent||'',40);
  const stage=safeText(job.title||'',100);
  const fingerprint=JSON.stringify([job.status,summary,runUrl]);
  markers[job.id]=fingerprint;
  if(old[job.id]===fingerprint)continue;
  events.push({type:'job_step',repository:ticket.repository,agent,status:job.status,
   summary,stage,runUrl,source:'owner_ticket_snapshot',verifiedCompletion:false});
 }
 return {events,markers};
}
