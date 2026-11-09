// Fixed public-page screenshot and layout collector using the EXISTING Cloudflare BROWSER binding.
// The signed main-branch GitHub workflow is the only caller; no owner browser or session reuse.
export const EYE_AUDIENCE='bubbles-eye-public-capture';
export const EYE_WORKFLOW='www-infinity4/QuantaPhi/.github/workflows/bubbles-eye.yml@refs/heads/main';
const ISSUER='https://token.actions.githubusercontent.com';
const PAGE='https://quantaphi.org/bubbles.html';
const MODES={mobile:{width:390,height:844,dpr:2,mobile:true},desktop:{width:1280,height:800,dpr:1,mobile:false}};
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function checkEyeClaims(c,now=Date.now()/1000){
 if(c?.iss!==ISSUER||c.aud!==EYE_AUDIENCE||c.repository!=='www-infinity4/QuantaPhi'||
  String(c.repository_id)!=='1380883643'||c.workflow_ref!==EYE_WORKFLOW||c.ref!=='refs/heads/main'||
  !['workflow_dispatch','workflow_run'].includes(c.event_name)||!/^[0-9]{1,24}$/.test(String(c.run_id||''))||
  !Number.isFinite(c.exp)||c.exp<=now||!Number.isFinite(c.nbf)||c.nbf>now+30||
  !Number.isFinite(c.iat)||c.iat>now+30||now-c.iat>600)throw Error('eye_runner_identity_rejected');
 return c;
}
export async function authenticateEye(request,{fetcher=fetch,now=Date.now()/1000}={}){
 const auth=request.headers.get('Authorization')||'';
 if(!auth.startsWith('Bearer ')||auth.length>16000)throw Error('eye_identity_required');
 const parts=auth.slice(7).split('.');if(parts.length!==3)throw Error('eye_identity_required');
 const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));
 if(header.alg!=='RS256'||!header.kid)throw Error('eye_signature_rejected');
 const response=await fetcher(ISSUER+'/.well-known/jwks',{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('eye_keys_unavailable');
 const key=(await response.json()).keys?.find(k=>k.kid===header.kid&&k.kty==='RSA');
 if(!key)throw Error('eye_key_unknown');
 const imported=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))
  throw Error('eye_signature_rejected');
 return checkEyeClaims(JSON.parse(new TextDecoder().decode(decode(parts[1]))),now);
}
// Read only geometry, labels, image integrity, and bounded heading text.
// Never access form values, cookies, local storage, owner chat, or credentials.
export const VISUAL_EXPRESSION=`(() => {
 const limit=(s,n=100)=>String(s||'').replace(/\\s+/g,' ').trim().slice(0,n);
 const root=document.documentElement;
 const view={width:innerWidth,height:innerHeight,docWidth:root.scrollWidth,docHeight:root.scrollHeight};
 const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);
  return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>2&&r.height>2;};
 const items=[...document.querySelectorAll('body *')].slice(0,5000).filter(visible).slice(0,400).map(el=>{
  const b=el.getBoundingClientRect();return {tag:el.tagName.toLowerCase(),id:limit(el.id,60),
   role:limit(el.getAttribute('role'),50),label:limit(el.getAttribute('aria-label')||el.getAttribute('alt'),80),
   x:Math.round(b.left),y:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height)};});
 const controls=[...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button]')]
  .filter(visible).slice(0,180).map(el=>{const b=el.getBoundingClientRect();return {
   tag:el.tagName.toLowerCase(),label:limit(el.getAttribute('aria-label')||el.textContent,70),
   x:Math.round(b.left),y:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height)};});
 const offscreenRight=view.docWidth>view.width+4?items.filter(x=>x.x>view.width||x.x+x.w>view.width+4).slice(0,25):[];
 const brokenImages=[...document.images].filter(el=>visible(el)&&el.complete&&el.naturalWidth===0)
  .slice(0,20).map(el=>({alt:limit(el.alt,60),tag:'img'}));
 const overlaps=[];
 for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
  const a=controls[i],b=controls[j];
  const w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
  const h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
  if(w>0&&h>0&&w*h>Math.min(a.w*a.h,b.w*b.h)*.30){
   overlaps.push({a:a.label,b:b.label});if(overlaps.length>=20)break;
  }
 }
 const blankCanvases=[];
 for(const [i,el] of [...document.querySelectorAll('canvas')].entries()){
  if(!visible(el)||!el.width||!el.height)continue;
  try{const ctx=el.getContext('2d');if(!ctx)continue;
   const c=ctx.getImageData(0,0,Math.min(el.width,12),Math.min(el.height,12));
   let nonBlank=false;for(let p=3;p<c.data.length;p+=4)if(c.data[p]>0){nonBlank=true;break;}
   if(!nonBlank)blankCanvases.push({index:i,probe:'transparent_corner_sample'});
  }catch{}
 }
 return {red:{title:limit(document.title,160),url:location.origin+location.pathname,...view,
  headings:[...document.querySelectorAll('h1,h2')].filter(visible).slice(0,15).map(el=>limit(el.textContent,100))},
  yellow:items,orange:{overflow:view.docWidth>view.width+4,offscreenRight,brokenImages,overlaps,blankCanvases}};
})()`;
async function withCDP(env,sessionId,targetId,fn){
 const connection=await env.BROWSER.connectSession(sessionId,{targetId});
 const upgrade=await connection.webSocket.fetch('https://browser-binding.invalid',{headers:{Upgrade:'websocket'}});
 if(!upgrade.webSocket)throw Error('eye_cdp_unavailable');
 const socket=upgrade.webSocket;socket.accept();let seq=0;
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++seq;const timer=setTimeout(()=>finish(Error('eye_cdp_timeout')),15000);
  const finish=(err,data)=>{clearTimeout(timer);socket.removeEventListener('message',onMessage);
   socket.removeEventListener('close',onClosed);err?reject(err):resolve(data);};
  const onClosed=()=>finish(Error('eye_cdp_closed'));
  const onMessage=e=>{let value;try{value=JSON.parse(e.data)}catch{return}
   if(value.id!==id)return;
   if(value.error)finish(Error('eye_cdp_command_failed'));else finish(null,value.result||{});
  };
  socket.addEventListener('message',onMessage);socket.addEventListener('close',onClosed);
  try{socket.send(JSON.stringify({id,method,params}))}catch(e){finish(e)}
 });
 try{return await fn(send,socket)}finally{socket.close()}
}
export async function capturePublicBubbles(env,mode,{pause=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const viewport=MODES[mode];if(!viewport)throw Error('invalid_eye_mode');
 if(!env.BROWSER?.acquire)throw Error('browser_binding_unavailable');
 let sessionId='';
 try{
  const session=await env.BROWSER.acquire({keepAlive:90000,targets:true});
  sessionId=typeof session==='string'?session:session?.sessionId;
  if(!/^[0-9a-f-]{36}$/i.test(sessionId||''))throw Error('eye_session_missing');
  const tab=await env.BROWSER.devtools.newTarget(sessionId,'about:blank');
  if(!tab?.id)throw Error('eye_target_missing');
  return await withCDP(env,sessionId,tab.id,async(send,socket)=>{
   const errors=[];
   const onEvent=e=>{let data;try{data=JSON.parse(e.data)}catch{return}
    if(data.method==='Runtime.exceptionThrown')errors.push({kind:'uncaught_js'});
    if(data.method==='Log.entryAdded'&&data.params?.entry?.level==='error')errors.push({kind:'console_error'});
    if(data.method==='Network.loadingFailed')errors.push({kind:'request_failed'});
    if(data.method==='Network.responseReceived'&&data.params?.response?.status>=400)errors.push({kind:'http_'+data.params.response.status});
   };
   socket.addEventListener('message',onEvent);
   try{
    await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:viewport.width,height:viewport.height,
     deviceScaleFactor:viewport.dpr,mobile:viewport.mobile,screenWidth:viewport.width,screenHeight:viewport.height});
    const nav=await send('Page.navigate',{url:PAGE});if(nav.errorText)throw Error('eye_navigation_failed');
    let state;
    for(let attempt=0;attempt<12;attempt++){
     const result=await send('Runtime.evaluate',{expression:VISUAL_EXPRESSION,returnByValue:true});
     if(!result.exceptionDetails&&result.result?.value?.red?.url===PAGE){state=result.result.value;break}
     if(attempt<11)await pause(350);
    }
    if(!state)throw Error('eye_dom_unavailable');
    await pause(750);
    const stable=await send('Runtime.evaluate',{expression:VISUAL_EXPRESSION,returnByValue:true});
    if(stable.result?.value?.red?.url===PAGE)state=stable.result.value;
    const fold=await send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
    const fullHeight=Math.min(3000,Math.max(viewport.height,Math.ceil(state.red.docHeight)||viewport.height));
    const full=await send('Page.captureScreenshot',{format:'png',fromSurface:true,
     captureBeyondViewport:true,clip:{x:0,y:0,width:viewport.width,height:fullHeight,scale:1}});
    if(!fold.data||!full.data||fold.data.length>6000000||full.data.length>6000000)
     throw Error('eye_screenshot_invalid_or_too_large');
    let accessibility=[];
    try{const ax=await send('Accessibility.getFullAXTree');accessibility=(ax.nodes||[]).slice(0,260)
      .map(n=>({role:String(n.role?.value||'').slice(0,40),name:String(n.name?.value||'').slice(0,100),ignored:n.ignored===true}));}
    catch{} // Older CDP backends may not support this method; bounded DOM boxes remain available.
    return {ok:true,mode,red:{...state.red,accessibility},yellow:state.yellow,orange:state.orange,
     errors:errors.slice(0,30),fullHeightClipped:state.red.docHeight>fullHeight,
     purple:{accepted:true},screenshots:{fold:fold.data,full:full.data}};
   }finally{socket.removeEventListener('message',onEvent)}
  });
 }finally{if(sessionId)await env.BROWSER.closeSession(sessionId).catch(()=>{})}
}
export async function routeEyeCapture(request,env,{authenticate=authenticateEye,capture=capturePublicBubbles}={}){
 if(request.method!=='POST')return Response.json({ok:false,error:'method_not_allowed'},{status:405});
 try{await authenticate(request)}catch{return Response.json({ok:false,error:'eye_runner_not_verified'},{status:401})}
 let data;try{const raw=await request.text();if(raw.length>128)throw Error();data=JSON.parse(raw)}
 catch{return Response.json({ok:false,error:'invalid_eye_request'},{status:400})}
 if(!data||Object.keys(data).some(k=>k!=='mode')||!Object.hasOwn(MODES,data.mode))
  return Response.json({ok:false,error:'invalid_eye_mode'},{status:400});
 try{const result=await capture(env,data.mode);
  return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){return Response.json({ok:false,error:String(error?.message||'eye_capture_failed').slice(0,70)},
  {status:503,headers:{'Cache-Control':'no-store'}})}
}
