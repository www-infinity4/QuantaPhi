// Natural Bubbles speech with deterministic statuses from authenticated tool receipts.
// Keep the original GitHub and Robot Brain receipts in the existing audit services.
export function githubReply(result={}){
 const state=String(result.status||'');
 const error=String(result.error||'');
 if(error==='github_runtime_credential_missing')return 'I cannot make that repository change until the GitHub connection is authorized. Nothing was changed.';
 if(error||!result.ok||state==='unconfirmed')return 'I could not verify that GitHub completed that request. I have not marked the work finished.';
 if(state==='repository_created')return 'Your repository was created. I can open it and help with the first changes.';
 if(state==='dispatch_accepted'||state==='queued')return 'GitHub accepted the work request. It has not finished yet.';
 if(state==='completed'||state==='success'||state==='deployed_verified')return 'The work finished and the available completion checks passed.';
 if(state==='working'||state==='in_progress')return 'The work has started. I will only call it finished when the completion checks confirm it.';
 if(state==='credential_verified_read')return 'Your GitHub connection is responding. I can check and work with your authorized repositories.';
 if(state==='repository_suggestions'||state==='repository_listed')return 'I found your project options. Tell me which one you want to work on.';
 const summary=String(result.summary||'').trim();
 if(/\b(?:complete|deployed|merged)\b/i.test(summary)&&!result.receipts?.some(r=>/deployed_verified|completed_successfully/.test(r.status||'')))
  return 'GitHub returned an update, but deployment or completed work still needs verification.';
 return summary&&!/\b(?:request[_ -]?id|ticket[_ -]?id|sha|token|workflow[_ -]?id|http_\d+|stack trace)\b/i.test(summary)
  ?summary.slice(0,230):'GitHub responded. The detailed result is available in Work details; completion has not been assumed.';
}
export function workReply(ticket={}){
 if(ticket.deduplicated)return 'That request is already saved. I am keeping the existing work rather than creating duplicates.';
 if(['complete','deployed_verified'].includes(ticket.status)&&ticket.runner==='completed_verified')return 'That repair is finished and verified. What should we work on next?';
 if(ticket.runner==='queued_for_runner'||ticket.status==='ready')return 'I saved your request. It is waiting for an available runner, so it has not started yet.';
 if(ticket.runner==='runner_dispatch_unverified'||ticket.runner==='awaiting_repository_runner')return 'Your request is saved, but I cannot confirm that the runner has started.';
 if(ticket.runner==='working_verified')return 'The work has started. I will check for a verified finish.';
 return 'Your work request was saved. I have not yet confirmed that it started.';
}
export function progressReply(text){
 const value=String(text||'');
 if(/\b(?:finished|complete|deployed_verified)\b/i.test(value)&&/\b(?:verified|tests.*pass|deployed|browser.*pass)\b/i.test(value))return 'The repair finished and its completion checks passed.';
 if(/\b(?:started|running)\b/i.test(value)&&/\b(?:receipt|runner|claimed|confirmed)\b/i.test(value))return 'The work has started. I am checking for the finished result.';
 if(/\b(?:queued|saved|waiting)\b/i.test(value))return 'The request is saved and waiting to start.';
 if(/\b(?:blocked|failed|unreachable)\b/i.test(value))return 'The work needs attention. I can check the details and identify what failed.';
 return 'There is a new work update. Its verified details are in Work details.';
}
export function workSummary(tickets=[]){
 const items=Array.isArray(tickets)?tickets:[];
 if(!items.length)return 'There are no saved work requests to report.';
 const working=items.filter(t=>t.status==='working').length;
 const blocked=items.filter(t=>t.status==='blocked').length;
 const completed=items.filter(t=>['complete','deployed_verified'].includes(t.status)).length;
 const pending=items.filter(t=>['ready','queued'].includes(t.status)).length;
 const parts=[];
 if(working)parts.push(working+' marked in progress (not automatically proof a runner is active)');
 if(pending)parts.push(pending+' waiting');
 if(blocked)parts.push(blocked+' needing attention');
 if(completed)parts.push(completed+' marked completed in the records');
 return 'Here is the work overview: '+(parts.join(', ')||'no active changes reported')+'. I can inspect an individual job’s verified results when you ask.';
}
