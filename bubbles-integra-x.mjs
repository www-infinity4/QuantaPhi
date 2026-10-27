// Browser-side Bubbles commands for Integra's owner-scoped TinyFish X reader/publisher.
// This is a client to the OWNER Brain. No API keys or X cookies belong here.
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const map=Object.freeze({'#bubbles':'bubbles','bubbles':'bubbles','#integra':'integra','integra':'integra',
 '#quantaphi':'quantaphi','quantaphi':'quantaphi','@yahoopingcwlz':'yahoo','yahoopingcwlz':'yahoo',
 '@googlegware':'googlegware','googlegware':'googlegware'});
export function parseIntegraCommand(text){
 const input=String(text||'').trim();
 const command=input.replace(/^(?:hey\s+)?bubbles[,\s]+/i,'').replace(/^ask\s+/i,'').trim();
 if(!/^integra\b/i.test(command))return null;
 const rest=command.replace(/^integra[,\s:]*/i,'').trim();
 if(/^(?:connection|health|setup|connected|capabilities)\??$/i.test(rest))return {action:'health'};
 const read=/^(?:read|scan|check)\s+(#?[a-zA-Z]+|@[a-zA-Z]+)\??$/i.exec(rest);
 if(read){const source=map[read[1].toLowerCase()];return source?{action:'read',source}:{error:'Unknown Integra source. Try #bubbles, #integra, #QuantaPhi, @YahooPingcwlz or @googlegware.'};}
 const status=/^status\s+([a-f0-9-]{36})\??$/i.exec(rest);
 if(status)return uuid.test(status[1])?{action:'status',jobId:status[1]}:{error:'That Integra job ID is invalid.'};
 const post=/^(?:post|publish)\s*:\s*([\s\S]+)$/i.exec(rest);
 if(post)return post[1].trim().length<=280?{action:'draft',text:post[1].trim(),wantPublish:true}:{error:'That X post exceeds 280 characters.'};
 return {error:'Use “Integra read #bubbles”, “Integra post: text”, “Integra status JOB_ID” or “Integra connection”.'};
}
function message(data){
 const job=data.job||{};
 if(data.error)return 'Integra: '+String(data.error).replace(/_/g,' ')+'. No new action confirmed.';
 if(!data.ok)return 'Integra did not confirm the operation.';
 const state=job.state||'';
 if(job.kind==='read'&&state==='completed_read')return 'Integra read completed:\n'+(job.summary||'No extractable findings.');
 if(job.kind==='post'&&state==='verified_published')return 'Integra X post verified: '+job.url;
 if(job.kind==='post'&&state==='unverified_post')return 'Integra browser finished, but publication was NOT verified. Check X before trying again.';
 if(state==='working')return 'Integra '+(job.kind==='read'?'read':'post')+' is running. Receipt: '+job.jobId+'. Say “Integra status '+job.jobId+'” to check. A started job is not a completed read or post.';
 if(state==='dispatch_uncertain')return 'Integra dispatch is uncertain. Do not retry. Inspect the provider history. Receipt: '+job.jobId;
 if(state==='draft')return 'Integra draft saved; not posted. Receipt: '+job.jobId;
 if(data.ready!==undefined)return data.ready?'Integra backend credentials configured. A live X read/post still needs verification.':'Integra backend is not configured on Brain yet. A server-only TinyFish key and a matching signed-in browser profile are required.';
 return 'Integra: '+String(data.output||job.error||'Status unavailable').slice(0,2200);
}
export async function executeIntegraCommand(command,{url,headers,fetcher=fetch,approve=()=>false}){
 if(command.error)return command.error;
 const request=async payload=>{
  const response=await fetcher(url,{method:'POST',headers:{...headers,'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(payload)});
  const data=await response.json();
  return data;
 };
 if(command.action==='draft'&&command.wantPublish){
  const draft=await request({action:'draft',text:command.text});
  if(!draft.ok||!draft.job?.jobId)return message(draft);
  // Must be a real owner click, not a model suggestion, scraped X post or voice transcription.
  if(!approve(command.text))return message(draft);
  const confirmed=await request({action:'confirm',jobId:draft.job.jobId,approval:'publish_once'});
  return message(confirmed);
 }
 return message(await request(command));
}
