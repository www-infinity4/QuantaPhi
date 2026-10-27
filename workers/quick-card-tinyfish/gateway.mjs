/* TinyFish public website research adapter for continuity-session-coordinator.
 * Mount behind POST /v1/quick-cards/tinyfish and forward from first-party site.
 * Uses existing coordinator TINYFISH_API_KEY and TINYFISH_BRIDGE_TOKEN secrets.
 * Does not permit account access, ChatGPT conversation automation or writing.
 */
export const WEBSITE_CARDS=Object.freeze({
 starmaker:'https://www.starmakerstudios.com/en/songs',
 youtube:'https://www.youtube.com/',
 reddit:'https://www.reddit.com/r/popular/',
 x:'https://x.com/explore',
 tiktok:'https://www.tiktok.com/explore',
 cnn:'https://www.cnn.com/',
 'fox-news':'https://www.foxnews.com/',
 'yahoo-news':'https://news.yahoo.com/',
 'tv-guide':'https://www.tvguide.com/',
 'fox-one':'https://www.fox.com/',
 'fox-one-live-news':'https://www.fox.com/stream/fox-news',
 facebook:'https://www.facebook.com/',
 instagram:'https://www.instagram.com/'
});
const HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
const APPROVED=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
const json=(body,status=200,origin='')=>Response.json(body,{status,headers:{...HEADERS,...(APPROVED.has(origin)?{'Access-Control-Allow-Origin':origin}: {})}});
export function extractAgentResult(raw){
 const chunks=String(raw||'').split(/\r?\n/);
 let complete=null;
 for(const chunk of chunks){
  if(!chunk.startsWith('data:'))continue;
  let event;try{event=JSON.parse(chunk.slice(5).trim())}catch{continue}
  if(event.type==='COMPLETE')complete=event;
 }
 if(!complete||complete.status!=='COMPLETED')return null;
 const payload=complete.resultJson??complete.result;
 if(payload==null)return null;
 const parsed=typeof payload==='string'?payload:JSON.stringify(payload);
 return parsed.trim().slice(0,5000)||null;
}
export function validateCardBrowse(body){
 if(!body||typeof body!=='object'||Array.isArray(body))return null;
 const cardId=String(body.cardId||'');
 if(!Object.hasOwn(WEBSITE_CARDS,cardId))return null;
 const query=typeof body.query==='string'?body.query.trim():'';
 if(query.length<3||query.length>240||/[\x00-\x08\x0e-\x1f]/.test(query))return null;
 return {cardId,query,sourceUrl:WEBSITE_CARDS[cardId]};
}
async function acquireQuota(env,request){
 if(!env.WORK_DB||!env.TINYFISH_BRIDGE_TOKEN)return false;
 const ip=request.headers.get('CF-Connecting-IP')||'unknown';
 const raw=new TextEncoder().encode(env.TINYFISH_BRIDGE_TOKEN+'|'+ip);
 const id=[...new Uint8Array(await crypto.subtle.digest('SHA-256',raw))].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,30);
 const hour=Math.floor(Date.now()/3600000),day=Math.floor(Date.now()/86400000);
 await env.WORK_DB.prepare('CREATE TABLE IF NOT EXISTS tinyfish_card_quota (bucket TEXT PRIMARY KEY,hits INTEGER NOT NULL)').run();
 const bump=async (key,cap)=>{
  const row=await env.WORK_DB.prepare('INSERT INTO tinyfish_card_quota (bucket,hits) VALUES (?,1) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 WHERE hits<? RETURNING hits').bind(key,cap).first();
  return Boolean(row?.hits);
 };
 if(!await bump('ip:'+hour+':'+id,4))return false;
 return bump('global:'+day,80);
}
export async function handleTinyfishCard(request,env,fetcher=fetch){
 const origin=request.headers.get('Origin')||'';
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
  ...HEADERS,...(APPROVED.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}:{})}});
 if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405,origin);
 if(!APPROVED.has(origin))return json({ok:false,error:'origin_not_allowed'},403,origin);
 if(!String(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({ok:false,error:'content_type_required'},415,origin);
 const size=Number(request.headers.get('Content-Length')||'0');
 if(size>2048)return json({ok:false,error:'body_too_large'},413,origin);
 let body;try{body=await request.json()}catch{return json({ok:false,error:'invalid_json'},400,origin)}
 const data=validateCardBrowse(body);
 if(!data)return json({ok:false,error:'unknown_card_or_query'},400,origin);
 if(!env.TINYFISH_API_KEY)return json({ok:false,error:'gateway_unavailable'},503,origin);
 try{if(!await acquireQuota(env,request))return json({ok:false,error:'usage_limit_reached'},429,origin)}
 catch{return json({ok:false,error:'rate_limit_unavailable'},503,origin)}
 const goal='Read only PUBLIC web pages belonging to this website. Do not log in, submit user data, post, purchase, message, or bypass access controls. '+ 
  'Answer the visitor question: '+JSON.stringify(data.query)+'. Return an accurate concise JSON object with an answer and up to three original public source links; if none available, clearly say so.';
 try{
  const upstream=await fetcher('https://agent.tinyfish.ai/v1/automation/run-sse',{
   method:'POST',headers:{'X-API-Key':env.TINYFISH_API_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({url:data.sourceUrl,goal,browser_profile:'lite'}),signal:AbortSignal.timeout(90000)});
  if(!upstream.ok)return json({ok:false,error:'tinyfish_upstream_unavailable'},502,origin);
  const text=await upstream.text();
  if(text.length>700000)return json({ok:false,error:'tinyfish_response_too_large'},502,origin);
  const result=extractAgentResult(text);
  if(!result)return json({ok:false,error:'tinyfish_no_verified_result'},502,origin);
  return json({ok:true,provider:'TinyFish',cardId:data.cardId,sourceUrl:data.sourceUrl,checkedAt:new Date().toISOString(),result},200,origin);
 }catch{return json({ok:false,error:'tinyfish_request_failed'},502,origin)}
}
