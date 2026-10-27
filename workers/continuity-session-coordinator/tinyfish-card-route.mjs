/* Imported by continuity-session-coordinator's existing fetch handler.
 * Public, bounded TinyFish Search ONLY. No browser sessions, paid agent runs,
 * account cookies, prompts to ChatGPT, financial actions or form submissions.
 * Preserve coordinator's scheduled handler, existing bindings, and secrets.
 */
const ORIGIN='https://quantaphi.org';
const SEARCH='https://api.search.tinyfish.ai';
const MAX_PER_DAY=15;
const HEADERS={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Access-Control-Allow-Headers':'Content-Type','Vary':'Origin',
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function reply(data,status=200){return Response.json(data,{status,headers:HEADERS});}
const hostnameValid=h=>typeof h==='string'&&h.length>=4&&h.length<=130&&
 /^(?=.{4,130}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,30}$/i.test(h)&&
 !/(^|\.)localhost$/.test(h)&&!/(^|\.)internal$/.test(h)&&!/(^|\.)local$/.test(h);
export function normalizeTinyFishSearch(input,hostname){
 const candidates=Array.isArray(input)?input:input?.results||input?.items||input?.data?.results||input?.data?.items||[];
 if(!Array.isArray(candidates))return [];
 const results=[],seen=new Set();
 for(const item of candidates){
  let url;try{url=new URL(item?.url||item?.link||item?.source_url||'')}catch{continue}
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||(host!==hostname&&!host.endsWith('.'+hostname))||url.username||url.password||url.port||seen.has(url.href))continue;
  seen.add(url.href);
  results.push({url:url.href,title:String(item.title||item.name||host).replace(/[\x00-\x1f]/g,' ').slice(0,160),
   snippet:String(item.snippet||item.description||item.content||'').replace(/[\x00-\x1f]/g,' ').slice(0,360)});
  if(results.length===8)break;
 }
 return results;
}
async function limitedBody(response){
 if(Number(response.headers.get('content-length'))>131072)throw Error('too_large');
 const reader=response.body?.getReader();if(!reader)throw Error('empty');
 const chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>131072){await reader.cancel();throw Error('too_large')}chunks.push(value)}}
 finally{reader.releaseLock();}
 const all=new Uint8Array(size);let at=0;for(const c of chunks){all.set(c,at);at+=c.byteLength}
 return JSON.parse(new TextDecoder().decode(all));
}
async function authorizeQuota(request,env){
 // Anonymous limits are deliberately fail-closed. Never store raw IP addresses.
 if(!env.WORK_DB||!env.TINYFISH_BRIDGE_TOKEN)throw Error('not_configured');
 const ip=request.headers.get('CF-Connecting-IP');
 if(!ip||ip.length>64)throw Error('invalid_client');
 const date=new Date().toISOString().slice(0,10);
 const bytes=new TextEncoder().encode(ip+'|'+date+'|'+env.TINYFISH_BRIDGE_TOKEN);
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 await env.WORK_DB.prepare('CREATE TABLE IF NOT EXISTS tinyfish_card_quotas (day TEXT NOT NULL, client_hash TEXT NOT NULL, requests INTEGER NOT NULL, PRIMARY KEY (day,client_hash))').run();
 const result=await env.WORK_DB.prepare(
  'INSERT INTO tinyfish_card_quotas (day,client_hash,requests) VALUES(?,?,1) ON CONFLICT (day,client_hash) DO UPDATE SET requests=requests+1 WHERE requests<?'
 ).bind(date,digest,MAX_PER_DAY).run();
 if(result?.success===false)throw Error('quota_unavailable');
 if(result?.meta?.changes!==1)throw Error('rate_limited');
}
export async function handleTinyFishCardRequest(request,env,{fetcher=fetch}={}){
 const u=new URL(request.url);
 if(u.pathname!=='/v1/cards/discover')return null;
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:HEADERS});
 if(request.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
 if(request.headers.get('Origin')!==ORIGIN)return reply({ok:false,error:'origin_not_allowed'},403);
 if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return reply({ok:false,error:'content_type'},415);
 if(Number(request.headers.get('Content-Length')||0)>1500)return reply({ok:false,error:'too_large'},413);
 let input;
 try{input=await request.json()}catch{return reply({ok:false,error:'invalid_json'},400)}
 const hostname=String(input?.hostname||'').toLowerCase();
 const query=String(input?.query||'').trim();
 if(!hostnameValid(hostname)||query.length<2||query.length>180||/[\x00-\x1f]/.test(query))
  return reply({ok:false,error:'invalid_request'},400);
 if(!env.TINYFISH_API_KEY)return reply({ok:false,error:'not_configured'},503);
 try{await authorizeQuota(request,env)}
 catch(error){const limited=error.message==='rate_limited';return reply({ok:false,error:limited?'rate_limited':'quota_unavailable'},limited?429:503)}
 const params=new URLSearchParams({query:'site:'+hostname+' '+query});
 try{
  const upstream=await fetcher(SEARCH+'?'+params.toString(),{method:'GET',redirect:'manual',
   headers:{'X-API-Key':env.TINYFISH_API_KEY,'Accept':'application/json'},
   signal:AbortSignal.timeout(12000)});
  if(!upstream.ok)return reply({ok:false,error:'upstream_unavailable'},502);
  const doc=await limitedBody(upstream);
  return reply({ok:true,provider:'tinyfish-search',hostname,results:normalizeTinyFishSearch(doc,hostname)});
 }catch{return reply({ok:false,error:'upstream_unavailable'},502)}
}
