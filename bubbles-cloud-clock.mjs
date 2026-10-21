/* First-party Bubbles chat adapter for Cloudflare's existing Brain Clock.
 * Scheduling an already authorized ticket is not permission to edit a repo.
 * No secrets, alarms, or private worker controls are exposed to anonymous chat.
 */
const TICKET=/\b(IW-\d{8}-[0-9A-F-]{8})\b/i,JOB=/\b(TASK-\d+)\b/i;
const CLOCK=/\b(?:schedule|scheduled|scheduler|alarm|clock\s+(?:tasks?|jobs?)|scheduled\s+(?:tasks?|jobs?))\b/i;
export function parseClockIntent(value,{now=new Date()}={}){
 const message=String(value||'').trim();
 if(!CLOCK.test(message))return null;
 if(/\b(?:how|why|what)\b.{0,60}\b(?:schedule|clock|alarm)\b/i.test(message)&&!/\b(?:show|list)\b/i.test(message))return null;
 const prefix=message.replace(/^(?:bubbles[,:]?|please|hey\s+bubbles)[,:\s]*/i,'');
 if(/^(?:clear|archive|clean\s*up|remove)\b.{0,70}\b(?:old|finished|completed|stale)\b.{0,40}\b(?:clock|alarms?|scheduled|tasks?|jobs?)/i.test(prefix))
  return {action:'archive_old'};
 if(/^(?:show|list|check|what are|what's)\b.{0,75}\b(?:scheduled|alarms?|clock\s+tasks?|clock\s+jobs?)/i.test(prefix))
  return {action:'list'};
 const control=prefix.match(/^(pause|resume|cancel|archive)\b.{0,60}\b(clock_[0-9a-f-]{36})\b/i);
 if(control){
  const action=control[1].toLowerCase(),id=control[2];
  if(action==='resume')return {action,id,needsTime:true};
  return {action,id};
 }
 if(!/\b(?:schedule|set an? alarm|run|start)\b/i.test(prefix))return null;
 const ticketId=message.match(TICKET)?.[1]?.toUpperCase(),jobId=message.match(JOB)?.[1]?.toUpperCase();
 if(!ticketId||!jobId)return {action:'create',needsTicket:true};
 const repeat=/\b(?:every\s+hour|hourly)\b/i.test(message)?'hourly':/\b(?:each\s+day|every\s+day|daily)\b/i.test(message)?'daily':'once';
 let startAt=message.match(/\b(?:at|on)\s+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2}))/i)?.[1];
 if(!startAt){
  const local=message.match(/\btomorrow\b(?:\s+at)?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if(local){
   let h=Number(local[1])%12;if(local[3].toLowerCase()==='pm')h+=12;
   const when=new Date(now.getTime());when.setDate(when.getDate()+1);when.setHours(h,Number(local[2]||0),0,0);
   startAt=when.toISOString();
  }
 }
 if(!startAt)return {action:'create',needsTime:true,ticketId,jobId};
 return {action:'create',ticketId,jobId,repeat,startAt};
}
const detail=e=>String(e?.message||e||'unknown').replace(/[\r\n]+/g,' ').slice(0,160);
export async function clockConversation(intent,{ownerHeaders,fetcher=fetch,base='https://infinity-brain-clock.marvaseater.workers.dev'}={}){
 if(!intent)return null;
 if(intent.needsTicket)return 'To schedule an existing job, tell me its verified Robot Brain ticket and job IDs, for example: schedule ticket IW-20261021-ABCD1234 job TASK-1 tomorrow at 4 PM. I will not invent a job or approve one silently.';
 if(intent.needsTime)return 'Please give the schedule time, such as tomorrow at 4 PM or a full ISO date/time including its UTC offset. No alarm has been created.';
 const headers=await ownerHeaders();
 if(!headers?.Authorization)throw Error('verified_Bubbles_owner_session_required');
 const response=await fetcher(base+'/work/clock',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(intent)},17000);
 const result=await response.json();
 if(!response.ok||result.ok!==true)throw Error(result.error||'clock_change_not_confirmed');
 if(intent.action==='list'){
  const tasks=result.tasks||[];
  return tasks.length?'Cloudflare Brain Clock schedules:\n'+tasks.map(t=>t.id+' · '+t.status+' · '+t.repository+' · '+t.ticketId+'/'+t.jobId+' · '+t.repeat+' · '+(t.nextAt?new Date(t.nextAt).toLocaleString():'no next run')+' · Last receipt: '+(t.lastReceipt?.status||'none')).join('\n'):'No active owner clock schedules. Older Robot Brain history is preserved.';
 }
 if(intent.action==='archive_old')return 'Archived '+result.archived+' old finished/cancelled schedules. Original tickets and receipts were not deleted.';
 if(intent.action==='create'){
  const task=result.task;
  return 'Cloudflare clock scheduled '+task.ticketId+'/'+task.jobId+' for '+new Date(task.nextAt).toLocaleString()+' ('+task.repeat+'). Schedule ID: '+task.id+'. This is a scheduled request, not proof that any bot ran.';
 }
 return 'Cloudflare clock '+intent.action+' confirmed for '+result.task.id+'. Original work history and receipts remain available.';
}
