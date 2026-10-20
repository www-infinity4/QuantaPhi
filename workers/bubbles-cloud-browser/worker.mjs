import {browserTool} from '../bubbles-tools/browser.mjs';
export {BrowserConsentStore} from './consent.mjs';
const origins=new Set(['https://quantaphi.org','https://www.quantaphi.org','https://www-infinity4.github.io']);
const respond=(origin,body,status=200)=>Response.json(body,{status,headers:{
 'Cache-Control':'no-store','Vary':'Origin',
 'Access-Control-Allow-Origin':origin,
 'Access-Control-Allow-Headers':'Authorization, Content-Type',
 'Access-Control-Allow-Methods':'POST, OPTIONS'}});
async function owner(request,env){
 const bearer=request.headers.get('Authorization')||'';
 if(!/^Bearer r[bd]_[a-f0-9]{64}$/.test(bearer)||!env.BRAIN?.fetch)return false;
 try{
  const r=await env.BRAIN.fetch('https://brain.internal/health',{
   headers:{Authorization:bearer},signal:AbortSignal.timeout(8000)});
  return r.ok;
 }catch{return false;}
}
const consentStore=env=>env.CONSENT.get(env.CONSENT.idFromName('single-verified-bubbles-owner-v1'));
export default {
 async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(path==='/health')return Response.json({ok:true,service:'bubbles-cloud-browser',
   browserBound:!!env.BROWSER,ownerGate:!!env.BRAIN,consentBound:!!env.CONSENT},
   {headers:{'Cache-Control':'no-store'}});
  const origin=request.headers.get('Origin')||'';
  if(!origins.has(origin))return respond('https://quantaphi.org',{ok:false,error:'origin_not_allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
   'Cache-Control':'no-store','Access-Control-Allow-Origin':origin,
   'Access-Control-Allow-Headers':'Authorization, Content-Type',
   'Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
  if(request.method!=='POST')return respond(origin,{ok:false,error:'method_not_allowed'},405);
  if(path==='/v1/browser/permission'){
   if(!(await owner(request,env)))return respond(origin,{ok:false,error:'owner_authorization_required'},403);
   if(!env.CONSENT)return respond(origin,{ok:false,error:'consent_storage_unavailable'},503);
   let body={};
   try{const raw=await request.text();if(raw.length>180)throw Error('too_large');body=JSON.parse(raw||'{}');}
   catch{return respond(origin,{ok:false,error:'invalid_request'},400);}
   const record=consentStore(env);
   if(body.action==='status')return respond(origin,await record.status());
   if(body.action==='enable')return respond(origin,await record.enable());
   if(body.action==='revoke')return respond(origin,await record.revoke());
   return respond(origin,{ok:false,error:'unsupported_action'},400);
  }
  if(path!=='/v1/browser')return respond(origin,{ok:false,error:'not_found'},404);
  // Existing manual Chrome viewing continues to use its owner-verified session.
  // Only programmatic CDP actions require an additional five-day owner consent.
  let action='';
  try{
   const raw=await request.clone().text();if(raw.length>4096)throw Error('too_large');
   action=JSON.parse(raw||'{}').action||'';
  }catch{return respond(origin,{ok:false,error:'invalid_request'},400);}
  if(['read','navigate','click','type','viewport'].includes(action)){
   if(!(await owner(request,env)))return respond(origin,{ok:false,error:'owner_authorization_required'},403);
   if(!env.CONSENT)return respond(origin,{ok:false,error:'consent_storage_unavailable'},503);
   const state=await consentStore(env).status();
   if(!state.enabled)return respond(origin,{ok:false,error:'browser_consent_required'},403);
  }
  return browserTool(request,env);
 }
};
