// Treat a gateway error as a failed operation, never an empty queue or a
// successful receipt. Do not log upstream HTML, raw JSON or redirect URLs.
const safeErrors=new Set(['runner_operation_unavailable','provider_quota_exhausted','runner_identity_required','runner_identity_rejected','runner_signature_rejected','runner_keys_unavailable','runner_key_unknown','runner_lease_expired','runner_lease_required','runner_lease_mismatch']);
const record=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
function validClaimLease(lease){
 return record(lease)&&record(lease.job)&&
  [lease.key,lease.leaseId,lease.ticketId,lease.jobId,lease.job.instructions].every(nonempty)&&
  typeof lease.repository==='string'&&/^[^/\s]+\/[^/\s]+$/.test(lease.repository)&&
  lease.job.repository===lease.repository&&lease.job.id===lease.jobId&&
  lease.status==='claimed'&&Number.isSafeInteger(lease.leaseUntil)&&lease.leaseUntil>0;
}
export async function readBrainRunnerResponse(response,operation){
 const op=typeof operation==='string'&&/^[a-z][a-z0-9_-]{0,39}$/.test(operation)?operation:'unknown';
 const status=response.status;
 const fail=kind=>Error('runner_'+op+'_'+kind+'http_'+status);
 if(response.redirected||status>=300&&status<400)throw fail('redirect_');
 if(!/^application\/(?:json|[a-z0-9.+-]+\+json)(?:\s*;|$)/i.test(response.headers.get('content-type')||''))throw fail('non_json_');
 let data;
 try{data=await response.json();}catch{throw fail('invalid_json_');}
 if(!response.ok||data?.ok===false){
  if(typeof data?.error==='string'&&safeErrors.has(data.error))throw Error(data.error);
  throw fail('');
 }
 if(!data||typeof data!=='object'||Array.isArray(data)||data.ok!==true||
  op==='claim'&&(!Object.hasOwn(data,'lease')||data.lease!==null&&!validClaimLease(data.lease)))
  throw fail('invalid_receipt_');
 return data;
}
