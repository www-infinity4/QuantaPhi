/* Project real steps from the owner-authenticated Brain ticket-list result.
 * A browser observation is not an independently verified GitHub commit,
 * completed deployment, or spendable Bubble Bit. No network or wallet access. */
const REPO=/^www-infinity4\/[A-Za-z0-9_.-]{1,80}$/;
const JOB=/^[A-Za-z0-9_-]{1,48}$/;
const STATES=new Set(['queued','ready','working','blocked','committed_unverified','merged_verified','deployed_verified','complete','completed','superseded']);
const RUNNER_PHASE=/^(?:discovery_started|planning_started|red_reasoned|orange_reasoned|blue_reasoned|source_read|patch_started|patch_prepared|review_started|checks_started|checks_passed|arbitration_started|publication_started|pr_opened|attempt_failed)$/;
const safeText=(v,limit)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,limit):'';
function safeRunUrl(value,repository){
 try{
  const url=new URL(value);
  if(url.origin!=='https://github.com'||url.search||url.hash||url.username||url.password)return '';
  // The general repository engineer runs in Moltnook, even when the ticket
  // changes QuantaPhi source. Keep its signed GitHub Actions proof visible.
  const prefixes=['/'+repository+'/','/www-infinity4/Moltnook/'];
  const prefix=prefixes.find(value=>url.pathname.startsWith(value));
  if(!prefix)return '';
  const action=url.pathname.slice(prefix.length);
  return /^(?:actions\/runs\/[0-9]+|pull\/[0-9]+|commit\/[0-9a-f]{7,40})$/.test(action)?url.href:'';
 }catch{return ''}
}
export function projectVerifiedJobTransitions(ticket,previous={}){
 if(!ticket||!JOB.test(String(ticket.id||'').replace(/^IW-[0-9]{8}-/,'').slice(0,48))||
  !REPO.test(ticket.repository||'')||!Array.isArray(ticket.context?.color_jobs))
  return {events:[],markers:previous};
 const old=previous.__ticketId===ticket.id?previous:{};
 const markers={...old,__ticketId:ticket.id},events=[];
 for(const job of ticket.context.color_jobs.slice(0,12)){
  if(!JOB.test(job?.id||'')||job.repository!==ticket.repository||!STATES.has(job.status))continue;
  const p=job.progress&&typeof job.progress==='object'?job.progress:{};
  const summary=safeText(p.summary||p.next||p.blocker||'',180);
  const runUrl=safeRunUrl(p.runUrl||p.url||'',ticket.repository);
  const agent=safeText(job.agent||'',40);
  const stage=safeText(job.title||'',100);
  const steps=(Array.isArray(p.runnerSteps)?p.runnerSteps:[]).slice(-36);
  let hasRunnerProgress=false;
  for(const step of steps){
   const runnerUrl=safeRunUrl(step?.runUrl,ticket.repository);
   const label=safeText(step?.label,100);
   const run=runnerUrl.match(/\/actions\/runs\/(\d+)$/)?.[1];
   const runAttempt=step?.runAttempt??1;
   if(!run||!label||!RUNNER_PHASE.test(step.phase||'')||!Number.isInteger(step.attempt)||step.attempt<0||step.attempt>3||
    !Number.isInteger(runAttempt)||runAttempt<1||runAttempt>9999||
    step.id!==run+(runAttempt===1?'':'.'+runAttempt)+'-'+step.attempt+'-'+step.phase)continue;
   if(runnerUrl===runUrl)hasRunnerProgress=true;
   const key=job.id+'|'+step.id;
   if(markers[key])continue;
   markers[key]=true;
   const stepAgent={red_reasoned:'red-macro-reader',orange_reasoned:'orange-peel',blue_reasoned:'blueberry'}[step.phase]||agent;
   events.push({type:'job_step',repository:ticket.repository,agent:stepAgent,status:job.status,
    stage:label+(step.attempt?' · attempt '+step.attempt:''),summary:safeText(step.summary,180),
    runUrl:safeRunUrl(step.prUrl,ticket.repository)||runnerUrl,runnerPhase:step.phase,runnerJob:job.id,
    source:'owner_ticket_snapshot',verifiedCompletion:false});
  }
  const fingerprint=JSON.stringify([job.status,summary,runUrl]);
  markers[job.id]=fingerprint;
  if(old[job.id]===fingerprint||(job.status==='working'&&hasRunnerProgress))continue;
  events.push({type:'job_step',repository:ticket.repository,agent,status:job.status,
   summary,stage,runUrl,runnerJob:job.id,source:'owner_ticket_snapshot',verifiedCompletion:false});
 }
 for(const key of Object.keys(markers).filter(key=>key.includes('|')).slice(0,-600))delete markers[key];
 return {events,markers};
}
