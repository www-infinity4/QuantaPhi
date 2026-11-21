// Connect conversational reads to the existing Cloudflare Browser Run reader.
export function wantsPublicX(text){
 const q=String(text||'');
 return /\b(?:twitter|tweets?|x posts?|YahooPingcwlz)\b|https:\/\/(?:www\.)?x\.com\/YahooPingcwlz\b/i.test(q)
  && /\b(?:read|show|check|view|see|latest|recent|access|able|can|look|summarize)\b/i.test(q)
  && !/^(?:do not|don't|never)\b/i.test(q);
}
export async function publicXRead(env){
 if(!env.PUBLIC_X)return {ok:false,output:'The Cloudflare public X reader is not connected to this chat gateway.',receipt:{tool:'public_x.read',status:'blocked',repositoryActionsVerified:false}};
 try{
  const results=await Promise.all(['/health','/inbox'].map(async path=>{
   const r=await env.PUBLIC_X.fetch(new Request('https://public-x.internal'+path,{signal:AbortSignal.timeout(10000)}));
   if(!r.ok)throw Error('reader_unavailable');
   const raw=await r.text();if(raw.length>150000)throw Error('reader_response_too_large');
   const b=JSON.parse(raw);if(b.ok!==true)throw Error('reader_failed');return b;
  }));
  const [health,inbox]=results;
  if(health.profile!=='https://x.com/YahooPingcwlz'||inbox.author!=='YahooPingcwlz')throw Error('reader_profile_mismatch');
  const items=(Array.isArray(inbox.items)?inbox.items:[]).slice(0,30).filter(p=>
   typeof p.id==='string'&&/^\d{15,22}$/.test(p.id)&&p.url==='https://x.com/YahooPingcwlz/status/'+p.id&&typeof p.body==='string')
   .map(p=>({id:p.id,url:p.url,text:p.body.slice(0,2000),observedAt:p.observed_at}));
  const scan=health.readStatus||{},fresh=scan.status==='public_posts_observed',manual=scan.status==='manual_browser_verified';
  const status=fresh?'complete':'partial';
  const output='Your public X reader uses the Cloudflare cloud browser. '+
   (fresh?'The last scheduled scan observed public posts. ':manual?'An independent manual cloud-browser scan observed public posts; a scheduled scan is not verified by that receipt. ':scan.status==='blocked'?'The latest scan was blocked; these are previously saved posts, not a fresh timeline read. ':'A successful fresh timeline scan has not been verified. ')+
   (scan.last_success?'Last successful scan: '+scan.last_success+'. ':'')+
   'This inbox contains candidate Bubbles requests, not your complete feed. '+
   (items.length?items.map(p=>p.text+' ('+p.url+')').join('\n'):'No saved candidate posts are available.')+
   ' Reading these posts does not submit or execute a Brain job.';
  return {ok:true,output,items,readStatus:scan,sources:items.map(p=>({url:p.url,title:'Public X post by @YahooPingcwlz'})),
   receipt:{tool:'public_x.read',status,provider:'Cloudflare Browser Run public profile',cached:true,freshScanTriggered:false,completeHistory:false,scope:'candidate_inbox',lastScanProvenance:manual?'manual_browser':fresh?'scheduled_browser':'unverified_or_blocked',repositoryActionsVerified:false,executed:false}};
 }catch{return {ok:false,output:'The Cloudflare public X reader could not be reached. I have not verified a fresh Twitter read.',receipt:{tool:'public_x.read',status:'failed',repositoryActionsVerified:false}};}
}
