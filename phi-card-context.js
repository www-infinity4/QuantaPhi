/* QuantaPhi card context: same-tab topic and source, never payment or account state. */
(function(root){
'use strict';
const KEY='phi_card_context_v1',TTL=1800000;
const text=(v,n=140)=>String(v||'').replace(/[<>\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
function topic(v){const s=text(v);return /@|https?:\/\/|(?:\d[ -]?){8,}/.test(s)?'':s}
function read(){
 let p;try{p=JSON.parse(root.sessionStorage?.getItem(KEY)||'null')}catch{return null}
 if(!p||p.schemaVersion!==1||p.expiresAt<=Date.now()||!topic(p.topic)){try{root.sessionStorage?.removeItem(KEY)}catch{}return null}
 return {...p};
}
function publish(input={}){
 const t=topic(input.topic);if(!t)return null;
 const old=read(),source=text(input.sourceCard||'search',32);
 if(old?.topic===t&&old.sourceCard===source)return old;
 const now=Date.now(),record={schemaVersion:1,topic:t,sourceCard:source,intent:text(input.intent||'research',30),
 summary:topic(input.summary)?.slice(0,240)||'',entities:[...new Set((t.match(/[A-Za-z][A-Za-z-]{2,}/g)||[]).map(v=>v.toLowerCase()))].slice(0,8),
 updatedAt:now,expiresAt:now+TTL};
 try{root.sessionStorage?.setItem(KEY,JSON.stringify(record))}catch{}
 root.dispatchEvent(new CustomEvent('phi:card-context:update',{detail:record}));return record;
}
function clear(){try{root.sessionStorage?.removeItem(KEY)}catch{}root.dispatchEvent(new CustomEvent('phi:card-context:update',{detail:null}))}
function subscribe(fn){const listener=e=>fn(e.detail);root.addEventListener('phi:card-context:update',listener);return()=>root.removeEventListener('phi:card-context:update',listener)}
root.PhiCardContext={read,getSnapshot:read,publish,clear,subscribe};
function wire(){
 const q=document.getElementById('q'),go=document.getElementById('go'),book=document.getElementById('infiniteBook');
 const search=()=>{if(q?.value)publish({topic:q.value,sourceCard:'search'})};
 go?.addEventListener('click',search);
 q?.addEventListener('keydown',e=>{if(e.key==='Enter')search()});
 q?.addEventListener('search',search);
 if(book&&root.MutationObserver){
  let previous='';
  const observe=()=>{const title=topic(book.querySelector('.ib-title')?.textContent);
   if(title&&title!==previous&&!/^(loading|untitled|reads? and realms)$/i.test(title)){previous=title;publish({topic:title,sourceCard:'story',intent:'illustration',summary:book.querySelector('.ib-summary')?.textContent})}};
  const obs=new root.MutationObserver(observe);obs.observe(book,{subtree:true,childList:true,characterData:true});
 }
 if(!read()&&q?.value)search();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})(window);
