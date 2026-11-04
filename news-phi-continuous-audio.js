/* News Phi stays in the QuantaPhi document so Infinity Radio's audio element
 * survives the navigation. This does not claim OS-level background playback. */
(()=>{
 'use strict';
 let dialog,frame,external,previousFocus;
 function newsUrl(value){
  try{
   const url=new URL(value,window.location.href);
   if(!['http:','https:'].includes(url.protocol))return null;
   const local=url.origin===window.location.origin&&/^\/(?:newsroom\/|news-phi\/)/i.test(url.pathname);
   const legacy=url.origin==='https://www-infinity4.github.io'&&/^\/News-Phi(?:\/|$)/.test(url.pathname);
   return local||legacy?url:null;
  }catch(_){return null}
 }
 function make(tag,text,css){
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(css)node.className=css;
  return node;
 }
 function mount(reader){
  const style=make('style');
  style.textContent=`
   .news-phi-reader{width:min(1100px,calc(100vw - 14px));height:min(92dvh,960px);max-width:none;max-height:none;
    margin:auto;padding:0;border:1px solid #abc6d3;border-radius:16px;background:#f4f8fb;color:#233c4d;
    box-shadow:0 16px 65px #0c20355c;overflow:hidden}
   .news-phi-reader::backdrop{background:#152533b5}
   .news-phi-reader-shell{height:100%;display:flex;flex-direction:column;min-height:0}
   .news-phi-reader-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px;
    border-bottom:1px solid #c8d7df;background:#e8f1f5;font:600 15px/1.35 system-ui,sans-serif}
   .news-phi-reader-title{font-weight:850;flex:1 1 95px}
   .news-phi-reader button,.news-phi-reader a{font:700 14px/1.25 system-ui,sans-serif;min-height:44px;
    display:inline-flex;align-items:center;justify-content:center;padding:10px 13px;border:1px solid #a9c2cf;
    border-radius:10px;background:#fff;color:#16495f;text-decoration:none;cursor:pointer}
   .news-phi-reader button:disabled{opacity:.6;cursor:default}
   .news-phi-reader :is(button,a):focus-visible{outline:3px solid #7b46b8;outline-offset:2px}
   .news-phi-reader-status{flex:1 1 100%;font-size:13px;color:#385563;font-weight:500;overflow-wrap:anywhere}
   .news-phi-reader-frame{flex:1 1 auto;min-height:0;width:100%;border:0;background:#fff}
   @media(max-width:420px){.news-phi-reader-head{gap:7px;padding:8px}.news-phi-reader button,.news-phi-reader a{padding:8px}}
  `;
  document.body.appendChild(style);
  dialog=reader;dialog.className='news-phi-reader';
  dialog.setAttribute('aria-label','News Phi reader with continuous Infinity Radio');
  const shell=make('div',undefined,'news-phi-reader-shell');
  const head=make('header',undefined,'news-phi-reader-head');
  const title=make('strong','News Phi','news-phi-reader-title');
  const play=make('button','▶');play.type='button';play.setAttribute('aria-label','Play or pause Infinity Radio');
  const next=make('button','⏭');next.type='button';next.setAttribute('aria-label','Next Infinity Radio song');
  const close=make('button','Close news');close.type='button';
  external=make('a','Open separately ↗');external.target='_blank';external.rel='noopener noreferrer';
  const status=make('span','Infinity Radio','news-phi-reader-status');status.setAttribute('role','status');
  frame=make('iframe',undefined,'news-phi-reader-frame');frame.title='News Phi articles';
  head.append(title,play,next,close,external,status);shell.append(head,frame);dialog.appendChild(shell);
  document.body.appendChild(dialog);
  const sourcePlay=()=>document.getElementById('irQuickPlay');
  const sourceNext=()=>document.getElementById('irQuickNext');
  const sourceStatus=()=>document.querySelector('#infinityRadioQuick .ir-quick-status');
  const sync=()=>{
   const player=sourcePlay(),skip=sourceNext();
   play.disabled=!player||player.disabled;
   next.disabled=!skip||skip.disabled;
   play.textContent=player?.getAttribute('aria-pressed')==='true'?'Ⅱ':'▶';
   status.textContent=sourceStatus()?.textContent||'Infinity Radio · choose Play to listen';
  };
  play.addEventListener('click',()=>{sourcePlay()?.click();sync()});
  next.addEventListener('click',()=>{sourceNext()?.click();sync()});
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{frame.src='about:blank';previousFocus?.focus?.()});
  if(typeof MutationObserver==='function'){
   const observer=new MutationObserver(sync);
   if(sourcePlay())observer.observe(sourcePlay(),{attributes:true,attributeFilter:['aria-pressed','disabled']});
   if(sourceNext())observer.observe(sourceNext(),{attributes:true,attributeFilter:['disabled']});
   if(sourceStatus())observer.observe(sourceStatus(),{childList:true,characterData:true,subtree:true});
  }
  return sync;
 }
 let syncControls;
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target?.closest?.('a[href]');
  if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
  const url=newsUrl(link.getAttribute('href'));
  if(!url)return;
  // Without native dialog support, keep the original working navigation.
  if(!dialog){
   const reader=document.createElement('dialog');
   if(typeof reader.showModal!=='function')return;
   syncControls=mount(reader);
  }
  event.preventDefault();
  previousFocus=link;
  frame.src=url.href;
  external.href=url.href;
  if(!dialog.open)dialog.showModal();
  syncControls();
 });
})();
