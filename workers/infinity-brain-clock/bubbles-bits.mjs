/**
 * Bubbles Bits: receipt-backed session projection only.
 * This module DOES NOT mint tokens or authorize spending. A transactional,
 * authenticated wallet ledger must separately verify and settle credits.
 */
const STEPS=new Set(['personal_context','github_read','brain_ticket','code_edit','test_verified','pr_merge','tool_result']);
const hashOK=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const idOK=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{2,100}$/.test(v);
export function validateBitReceipt(event,ownerHash,sessionId){
 if(!hashOK(ownerHash)||!idOK(sessionId)||!event||typeof event!=='object')return false;
 if(event.ownerHash!==ownerHash||event.sessionId!==sessionId||!idOK(event.id))return false;
 if(!STEPS.has(event.step)||event.status!=='verified')return false;
 const e=event.evidence;
 return !!(e&&typeof e==='object'&&idOK(e.receiptId)&&typeof e.tool==='string'&&
   /^[a-z][a-z0-9_.-]{2,80}$/.test(e.tool)&&
   (e.sourceSha===undefined||/^[a-f0-9]{40}$/.test(e.sourceSha)));
}
export function summarizeBubblesBits(events,{ownerHash,sessionId}={}){
 if(!Array.isArray(events))throw new TypeError('events must be an array');
 const seen=new Set();let eligibleCount=0,duplicates=0,rejected=0;
 let firstVerified=null;
 for(const event of events.slice(0,500)){
  if(!validateBitReceipt(event,ownerHash,sessionId)){rejected++;continue}
  if(firstVerified===null)firstVerified=event.step;
  if(seen.has(event.id)){duplicates++;continue}
  seen.add(event.id);eligibleCount++;
 }
 if(firstVerified!==null&&firstVerified!=='personal_context')
  return {eligibleCount:0,provisionalBits:0,spendableBits:0,walletWrites:0,duplicates,rejected,blockedReason:'personal_context_first_required'};
 return {eligibleCount,provisionalBits:eligibleCount,spendableBits:0,walletWrites:0,duplicates,rejected,blockedReason:null};
}
