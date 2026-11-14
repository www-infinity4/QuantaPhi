/**
 * Bubbles Bits: source-receipt projection only. NO currency minting, spending,
 * wallet transfers, account identifiers or balance mutation in this module.
 * An authenticated server-side ledger must independently settle each credit.
 */
const STEP_TOOLS=Object.freeze({
 personal_context:['brain.owner_context','bubbles.memory'],
 github_read:['github.read_file','github.search','github.read_repository'],
 brain_ticket:['brain.ticket','brain.runner_receipt'],
 code_edit:['github.commit','github.update_file'],
 test_verified:['github.workflow_checks','github.test_result'],
 pr_merge:['github.merge_pull_request','github.pr_merge_receipt'],
 tool_result:['web.search','web.read_page','bubbles.image_read','github.read_file','github.search']
});
const STEPS=new Set(Object.keys(STEP_TOOLS));
const hashOK=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const idOK=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{2,100}$/.test(v);
const shaOK=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
export function validateBitReceipt(event,ownerHash,sessionId){
 if(!hashOK(ownerHash)||!idOK(sessionId)||!event||typeof event!=='object'||Array.isArray(event))return false;
 if(event.ownerHash!==ownerHash||event.sessionId!==sessionId||!idOK(event.id))return false;
 if(!STEPS.has(event.step)||event.status!=='verified')return false;
 const evidence=event.evidence;
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence)||!idOK(evidence.receiptId))return false;
 if(!STEP_TOOLS[event.step].includes(evidence.tool))return false;
 if(evidence.sourceSha!==undefined&&!shaOK(evidence.sourceSha))return false;
 if(['code_edit','test_verified','pr_merge'].includes(event.step)&&!shaOK(evidence.sourceSha))return false;
 return true;
}
export function summarizeBubblesBits(events,{ownerHash,sessionId}={}){
 if(!Array.isArray(events))throw new TypeError('events must be an array');
 // A truncated projection would conceal duplicates and settlement gaps.
 if(events.length>500)throw new RangeError('too_many_bit_receipts');
 const seenEvents=new Set(),seenReceipts=new Set();
 let eligibleCount=0,duplicates=0,rejected=0,firstVerified=null;
 for(const event of events){
  if(!validateBitReceipt(event,ownerHash,sessionId)){rejected++;continue}
  if(firstVerified===null)firstVerified=event.step;
  const receiptId=event.evidence.receiptId;
  if(seenEvents.has(event.id)||seenReceipts.has(receiptId)){duplicates++;continue}
  seenEvents.add(event.id);seenReceipts.add(receiptId);eligibleCount++;
 }
 if(firstVerified!==null&&firstVerified!=='personal_context')
  return {eligibleCount:0,provisionalBits:0,spendableBits:0,walletWrites:0,duplicates,rejected,blockedReason:'personal_context_first_required'};
 return {eligibleCount,provisionalBits:eligibleCount,spendableBits:0,walletWrites:0,duplicates,rejected,blockedReason:null};
}
