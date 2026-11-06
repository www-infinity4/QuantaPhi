/* Read-only natural-language status inquiries for the CURRENT conversation.
 * Never dispatch another GitHub mutation from a follow-up question.
 */
export function isGithubReceiptFollowup(value){
 const text=String(value||'').trim().replace(/\s+/g,' ');
 if(text.length<8||text.length>180)return false;
 if(/\b(?:also|then|and\s+(?:create|delete|edit|update|push|commit)|without|instead)\b/i.test(text))return false;
 return /^(?:(?:hey|please|bubbles)[,\s]+)?(?:did\s+(?:github|the\s+github\s+(?:job|request)|it)\s+(?:respond|reply|finish|complete|create\s+(?:the|my|a)?\s*(?:repo|repository))\b(?:\s+(?:to|with|on|for|yet)\b[\w\s.-]*)?|has\s+(?:github|it)\s+(?:responded|replied|finished|completed)\b|does\s+that\s+mean\s+(?:yes\s+)?(?:it\s+)?created\s+(?:a|the|my)\s+(?:repo|repository)|was\s+(?:(?:the|my)\s+)?[\w.-]{1,80}\s+created|(?:github|git\s*hub)\s+(?:status|response|result))\s*[?!.]*$/i.test(text);
}
const safeRepository=value=>/^www-infinity4\/[a-zA-Z0-9_.-]{1,80}$/.test(String(value||''))?value:'';
export function githubReceiptFollowupReply(result){
 if(!result||typeof result!=='object'||result.error==='receipt_not_found')
  return 'GitHub has no saved completion receipt for this request yet. No repository creation is confirmed.';
 if(result.ok!==true)return 'The GitHub execution receipt reports a blocked or unsuccessful request ('+String(result.error||result.status||'unavailable').slice(0,90)+'). No repository creation is confirmed.';
 if(result.status==='working'||result.status==='in_progress')
  return 'GitHub is still processing the saved request. The final result and repository creation are not yet verified.';
 if(result.status==='unconfirmed'||result.status==='dispatch_accepted')
  return 'The request was submitted, but GitHub completion is not yet verified. No repository creation is confirmed.';
 if(result.status==='repository_created'){
  const repository=safeRepository(result.repository);
  const url=repository&&result.url==='https://github.com/'+repository?result.url:'';
  return repository&&url?'GitHub confirmed that it created '+repository+'. '+url:'GitHub reported repository creation, but its repository identity and URL are not verified in this response.';
 }
 if(result.status==='repository_already_exists'){
  const repo=safeRepository(result.repository);
  return repo?'GitHub reports that '+repo+' already exists. No new repository was created by this request.':'GitHub reported an existing repository, but did not provide a verifiable repository identity.';
 }
 if(result.status==='blocked'||result.status==='failed')
  return 'GitHub did not complete the request ('+String(result.error||result.status).slice(0,90)+'). No repository creation is confirmed.';
 return 'GitHub returned status '+String(result.status||'unknown').slice(0,65)+'. Check the recorded receipt for actual steps; repository creation is not confirmed by this status.';
}
