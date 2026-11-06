// Gemini Quick Card: Google verifies the visitor; the site's existing server-side
// Gemini key authorizes model calls. A Google login is NOT a Gemini subscription.
export const GEMINI_CARD_PATH='/v1/ai/card/gemini';
const LIMIT_PER_GOOGLE_ACCOUNT_PER_UTC_DAY=16;
const response=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const safe=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const validAccount=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{43}$/.test(id);
const validOrigin=o=>['https://quantaphi.org','https://www.quantaphi.org'].includes(o);
async function lookupConnections(request,env){
 if(!env.CONNECTIONS_SERVICE?.fetch)throw Error('google_connection_service_unavailable');
 const check=await env.CONNECTIONS_SERVICE.fetch('https://quantaphi.org/api/bubbles/connections/accounts',{
  method:'GET',headers:{Authorization:request.headers.get('Authorization'),Origin:'https://quantaphi.org'},
  signal:AbortSignal.timeout(10000)
 });
 if(check.status===401||check.status===403)throw Error('google_connection_required');
 if(!check.ok)throw Error('google_connection_service_unavailable');
 const data=await check.json();
 if(!data.ok||!Array.isArray(data.accounts))throw Error('google_connection_service_unavailable');
 return data.accounts;
}
async function reserveQuota(env,id){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('gemini-card:'+id));
 const opaque=Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
 const day=new Date().toISOString().slice(0,10);
 // Atomic D1 increment prevents multiple parallel requests bypassing the daily cap.
 return env.METER_DB.prepare(
  'INSERT INTO ai_usage_daily(user_id,day,prompt_tokens,completion_tokens,requests,updated_at) VALUES(?1,?2,0,0,1,?3) '+
  'ON CONFLICT(user_id,day) DO UPDATE SET requests=requests+1,updated_at=excluded.updated_at '+
  'WHERE requests<'+LIMIT_PER_GOOGLE_ACCOUNT_PER_UTC_DAY+' RETURNING requests'
 ).bind('gemini-card:'+opaque,day,Date.now()).first();
}
export async function handleGeminiCard(request,env,{fetcher=fetch,lookup=lookupConnections}={}){
 if(request.method!=='POST')return response({ok:false,error:'method_not_allowed'},405);
 if(!validOrigin(request.headers.get('Origin')))return response({ok:false,error:'origin_not_allowed'},403);
 if(!/^Bearer (?:sq_[A-Za-z0-9_-]{32,}|bc_[A-Za-z0-9_-]{16,})$/.test(request.headers.get('Authorization')||''))
  return response({ok:false,error:'verified_wallet_required'},401);
 if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))
  return response({ok:false,error:'json_required'},415);
 if(Number(request.headers.get('Content-Length')||0)>8000)return response({ok:false,error:'request_too_large'},413);
 let body;try{const raw=await request.text();if(raw.length>8000)throw Error();body=JSON.parse(raw)}catch{return response({ok:false,error:'invalid_request'},400)}
 const id=body?.accountId,question=safe(body?.question,1800);
 if(!validAccount(id)||question.length<3||typeof body.question!=='string'||body.question.length>1800)
  return response({ok:false,error:'invalid_gemini_request'},400);
 // Short bounded context is scoped to this one browser card and this one request.
 const history=body.history===undefined?[]:body.history;
 if(!Array.isArray(history)||history.length>8||history.some(h=>
   !h||!['user','model'].includes(h.role)||typeof h.text!=='string'||h.text.length>1800||
   !h.text.trim()))return response({ok:false,error:'invalid_gemini_history'},400);
 if(!env.GEMINI_API_KEY)return response({ok:false,error:'gemini_not_configured'},503);
 if(!env.METER_DB?.prepare)return response({ok:false,error:'gemini_meter_unavailable'},503);
 let accounts;try{accounts=await lookup(request,env)}catch(e){
  const reason=e?.message==='google_connection_required'?'google_connection_required':'google_connection_service_unavailable';
  return response({ok:false,error:reason},reason==='google_connection_required'?403:503);
 }
 const connected=accounts.find(a=>a.id===id&&a.provider==='google'&&a.status==='connected'&&
    Number.isFinite(a.expiresAt)&&a.expiresAt>Date.now()+30000);
 if(!connected)return response({ok:false,error:'google_connection_required'},403);
 let reservation;try{reservation=await reserveQuota(env,id)}catch{return response({ok:false,error:'gemini_meter_unavailable'},503)}
 if(!reservation)return response({ok:false,error:'gemini_daily_limit',limit:LIMIT_PER_GOOGLE_ACCOUNT_PER_UTC_DAY},429);
 try{
  const contents=[...history.map(h=>({role:h.role,parts:[{text:h.text}]})),{role:'user',parts:[{text:question}]}];
  const result=await fetcher('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{
   method:'POST',redirect:'manual',signal:AbortSignal.timeout(30000),
   headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
   body:JSON.stringify({contents,generationConfig:{maxOutputTokens:900}})
  });
  if(!result.ok)return response({ok:false,error:result.status===429?'gemini_rate_limited':'gemini_provider_unavailable'},result.status===429?429:502);
  const data=await result.json();
  const answer=safe((data?.candidates?.[0]?.content?.parts||[]).map(p=>p?.text||'').join('\n'),6000);
  if(!answer)return response({ok:false,error:'gemini_empty_response'},502);
  return response({ok:true,provider:'Gemini',model:'gemini-2.5-flash',accountId:id,answer,
   remaining:Math.max(0,LIMIT_PER_GOOGLE_ACCOUNT_PER_UTC_DAY-Number(reservation.requests||1)),cached:false});
 }catch{return response({ok:false,error:'gemini_provider_unavailable'},502)}
}
