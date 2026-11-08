/* Read-only, owner-scoped branch + ticket status. Natural-language user
 * intent is never authority for a write or an LLM-generated tool call. */
const REPO=/^www-infinity4\/[A-Za-z0-9_.-]{1,80}$/;
const SHA=/^[a-f0-9]{40}$/;
const clean=v=>String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
export function parseBranchStatusQuery(value){
 const message=clean(value);
 if(message.length<10||message.length>300)return null;
 if(!/\b(?:check|verify|status|progress|has|have|did|was|is|finished|finish|completed|complete)\b/i.test(message)||
    !/\b(?:branch|job|runner|status|progress|finished|completed)\b/i.test(message))return null;
 if(/\b(?:and|then|also)\s+(?:delete|remove|edit|create|commit|write|push|merge|deploy|dispatch|start|run)\b/i.test(message))return null;
 const explicit=message.match(/\bwww-infinity4\/([A-Za-z0-9_.-]{1,80})\b/i);
 const foreign=message.match(/\b([A-Za-z0-9_.-]+)\/Chiller\b/i);
 if(foreign&&foreign[1].toLowerCase()!=='www-infinity4')return null;
 const repository=explicit?'www-infinity4/'+explicit[1]:/\bChiller\b/i.test(message)?'www-infinity4/Chiller':'';
 if(!REPO.test(repository))return null;
 const specified=message.match(/\b(?:branch\s+(?:named\s+)?|on\s+branch\s+)([A-Za-z0-9][A-Za-z0-9._/-]{0,99})\b/i)?.[1];
 const branch=(specified&&!/^(?:in|on|for|of|status|progress|is|was)$/i.test(specified)?specified:'')||
  message.match(/\badd-full-episodes\b/i)?.[0]||'';
 if(!branch||branch.includes('..')||branch.includes('//')||branch.endsWith('/')||
    branch.split('/').some(x=>x.startsWith('.')||x.endsWith('.'))||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/.test(branch))return null;
 return {repository,branch};
}
// A claim of "completed" from the Brain response is evidence only when its
// persisted readback, repository identity and exact returned ref agree with the
// owner's original request. It does not prove a runner ran or deployed.
export function isVerifiedBranchReadReceipt(query,result){
 const receipt=result?.readReceipt;
 if(!query||!result||result.ok!==true||
    !REPO.test(query.repository||'')||result.repository!==query.repository||
    result.branch!==query.branch||!Number.isSafeInteger(result.repositoryId)||result.repositoryId<=0||
    !receipt||receipt.persisted!==true||receipt.tool!=='github.read_branch_status'||
    receipt.status!=='complete'||!/^branch_[a-f0-9]{32}$/.test(receipt.id||'')||
    receipt.repository!==result.repository||receipt.repositoryId!==result.repositoryId||
    receipt.branch!==result.branch||receipt.exists!==result.exists||receipt.headSha!==result.headSha||
    receipt.jobExecutionVerified!==false||receipt.deploymentVerified!==false||
    result.jobExecutionVerified!==false||result.deploymentVerified!==false)return false;
 return (result.status==='branch_found'&&result.exists===true&&SHA.test(result.headSha||''))||
    (result.status==='branch_not_found'&&result.exists===false&&result.headSha===null);
}
export function describeAuthenticatedBranchStatus(query,branchResult,ticketResult,options={}){
 if(!query||!REPO.test(query.repository))return 'GitHub branch status not verified: invalid repository.';
 const same=branchResult?.ok===true&&branchResult.repository===query.repository&&
  branchResult.branch===query.branch&&Number.isSafeInteger(branchResult.repositoryId)&&branchResult.repositoryId>0;
 const found=same&&branchResult.exists===true&&branchResult.status==='branch_found'&&SHA.test(branchResult.headSha||'');
 const missing=same&&branchResult.exists===false&&branchResult.status==='branch_not_found';
 if(!found&&!missing)return 'GitHub branch status not verified: identity mismatch or authenticated read unavailable. No runner result is confirmed.';
 const summary=found?
  'GitHub checked '+query.repository+': branch exists ('+query.branch+') at commit '+branchResult.headSha.slice(0,12)+'. Verified source: https://github.com/'+query.repository+'/commit/'+branchResult.headSha+'. A branch alone does not prove a job finished or was deployed.':
  'GitHub checked '+query.repository+': branch '+query.branch+' not found. The job execution is unverified; a missing branch does not establish whether the runner was attempted.';
 if(ticketResult?.ok!==true||!Array.isArray(ticketResult.tickets))
  return summary+' Saved Brain ticket status could not be verified.';
 const match=ticketResult.tickets.find(ticket=>ticket?.repository===query.repository&&
  typeof ticket.title==='string'&&ticket.title.toLowerCase().includes(query.branch.toLowerCase()));
 if(!match){
  // A recent ticket pointer is only a hint. Reconcile its exact ID and
  // repository against THIS owner's fresh authenticated list before display.
  // Different title means no demonstrated link to this requested branch.
  const ticketId=options?.conversationTicketId;
  const sameChat=typeof ticketId==='string'&&/^IW-[0-9]{8}-[A-Z0-9]{8}$/.test(ticketId)
   ?ticketResult.tickets.find(ticket=>ticket?.id===ticketId&&ticket?.repository===query.repository)
   :null;
  const state=clean(sameChat?.status).slice(0,48);
  if(/^(?:queued|ready|working|blocked|committed_unverified|merged_verified|deployed_verified|complete|completed|superseded)$/.test(state))
   return summary+" This conversation's saved ticket reports "+state.replace(/_/g,' ')+
    '. Its link to branch '+query.branch+' is unverified; this does not confirm runner completion.';
  return summary+' No exactly matching saved Brain ticket was identified in the latest available owner work list; this is not proof that no job was queued.';
 }
 const status=clean(match.status).slice(0,48);
 if(!/^(?:queued|ready|working|blocked|committed_unverified|merged_verified|deployed_verified|complete|completed|superseded)$/.test(status))
  return summary+' Saved Brain ticket status is unverified.';
 return summary+' Matching saved Brain ticket reports '+status.replace(/_/g,' ')+'. Ticket state and verified GitHub execution, tests and deployment are separate.';
}
