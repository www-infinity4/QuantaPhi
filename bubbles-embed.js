/* QuantaPhi Bubbles AI embeddable launcher.
   Put the script on any site you control: it does not request passwords or copy sessions. */
(function(){
'use strict';
const script=document.currentScript;
if(!script)return;
const ORIGIN='https://quantaphi.org';
const MAXLEN={name:38,instructions:800,id:48};
const role=String(script.dataset.bubbleRole||'assistant').toLowerCase();
const allowedRoles=new Set(['assistant','singer','listener','specialist','github']);
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
function resize(open){
 if(expanded===open)return;
 expanded=open;
 iframe.style.width=open?'min(425px,calc(100vw - 12px))':'70px';
 iframe.style.height=open?'min(690px,calc(100dvh - 12px))':'70px';
 iframe.style.right=open?'6px':'11px';
 iframe.style.bottom=open?'6px':'80px';
}
function onMessage(event){
 if(event.origin!==ORIGIN||event.source!==iframe.contentWindow)return;
 if(!event.data||event.data.type!=='quantaphi:bubbles:size'||typeof event.data.open!=='boolean')return;
 resize(event.data.open);
}
window.addEventListener('message',onMessage);
iframe.addEventListener('load',()=>resize(false));
(document.body||document.documentElement).appendChild(iframe);
})();
