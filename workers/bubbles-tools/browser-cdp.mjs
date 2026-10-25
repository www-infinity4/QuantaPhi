import {browserReadExpression,browserClickExpression} from './browser-controls.mjs';
import {chatgptInspectExpression,chatgptPrepareExpression,chatgptSendExpression} from './chatgpt-dom.mjs';
import {chooseContinuation} from '../../bubbles-chatgpt-continuity.mjs';
// Bounded Chrome DevTools actions used by authenticated Bubbles conversation.
// This is a real Browser Run CDP connection; no model-generated JavaScript is evaluated.
let sequence=0;
function command(socket,method,params={}){
 return new Promise((resolve,reject)=>{
  const id=++sequence;
  const timer=setTimeout(()=>finish(Error('browser_command_timeout')),12000);
  function finish(error,result){
   clearTimeout(timer);socket.removeEventListener('message',message);socket.removeEventListener('close',closed);
   if(error)reject(error);else resolve(result);
  }
  function closed(){finish(Error('browser_connection_closed'))}
  function message(event){
   let data;try{data=JSON.parse(event.data)}catch{return}
   if(data.id!==id)return;
   if(data.error)finish(Error('cdp_command_failed'));else finish(null,data.result||{});
  }
  socket.addEventListener('message',message);
  socket.addEventListener('close',closed);
  try{socket.send(JSON.stringify({id,method,params}))}catch(error){finish(error)}
 });
}
async function connect(env,sessionId,targetId,callback){
 const connection=await env.BROWSER.connectSession(sessionId,{targetId});
 const upgrade=await connection.webSocket.fetch('https://browser-binding.invalid',{headers:{Upgrade:'websocket'}});
 if(!upgrade.webSocket)throw Error('browser_websocket_unavailable');
 const socket=upgrade.webSocket;socket.accept();
 try{return await callback((method,params)=>command(socket,method,params))}
 finally{socket.close()}
}
const typeExpression=(name,value)=>"(()=>{const name="+JSON.stringify(name)+",value="+JSON.stringify(value)+";"+
"const key=s=>String(s||'').trim().toLowerCase();"+
"const inputs=[...document.querySelectorAll('input:not([type=password]),textarea')];"+
"const field=inputs.find(el=>[el.id,el.name,el.getAttribute('aria-label'),el.getAttribute('placeholder')].some(v=>key(v)===key(name))&&el.getClientRects().length);"+
"if(!field||!['search','text','url','email','textarea'].includes(field.type||'textarea')||/password|token|code|otp|payment|credit.card|ssn/i.test([name,field.name,field.id].join(' ')))return {ok:false,error:'field_not_available_or_protected'};"+
"const setter=Object.getOwnPropertyDescriptor(field instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;"+
"setter.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));"+
"return {ok:true,field:String(field.id||field.name||name).slice(0,100),characters:value.length}})()";
function target(tabs,wanted=''){
 const page=(Array.isArray(tabs)?tabs:[]).filter(t=>t.type==='page');
 return wanted?page.find(t=>t.id===wanted)||null:page.at(-1)||null;
}
export async function browserAction(env,{sessionId,action,targetId='',url='',label='',field='',value='',mode='',text='',conversationUrl=''}){
 const targets=await env.BROWSER.devtools.listTargets(sessionId);
 const tab=target(targets,targetId);
 if(!tab)throw Error('browser_tab_not_found');
 if(!(['read','navigate','click','type','viewport'].includes(action)||['chatgpt_scan','chatgpt_resume'].includes(action)))throw Error('unsupported_browser_action');
 if(action==='viewport'&&!['phone','desktop'].includes(mode))throw Error('unsupported_browser_viewport');
 if(action==='navigate' && !url)throw Error('browser_url_required');
 if(action==='click' && (!label||label.length>100))throw Error('browser_label_required');
 if(action==='type' && (!field||field.length>100||value.length>500))throw Error('browser_field_invalid');
 return connect(env,sessionId,tab.id,async send=>{
  // Fixed DOM allowlist: these actions never execute caller-provided JS.
  if(action==='chatgpt_scan'||action==='chatgpt_resume'){
   const evaluate=async expression=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:false});
    if(r.exceptionDetails||!r.result?.value)throw Error('chatgpt_dom_unavailable');
    return r.result.value;
   };
   if(action==='chatgpt_scan')return {...await evaluate(chatgptInspectExpression),targetId:tab.id};
   // This specialized route has exactly one permitted message. A caller
   // cannot turn an owner-approved continuation into arbitrary browser typing.
   if(text!=='*')return {ok:false,error:'literal_star_only'};
   const current=await evaluate(chatgptInspectExpression);
   if(!current.authenticatedConversation||current.conversationUrl!==conversationUrl)
    return {ok:false,error:'conversation_changed_before_send'};
   // Re-evaluate the same eligibility policy server-side. A direct API caller
   // must not bypass owner-input, pending-work or recent-nudge safeguards.
   const eligibility=chooseContinuation(current);
   if(eligibility.state!=='ready')return {ok:false,error:'continuation_not_eligible',reason:eligibility.reason};
   if(current.generating||current.draftPresent||current.recentNudgeCount>0)
    return {ok:false,error:'conversation_not_idle'};
   const continuation='*';
   const prepared=await evaluate(chatgptPrepareExpression);
   if(prepared.ok!==true)return prepared;
   await send('Input.insertText',{text:continuation});
   const submitted=await evaluate(chatgptSendExpression);
   if(submitted.ok!==true)return submitted;
   for(let i=0;i<8;i++){
    await new Promise(resolve=>setTimeout(resolve,300));
    const observed=await evaluate(chatgptInspectExpression);
    if(observed.authenticatedConversation===true&&observed.latestRole==='user'&&observed.latestUserText===continuation)
     return {ok:true,action:'chatgpt_resume',submissionVerified:true,answerVerified:false,
      title:observed.title,conversationUrl:observed.conversationUrl,targetId:tab.id};
   }
   return {ok:false,error:'submission_not_observed',sendDispatched:true,submissionVerified:false,
    answerVerified:false,targetId:tab.id};
  }
  if(action==='viewport'){
   // This changes Chromium's actual CSS viewport, rather than shrinking its iframe.
   // It is an Android-sized WEBSITE preview, never the user's physical Android screen.
   const phone=mode==='phone';
   const width=phone?360:1280,height=phone?800:800;
   await send('Emulation.setDeviceMetricsOverride',{
    width,height,deviceScaleFactor:phone?2:1,mobile:phone,
    screenWidth:width,screenHeight:height
   });
   await send('Emulation.setTouchEmulationEnabled',{enabled:phone,maxTouchPoints:phone?1:0});
   return {ok:true,mode:phone?'phone_website':'desktop_website',width,height,
    mobileWebPreview:phone,physicalAndroidScreen:false,targetId:tab.id};
  }
  if(action==='navigate'){
   const response=await send('Page.navigate',{url});return {ok:true,targetId:tab.id,navigationRequested:Boolean(response.frameId)};
  }
  const result=await send('Runtime.evaluate',{
   expression:action==='read'?browserReadExpression:action==='click'?browserClickExpression(label):typeExpression(field,value),
   returnByValue:true,awaitPromise:false
  });
  if(result.exceptionDetails||!result.result?.value)throw Error('browser_action_not_confirmed');
  return {...result.result.value,targetId:tab.id};
 });
}
