/* Owner-only, read-only cross-check between archived requests and existing work.
 * A shared repository or ticket status is never proof that a feature is done.
 */
import {sweepOwnerWorkHistory} from './conversation-work-sweep.mjs';
const OWNER=/^[a-f0-9]{64}$/;
const TICKET=/^IW-[0-9]{8}-[A-F0-9-]{8}$/;
const allowedStatus=new Set(['draft','ready','working','blocked','complete','committed_unverified','merged_verified','deployed_verified','cancelled','failed']);
const cleanStatus=v=>allowedStatus.has(v)?v:'unknown';
const cleanId=v=>typeof v==='string'&&TICKET.test(v)?v:null;
const MAX_ROWS=120;
const MAX_CANDIDATES=20;

// Explicit provenance is useful for duplicate avoidance, never a permission
// grant. Legacy tickets generally lack it, so only list them as same-repo work.
export function reconcileCandidateTickets(candidates,rows){
 if(!Array.isArray(candidates)||!Array.isArray(rows))throw TypeError('ticket_inventory_required');
 const tickets=rows.slice(0,MAX_ROWS).flatMap(row=>{
  if(!cleanId(row?.id)||typeof row.repository!=='string')return [];
  let context={};
  try{const parsed=JSON.parse(row.context_json||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))context=parsed}catch{}
  const tags=Array.isArray(context.sourceMessageIds)
   ?context.sourceMessageIds.filter(x=>typeof x==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(x)).slice(0,20):[];
  return [{id:row.id,repository:row.repository,status:cleanStatus(row.status),
   auditCandidateId:typeof context.auditCandidateId==='string'?context.auditCandidateId:null,
   sourceIds:tags}];
 });
 return candidates.slice(0,MAX_CANDIDATES).flatMap(candidate=>{
  if(typeof candidate?.id!=='string'||candidate.status!=='candidate_needs_repository_inspection'
    ||typeof candidate.repositorySuggestion!=='string')return [];
  const same=tickets.filter(t=>t.repository===candidate.repositorySuggestion);
  const ids=new Set((candidate.evidence||[]).map(x=>x.messageId));
  const exact=same.flatMap(t=>{
   const basis=t.auditCandidateId===candidate.id?'explicit_candidate_id':
    t.sourceIds.some(id=>ids.has(id))?'source_message_id':null;
   return basis?[{ticketId:t.id,status:t.status,linkage:basis}]:[];
  }).slice(0,8);
  const stateCounts={};
  for(const t of same)stateCounts[t.status]=(stateCounts[t.status]||0)+1;
  return [{id:candidate.id,title:String(candidate.title||candidate.id).slice(0,100),
   repositorySuggestion:candidate.repositorySuggestion,repositoryVerified:false,
   mentions:candidate.mentions||0,evidence:(candidate.evidence||[]).slice(0,12),
   kind:candidate.kind,status:'candidate_needs_repository_inspection',
   linkedTickets:exact,sameRepositoryTicketCount:same.length,
   sameRepositoryStatusCounts:stateCounts,
   linkedTicketsNeedSourceReview:true,relatedWorkVerified:false,
   executionAuthorized:false,codeDispatched:false,featureCompleted:false}];
 });
}

export async function reconcileOwnerBacklog(db,owner,body={}){
 if(!OWNER.test(owner||''))throw Error('verified_owner_hash_required');
 const audit=await sweepOwnerWorkHistory(db,owner,{
  limit:Math.max(1,Math.min(250,Number.isInteger(body.limit)?body.limit:150)),
  pages:Math.max(1,Math.min(4,Number.isInteger(body.pages)?body.pages:4)),
  ...(body.beforeAt===undefined&&body.beforeId===undefined?{}:
   {beforeAt:body.beforeAt,beforeId:body.beforeId})
 });
 // This inventory is intentionally bounded. If there are more owner tickets,
 // say so rather than claiming to have ruled out a duplicate.
 const {results=[]}=await db.prepare(
  'SELECT id,repository,status,context_json FROM work_tickets WHERE owner_hash=? ORDER BY created_at DESC,id DESC LIMIT ?'
 ).bind(owner,MAX_ROWS+1).all();
 const tickets=results.slice(0,MAX_ROWS);
 return {ok:true,mode:'work-audit-reconcile',readOnly:true,
  messagesScanned:audit.messagesScanned,pagesScanned:audit.pagesScanned,
  nextCursor:audit.nextCursor,ticketsScanned:tickets.length,
  ticketInventoryTruncated:results.length>MAX_ROWS,
  candidates:reconcileCandidateTickets(audit.candidates,tickets),
  scope:'existing_owner_tickets_only',sameRepositoryIsNotProof:true,
  linkageIsNotCompletion:true,executionStarted:false,ownerApprovalInferred:false};
}
