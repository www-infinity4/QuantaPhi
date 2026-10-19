// Submit one authenticated owner request with its planned jobs in the same write.
// Local storage is never a job receipt. This module does not claim execution.
export async function planAndQueue(request,{owner=globalThis.QuantaBrainOwner,tools=globalThis.BubblesBrainActions,send=fetch}={}){
 const text=String(typeof request==='string'?request:request?.request||'').trim();
 if(!text||text.length>12000)throw Error('Describe the work in 12,000 characters or fewer.');
 const repository=typeof request==='object'&&request.repository?request.repository:tools?.repositoryFor(text);
 if(!/^www-infinity4\/[A-Za-z0-9_.-]+$/.test(repository||''))throw Error('Choose an owner repository for this request.');
 if(!tools?.makeJobs)throw Error('The bot planner is still loading. Please try again.');
 const headers=await owner?.ready;
 if(!headers?.Authorization)throw Error('Connect your owner session to start work.');
 const jobs=tools.makeJobs(text,repository),plan=tools.requestPlan(text,repository);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(repository+'|'+text));
 const submission=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await send('https://infinity-brain-clock.marvaseater.workers.dev/work/tickets/create',{
   method:'POST',headers:{...headers,'Content-Type':'application/json'},signal:controller.signal,
   body:JSON.stringify({start_immediately:true,request:text,title:text.slice(0,120),repository,
    context:{kind:'robot-directions',submission_id:submission,design:'Oracle Octaves · Android first',color_jobs:jobs,plan}})});
  const result=await response.json();
  if(!response.ok||!result.ok||!result.ticket?.id)throw Error(result.error||'The work request could not be confirmed.');
  return {...result,message:tools.executionMessage(result.execution,result.deduplicated,result.ticket.status)};
 }finally{clearTimeout(timer)}
}
