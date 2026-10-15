/* Infinity Platinum Phone: opt-in web-address directory and WebRTC signaling.
 * No PSTN dial-out, SIM/data, emergency calling, or number ownership is implied.
 * Only verified line owners can answer. No voice/video is routed through this Worker.
 */
const ORIGIN='https://quantaphi.org';
const ALIAS=/^[a-z][a-z0-9-]{2,25}$/;
const RESERVED=new Set(['admin','support','security','emergency','police','fire','medical','operator','switchboard','911','112','000','help','system','quantaphi','platinum']);
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const fail=(error,status=400)=>json({ok:false,error},status);
const hex=buf=>Array.from(new Uint8Array(buf),x=>x.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const validSecret=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
const live=call=>call&&call.status!=='ended'&&Date.now()-call.createdAt<(call.status==='ringing'?90000:10800000);
async function body(req){const str=await req.text();if(str.length>70000)throw Error('payload_too_large');return JSON.parse(str||'{}')}
function ownerKey(req){return String(req.headers.get('x-platinum-owner')||'')}
function ticket(req){return String(req.headers.get('x-platinum-ticket')||'')}
export class PlatinumLine{
 constructor(state,env){this.state=state;this.env=env}
 async record(){return this.state.storage.get('profile')}
 async authorized(req,p){const key=ownerKey(req);return !!p&&validSecret(key)&&await sha(key)===p.ownerHash}
 async current(){const call=await this.state.storage.get('call');return live(call)?call:null}
 async fetch(req){
  const action=new URL(req.url).pathname;
  const p=await this.record();
  try{
   if(action==='/profile'){
    return json({ok:true,registered:!!p,alias:p?.alias||null,name:p?.name||null,online:!!p&&Date.now()-(p.seenAt||0)<30000});
   }
   if(action==='/auth')return json({ok:await this.authorized(req,p)});
   if(action==='/register'){
    const key=ownerKey(req);if(!validSecret(key))return fail('owner_key_required',401);
    const input=await body(req);
    const name=String(input.name||'').replace(/[\x00-\x1f<>]/g,'').trim().slice(0,48);
    if(p&&!await this.authorized(req,p))return fail('address_already_registered',409);
    const profile=p?{...p,name:name||p.name}:{alias:input.alias,name:name||input.alias,ownerHash:await sha(key),createdAt:Date.now(),seenAt:0};
    await this.state.storage.put('profile',profile);
    return json({ok:true,alias:profile.alias,name:profile.name,created:!p});
   }
   if(!p)return fail('address_unregistered',404);
   if(action==='/ping'){
    if(!await this.authorized(req,p))return fail('owner_key_invalid',401);
    p.seenAt=Date.now();await this.state.storage.put('profile',p);
    return json({ok:true});
   }
   if(action==='/inbox'){
    if(!await this.authorized(req,p))return fail('owner_key_invalid',401);
    const c=await this.current();
    return json({ok:true,call:c?{id:c.id,from:c.from,status:c.status,offer:c.offer||null,createdAt:c.createdAt}:null});
   }
   if(action==='/call'){
    const data=await body(req),from=String(data.from||'');
    if(!ALIAS.test(from))return fail('caller_identity_required',400);
    const existing=await this.current();
    if(existing)return fail('line_busy',409);
    // Per-destination abuse brake; incoming calls never create public number records.
    const now=Date.now(),attempts=(await this.state.storage.get('attempts')||[]).filter(t=>now-t<600000);
    if(attempts.length>=12)return fail('temporarily_rate_limited',429);
    attempts.push(now);await this.state.storage.put('attempts',attempts);
    const rawTicket=random();
    const call={id:random(),callerHash:await sha(rawTicket),from,createdAt:now,status:'ringing',offer:null,answer:null};
    await this.state.storage.put('call',call);
    return json({ok:true,id:call.id,ticket:rawTicket,status:'ringing',to:p.alias});
   }
   const c=await this.current();
   if(action==='/status'){
    if(!c||!validSecret(ticket(req))||await sha(ticket(req))!==c.callerHash)return fail('call_unavailable',404);
    return json({ok:true,status:c.status,answer:c.answer||null});
   }
   if(action==='/signal'){
    if(!c)return fail('call_unavailable',404);
    const data=await body(req);
    if(data.id!==c.id)return fail('call_unavailable',404);
    const isOwner=await this.authorized(req,p);
    const isCaller=validSecret(ticket(req))&&await sha(ticket(req))===c.callerHash;
    if(!isOwner&&!isCaller)return fail('not_participant',403);
    if(data.type==='hangup'){
     c.status='ended';c.offer=null;c.answer=null;
    }else if(data.type==='offer'&&isCaller&&c.status==='ringing'&&!c.offer&&typeof data.sdp==='string'&&data.sdp.startsWith('v=0')&&data.sdp.length<60000){
     c.offer=data.sdp;
    }else if(data.type==='answer'&&isOwner&&c.status==='ringing'&&c.offer&&typeof data.sdp==='string'&&data.sdp.startsWith('v=0')&&data.sdp.length<60000){
     c.answer=data.sdp;c.status='connected';
    }else return fail('invalid_call_transition',409);
    await this.state.storage.put('call',c);
    return json({ok:true,status:c.status});
   }
   return fail('unknown_action',404);
  }catch(e){return fail(e.message==='payload_too_large'?'payload_too_large':'malformed_request',400)}
 }
}
function cors(origin){return origin===ORIGIN||origin==='http://localhost:8787'||origin==='http://127.0.0.1:8787'}
export default{
 async fetch(request,env){
  const origin=request.headers.get('Origin');
  if(origin&&!cors(origin))return fail('origin_not_allowed',403);
  const allow=origin&&cors(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'content-type,x-platinum-owner,x-platinum-ticket','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}:{};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:allow});
  let response;
  const url=new URL(request.url);
  if(url.pathname==='/health')response=json({ok:true,service:'infinity-platinum-switchboard',version:1,pstn:false,emergency:false});
  else{
   const found=url.pathname.match(/^\/v1\/line\/([a-z0-9-]+)(?:\/(register|ping|inbox|call|signal|status))?\/?$/);
   if(!found||!ALIAS.test(found[1])||RESERVED.has(found[1]))response=fail('invalid_address',404);
   else{
    const [,alias,action]=found;
    const method=action==='register'||action==='ping'||action==='call'||action==='signal'?'POST':'GET';
    if(request.method!==method)response=fail('method_not_allowed',405);
    else if(action==='call'){
     try{
      const data=await body(request);
      const from=String(data.from||'');
      if(!ALIAS.test(from)||RESERVED.has(from)||!validSecret(data.ownerKey))response=fail('registered_caller_required',403);
      else{
       const auth=await env.PLATINUM_LINES.get(env.PLATINUM_LINES.idFromName(from))
        .fetch(new Request('https://internal/auth',{method:'GET',headers:{'x-platinum-owner':data.ownerKey}}));
       const proof=await auth.json();
       if(!proof.ok)response=fail('registered_caller_required',403);
       else response=await env.PLATINUM_LINES.get(env.PLATINUM_LINES.idFromName(alias))
        .fetch(new Request('https://internal/call',{method:'POST',body:JSON.stringify({from})}));
      }
     }catch{response=fail('malformed_request',400)}
    }else{
     const upstream=new URL('https://internal/'+(action||'profile'));
     const headers=new Headers(request.headers);
     headers.delete('cookie');headers.delete('authorization');
     const stub=env.PLATINUM_LINES.get(env.PLATINUM_LINES.idFromName(alias));
     const req=new Request(upstream,{method:request.method,headers,body:request.method==='POST'?request.body:undefined});
     if(action==='register'){
      // Identity labels are derived from the URL, never trusted from a request body.
      try{const data=await body(req);response=await stub.fetch(new Request(upstream,{method:'POST',headers,body:JSON.stringify({...data,alias})}));}
      catch{response=fail('malformed_request',400)}
     }else response=await stub.fetch(req);
    }
   }
  }
  const h=new Headers(response.headers);for(const [k,v] of Object.entries(allow))h.set(k,v);
  return new Response(response.body,{status:response.status,headers:h});
 }
};
