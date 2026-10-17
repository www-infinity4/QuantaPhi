/* Red-Bubbles <-> Red-Brain: owner-gated, durable macro coordination.
 * Both sectors can read the same verified work state. Writes remain
 * purpose-scoped: Bubbles acknowledges/observes, Brain records runner receipts.
 * Never accept executable commands, privileges, or transcripts through sync. */
export const RED_PROTOCOL=1;
const clip=(value,n=160)=>String(value||'').slice(0,n);
const safeStatus=value=>/^[a-z_]{1,42}$/.test(String(value||''))?String(value):'unknown';
export function classifyDispatch(dispatch){
 if(dispatch?.status==='scheduled_fallback')return {state:'awaiting_repository_runner',reason:clip(dispatch.error||'runner_not_dispatched')};
 if(dispatch?.status==='workflow_dispatched'||dispatch?.status==='dispatched'||dispatch?.status==='queued')return {state:'dispatched_unverified',reason:'Awaiting authenticated runner receipt'};
 if(dispatch?.status==='failed'||dispatch?.ok===false)return {state:'runner_dispatch_failed',reason:clip(dispatch.error||'runner_dispatch_failed')};
 return {state:'queued_unverified',reason:'No runner execution receipt'};
}
export async function recordRedBrain(storage,input,now=Date.now()){
 const prior=await storage.get('red-brain-event')||{revision:0};
 const event={revision:prior.revision+1,at:now,kind:clip(input.kind,40),
  state:safeStatus(input.state),ticketId:clip(input.ticketId,80),
  jobId:clip(input.jobId,30),runUrl:clip(input.runUrl,250),
  commitSha:/^[0-9a-f]{40}$/.test(input.commitSha||'')?input.commitSha:'',
  testsPassed:input.testsPassed===true,
  reason:clip(input.reason,180)};
 await storage.put('red-brain-event',event);return event;
}
export async function redExchange(storage,body,now=Date.now()){
 if(!body||typeof body!=='object'||Array.isArray(body)||body.protocol!==RED_PROTOCOL||
  body.sector!=='red-bubbles'||!/^bubbles-(?:android|website)-[A-Za-z0-9_-]{8,80}$/.test(body.clientId||''))
  return {ok:false,error:'invalid_red_sector_envelope'};
 // Bubbles can acknowledge observations but cannot impersonate Brain or submit a
 // worker command through the telemetry channel. The normal owner adapter writes jobs.
 const acknowledged=Math.max(0,Math.min(100000000,Number.isSafeInteger(body.ackRevision)?body.ackRevision:0));
 const previous=await storage.get('red-bubbles-sector')||{};
 const bubble={sector:'red-bubbles',clientId:body.clientId,seenAt:now,
  ackRevision:Math.max(previous.clientId===body.clientId?previous.ackRevision||0:0,acknowledged)};
 await storage.put('red-bubbles-sector',bubble);
 const event=await storage.get('red-brain-event')||null;
 const heartbeat=await storage.get('writerHeartbeat')||null;
 const request=await storage.get('requested-next-job')||null;
 const dispatch=await storage.get('last-owner-dispatch')||null;
 const runnerAge=typeof heartbeat?.when==='number'?Math.max(0,now-heartbeat.when):null;
 const dispatchAge=typeof dispatch?.when==='number'?Math.max(0,now-dispatch.when):null;
 return {ok:true,protocol:RED_PROTOCOL,serverAt:now,
  redBubbles:{sector:'red-bubbles',connected:true,ackRevision:bubble.ackRevision,seenAt:bubble.seenAt},
  redBrain:{sector:'red-brain',connected:true,revision:event?.revision||0,
   event:event&&event.revision>bubble.ackRevision?event:null,
   pendingJob:request?{ticketId:clip(request.ticketId,80),jobId:clip(request.jobId,30)}:null,
   lastDispatch:dispatch?{state:classifyDispatch(dispatch).state,
    reason:classifyDispatch(dispatch).reason,at:dispatch.when||0,ageMs:dispatchAge}:null,
   runner:{lastSeenAt:heartbeat?.when||null,ageMs:runnerAge,
    activeReceipt:runnerAge!==null&&runnerAge<90000?clip(heartbeat.runUrl,250):null,
    state:runnerAge===null?'no_runner_heartbeat':runnerAge>90000?'stale_runner_heartbeat':'recent_heartbeat_not_execution_proof'}},
  noWriteExecuted:true};
}
