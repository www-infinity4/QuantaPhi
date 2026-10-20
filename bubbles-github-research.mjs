// Parse GitHub discovery commands before engineering/ticket classification.
// A public search is NOT limited to the user's repository list.
export function githubResearchIntent(raw) {
 const addressed=String(raw||'').trim().replace(/^(?:(?:hey|please|bubbles)[,\s:]+)+/i,'');
 if(!/\bgithub\b/i.test(addressed))return null;
 if(!/\b(?:search|research|find|look\s+(?:up|for|into)|discover|scan|explore|compare)\b/i.test(addressed))return null;
 if(/^(?:how|why|what\s+(?:is|are)|explain|describe)\b/i.test(addressed))return null;
 if(/\b(?:create|delete|publish|push|commit|merge|deploy)\s+(?:a|the|my)?\s*(?:repo|repository|file|branch|pr|pull request)\b/i.test(addressed))return null;
 const publicOverride=/\b(?:all|across|entire|whole|public|global|anywhere)\b.{0,35}\b(?:github|repos?|repositories|files|code)\b|\b(?:github)\b.{0,20}\b(?:public|worldwide|everywhere|entire)\b|\b(?:don't|do not|not)\s+(?:just\s+)?(?:search\s+)?(?:my|our)\s+(?:own\s+)?repos?\b/i.test(addressed);
 const owner=/\b(?:my|our|mine)\b.{0,24}\b(?:github|repos?|repositories|code|files)\b|\bgithub\b.{0,25}\b(?:my|our)\s+(?:repos?|repositories)\b/i.test(addressed);
 const scope=publicOverride?'public':owner?'owner':'public';
 let query=addressed
  .replace(/\b(?:do not|don't|not just)\s+(?:use|search|look in)?\s*(?:my|our)\s+(?:own\s+)?(?:repos?|repositories)\b/ig,' ')
  .replace(/\b(?:search|research|find|look\s+(?:up|for|into)|discover|scan|explore|compare|broad|across|all|public|global|entire|whole|on|of|from|through|files|codebase|code|repositories|repository|repos|repo|github|please|my|our|the|for|to|in|so|i|can|you|could|would|need|want|instead|not|just|and)\b/ig,' ')
  .replace(/\b(?:bubbles|upgrade|improve|improving|intelligence|intelligent|tools?|software|components?)\b/ig,' ')
  .replace(/[^\p{L}\p{N}\s._+@#/-]/gu,' ').replace(/\s+/g,' ').trim();
 if(/\b(?:speech|voice|transcription|microphone|recognition)\b/i.test(query)){
  query='android speech recognition';
 }else if(/\b(?:apk|android)\b/i.test(query)&&query.split(' ').length<3){
  query='android apk build';
 }
 if(query.length<2)query='android speech recognition';
 return {scope,query:query.slice(0,160)};
}
export function githubResearchReply(result, intent) {
 if(!result?.ok){
  return 'GitHub '+intent.scope+' code search was not confirmed: '+String(result?.error||result?.status||'connection unavailable').replace(/_/g,' ')+'. No GitHub files were read or modified.'+
   (result?.searchUrl?'\nOpen GitHub search: '+result.searchUrl:'');
 }
 const results=Array.isArray(result.results)?result.results:[];
 const scope=intent.scope==='owner'?'your connected GitHub repositories':'public GitHub';
 const headline='Searched '+scope+' for "'+result.query+'". '+String(result.coverage||'Source scope unavailable')+'. '+
  String(result.total??results.length)+' reported matches; '+results.length+' shown.';
 const entries=results.slice(0,15).map((item,i)=>
  (i+1)+'. '+String(item.repository||'GitHub')+(item.path?' / '+item.path:'')+
  (item.excerpt?' — '+String(item.excerpt).replace(/\s+/g,' ').slice(0,240):'')+
  '\n'+item.url);
 return [headline,...(entries.length?entries:['No matching files or repositories were returned.']),
  'Full GitHub search: '+result.searchUrl,
  'This was read-only. No repository job, commit or deployment was requested.'].join('\n');
}
