import {browserTool,proof} from '../bubbles-tools/browser.mjs';
import {processChatGPTJob,completeChatGPTMessage} from './chatgpt-bridge.mjs';
import {authenticateBridge,runnerMessage} from './runner-bridge.mjs';
import {serverAssist} from './server-assist.mjs';
import {signedBrowserCheck,browserCheckPage,CHECK_PATH} from './browser-check.mjs';
import {continuityPreview} from './preview.mjs';
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
 async fetch(request,env,ctx){
  const path=new URL(request.url).pathname;
  if(path.startsWith('/bubbles-continuity-preview/')){
   try{return await continuityPreview(request,typeof CONTINUITY_PREVIEW_SOURCE_SHA==='undefined'?'':CONTINUITY_PREVIEW_SOURCE_SHA);}
   catch{return new Response('Preview source unavailable',{status:502,headers:{'Cache-Control':'no-store'}});}
  }
  if(path===CHECK_PATH&&request.method==='GET')return browserCheckPage();
  if(path==='/health')return Response.json({ok:true,service:'bubbles-cloud-browser',serverConversation:'signed-server-v2',continuationController:'durable-eight-v1',toolsBound:!!env.TOOLS,
   browserBound:!!env.BROWSER,ownerGate:!!env.BRAIN,consentBound:!!env.CONSENT,chatgptBridgeBound:!!env.BRIDGE_DB},
   {headers:{'Cache-Control':'no-store'}});
  const origin=request.headers.get('Origin')||'';
  if(path==='/v1/browser/chatgpt/runner'){
   const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
   if(origin||request.method!=='POST')return reply({ok:false,error:'server_runner_required'},403);
   let claims;try{claims=await authenticateBridge(request)}catch{return reply({ok:false,error:'bridge_runner_not_verified'},401)}
   if(!env.CONSENT||!env.BRIDGE_DB)return reply({ok:false,error:'chatgpt_bridge_bindings_missing'},503);
   let body;try{const raw=await request.text();if(raw.length>4200)throw Error();body=JSON.parse(raw)}catch{return reply({ok:false,error:'invalid_bridge_request'},400)}
   try{
    const result=body.operation==='browser_check'
     ?await signedBrowserCheck({claims,body,db:env.BRIDGE_DB,store:consentStore(env),env})
     :['assist','result'].includes(body.operation)
     ?await serverAssist({claims,body,db:env.BRIDGE_DB,store:consentStore(env),fetcher:(url,options)=>{
       if(!env.TOOLS?.fetch)throw Error('bubbles_tools_binding_missing');
       return env.TOOLS.fetch(url,options);
      }})
     :await runnerMessage({claims,body,db:env.BRIDGE_DB,store:consentStore(env)});
    return reply(result,result.ok?200:result.status||403);
   }catch{return reply({ok:false,error:'bridge_transport_unavailable'},503)}
  }
  if(!origins.has(origin))return respond('https://quantaphi.org',{ok:false,error:'origin_not_allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
   'Cache-Control':'no-store','Access-Control-Allow-Origin':origin,
   'Access-Control-Allow-Headers':'Authorization, Content-Type',
   'Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
  if(request.method!=='POST')return respond(origin,{ok:false,error:'method_not_allowed'},405);
  if(path.startsWith('/v1/browser/chatgpt/')){
   if(!(await owner(request,env)))return respond(origin,{ok:false,error:'owner_authorization_required'},403);
   if(!env.CONSENT||!env.BRIDGE_DB)return respond(origin,{ok:false,error:'chatgpt_bridge_bindings_missing'},503);
   let body={};try{const raw=await request.text();if(raw.length>4200)throw Error('large');
    body=JSON.parse(raw||'{}')}catch{return respond(origin,{ok:false,error:'invalid_request'},400)}
   const store=consentStore(env);
   if(path==='/v1/browser/chatgpt/continuity'){
    if(!['start','status','stop','view'].includes(body.action))return respond(origin,{ok:false,error:'unsupported_action'},400);
    if(body.action!=='start'&&Object.keys(body).some(key=>key!=='action'))return respond(origin,{ok:false,error:'invalid_request'},400);
    if(body.action==='status')return respond(origin,await store.continuationStatus());
    if(body.action==='stop')return respond(origin,await store.stopContinuation());
    if(!(await store.status()).enabled||!(await store.chatgptStatus()).enabled)
     return respond(origin,{ok:false,error:'existing_five_day_approval_required'},403);
    if(body.action==='start'){
     if(Object.keys(body).some(key=>!['action','sessionId','proof','targetId'].includes(key)))
      return respond(origin,{ok:false,error:'invalid_request'},400);
     // Verify the owner-bound browser proof with the existing adapter before
     // admitting a scoped background job. No bearer/proof is stored in the DO.
     const checked=await browserTool(new Request(request.url,{method:'POST',headers:request.headers,
      body:JSON.stringify({...body,action:'view'})}),env);
     if(!checked.ok)return checked;
     try{return respond(origin,await store.startContinuation({sessionId:body.sessionId,targetId:body.targetId}));}
     catch{return respond(origin,{ok:false,error:'continuation_start_unconfirmed'},409);}
    }
    const context=await store.continuationContext();
    if(!context)return respond(origin,{ok:false,error:'continuation_not_started'},404);
    return browserTool(new Request(request.url,{method:'POST',headers:request.headers,
     body:JSON.stringify({action:'view',...context,
      proof:await proof(request.headers.get('Authorization'),context.sessionId)})}),env);
   }
   if(path==='/v1/browser/chatgpt/account'){
    if(Object.keys(body).length)return respond(origin,{ok:false,error:'invalid_request'},400);
    return respond(origin,{ok:true,email:String(env.CHATGPT_LOGIN_EMAIL||''),persistentProfile:false,backgroundContinuation:true});
   }
   if(path==='/v1/browser/chatgpt/heartbeat'){
    if(Object.keys(body).some(key=>key!=='state'))return respond(origin,{ok:false,error:'invalid_consumer_state'},400);
    const result=await store.consumerHeartbeat(body.state);
    return respond(origin,result,result.ok?200:result.status||403);
   }
   if(path==='/v1/browser/chatgpt/permission'){
    if(body.action==='status')return respond(origin,await store.chatgptStatus());
    if(body.action==='enable')return respond(origin,await store.enableChatGPT());
    if(body.action==='revoke')return respond(origin,await store.revokeChatGPT());
    return respond(origin,{ok:false,error:'unsupported_action'},400);
   }
   if(path==='/v1/browser/chatgpt/process'){
    // The owner's ordinary browser-automation consent must also be active;
    // a ChatGPT grant never silently reactivates an expired browser grant.
    const browserConsent=await store.status();
    if(!browserConsent.enabled)return respond(origin,{ok:false,error:'browser_consent_required'},403);
    const heartbeat=await store.consumerHeartbeat('ready');
    if(!heartbeat.ok)return respond(origin,heartbeat,heartbeat.status||403);
    const result=await processChatGPTJob({db:env.BRIDGE_DB,store,request,env,body,browserTool});
    return respond(origin,result,result.ok?200:result.status||403);
   }
   if(path==='/v1/browser/chatgpt/complete'){
    const result=await completeChatGPTMessage({db:env.BRIDGE_DB,store,id:body.id,reply:body.reply});
    return respond(origin,result,result.ok?200:result.status||403);
   }
   return respond(origin,{ok:false,error:'not_found'},404);
  }
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
  if((['read','navigate','click','type','viewport'].includes(action)||['chatgpt_scan','chatgpt_resume','chatgpt_signin'].includes(action))){
   if(!(await owner(request,env)))return respond(origin,{ok:false,error:'owner_authorization_required'},403);
   if(!env.CONSENT)return respond(origin,{ok:false,error:'consent_storage_unavailable'},503);
   const state=await consentStore(env).status();
   if(!state.enabled)return respond(origin,{ok:false,error:'browser_consent_required'},403);
   if(['chatgpt_scan','chatgpt_resume','chatgpt_signin'].includes(action)&&!(await consentStore(env).chatgptStatus()).enabled)
    return respond(origin,{ok:false,error:'chatgpt_five_day_approval_required'},403);
  }
  return browserTool(request,env,{chatgptApproved:['chatgpt_scan','chatgpt_resume','chatgpt_signin'].includes(action)});
 }
};
