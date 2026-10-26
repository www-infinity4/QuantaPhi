/* Public X browser reader. Separate Cloudflare browser/D1, no X API credentials. */
const PROFILE='https://x.com/YahooPingcwlz';
const OWNER='YahooPingcwlz';
const origin='https://quantaphi.org';
const now=()=>new Date().toISOString();
const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':origin}});
const decode=s=>String(s).replace(/&(?:amp|lt|gt|quot|apos|#39|nbsp);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'",'&nbsp;':' '}[x])).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,Number(n)||32)));
const strip=s=>decode(String(s).replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
export function parsePublicProfile(html){
 const h=String(html||''),out=[],seen=new Set(),re=/<div role="link" data-href="\/YahooPingcwlz\/status\/(\d{15,22})"/gi;
 for(const m of h.matchAll(re)){
  const id=m[1];if(seen.has(id))continue;
  const cut=h.indexOf('</article>',m.index);
  if(cut<0||cut-m.index>25000)continue;
  const article=h.slice(m.index,cut+10);
  if(!article.includes('href="/YahooPingcwlz"'))continue; // authored account, not a quoted article
  const match=article.match(/<div class="[^"]*\bwhitespace-pre-wrap\b[^"]*" dir="auto">([\s\S]*?)<\/div>/i);
  if(!match)continue;
  const text=strip(match[1]).slice(0,2000);if(!text)continue;
  out.push({id,text,url:PROFILE+'/status/'+id,pinned:/>Pinned</.test(article)});
  seen.add(id);
 }
 return out.slice(0,50);
}
export function classifyPost(text){
 const s=String(text||'');
 if(/#bubbles\b/i.test(s))return 'tagged';
 const subject=/\b(bubbles?|robot brain|quanta(?:phi)?|quant data|quick[- ]?cards?|infinity viewer|apk|website|webpage|cardone|starcoin|shop ?lc|vamworld|pcgs|ngc|gallery|mall|google card|tv card)\b/i.test(s);
 const action=/\b(build|create|make|add|put|show|place|fix|repair|restore|update|connect|deploy|publish|sync|replace|improve|change|install|redesign|give|need|want|must|ought|should|have to|we need|we have)\b/i.test(s);
 return subject&&action?'possible':subject?'context':'other';
}
async function recordScan(env,{status,visible=0,added=0,candidates=0,error=''}){
 const lastSuccess=status==='public_posts_observed'?now():null;
 await env.DB.prepare("INSERT INTO owner_x_scans (k,last_checked,last_success,status,visible_count,new_count,candidate_count,error) VALUES ('main',?,?,?,?,?,?,?) ON CONFLICT(k) DO UPDATE SET last_checked=excluded.last_checked,last_success=COALESCE(excluded.last_success,owner_x_scans.last_success),status=excluded.status,visible_count=excluded.visible_count,new_count=excluded.new_count,candidate_count=excluded.candidate_count,error=excluded.error").bind(now(),lastSuccess,status,visible,added,candidates,error.slice(0,180)).run();
}
async function renderedProfileHTML(response){
 const reader=response.body?.getReader();
 if(!reader)throw Error('browser_content_invalid');
 const chunks=[];let size=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;
   if(size>2*1024*1024)throw Error('browser_content_too_large');
   chunks.push(value);
  }
 }finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 const raw=new TextDecoder().decode(bytes);
 // Browser Run /content returns a JSON envelope, including from quickAction.
 // Parse only its successful rendered HTML; escaped JSON is not page markup.
 if(raw.trimStart().startsWith('{')){
  let content;try{content=JSON.parse(raw);}catch{throw Error('browser_content_invalid');}
  if(content.success!==true||typeof content.result!=='string')throw Error('browser_content_unavailable');
  return content.result;
 }
 // Retain compatibility with direct HTML responses from existing adapters.
 if(!raw.trimStart().startsWith('<'))throw Error('browser_content_invalid');
 return raw;
}
export async function scanPublicX(env){
 if(!env.BROWSER||!env.DB)throw Error('browser_or_db_binding_unavailable');
 // A profile may render its initial skeleton before public articles arrive.
 // Retry one empty render with a longer DOM wait, but never report zero posts
 // as a successful read; X sometimes returns a login wall or rate limit.
 let observed=[];
 try{
  for(const waitForTimeout of [4800,8000]){
   const response=await env.BROWSER.quickAction('content',{url:PROFILE,waitForTimeout,
    gotoOptions:{waitUntil:'domcontentloaded',timeout:25000}});
   if(!response.ok)throw Error('browser_http_'+response.status);
   observed=parsePublicProfile(await renderedProfileHTML(response));
   if(observed.length)break;
  }
  if(!observed.length)throw Error('no_visible_public_owner_posts_after_retry');
 }catch(e){await recordScan(env,{status:'blocked',error:String(e.message||e)});throw e}
 const stamp=now();
 let newCount=0,candidates=0;
 for(const p of observed){
  const kind=classifyPost(p.text);
  const result=await env.DB.prepare("INSERT OR IGNORE INTO owner_x_posts(id,url,body,kind,observed_at,pinned) VALUES (?,?,?,?,?,?)").bind(p.id,p.url,p.text,kind,stamp,p.pinned?1:0).run();
  const added=Number(result.meta?.changes||0);
  newCount+=added;
  if(added&&(kind==='tagged'||kind==='possible'))candidates++;
 }
 await recordScan(env,{status:'public_posts_observed',visible:observed.length,added:newCount,candidates});
 return {ok:true,status:'public_posts_observed',visibleCount:observed.length,newPosts:newCount,newPossibleRequests:candidates,lastSuccess:stamp,publicRead:true,completeHistory:false};
}
export default {
 async scheduled(event,env,ctx){ctx.waitUntil(scanPublicX(env))},
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.method!=='GET')return json({ok:false,error:'read_only'},405);
  if(url.pathname.endsWith('/health')){
   const row=await env.DB.prepare("SELECT last_checked,last_success,status,visible_count,new_count,candidate_count,error FROM owner_x_scans WHERE k='main'").first();
   return json({ok:true,reader:'Cloudflare Browser Run public profile',profile:PROFILE,cron:'17 * * * * UTC',apiTokenRequired:false,readStatus:row||{status:'not_run'},executionEnabled:false});
  }
  if(url.pathname.endsWith('/inbox')){
   const rows=await env.DB.prepare("SELECT id,url,body,kind,observed_at FROM owner_x_posts WHERE kind IN ('tagged','possible') ORDER BY CAST(id AS INTEGER) DESC LIMIT 30").all();
   return json({ok:true,author:OWNER,items:rows.results||[],state:'candidate_review_only',note:'These posts are not verified owner work tickets.'});
  }
  return json({ok:false,error:'not_found'},404);
 }
};

