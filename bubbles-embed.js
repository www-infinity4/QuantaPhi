/* QuantaPhi Bubbles AI embeddable launcher.
   Put the script on any site you control: it does not request passwords or copy sessions. */
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
iframe.style.cssText='position:fixed;right:11px;bottom:80px;width:70px;height:70px;max-width:calc(100vw - 12px);max-height:calc(100dvh - 12px);border:0;background:transparent;overflow:hidden;z-index:2147483000;';
iframe.dataset.bubbleId=id;
let expanded=false;
const position={right:11,bottom:80};
function resize(open){
 if(expanded===open)return;
 expanded=open;
 iframe.style.width=open?'min(425px,calc(100vw - 12px))':'70px';
 iframe.style.height=open?'min(690px,calc(100dvh - 12px))':'70px';
 iframe.style.right=open?'6px':position.right+'px';
 iframe.style.bottom=open?'6px':position.bottom+'px';
}
function onMessage(event){
 if(event.origin!==ORIGIN||event.source!==iframe.contentWindow)return;
 if(!event.data)return;
 if(event.data.type==='quantaphi:bubbles:size'&&typeof event.data.open==='boolean'){resize(event.data.open);return}
 if(event.data.type==='quantaphi:bubbles:move'&&!expanded){
  const dx=Number(event.data.dx),dy=Number(event.data.dy);
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)>200||Math.abs(dy)>200)return;
  position.right=Math.max(4,Math.min((window.innerWidth||400)-70,position.right-dx));
  position.bottom=Math.max(4,Math.min((window.innerHeight||700)-70,position.bottom-dy));
  iframe.style.right=position.right+'px';iframe.style.bottom=position.bottom+'px';
 }
}
window.addEventListener('message',onMessage);
iframe.addEventListener('load',()=>resize(false));
(document.body||document.documentElement).appendChild(iframe);
})();
