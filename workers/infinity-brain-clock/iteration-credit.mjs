// Server-only bridge from actual GitHub operations to private Bubble Bit packets.
// A request, poll, model reply, dispatch or client event cannot authorize credit.
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(value);
const sha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const description=value=>{
 const text=String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
 return /(?:gh[pousr]_|sk-[A-Za-z0-9]|\bsq_|\br[bd]_|private key|\b(?:password|secret|bearer|api.key)\b)/i.test(text)?'Private customer criteria (details retained in the owner conversation)':text.slice(0,380);
};
export async function captureBitContext(storage,env,{sessionId,query}={}){
 if(env.BUBBLE_BITS_ENABLED!=='1'||!hex(env.WRITER_OWNER_HASH)||!id(sessionId)||typeof query!=='string'||!query.trim()||query.length>6000)return null;
 const now=Date.now(),record={id:'ctx_'+crypto.randomUUID().replaceAll('-',''),sessionId,ownerHash:env.WRITER_OWNER_HASH,
  criteriaKey:await hash(query.trim()),goal:description(query),expiresAt:now+30*60*1000};
 // Bound retention. Expired context cannot be renewed by replaying a proof.
 const index=await storage.get('bit-context-index')||[],keep=index.filter(x=>x.expiresAt>now).slice(-199);
 for(const old of index)if(!keep.some(x=>x.id===old.id))await storage.delete('bit-context:'+old.id);
 await storage.put('bit-context:'+record.id,record);
 await storage.put('bit-context-index',[...keep,{id:record.id,expiresAt:record.expiresAt}]);
 return {id:record.id,sessionId,criteriaKey:record.criteriaKey};
}
export async function resolveBitContext(storage,env,body){
 if(env.BUBBLE_BITS_ENABLED!=='1'||!id(body?.bitContext?.id)||!id(body.sessionId))return null;
 const ctx=await storage.get('bit-context:'+body.bitContext.id),recipient=await storage.get('bot-work-recipient');
 if(!ctx||ctx.ownerHash!==env.WRITER_OWNER_HASH||ctx.sessionId!==body.sessionId||ctx.criteriaKey!==body.bitContext.criteriaKey||ctx.expiresAt<=Date.now()||!(typeof recipient?.userId==='string'&&recipient.userId.length>0&&recipient.userId.length<=200))return null;
 return {...ctx,userId:recipient.userId};
}
export async function githubIteration(env,record,result,operation,index){
 if(!result?.ok||result.exists===false||!Number.isSafeInteger(index)||index<0||
    !/^[a-f0-9-]{36}$/i.test(record?.requestId||'')||!hex(env.WRITER_OWNER_HASH))return null;
 let tool;
 if(operation?.action==='read_file'&&sha(result.sha))tool='github.read_file';
 if(operation?.action==='read_repository'&&sha(result.headSha))tool='github.read_repository';
 if(operation?.action==='create_repository'&&result.status==='repository_created'&&
    /^www-infinity4\/[A-Za-z0-9_.-]{2,80}$/.test(result.repository||'')&&
    result.repository.toLowerCase()===record.repository?.toLowerCase()&&result.url==='https://github.com/'+result.repository)
  tool='github.create_repository';
 if(operation?.action==='capabilities'&&result.status==='credential_verified_read')tool='github.capabilities';
 if(operation?.action==='list_workflows'&&result.complete===true)tool='github.list_workflows';
 if(['list_runs','list_workflow_runs'].includes(operation?.action)&&result.status==='runs_read_only')tool='github.list_runs';
 if(operation?.action==='create_pr'&&result.status==='pull_request_open'&&Number.isSafeInteger(result.number))tool='github.create_pr';
 if(operation?.action==='dispatch_workflow'&&result.status==='dispatch_accepted'&&result.completed===false)tool='github.dispatch_workflow';
 if(operation?.action==='search_github_code'&&result.status==='code_search_results')tool='github.search';
 if(operation?.action==='commit_files'&&result.status==='committed_unverified'&&sha(result.commitSha))tool='github.commit';
 if(operation?.action==='read_run'&&result.status==='workflow_run_read'){
  // Inspecting an unfinished/failed run is a real read, never passed tests.
  tool=result.run?.status==='completed'&&result.run.conclusion==='success'?'github.workflow_checks':'github.read_repository';
 }
 if(!tool)return null;
 const receiptId='bb_'+await hash(JSON.stringify([env.WRITER_OWNER_HASH,record.requestId,tool,operation.repository,operation.path||null,result.commitSha||result.headSha||result.run?.headSha||result.sha||result.readme?.commitSha||null,result.run?.id||null,operation.query||null]));
 const receipt={id:receiptId,tool,status:'complete'};
 // Dispatch only confirms a request was queued. No actual run or code result
 // exists yet, so it cannot mint a Bubble Bit regardless of user context.
 if(tool==='github.dispatch_workflow')return {receipt,bit:{status:'observation_only',amount:0}};
 const ctx=record.bitContext;
 if(!ctx||tool==='github.create_repository')return {receipt,bit:{status:'context_unavailable',amount:0}};
 const packet={version:1,source:'brain_direct_github_v1',asset:'BUBBLE_BIT',receiptId,userId:ctx.userId,
  sessionId:ctx.sessionId,criteriaKey:ctx.criteriaKey,contextId:ctx.id,tool,
  goal:ctx.goal,summary:tool+' completed for '+String(operation.repository||'GitHub'),
  repository:operation.repository||null,requestId:record.requestId,
  sourceSha:result.commitSha||result.headSha||result.run?.headSha||result.sha||null,
  path:typeof operation.path==='string'?operation.path.slice(0,300):null,
  resultStatus:result.status||'source_read',reusePermission:'private'};
 return {receipt,credit:packet,bit:{status:'pending',amount:0,receiptId}};
}
export async function deliverBitCredit(env,iteration){
 const pending={status:'pending',amount:0,receiptId:iteration?.receipt?.id};
 if(env.BUBBLE_BITS_ENABLED!=='1'||!iteration?.credit||!env.BOT_WORK_SECRET||!env.BOT_WALLET)return pending;
 try{
  const r=await env.BOT_WALLET.fetch('https://wallet.internal/internal/bubble-bit-credit',{
   method:'POST',headers:{'Content-Type':'application/json','X-Bot-Work-Key':env.BOT_WORK_SECRET},
   body:JSON.stringify(iteration.credit),signal:AbortSignal.timeout(10000)});
  const proof=await r.json();
  if(!r.ok||!proof.ok||proof.asset!=='BUBBLE_BIT'||proof.receiptId!==iteration.receipt.id||proof.creditId!==iteration.receipt.id||proof.amount!==1)return pending;
  return {status:'credited',asset:'BUBBLE_BIT',receiptId:proof.receiptId,creditId:proof.creditId,amount:1};
 }catch{return pending}
}

