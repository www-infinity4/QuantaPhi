/* Owner-confirmed, read-only preflight before creating one inert draft ticket.
 * No model text may become execution authority. The owner archive, not the
 * browser, supplies the canonical title, scope and historical source.
 */
import {auditWorkHistory} from './conversation-work-audit.mjs';
const ID=/^[A-Za-z0-9_-]{8,100}$/;
const REPO=/^www-infinity4\/[A-Za-z0-9_.-]+$/;
const TOPIC=/^[a-z][a-z-]{2,48}$/;
const deny=error=>({ok:false,error});

export async function validateOwnerAuditDraft(db,owner,body={}){
 if(!/^[a-f0-9]{64}$/.test(owner||''))return deny('verified_owner_partition_required');
 if(body?.from_work_audit!==true||body?.start_immediately===true||
  (body?.context!==undefined&&body.context!==null)||body?.request!==undefined||
  body?.title!==undefined||body?.approval!==undefined||body?.plan!==undefined)
  return deny('audit_draft_must_not_authorize_execution');
 const id=body.auditCandidateId,repository=body.repository,source=body.sourceMessageIds;
 if(!TOPIC.test(id||'')||!REPO.test(repository||'')||
  !Array.isArray(source)||source.length<1||source.length>8||
  source.some(x=>!ID.test(x))||new Set(source).size!==source.length)
  return deny('audit_draft_source_invalid');
 const sql='SELECT id,role,text,at FROM bubbles_messages WHERE owner=? AND role=\'user\' AND id IN ('+
  source.map(()=>'?').join(',')+') LIMIT 9';
 let rows;
 try{const result=await db.prepare(sql).bind(owner,...source).all();rows=result?.results}
 catch{return deny('audit_draft_archive_unavailable')}
 if(!Array.isArray(rows)||rows.length!==source.length)return deny('audit_draft_owner_source_missing');
 let canonical=null;
 for(const row of rows){
  if(!source.includes(row?.id)||row.role!=='user'||typeof row.text!=='string')return deny('audit_draft_owner_source_invalid');
  const match=auditWorkHistory([row]).find(c=>c.id===id&&c.repositorySuggestion===repository);
  if(!match)return deny('audit_draft_topic_repository_mismatch');
  canonical=match;
 }
 if(!canonical)return deny('audit_draft_topic_not_found');
 // The original text is never passed to the runner or ticket: it is
 // historical evidence, not an executable instruction.
 const request='Review unfinished '+canonical.title+' against current repository source, CI, and live behavior. Prepare a new plan only with explicit owner approval.';
 return {ok:true,title:canonical.title,request,repository,
  context:{kind:'robot-directions',repositories:[repository],
   auditCandidateId:id,sourceMessageIds:[...source].sort(),
   submission_id:'audit-review-v1-'+id,auditReviewRequired:true,
   historicalInstructionsUntrusted:true},
  start_immediately:false};
}
