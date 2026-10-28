import {tinyfishCard} from '../../tinyfish-card-catalog.mjs';
import {authorized} from './bridge-auth.mjs';

const ORIGINS=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
const MAX_RESPONSE=262144;
const clean=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u0008\u000b-\u001f]/g,' ').trim().slice(0,n):'';
function reply(request,data,status=200){
 const origin=request.headers.get('Origin');
 return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
  'Vary':'Origin',...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),
  'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
}
export async function boundedJson(response,max=MAX_RESPONSE){
 if(Number(response.headers.get('content-length')||0)>max){await response.body?.cancel();throw Error('response_too_large')}
 const reader=response.body?.getReader();if(!reader)throw Error('response_empty');
 const chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
  if(size>max){await reader.cancel();throw Error('response_too_large')}chunks.push(value);
 }}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export function websitePlan(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['cardId','action','query'].includes(k)))throw Error('invalid_request');
 const card=tinyfishCard(body.cardId);if(!card)throw Error('card_not_registered');
 if(typeof body.action!=='string')throw Error('invalid_action');
 const mapped=card.actions?.find(a=>a.id===body.action);
 if(!['capabilities','inspect','search','message'].includes(body.action)&&!mapped)throw Error('invalid_action');
 if(body.query!==undefined&&typeof body.query!=='string')throw Error('invalid_query');
 const query=clean(body.query,500);
 if(body.action==='search'&&(query.length<2||query.length>180))throw Error('invalid_query');
 if(body.action!=='search'&&body.action!=='message'&&query)throw Error('unexpected_query');
 return {card,action:body.action,query,url:mapped?.url||card.url};
}
export function sameSourceUrl(value,start){
 try{
  const u=new URL(value),origin=new URL(start),root=origin.hostname.replace(/^www\./,'');
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.href.length>1800)return null;
  if(u.hostname!==root&&!u.hostname.endsWith('.'+root))return null;
  u.hash='';return u.href;
 }catch{return null}
}
export function sourceSearch(doc,url){
 if(!Array.isArray(doc?.results))throw Error('invalid_provider_result');
 const seen=new Set(),rows=[];
 for(const row of doc.results.slice(0,40)){
  const href=sameSourceUrl(row?.url,url);if(!href||seen.has(href))continue;
  const title=clean(row.title,180);if(!title)continue;seen.add(href);
  rows.push({title,url:href,text:clean(row.snippet||row.description,500)});if(rows.length===6)break;
 }
 return rows;
}
export function sourcePage(doc,url){
 const row=doc?.results?.find(r=>r?.url===url);
 const href=row&&sameSourceUrl(row.final_url||row.url,url);
 const text=clean(row?.text,5500);
 if(!row||!href||!text){
  const error=doc?.errors?.find(e=>e?.url===url)?.error;
  throw Error(['login_required','bot_blocked','page_not_found','timeout'].includes(error)?error:'source_not_readable');
 }
 if(/^(?:just a moment|verify you are human|checking your browser|access denied)\b/i.test(text))throw Error('bot_blocked');
 return [{title:clean(row.title,180)||new URL(href).hostname,url:href,text}];
}
export async function websiteQuota(request,env,{internal=false,now=Date.now()}={}){
 if(!env.WORK_DB||!env.TINYFISH_BRIDGE_TOKEN)throw Error('quota_unavailable');
 const ip=internal?'private-service':request.headers.get('CF-Connecting-IP');
 if(!ip||ip.length>64)throw Error('quota_unavailable');
 const day=new Date(now).toISOString().slice(0,10),minute=Math.floor(now/60000);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(day+'|'+ip+'|'+env.TINYFISH_BRIDGE_TOKEN));
 const client=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
 await env.WORK_DB.prepare('CREATE TABLE IF NOT EXISTS card_website_quota (bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires INTEGER NOT NULL)').run();
 const bump=async(bucket,cap,expires)=>{
  const r=await env.WORK_DB.prepare('INSERT INTO card_website_quota (bucket,hits,expires) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 WHERE hits<?').bind(bucket,expires,cap).run();
  if(r?.success===false)throw Error('quota_unavailable');
  if(r?.meta?.changes!==1)throw Error('usage_limit_reached');
 };
 // Shared across every isolate and both public/private paths. No anonymous
 // endpoint can dispatch paid Web Agent runs or exceed this feature's cap.
 await bump('global-day:'+day,200,now+172800000);
 await bump('global-minute:'+minute,20,now+120000);
 await bump('client:'+day+':'+client,30,now+172800000);
 // Deletes only expired counters belonging to this feature.
 await env.WORK_DB.prepare('DELETE FROM card_website_quota WHERE expires<?').bind(now).run();
}
export async function handleCardWebsite(request,env,{fetcher=fetch,now=Date.now}={}){
 const path=new URL(request.url).pathname,internal=path==='/internal/cards/website';
 if(path!=='/v1/cards/website'&&!internal)return null;
 if(internal){if(!authorized(request,env))return reply(request,{ok:false,error:'unauthorized'},401)}
 else if(!ORIGINS.has(request.headers.get('Origin')))return reply(request,{ok:false,error:'origin_not_allowed'},403);
 if(request.method==='OPTIONS'&&!internal)return new Response(null,{status:204,headers:reply(request,{}).headers});
 if(request.method!=='POST')return reply(request,{ok:false,error:'method_not_allowed'},405);
 if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return reply(request,{ok:false,error:'content_type_required'},415);
 let plan;
 try{plan=websitePlan(await boundedJson(request,2048))}catch(error){return reply(request,{ok:false,error:clean(error.message,90)},400)}
 if(plan.action==='message')return reply(request,{ok:false,error:'provider_session_required',cardId:plan.card.id,
  message:'Website messaging needs your own connected provider session. No message was sent.',sourceUrl:plan.card.url,executed:false},409);
 if(plan.action==='capabilities')return reply(request,{ok:true,cardId:plan.card.id,provider:'TinyFish',
  configured:Boolean(env.TINYFISH_API_KEY&&env.WORK_DB&&env.TINYFISH_BRIDGE_TOKEN),
  actions:['inspect','search',...(plan.card.actions||[]).map(a=>a.id)],messageSupported:false,sourceUrl:plan.card.url});
 if(!env.TINYFISH_API_KEY)return reply(request,{ok:false,error:'tinyfish_not_configured'},503);
 try{await websiteQuota(request,env,{internal,now:now()})}catch(error){return reply(request,{ok:false,error:error.message==='usage_limit_reached'?error.message:'quota_unavailable'},error.message==='usage_limit_reached'?429:503)}
 const search=plan.action==='search';
 const endpoint=search?'https://api.search.tinyfish.ai?'+new URLSearchParams({query:plan.query,include_domains:new URL(plan.url).hostname.replace(/^www\./,'')}):'https://api.fetch.tinyfish.ai';
 try{
  const upstream=await fetcher(endpoint,{method:search?'GET':'POST',redirect:'manual',
   headers:{'X-API-Key':env.TINYFISH_API_KEY,'Accept':'application/json',...(!search?{'Content-Type':'application/json'}:{})},
   ...(!search?{body:JSON.stringify({urls:[plan.url],format:'markdown',ttl:300,per_url_timeout_ms:15000})}:{}),signal:AbortSignal.timeout(22000)});
  if(!upstream.ok){await upstream.body?.cancel();return reply(request,{ok:false,error:upstream.status===401?'tinyfish_key_rejected':upstream.status===402?'tinyfish_allowance_exhausted':'tinyfish_unavailable'},502)}
  const doc=await boundedJson(upstream),items=search?sourceSearch(doc,plan.url):sourcePage(doc,plan.url);
  return reply(request,{ok:true,cardId:plan.card.id,action:plan.action,provider:search?'TinyFish Search':'TinyFish Fetch',
   sourceUrl:plan.url,observedAt:new Date(now()).toISOString(),items,
   receipt:{id:crypto.randomUUID(),state:items.length?'source_read':'no_matches',accountAccessed:false,messageSent:false}});
 }catch(error){return reply(request,{ok:false,error:['login_required','bot_blocked','page_not_found','timeout','source_not_readable'].includes(error.message)?error.message:'tinyfish_unavailable'},502)}
}
