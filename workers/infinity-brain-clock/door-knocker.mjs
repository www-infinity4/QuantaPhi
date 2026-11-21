/** Pure Door Knocker state machine. No network calls, agent injection or runtime queue. */
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{3,100}$/.test(v);
const owner=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const copy=s=>({activeRun:{...s.activeRun},messages:(s.messages||[]).map(m=>({...m}))});
export function queueKnock(state,input){
 if(!owner(input?.ownerHash)||!id(input?.runId)||!id(input?.id)||typeof input?.body!=='string'||!input.body.trim()||input.body.length>4000)throw Error('knock_invalid');
 if(state?.activeRun?.id!==input.runId)throw Error('run_mismatch');
 const s=copy(state);
 if(s.messages.some(m=>m.id===input.id&&m.ownerHash===input.ownerHash))return s;
 if(s.messages.some(m=>m.id===input.id))throw Error('message_id_collision');
 s.messages.push({id:input.id,ownerHash:input.ownerHash,runId:input.runId,body:input.body.trim(),status:'queued'});
 return s;
}
export function deliverAtCheckpoint(state,{ownerHash,runId,checkpointId,toolActive=false}={}){
 const s=copy(state);
 if(!owner(ownerHash)||!id(runId)||!id(checkpointId)||toolActive||s.activeRun.id!==runId)return s;
 const next=s.messages.find(m=>m.ownerHash===ownerHash&&m.runId===runId&&m.status==='queued');
 if(next){next.status='delivered';next.checkpointId=checkpointId}
 return s;
}
export function acknowledgeKnock(state,{ownerHash,runId,messageId,status,receiptId}={}){
 if(!owner(ownerHash)||!id(runId)||!id(messageId)||!['accepted','deferred','completed'].includes(status)||!id(receiptId))throw Error('executor_receipt_required');
 const s=copy(state),m=s.messages.find(x=>x.ownerHash===ownerHash&&x.runId===runId&&x.id===messageId);
 if(!m||!['delivered','accepted','deferred'].includes(m.status))throw Error('knock_not_delivered');
 if(status==='completed'&&m.status!=='accepted')throw Error('knock_not_accepted');
 m.status=status;m.executorReceiptId=receiptId;return s;
}
