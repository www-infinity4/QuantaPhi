const ORIGINS=new Set(['https://quantaphi.org','https://www.quantaphi.org','https://www-infinity4.github.io']);
const clean=(value,max=2500)=>typeof value==='string'?value.trim().slice(0,max):'';
function headers(request){return {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGINS.has(request.headers.get('Origin'))?request.headers.get('Origin'):'https://quantaphi.org','Vary':'Origin','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,GET,OPTIONS'};}
function response(request,body,status=200){return new Response(JSON.stringify(body),{status,headers:headers(request)});}
export function chooseTool(text){
 const request=clean(text).toLowerCase();
 if(/\b(?:create|start|make|open|build)\b.{0,70}\b(?:github\s+)?(?:repo|repository)\b/.test(request))return 'github.create_repository';
 if(/\b(?:news|headlines)\b/.test(request)&&/\b(?:check|read|tell|show|find|latest|current|today|google|get|what|headlines)\b/.test(request))return 'news.headlines';
 return 'oracle.chat';
}
function decode(text){return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,Number(n)))).trim();}
export function parseHeadlines(xml,now=Date.now()){
 const items=[],seen=new Set();
 for(const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
  const field=name=>decode(match[1].match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]||'');
  const title=field('title').slice(0,320),url=field('link'),published=Date.parse(field('pubDate'));
  let valid=false;try{const link=new URL(url);valid=link.protocol==='https:'&&link.hostname==='news.google.com';}catch{}
  if(!title||!valid||!Number.isFinite(published)||published>now+60000||now-published>7*86400000||seen.has(title.toLowerCase()))continue;
  seen.add(title.toLowerCase());items.push({title,url,publishedAt:new Date(published).toISOString(),publisher:field('source').slice(0,100)});
  if(items.length===5)break;
 }
 return items;
}
async function execute(request,env,body){
 const question=clean(body.request);if(!question)return response(request,{ok:false,error:'request_required'},400);
 const tool=chooseTool(question),id=crypto.randomUUID();
 const receipt={id,tool,status:'started',createdAt:new Date().toISOString(),kind:'bubbles-tool-result',minted:false};
 if(tool==='github.create_repository')return response(request,{ok:true,output:'I cannot create that GitHub repository yet. This bubble has no authenticated repository-creation connection. No repository was created or queued.',receipt:{...receipt,status:'blocked',reason:'github_creation_connection_required'}});
 if(tool==='news.headlines'){
  try{
   const url='https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
   const upstream=await fetch(url,{redirect:'follow',headers:{Accept:'application/rss+xml,application/xml,text/xml','User-Agent':'Bubbles-AI-News/1.0'},signal:AbortSignal.timeout(12000)});
   if(!upstream.ok)throw Error('news_feed_http_'+upstream.status);
   const xml=await upstream.text();if(xml.length>2000000)throw Error('news_feed_too_large');
   const sources=parseHeadlines(xml);if(!sources.length)throw Error('no_verified_current_headlines');
   const output='Here are '+sources.length+' current US headlines from Google News:\n'+sources.map((s,i)=>(i+1)+'. '+s.title).join('\n');
   return response(request,{ok:true,output,sources,receipt:{...receipt,status:'complete',sourceUrl:url,completedAt:new Date().toISOString()}});
  }catch(error){
   try {
    const url='https://news-phi-feed.marvaseater.workers.dev/v1/news/feed';
    const feed=env.NEWS?await env.NEWS.fetch(new Request(url,{signal:AbortSignal.timeout(8000)})):await fetch(url,{signal:AbortSignal.timeout(8000)});
    if(!feed.ok)throw Error('fallback_unavailable');
    const payload=await feed.json(),seen=new Set();
    const sources=(Array.isArray(payload.articles)?payload.articles:[]).filter(item=>{
     const date=Date.parse(item.publishedAt),title=clean(item.title,320);
     let valid=false;try{valid=new URL(item.url).protocol==='https:';}catch{}
     if(!title||!valid||!Number.isFinite(date)||date>Date.now()+60000||Date.now()-date>48*3600000||seen.has(title))return false;
     seen.add(title);return true;
    }).slice(0,5).map(item=>({title:clean(item.title,320),url:item.url,publishedAt:item.publishedAt,publisher:item.domain||''}));
    if(!sources.length)throw Error('fallback_empty');
    return response(request,{ok:true,output:'Google News is unavailable to this service right now. Here are current headlines from your News Phi source feed instead:\n'+sources.map((s,i)=>(i+1)+'. '+s.title).join('\n'),sources,receipt:{...receipt,status:'complete',sourceUrl:url,provider:'News Phi',fallbackReason:String(error?.message||'google_unavailable').slice(0,100)}});
   }catch{return response(request,{ok:true,output:'I could not retrieve current headlines. I have not substituted remembered headlines.',receipt:{...receipt,status:'failed',reason:'news_sources_unavailable'}});}
  }
 }
 if(!env.ORACLE)return response(request,{ok:false,error:'oracle_service_unavailable'},503);
 const forwarded=await env.ORACLE.fetch(new Request('https://infinity-rogers.marvaseater.workers.dev/v1/chat',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://quantaphi.org'},body:JSON.stringify({input:clean(body.input,16000)||question,context:{application:'Bubbles AI',task:'bubbles-user-voice-chat',persona:clean(body.context?.persona,40)||'assistant',requireCloudflare:true}})}));
 const result=await forwarded.json();
 return response(request,{...result,receipt:{...receipt,status:forwarded.ok&&result.ok!==false?'complete':'failed'}},forwarded.status);
}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(request.method==='GET'&&url.pathname==='/health')return response(request,{ok:true,service:'bubbles-tools',tools:{news:'connected',chat:Boolean(env.ORACLE),githubCreate:'not_connected'}});
 if(!ORIGINS.has(request.headers.get('Origin')))return response(request,{ok:false,error:'origin_not_allowed'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headers(request)});
 if(request.method!=='POST'||url.pathname!=='/v1/assist')return response(request,{ok:false,error:'not_found'},404);
 if(Number(request.headers.get('Content-Length')||0)>20000)return response(request,{ok:false,error:'body_too_large'},413);
 try{const text=await request.text();if(text.length>20000)return response(request,{ok:false,error:'body_too_large'},413);return await execute(request,env,JSON.parse(text));}catch{return response(request,{ok:false,error:'assistant_request_failed'},502);}
}};
