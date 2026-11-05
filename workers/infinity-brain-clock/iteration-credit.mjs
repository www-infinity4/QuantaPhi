// Server-only bridge from actual GitHub operations to private Bubble Bit packets.
// A request, poll, model reply, dispatch or client event cannot authorize credit.
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const sha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const description=value=>{
 const text=String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
 return /(?:gh[pousr]_|sk-[A-Za-z0-9]|\bsq_|\br[bd]_|private key|\b(?:password|secret|bearer|api.key)\b)/i.test(text)?'Private customer criteria (details retained in the owner conversation)':text.slice(0,380);
};
export async function captureBitContext(storage,env,body,criteria,readContext){
 if(env.BUBBLE_BITS_ENABLED!=='1'||!hex(env.WRITER_OWNER_HASH)||body.action!=='assist'||
    !/^[A-Za-z0-9_-]{10,80}$/.test(body.sessionId||'')||
    !/^[a-f0-9-]{36}$/i.test(body.requestId||'')||!criteria?.request)return null;
 const recipient=await storage.get('bot-work-recipient');
 if(!(typeof recipient?.userId==='string'&&recipient.userId.length>0&&recipient.userId.length<=200))return null;
 const {request,sourceHint,imageObservations}=criteria;
 const context=await readContext({messages:[],query:request,sessionId:body.sessionId});
 if(context?.ok!==true)return null;
 // Derive from the same canonical request used by the server tool runner.
 // Observations are untrusted evidence and contribute only a private hash.
 // No browser proof, wallet ID or assistant prose can replace these criteria.
 const criteriaKey=await hash(JSON.stringify([body.repository,body.mode,request,sourceHint,await hash(imageObservations)]));
 return {id:'ctx_'+body.requestId.replaceAll('-',''),sessionId:body.sessionId,requestId:body.requestId,
  ownerHash:env.WRITER_OWNER_HASH,criteriaKey,goal:description(request),userId:recipient.userId};
}
export async function githubIteration(env,record,result,operation,index){
 if(!result?.ok||result.exists===false||!Number.isSafeInteger(index)||index<0||
    !/^[a-f0-9-]{36}$/i.test(record?.requestId||'')||!hex(env.WRITER_OWNER_HASH))return null;
 let tool;
 if(operation?.action==='read_file'&&sha(result.sha))tool='github.read_file';
 if(operation?.action==='read_repository'&&sha(result.headSha))tool='github.read_repository';
 if(operation?.action==='search_github_code'&&result.status==='code_search_results')tool='github.search';
 if(operation?.action==='commit_files'&&result.status==='committed_unverified'&&sha(result.commitSha))tool='github.commit';
 if(operation?.action==='read_run'&&result.status==='workflow_run_read'){
  // Inspecting an unfinished/failed run is a real read, never passed tests.
  tool=result.run?.status==='completed'&&result.run.conclusion==='success'?'github.workflow_checks':'github.read_repository';
 }
 if(!tool)return null;
 const receiptId='bb_'+await hash(JSON.stringify([env.WRITER_OWNER_HASH,record.requestId,tool,operation.repository,operation.path||null,result.commitSha||result.headSha||result.run?.headSha||result.sha||null,result.run?.id||null,operation.query||null]));
 const receipt={id:receiptId,tool,status:'complete'};
 const ctx=record.bitContext;
 if(!ctx||ctx.requestId!==record.requestId||ctx.ownerHash!==env.WRITER_OWNER_HASH)
  return {receipt,bit:{status:'context_unavailable',amount:0}};
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
