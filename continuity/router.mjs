// Pure transition validation. Caller must authenticate and atomically persist returned work + event.
const states=new Set(['inbox','ready','running','blocked','review','complete']);
export function transition(work, command, authority, now) {
 if(!authority?.verified || authority.ownerId!==work.ownerId || authority.revoked || !Number.isFinite(authority.expiresAt) || authority.expiresAt<=now) throw Error('unauthorized');
 if(!Number.isFinite(now)||!Number.isSafeInteger(work.revision)||work.revision<0) throw Error('invalid_state');
 if(typeof command.idempotencyKey!=='string'||!command.idempotencyKey.trim()||command.idempotencyKey.length>128) throw Error('invalid_idempotency_key');
 const previous=(work.events||[]).find(e=>e.idempotencyKey===command.idempotencyKey);
 if(previous) {
  if(previous.fromRevision!==command.expectedRevision||previous.to!==command.to) throw Error('idempotency_conflict');
  return {work,event:previous,replayed:true};
 }
 if(command.expectedRevision!==work.revision) throw Error('revision_conflict');
 if(!states.has(command.to)||command.to===work.status) throw Error('invalid_transition');
 if(command.to==='complete') {
  const required=work.requiredReceiptKinds;
  if(!Array.isArray(required)||!required.length||required.some(k=>typeof k!=='string'||!k)) throw Error('acceptance_undefined');
  if(!required.every(kind=>(work.receipts||[]).some(r=>r.kind===kind&&r.provenance==='provider-confirmed'&&r.status==='success'))) throw Error('acceptance_unverified');
 }
 const event={sequence:work.revision+1,at:new Date(now).toISOString(),fromRevision:work.revision,from:work.status,to:command.to,idempotencyKey:command.idempotencyKey};
 return {work:{...work,status:command.to,revision:event.sequence,events:[...(work.events||[]),event]},event,replayed:false};
}
