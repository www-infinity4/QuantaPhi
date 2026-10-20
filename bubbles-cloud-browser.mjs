// Bubbles owner-only interactive Cloudflare Browser Run panel.
// The browser page is real hosted Chrome Live View, not an ordinary iframe
// pretending to click cross-origin websites. Provider logins stay in Chrome.
const SERVICE='https://bubbles-cloud-browser.marvaseater.workers.dev/v1/browser';
let panelInstance=null, agent=null;
const destinations={cloudflare:'https://dash.cloudflare.com/',starquest:'https://quantaphi.org/starquest/',bubbles:'https://quantaphi.org/bubbles.html',github:'https://github.com/www-infinity4',chatgpt:'https://chatgpt.com/',gemini:'https://gemini.google.com/',claude:'https://claude.ai/',quantaphi:'https://quantaphi.org/'};
export function browserSpeechIntent(input){
 const utterance=String(input||'').trim().replace(/^(?:(?:hey|okay|please|bubbles)[,\s]+)+/i,'');
 const browser=/\b(?:cloud|remote|chrome)\s+browser\b|\bbrowser run\b|\bin (?:the )?browser\b/i.test(utterance);
 const namedOpen=/^(?:open|launch|go to|visit)\s+(?:(?:the|my)\s+)?(?:cloudflare|chat\s?gpt|gemini|claude|starquest|bubbles(?: chat)?|quantaphi)(?:\s+(?:website|page|app))?[.!?]*$/i.test(utterance);
 if(!browser&&!namedOpen)return null;
 const show=/^(?:show|display|bring up|pull up|see|watch)\b/i.test(utterance)||namedOpen;
 const url=utterance.match(/https:\/\/[^\s"'<>]+/i)?.[0]||'';
 // Search is requested by meaning; the caller can ask to see Chrome while
 // searching, or simply get a grounded text result without opening controls.
 const search=/\b(?:search|look up|find)\b(?:\s+(?:google|the web|online|chrome))?(?:\s+for)?\s+(.+)$/i.exec(utterance);
 if(search&&!/^(?:type|enter|fill|click|tap|press)\b/i.test(utterance)){
  const query=search[1].replace(/\s+(?:in|using|with|on)\s+(?:the\s+)?(?:cloud|remote|chrome)\s+browser(?:\s+for\s+me)?[.!?]*$/i,'').replace(/[.!?]+$/,'').trim();
  if(query.length>1)return {action:'research',url:'https://www.google.com/search?q='+encodeURIComponent(query.slice(0,350)),show};
 }
 if(/\b(?:click|tap|press)\b/i.test(utterance)){
  const found=utterance.match(/\b(?:click|tap|press)\s+(?:on\s+)?["'“]?(.+?)["'”]?\s+(?:in|on|with|using)\s+(?:the\s+)?(?:cloud|remote|chrome)?\s*browser\b/i);
  return found?{action:'click',label:found[1].replace(/^["'“]|["'”]$/g,'').trim(),show}:null;
 }
 if(/\b(?:type|enter|fill)\b/i.test(utterance)){
  const found=utterance.match(/\b(?:type|enter|fill)\s+["'“](.+?)["'”]\s+(?:in|into)\s+(?:the\s+)?(.+?)\s+(?:in|on)\s+(?:the\s+)?(?:cloud|remote|chrome)?\s*browser\b/i);
  return found?{action:'type',value:found[1],field:found[2],show}:null;
 }
 if(/\b(?:open|go to|visit|navigate|launch|load)\b/i.test(utterance)){
  const name=/\bchat\s?gpt\b/i.test(utterance)?'chatgpt':Object.keys(destinations).find(k=>new RegExp('\\b'+k+'\\b','i').test(utterance));
  const target=url||destinations[name]||'';
  return target?{action:'navigate',url:target,show}:null;
 }
 if(/\b(?:read|inspect|review|examine|summarize|what(?:'s| is) on)\b/i.test(utterance))return {action:'read',show};
 if(/\b(?:connect|start|activate|enable)\b/i.test(utterance))return {action:'navigate',url:url||destinations.bubbles,show};
 if(show)return {action:'show',show:true};
 return null;
}
export async function browserConversation(command,{host,ownerHeaders}){
 const intent=browserSpeechIntent(command);if(!intent)return null;
 mount({host,ownerHeaders,reveal:intent.show});
 if(!agent)throw Error('browser_control_not_ready');
 return agent.run(intent);
}

const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function mount({host,ownerHeaders,reveal=false}){
 if(panelInstance){if(reveal)panelInstance.hidden=false;return panelInstance;}
 if(!host||typeof ownerHeaders!=='function')throw Error('browser_host_unavailable');
 const wrap=element('section');
 wrap.hidden=!reveal;
 wrap.className='ba-cloud-browser';
 wrap.style.cssText='padding:12px;margin:10px 0;border:1px solid #8f80b7;border-radius:14px;background:#f8f6fc;color:#302544;max-width:100%;box-sizing:border-box';
 const head=element('div');head.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap';
 head.append(element('strong','Cloud browser · Live Chrome'));
 const close=element('button','Close view');close.type='button';close.style.cssText='min-height:44px;border-radius:9px;padding:8px';
 close.onclick=()=>{wrap.hidden=true};head.append(close);wrap.append(head);
 const status=element('p','Owner verification required to start a private Chrome session.');status.setAttribute('role','status');
 status.style.cssText='font-size:13px;margin:7px 0 12px';wrap.append(status);
 const controls=element('div');controls.style.cssText='display:flex;gap:7px;flex-wrap:wrap';
 const start=element('button','Start Chrome');const stop=element('button','Stop session');
 const refresh=element('button','Reconnect view');
 const address=element('input');address.type='url';address.placeholder='https://example.com';address.value='https://quantaphi.org/';
 address.style.cssText='width:100%;box-sizing:border-box;min-height:44px;padding:10px;margin-top:8px;border:1px solid #ada4be;border-radius:10px';
 const add=element('button','Open new tab');
 const cloudflare=element('button','Open Cloudflare');
 // Owner signs in interactively; no provider credentials stored in Bubbles.
 const chatgpt=element('button','ChatGPT · sign in');
 const gemini=element('button','Gemini · sign in');
 for(const button of [start,refresh,stop,add,cloudflare,chatgpt,gemini]){button.type='button';button.style.cssText='min-height:44px;padding:9px;border-radius:10px;border:1px solid #7767a5;background:#fff;color:#322754';controls.append(button);}
 wrap.append(controls,address);
 // Device-size inspection changes the remote Chrome viewport through CDP.
 // A web preview is not the native phone display; the APK's own screen sharing
 // remains separately permissioned.
 const previewControls=element('div');
 previewControls.className='ba-browser-viewport';
 previewControls.style.cssText='display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:10px';
 const phonePreview=element('button','Phone website · 360px');
 const desktopPreview=element('button','Desktop website · 1280px');
 for(const button of [phonePreview,desktopPreview]){
  button.type='button';button.style.cssText='min-height:44px;padding:9px;border-radius:10px;border:1px solid #7767a5;background:#fff;color:#322754';
  previewControls.append(button);
 }
 const previewState=element('p','Choose a web viewport to inspect its actual layout. This does not show the physical Android screen.');
 previewState.setAttribute('role','status');previewState.style.cssText='font-size:12px;margin:6px 0 10px';
 wrap.append(previewControls,previewState);

 const access=document.createElement('div');access.className='ba-browser-permission';
 access.style.cssText='margin:10px 0;padding:10px;border:1px solid #cec3e5;border-radius:10px';
 const accessState=element('p','Browser assistant: owner approval not checked.');accessState.setAttribute('role','status');accessState.style.cssText='font-size:13px;margin:0 0 8px';
 const enable=element('button','Allow browser assistant · 5 days');
 const revoke=element('button','Revoke browser assistant access');
 for(const b of [enable,revoke]){b.type='button';b.style.cssText='min-height:44px;padding:8px 10px;margin:3px;border:1px solid #6d579b;border-radius:9px;background:#fff;color:#362657'}
 access.append(accessState,enable,revoke);wrap.append(access);
 // ChatGPT's connected Cloudflare tools exchange job receipts via the owner's
 // private D1 queue; only the signed Bubbles owner can approve this five-day grant.
 // A separate ChatGPT account/browser token is never placed in the HTML.
 const bridge=document.createElement('section');
 bridge.className='ba-chatgpt-browser-bridge';
 bridge.style.cssText='margin:10px 0;padding:12px;border:1px solid #9e89c4;border-radius:12px';
 const bridgeTitle=element('strong','ChatGPT ↔ Bubbles · Cloud Browser');
 const bridgeStatus=element('p','ChatGPT access is not yet verified.');
 bridgeStatus.setAttribute('role','status');bridgeStatus.style.cssText='font-size:13px;line-height:1.5;margin:8px 0';
 const approveBridge=element('button','Allow ChatGPT to use Bubbles · 5 days');
 const revokeBridge=element('button','Revoke ChatGPT access');
 for(const b of [approveBridge,revokeBridge]){b.type='button';b.style.cssText='min-height:44px;padding:8px 10px;margin:3px;border:1px solid #6d579b;border-radius:9px;background:#fff;color:#362657'}
 const bridgeNote=element('p','Allows authenticated Cloudflare account tools to send browser requests and messages into this Bubbles session for five days. Bubbles must be open for tasks to run. Browser passwords, payments and permission confirmations still require you. Commands and text results are recorded in your private Cloudflare D1.');
 bridgeNote.style.cssText='font-size:12px;line-height:1.5';
 bridge.append(bridgeTitle,bridgeStatus,approveBridge,revokeBridge,bridgeNote);wrap.append(bridge);
 let chatgptApproved=false,bridgePolling=false;
 async function bridgeCall(endpoint,payload){
  const headers=await ownerHeaders();
  if(!headers?.Authorization)throw Error('Connect the verified Bubbles owner session first.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  try{
   const res=await fetch(SERVICE+'/chatgpt/'+endpoint,{
    method:'POST',headers:{'Content-Type':'application/json',...headers},
    body:JSON.stringify(payload),signal:controller.signal,cache:'no-store'});
   const data=await res.json();
   if(!res.ok||!data.ok)throw Error(data.error||'bridge_operation_not_confirmed');
   return data;
  }finally{clearTimeout(timeout)}
 }
 async function bridgePermission(action){
  approveBridge.disabled=true;revokeBridge.disabled=true;
  try{
   const result=await bridgeCall('permission',{action});
   chatgptApproved=result.enabled===true;
   bridgeStatus.textContent=chatgptApproved?
    'ChatGPT bridge approved until '+new Date(result.expiresAt).toLocaleString()+'. Bubbles will handle verified requests while this app is open.':
    'ChatGPT bridge access is off. No queued request can run.';
   return result;
  }catch(error){bridgeStatus.textContent='ChatGPT bridge not confirmed: '+String(error.message||error).slice(0,145);throw error}
  finally{approveBridge.disabled=false;revokeBridge.disabled=false}
 }
 approveBridge.addEventListener('click',()=>void bridgePermission('enable').catch(()=>{}));
 revokeBridge.addEventListener('click',()=>void bridgePermission('revoke').catch(()=>{}));

 async function permission(action){
  enable.disabled=true;revoke.disabled=true;
  try{
   const headers=await ownerHeaders();
   if(!headers?.Authorization)throw Error('Connect the verified owner session first.');
   const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
   let response;
   try{response=await fetch(SERVICE.replace('/v1/browser','/v1/browser/permission'),{
    method:'POST',headers:{'Content-Type':'application/json',...headers},
    body:JSON.stringify({action}),signal:ctl.signal,cache:'no-store'});
   }finally{clearTimeout(timer)}
   const data=await response.json();
   if(!response.ok||!data.ok)throw Error(data.error||'permission_not_confirmed');
   accessState.textContent=data.enabled?'Browser helper approved until '+new Date(data.expiresAt).toLocaleString()+'. Browser sessions and owner verification still expire independently.':'Browser helper access is off. Manual Chrome viewing remains available.';
  }catch(error){accessState.textContent='Permission not confirmed: '+String(error.message||error).slice(0,135);}
  finally{enable.disabled=false;revoke.disabled=false;}
 }
 enable.onclick=()=>void permission('enable');
 revoke.onclick=()=>void permission('revoke');

 const link=element('a','Open interactive browser in a new tab ↗');link.target='_blank';link.rel='noopener noreferrer';
 link.style.cssText='display:none;margin:8px 0;font-weight:700;color:#5430a4;word-break:break-word';
 wrap.append(link);
 const frame=element('iframe');frame.title='Cloud Chrome live browser';frame.referrerPolicy='no-referrer';
 frame.setAttribute('allow','clipboard-read; clipboard-write; fullscreen');
 frame.style.cssText='display:none;width:100%;height:min(68vh,520px);min-height:320px;border-radius:10px;border:1px solid #c5badd';
 wrap.append(frame);
 const note=element('p','Use the browser controls to click, type, navigate, and sign into your own sites. Phone website and Desktop website change the actual remote Chrome layout. To see your physical Android screen, Bubbles APK must share a fresh device frame with Android permission; this cloud browser cannot see it yet. Sign into ChatGPT and Gemini interactively using your chosen account (different Google emails are allowed). A login does not automatically authorize Bubbles to read private chat history or use another provider API. Sessions are temporary; Stop ends remote Chrome.');
 note.style.cssText='font-size:12px;line-height:1.5;margin:10px 0 0';wrap.append(note);
 // The approval is the FIRST visible item. Advanced Chrome controls remain
 // reachable by expanding one native <details> inside the chat's scroll owner.
 const advanced=element('details');
 advanced.className='ba-browser-advanced';
 advanced.append(element('summary','Cloud Browser controls · open / close'));
 for(const child of [...wrap.children]){
  if(child!==bridge)advanced.append(child);
 }
 wrap.append(bridge,advanced);
 wrap.classList.add('ba-cloud-browser-scrolling');
 wrap.approveChatGPT=()=>bridgePermission('enable');
 wrap.revokeChatGPT=()=>bridgePermission('revoke');
 wrap.checkChatGPT=()=>bridgePermission('status');
 wrap.openBrowserControls=()=>{advanced.open=true;};
 host.append(wrap);panelInstance=wrap;
 let state=null,busy=false;
 async function call(action,extra={}){
   const headers=await ownerHeaders();
   if(!headers?.Authorization)throw Error('Connect the verified Bubbles owner session first.');
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
   try{
     const response=await fetch(SERVICE,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({action,...(state||{}),...extra}),signal:controller.signal,cache:'no-store'});
     const result=await response.json();
     if(!response.ok||result.ok!==true)throw Error(result.error==='browser_binding_not_deployed'?'Cloud browser deployment or binding is not active yet.':result.error||'browser_request_failed');
     return result;
   }finally{clearTimeout(timeout);}
 }
 const loading=(value)=>{busy=value;for(const b of [start,stop,refresh,add,cloudflare,chatgpt,gemini,phonePreview,desktopPreview])b.disabled=value;};
 const show=(result)=>{
   if(result.sessionId)state={sessionId:result.sessionId,proof:result.proof||state?.proof,targetId:result.targetId||state?.targetId};
   if(result.url){
     const u=new URL(result.url);
     if(u.protocol!=='https:'||u.hostname!=='live.browser.run')throw Error('unexpected_browser_view_host');
     link.href=u.href;link.style.display='inline-block';frame.src=u.href;frame.style.display='block';
   }
   status.textContent='Live Chrome session connected. View link is short-lived; Reconnect view obtains a fresh link.';
 };
 async function action(kind,extra={}){
   if(busy)return;loading(true);status.textContent='Connecting securely to Cloudflare Chrome…';
   try{const result=await call(kind,extra);
    if(kind==='stop'){state=null;frame.src='about:blank';frame.style.display='none';link.removeAttribute('href');link.style.display='none';status.textContent='Remote Chrome session closed.';}
    else show(result);
   }catch(error){status.textContent='Browser action not confirmed: '+String(error.message||error).slice(0,150);}
   finally{loading(false);}
 }
 async function setWebsiteViewport(mode){
  if(busy)return;
  loading(true);
  try{
   // One tap can open Chrome and switch its real responsive layout.
   if(!state){const started=await call('start',{url:address.value});show(started);}
   const result=await call('viewport',{mode});
   const viewport=result.result;
   if(!viewport?.ok||viewport?.physicalAndroidScreen!==false||!Number.isInteger(viewport.width))
    throw Error('chrome_viewport_not_verified');
   previewState.textContent=(mode==='phone'?'Phone website':'Desktop website')+' viewport verified at '+viewport.width+' × '+viewport.height+' CSS pixels. This is remote Chrome, not the Android device screen.';
   status.textContent='Remote Chrome layout changed and confirmed by Chrome DevTools.';
  }catch(error){
   previewState.textContent='Web layout change not confirmed: '+String(error.message||error).slice(0,150);
  }finally{loading(false);}
 }
 phonePreview.addEventListener('click',()=>void setWebsiteViewport('phone'));
 desktopPreview.addEventListener('click',()=>void setWebsiteViewport('desktop'));
 start.addEventListener('click',()=>action('start',{url:address.value}));
 cloudflare.addEventListener('click',()=>{
  address.value=destinations.cloudflare;
  void action(state?'tab':'start',{url:destinations.cloudflare});
 });
 for(const [button,url] of [[chatgpt,destinations.chatgpt],[gemini,destinations.gemini]]){
  button.addEventListener('click',()=>{
   address.value=url;
   // Tabs share one Chrome profile; owner selects the desired provider account.
   // Interactive login does not grant the agent private chat API access.
   void action(state?'tab':'start',{url});
  });
 }
 add.addEventListener('click',()=>{if(!state){status.textContent='Start Chrome first.';return;}void action('tab',{url:address.value})});
 refresh.addEventListener('click',()=>{if(!state){status.textContent='Start Chrome first.';return;}void action('view')});
 stop.addEventListener('click',()=>{if(state)void action('stop');else status.textContent='No live Chrome session to stop.'});
 agent={async run(intent){
  const actionName=intent.action;
  if(actionName==='show'){
   if(!state){
    const opened=await call('start',{url:destinations.quantaphi});
    show(opened);
   }else show(await call('view'));
   return 'Live Cloud Chrome is visible in this Bubbles chat. The browser is connected, but no search was requested.';
  }
  if(actionName==='research'){
   if(!state){
    const opened=await call('start',{url:intent.url});
    show(opened);
   }else{
    const moved=await call('navigate',{url:intent.url});
    if(moved.result?.navigationRequested!==true)throw Error('browser_navigation_unverified');
   }
   // Let Chrome finish its first paint before requesting bounded page text.
   await new Promise(resolve=>setTimeout(resolve,550));
   const read=await call('read');
   if(read.result?.ok===false)throw Error(read.result.error||'browser_page_read_failed');
   const page=read.result||{};
   const report='Chrome research page: '+String(page.title||'Search results')+' · '+
    String(page.url||intent.url)+'\n'+String(page.text||'No readable page text was returned.').slice(0,7000);
   return report;
  }
  const requested=actionName==='navigate'?{action:state?'navigate':'start',url:intent.url}:intent;
  if(!state&&requested.action!=='start'){
   return 'Cloud Chrome has no active session. Ask me to open or show the browser, then try again.';
  }
  if(requested.action==='start'){
   const started=await call('start',{url:requested.url});
   show(started);
   return 'Cloud Chrome opened '+requested.url+'. The live session was confirmed.';
  }
  const result=await call(requested.action,requested);
  if(result.ok!==true||result.result?.ok===false)throw Error(result.result?.error||result.error||'browser_operation_unverified');
  if(requested.action==='navigate')return result.result?.navigationRequested?
   'Cloud Chrome requested navigation to '+requested.url+'. The loaded page has not yet been read.':
   'Chrome did not confirm navigation.';
  if(requested.action==='read')return 'Cloud browser read: '+String(result.result?.title||'Untitled')+' · '+
   String(result.result?.url||'')+'\n'+String(result.result?.text||'').slice(0,7000);
  if(requested.action==='click')return 'Cloud browser clicked '+String(result.result?.label||requested.label)+'. The changed page has not yet been read.';
  if(requested.action==='type')return 'Cloud browser typed '+result.result.characters+' characters in '+String(result.result.field||'the field')+'. I did not submit the form.';
  return 'Browser action returned a verified server receipt.';
 }};

 async function pollChatGPT(){
  if(bridgePolling||!chatgptApproved||document.hidden)return;
  bridgePolling=true;
  try{
   const data=await bridgeCall('process',state?{sessionId:state.sessionId,proof:state.proof}:{});
   if(data.view){show(data.view)}
   if(data.status==='needs_bubbles_reply'&&data.jobId){
    let reply;
    try{
     reply=await new Promise(resolve=>{
      let done=false;
      const finish=x=>{if(done)return;done=true;clearTimeout(timer);resolve(x)};
      const timer=setTimeout(()=>finish({ok:false,error:'bubbles_reply_timeout'}),55000);
      window.dispatchEvent(new CustomEvent('bubbles:chatgpt-bridge',{detail:{
       text:data.message,respond:finish}}));
     });
    }catch{reply={ok:false,error:'bubbles_chat_not_available'}}
    await bridgeCall('complete',{id:data.jobId,reply});
    bridgeStatus.textContent=reply.ok?'Bubbles replied to ChatGPT. Receipt stored in Cloudflare.':
     'Bubbles could not answer ChatGPT: '+String(reply.error||'unknown').slice(0,80);
   }else if(data.jobId){
    bridgeStatus.textContent=data.result?.ok?
     'ChatGPT browser request completed. Verified result saved in Cloudflare.':
     'ChatGPT browser request blocked: '+String(data.result?.error||'unverified').slice(0,100);
   }
  }catch(error){
   const value=String(error.message||error);
   if(value==='chatgpt_five_day_approval_required'){
    chatgptApproved=false;bridgeStatus.textContent='ChatGPT five-day approval expired or was revoked.';
   }else if(!/owner_authorization_required|browser_consent_required/.test(value)){
    bridgeStatus.textContent='ChatGPT bridge check unavailable: '+value.slice(0,130);
   }
  }finally{bridgePolling=false}
 }
 // The session and owner token remain in this first-party page. Cloudflare
 // D1 receives only a structured request/receipt, never browser credentials.
 setInterval(()=>void pollChatGPT(),8000);
 void bridgePermission('status');
 return wrap;
}