// Per-receipt queue entries avoid a read/modify/write index race. The alarm
// retries only saved credits, with a cooldown; it never reruns the source tool.
export async function retryBitCredits(storage,env){
 if(env.BUBBLE_BITS_ENABLED!=='1')return;
 const queued=await storage.list({prefix:'bit-credit-retry:',limit:3});
 for(const [queueKey,next] of queued){
  if(next.retryAfter>Date.now())continue;
  const record=await storage.get(next.recordKey),item=record?.receipts?.find(x=>x.receipt?.id===next.receiptId);
  if(!item?.bitCredit||item.bit?.status==='credited'){await storage.delete(queueKey);continue;}
  const proof=await storage.get('bit-credit-proof:'+next.receiptId)||await deliverBitCredit(env,{receipt:item.receipt,credit:item.bitCredit});
  if(proof.status==='credited'){
   // A per-receipt proof cannot overwrite source steps appended concurrently.
   await storage.put('bit-credit-proof:'+next.receiptId,proof);
   await storage.delete(queueKey);
  }else{
   // Rotate the key behind other queued receipts, so one failing destination
   // cannot starve the rest of the queue indefinitely.
   const rotated='bit-credit-retry:'+String(Date.now()+300000).padStart(16,'0')+':'+next.receiptId;
   await storage.put(rotated,{...next,retryAfter:Date.now()+300000});
   if(rotated!==queueKey)await storage.delete(queueKey);
  }
 }
}
