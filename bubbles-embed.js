/* QuantaPhi Bubbles AI embeddable launcher.
   The CLOSED bubble is a true host-page button, never a miniature iframe viewport.
   This prevents an iframe's rectangular canvas, footer or loading text showing
   around the orb before the public messenger opens. */
(function(){
'use strict';
const script=document.currentScript;
if(!script)return;
const ORIGIN='https://quantaphi.org';
const MAXLEN={name:38,instructions:800,id:48};
const role=String(script.dataset.bubbleRole||'assistant').toLowerCase();
const allowedRoles=new Set(['assistant','builder','singer','listener','specialist','github']);
const name=String(script.dataset.bubbleName||'Bubbles').slice(0,MAXLEN.name);
const instructions=String(script.dataset.bubbleInstructions||'').slice(0,MAXLEN.instructions);
const id=String(script.dataset.bubbleId||'embedded').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,MAXLEN.id)||'embedded';
const options=new URLSearchParams({embed:'1',id,role:allowedRoles.has(role)?role:'assistant',name,instructions});
const iframe=document.createElement('iframe');
iframe.src=ORIGIN+'/bubbles.html?'+options;
iframe.title=name+' · Bubbles AI messenger';
iframe.loading='eager';
iframe.setAttribute('allow','microphone');
iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups');
iframe.setAttribute('referrerpolicy','no-referrer');
// A collapsed HTML iframe paints a rectangular document regardless of the
// shape of the orb INSIDE it. Hide the iframe completely until chat is opened.
iframe.style.cssText='position:fixed;right:6px;bottom:6px;width:min(425px,calc(100vw - 12px));height:min(690px,calc(100dvh - 12px));max-width:calc(100vw - 12px);max-height:calc(100dvh - 12px);border:0;background:transparent;overflow:hidden;z-index:2147483000;display:none;';
iframe.dataset.bubbleId=id;
iframe.style.setProperty('display','none','important');
const orb=document.createElement('button');
orb.type='button';orb.className='quantaphi-bubbles-embed-launcher';
orb.setAttribute('aria-label','Open '+name+' chat');
orb.setAttribute('aria-expanded','false');
orb.style.cssText='position:fixed!important;right:11px;bottom:80px;width:68px!important;height:68px!important;border:2px solid #b9fbff!important;border-radius:50%!important;box-sizing:border-box!important;display:block!important;padding:0!important;margin:0!important;background:radial-gradient(circle at 30% 21%,#fff 0%,#f7ffffaa 15%,transparent 28%),radial-gradient(circle at 69% 78%,#395acc,#6354c9 52%,transparent 82%),radial-gradient(circle at 28% 38%,#bbfaff,#60c8ed 52%,#7153d6 95%)!important;box-shadow:inset 4px 5px 12px #ffffffa6,inset -8px -8px 15px #34268b8c,0 0 12px #77e6f5b0,0 5px 19px #25195b76!important;cursor:pointer!important;touch-action:none!important;overflow:hidden!important;z-index:2147483001!important;';
orb.style.setProperty('display','block','important');
for(const [left,top,size] of [[13,37,14],[21,16,29],[48,37,12]]){
 const bubble=document.createElement('span');
 bubble.setAttribute('aria-hidden','true');
 bubble.style.cssText='position:absolute!important;left:'+left+'px!important;top:'+top+'px!important;width:'+size+'px!important;height:'+size+'px!important;border-radius:50%!important;background:radial-gradient(circle at 28% 26%,white,#dcffff9e 39%,#2e88d89c 85%)!important;pointer-events:none!important;';
 orb.appendChild(bubble);
}
let expanded=false,loaded=false,pendingOpen=false,drag=null,suppressClick=false;
const position={right:11,bottom:80};
function resize(open){
 expanded=Boolean(open);
 iframe.style.setProperty('display',expanded?'block':'none','important');
 orb.style.setProperty('display',expanded?'none':'block','important');
 orb.setAttribute('aria-expanded',String(expanded));
 iframe.style.right=expanded?'6px':position.right+'px';
 iframe.style.bottom=expanded?'6px':position.bottom+'px';
}
function requestOpen(){
 if(!loaded){pendingOpen=true;return}
 pendingOpen=false;
 iframe.contentWindow?.postMessage({type:'quantaphi:bubbles:open',id},ORIGIN);
}
orb.addEventListener('click',()=>{
 if(suppressClick){suppressClick=false;return}
 resize(true);requestOpen();
});
// Keep the floating shell draggable on mobile without exposing the iframe.
orb.addEventListener('pointerdown',event=>{
 if(event.button!==undefined&&event.button!==0)return;
 drag={x:event.clientX,y:event.clientY,startRight:position.right,startBottom:position.bottom,moved:false};
 orb.setPointerCapture?.(event.pointerId);
});
orb.addEventListener('pointermove',event=>{
 if(!drag)return;
 const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
 if(!drag.moved&&Math.hypot(dx,dy)<9)return;
 drag.moved=true;
 position.right=Math.max(4,Math.min((window.innerWidth||400)-68,drag.startRight-dx));
 position.bottom=Math.max(4,Math.min((window.innerHeight||700)-68,drag.startBottom-dy));
 orb.style.right=position.right+'px';orb.style.bottom=position.bottom+'px';
});
orb.addEventListener('pointerup',()=>{if(drag?.moved)suppressClick=true;drag=null});
orb.addEventListener('pointercancel',()=>{drag=null});
function onMessage(event){
 if(event.origin!==ORIGIN||event.source!==iframe.contentWindow)return;
 if(!event.data)return;
 if(event.data.type==='quantaphi:bubbles:size'&&typeof event.data.open==='boolean'){
  resize(event.data.open);return;
 }
 if(event.data.type==='quantaphi:bubbles:site-draft'){
  if(event.data.id!==id||typeof event.data.request!=='string')return;
  const request=event.data.request.trim().slice(0,2000);
  if(!request)return;
  // Public site drafts are untrusted visitor text, NOT authority to run work.
  window.dispatchEvent(new CustomEvent('bubbles:work-draft',{detail:{
   bubbleId:id,request,executed:false,source:'bubbles-embed'
  }}));
  return;
 }
 if(event.data.type==='quantaphi:bubbles:move'&&!expanded){
  const dx=Number(event.data.dx),dy=Number(event.data.dy);
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)>200||Math.abs(dy)>200)return;
  position.right=Math.max(4,Math.min((window.innerWidth||400)-68,position.right-dx));
  position.bottom=Math.max(4,Math.min((window.innerHeight||700)-68,position.bottom-dy));
  orb.style.right=position.right+'px';orb.style.bottom=position.bottom+'px';
 }
}
window.addEventListener('message',onMessage);
iframe.addEventListener('load',()=>{loaded=true;if(expanded||pendingOpen)requestOpen()});
(document.body||document.documentElement).append(iframe,orb);
})();