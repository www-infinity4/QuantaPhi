// Bubbles owner-only interactive Cloudflare Browser Run panel.
// The browser page is real hosted Chrome Live View, not an ordinary iframe
// pretending to click cross-origin websites. Provider logins stay in Chrome.
const SERVICE='https://bubbles-tools.marvaseater.workers.dev/v1/browser';
let panelInstance=null;
const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function mount({host,ownerHeaders}){
 if(panelInstance){panelInstance.hidden=false;return panelInstance;}
 if(!host||typeof ownerHeaders!=='function')throw Error('browser_host_unavailable');
 const wrap=element('section');
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
 for(const button of [start,refresh,stop,add]){button.type='button';button.style.cssText='min-height:44px;padding:9px;border-radius:10px;border:1px solid #7767a5;background:#fff;color:#322754';controls.append(button);}
 wrap.append(controls,address);
 const link=element('a','Open interactive browser in a new tab ↗');link.target='_blank';link.rel='noopener noreferrer';
 link.style.cssText='display:none;margin:8px 0;font-weight:700;color:#5430a4;word-break:break-word';
 wrap.append(link);
 const frame=element('iframe');frame.title='Cloud Chrome live browser';frame.referrerPolicy='no-referrer';
 frame.setAttribute('allow','clipboard-read; clipboard-write; fullscreen');
 frame.style.cssText='display:none;width:100%;height:min(68vh,520px);min-height:320px;border-radius:10px;border:1px solid #c5badd';
 wrap.append(frame);
 const note=element('p','Use the browser controls to click, type, navigate, and sign into your own sites. This is remote Cloudflare Chrome, not your Android screen. Google, Gemini and Claude each control their own authentication. Sessions are temporary; Stop ends the remote browser.');
 note.style.cssText='font-size:12px;line-height:1.5;margin:10px 0 0';wrap.append(note);
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
 const loading=(value)=>{busy=value;for(const b of [start,stop,refresh,add])b.disabled=value;};
 const show=(result)=>{
   if(result.sessionId)state={sessionId:result.sessionId,proof:result.proof||state?.proof};
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
 start.addEventListener('click',()=>action('start',{url:address.value}));
 add.addEventListener('click',()=>{if(!state){status.textContent='Start Chrome first.';return;}void action('tab',{url:address.value})});
 refresh.addEventListener('click',()=>{if(!state){status.textContent='Start Chrome first.';return;}void action('view')});
 stop.addEventListener('click',()=>{if(state)void action('stop');else status.textContent='No live Chrome session to stop.'});
 return wrap;
}
