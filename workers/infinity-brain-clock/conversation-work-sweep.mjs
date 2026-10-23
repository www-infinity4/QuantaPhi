/* Owner-only, bounded multi-page discovery. Never dispatches jobs or reads another owner. */
import {auditOwnerConversation} from './conversation-work-audit.mjs';

const max=v=>Number.isInteger(v)&&v>0?v:null;
const newestAt=v=>Number.isSafeInteger(v)?v:0;

export function combineAuditCandidates(pages){
 if(!Array.isArray(pages))throw TypeError('audit_pages_required');
 const merged=new Map();
 for(const page of pages){
  if(!Array.isArray(page?.candidates))throw TypeError('audit_page_candidates_required');
  for(const next of page.candidates){
   if(typeof next?.id!=='string'||next.status!=='candidate_needs_repository_inspection')continue;
   let current=merged.get(next.id);
   if(!current){
    current={...next,status:'candidate_needs_repository_inspection',
      repositoryVerified:false,receipt:undefined,mentions:0,evidence:[],constraints:[]};
    delete current.receipt;
    merged.set(next.id,current);
   }
   current.mentions+=Math.max(next.mentions||0,(next.evidence||[]).length);
   // A sweep reads newest first. Preserve the newest 12 actual owner-message
   // IDs; don't concatenate full private transcripts into a runner prompt.
   for(const proof of (next.evidence||[])){
    if(current.evidence.length>=12)break;
    if(!current.evidence.some(x=>x.messageId===proof.messageId))
     current.evidence.push({...proof,excerpt:String(proof.excerpt||'').slice(0,320)});
   }
   for(const rule of next.constraints||[]){
    if(current.constraints.length>=8)break;
    const text=String(rule||'').slice(0,220);
    if(text&&!current.constraints.includes(text))current.constraints.push(text);
   }
   if(next.kind==='repair')current.kind='repair';
   if(next.kind==='integrate'&&current.kind==='verify')current.kind='integrate';
  }
 }
 return [...merged.values()].sort((a,b)=>b.mentions-a.mentions||
   newestAt(b.evidence[0]?.at)-newestAt(a.evidence[0]?.at)||a.id.localeCompare(b.id));
}

export async function sweepOwnerWorkHistory(db,owner,body={}){
 if(typeof owner!=='string'||!owner)throw Error('verified_owner_required');
 const pageSize=Math.min(250,max(body.limit)||150);
 const maxPages=Math.min(4,max(body.pages)||4);
 let cursor=body.beforeAt===undefined&&body.beforeId===undefined?null:
  {beforeAt:body.beforeAt,beforeId:body.beforeId};
 let pagesScanned=0,messagesScanned=0,more=false;
 const pages=[];
 for(let i=0;i<maxPages;i++){
  const page=await auditOwnerConversation(db,owner,{mode:'work-audit',limit:pageSize,...(cursor||{})});
  pages.push(page);
  pagesScanned++;
  messagesScanned+=page.scanned;
  cursor=page.nextCursor;
  if(!cursor){more=false;break;}
  more=true;
 }
 return {ok:true,mode:'work-audit-sweep',readOnly:true,pagesScanned,messagesScanned,
  candidates:combineAuditCandidates(pages),nextCursor:more?cursor:null,
  ownerApprovalInferred:false,executionStarted:false,runnerDispatchRequested:false,
  candidateMeaning:'unverified owner request; repository and CI/live evidence required before execution or completion'};
}
