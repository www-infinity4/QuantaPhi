/*
 * Explicit, wallet-verified private history transfer from BubblesMemory to the
 * existing Robot Brain conversation archive. This is NOT a job submission.
 * Imported text is evidence, never an owner permission or trusted instruction.
 */
export async function transferOwnerHistory({
 getBatch,sendBatch,onProgress=()=>{},authorize=()=>true,
 startCursor={afterAt:0,afterId:''},maxMessages=1000
}={}){
 if(typeof getBatch!=='function'||typeof sendBatch!=='function')throw Error('history_transfer_adapter_required');
 if(!Number.isSafeInteger(startCursor?.afterAt)||startCursor.afterAt<0||
  typeof startCursor?.afterId!=='string'||startCursor.afterId.length>100)
  throw Error('history_transfer_cursor_invalid');
 const cap=Math.min(1000,Math.max(1,Number.isInteger(maxMessages)?maxMessages:1000));
 let cursor={afterAt:startCursor.afterAt,afterId:startCursor.afterId},sent=0,batches=0,done=false;
 while(sent<cap){
  if(!authorize())throw Error('owner_history_transfer_cancelled_or_disconnected');
  const messages=await getBatch({...cursor,limit:Math.min(20,cap-sent)});
  if(!Array.isArray(messages)||messages.length>20)throw Error('history_transfer_batch_invalid');
  if(!messages.length){done=true;break;}
  let previous=cursor;
  for(const m of messages){
   if(m?.role!=='user'||!(/^[A-Za-z0-9_-]{8,100}$/.test(m.id||''))||
    !Number.isSafeInteger(m.at)||m.at<=0||typeof m.text!=='string'||
    !m.text.trim()||m.text.length>6000||m.at<previous.afterAt||
    (m.at===previous.afterAt&&m.id<=previous.afterId))
    throw Error('history_transfer_row_invalid');
   previous={afterAt:m.at,afterId:m.id};
  }
  if(!authorize())throw Error('owner_history_transfer_cancelled_or_disconnected');
  // Each turn stays in the private owner's separate historical session, not
  // in the live Bubbles chat. IDs and dates are kept for idempotent replay.
  const saved=await sendBatch(messages.map(m=>({...m,sessionId:'imported_owner_history_v1'})));
  if(!Array.isArray(saved)||saved.length!==messages.length||
   messages.some(m=>!saved.includes(m.id)))throw Error('history_transfer_receipt_unverified');
  cursor=previous;sent+=messages.length;batches++;
  onProgress({messages:sent,batches,cursor,complete:false});
  if(messages.length<Math.min(20,cap-(sent-messages.length))){done=true;break;}
 }
 return {status:done?'history_import_verified':'history_import_page_verified',messages:sent,batches,
  cursor,complete:done,workDispatched:false,approvalGranted:false,repositoryChanged:false};
}
