import {browserAction} from './browser-cdp.mjs';
// Verified-owner Cloudflare Browser Run adapter for the Bubbles workspace.
// Browser URLs contain bearer credentials; never put them in logs, saved chat,
// wallet records, repo commits or generic public pages.
const ALLOWED = new Set(['https://quantaphi.org', 'https://www.quantaphi.org', 'https://www-infinity4.github.io']);
const clamp = value => String(value || '').slice(0, 250);
const json = (origin, data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control':'no-store', 'Access-Control-Allow-Origin':origin,
  'Access-Control-Allow-Headers':'Authorization, Content-Type',
  'Access-Control-Allow-Methods':'POST, OPTIONS', 'Vary':'Origin' }
});
export function browserTarget(raw) {
  let url;
  try { url = new URL(String(raw || '')); } catch { throw Error('invalid_url'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
    url.href.length > 1800 || /(?:^|\.)(?:localhost|local|internal|test)$/.test(url.hostname) ||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) ||
    url.hostname === '[::1]') throw Error('unsafe_browser_url');
  return url.toString();
}
const validSession = value => /^[a-f0-9-]{36}$/i.test(value || '');
const validProof = value => /^[a-f0-9]{64}$/.test(value || '');
async function proof(token, id) {
  const bytes = new TextEncoder().encode('bubbles-browser-owner-v1:' + id + ':' + token);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('');
}
async function ownerAllowed(request, env) {
  const token = request.headers.get('Authorization') || '';
  if (!/^Bearer [\x21-\x7e]{16,512}$/.test(token) || !env.BRAIN?.fetch) return false;
  try {
    const r = await env.BRAIN.fetch('https://brain.internal/health', {
      headers:{Authorization:token}, signal:AbortSignal.timeout(8000)
    });
    return r.ok;
  } catch { return false; }
}
export async function browserTool(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!ALLOWED.has(origin)) return json('https://quantaphi.org',{ok:false,error:'origin_not_allowed'},403);
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:{
    'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type',
    'Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'
  }});
  if (request.method !== 'POST') return json(origin,{ok:false,error:'method_not_allowed'},405);
  if (!(await ownerAllowed(request,env))) return json(origin,{ok:false,error:'owner_authorization_required'},403);
  if (!env.BROWSER?.acquire) return json(origin,{ok:false,error:'browser_binding_not_deployed'},503);
  let body;
  try { if(Number(request.headers.get('Content-Length')||0)>4096)throw Error('body_too_large');
    const raw=await request.text();if(raw.length>4096)throw Error('body_too_large');body=JSON.parse(raw||'{}');
  } catch {return json(origin,{ok:false,error:'invalid_request'},400);}
  const token=request.headers.get('Authorization');
  try {
    if(body.action==='start'){
      const url=browserTarget(body.url||'https://quantaphi.org/bubbles.html');
      const session=await env.BROWSER.acquire({keepAlive:1200000,targets:true});
      const sessionId=typeof session==='string'?session:session?.sessionId;
      if(!validSession(sessionId))throw Error('browser_session_not_created');
      try {
        const opened=await env.BROWSER.devtools.newTarget(sessionId,url);
        const view=await env.BROWSER.getLiveView(sessionId,{mode:'full',expiresInMs:300000});
        if(!view?.devtoolsFrontendUrl)throw Error('live_view_unavailable');
        return json(origin,{ok:true,sessionId,targetId:opened?.id||null,proof:await proof(token,sessionId),url:view.devtoolsFrontendUrl,
          status:'live',expiresInSeconds:300});
      } catch(error){await env.BROWSER.closeSession(sessionId).catch(()=>{});throw error;}
    }
    if(!validSession(body.sessionId)||!validProof(body.proof)||
       body.proof!==await proof(token,body.sessionId)) return json(origin,{ok:false,error:'browser_session_not_owned'},403);
    if(body.action==='stop'){
      await env.BROWSER.closeSession(body.sessionId);
      return json(origin,{ok:true,status:'closed'});
    }
    if(['navigate','read','click','type','viewport'].includes(body.action)){
      const action=body.action;
      const value=typeof body.value==='string'?body.value:'';
      const field=typeof body.field==='string'?body.field:'';
      const label=typeof body.label==='string'?body.label:'';
      const targetId=typeof body.targetId==='string'?body.targetId:'';
      const url=action==='navigate'?browserTarget(body.url):'';
      // These are explicit deterministic actions, not unrestricted shell or JS.
      const result=await browserAction(env,{sessionId:body.sessionId,action,
       targetId,url,label,field,value,mode:body.mode});
      return json(origin,{ok:Boolean(result.ok!==false),status:result.ok===false?'blocked':'verified',
        action,result:result.ok===false?result:{...result,text:typeof result.text==='string'?result.text.slice(0,8500):undefined}});
    }
    if(body.action==='tab'){
      const target=await env.BROWSER.devtools.newTarget(body.sessionId,browserTarget(body.url));
      if(!target?.id)throw Error('browser_tab_not_opened');
      body.targetId=target.id;
    } else if(body.action!=='view')return json(origin,{ok:false,error:'unsupported_action'},400);
    const view=await env.BROWSER.getLiveView(body.sessionId,{mode:'full',expiresInMs:300000});
    if(!view?.devtoolsFrontendUrl)throw Error('live_view_unavailable');
    const tabs=await env.BROWSER.devtools.listTargets(body.sessionId);
    return json(origin,{ok:true,sessionId:body.sessionId,targetId:body.targetId||null,status:'live',url:view.devtoolsFrontendUrl,
      tabs:Array.isArray(tabs)?tabs.filter(t=>t.type==='page').map(t=>({title:clamp(t.title),url:clamp(t.url)})):[],
      expiresInSeconds:300});
  } catch(error) {
    const reason=String(error?.message||'browser_unavailable');
    return json(origin,{ok:false,error:/^(?:invalid_url|unsafe_browser_url)$/.test(reason)?reason:'browser_session_unavailable',
      detail:'The Chrome session could not be started or reached. No browser action is confirmed.'},/^(?:invalid_url|unsafe_browser_url)$/.test(reason)?400:503);
  }
}
