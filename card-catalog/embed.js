/* Phi Card Catalog runtime: safe, public, opt-in website embeds. */
(function(){'use strict';
const script=document.currentScript;if(!script)return;
const SRC='https://quantaphi.org',MAX_CARDS=12;
function decode(raw){try{return JSON.parse(decodeURIComponent(raw||''))}catch{return null}}
const manifest=decode(script.dataset.phiConfig);
if(!manifest||manifest.schema!=='phi-site-cards/v1'||!Array.isArray(manifest.cards))return;
const origin=location.origin;
const allow=new Set(['search-engine','search-viewer']);
const ids=new Set();
for(const item of manifest.cards.slice(0,MAX_CARDS)){
 if(!item||!allow.has(item.id)||typeof item.instanceId!=='string'||ids.has(item.instanceId))continue;
 ids.add(item.instanceId);
 const holder=document.createElement('section');holder.className='phi-embedded-card';
 const title=String(item.options?.name||'Search').slice(0,60);
 holder.setAttribute('aria-label',title);
 const frame=document.createElement('iframe');
 const url=new URL('/card-catalog/search.html',SRC);
 const mode=String(item.options?.mode||'quanta-style');
 url.search=new URLSearchParams({title,mode:['quanta-style','overview-first','image-first','links-only'].includes(mode)?mode:'quanta-style',viewer:String(item.id==='search-viewer'),parent:origin});
 frame.src=url.href;frame.title=title;frame.loading='lazy';
 frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
 frame.setAttribute('referrerpolicy','no-referrer');
 frame.style.cssText='display:block;width:100%;height:680px;max-height:85vh;min-height:380px;border:1px solid #91b9cb;border-radius:16px;background:#fff;';
 holder.appendChild(frame);script.parentNode.insertBefore(holder,script);
 // Only the actual QuantaPhi frame can send research events back to the site.
 const receive=event=>{
  if(event.origin!==SRC||event.source!==frame.contentWindow)return;
  const detail=event.data;
  if(!detail||!['phi:research:search','phi:research:click'].includes(detail.type))return;
  if(typeof detail.query!=='string'||detail.query.length>200)return;
  const e=new CustomEvent(detail.type,{detail:{instanceId:item.instanceId,query:detail.query,
   title:String(detail.title||'').slice(0,120),url:String(detail.url||'').slice(0,1200),mode:String(detail.mode||'').slice(0,35)}});
  holder.dispatchEvent(e);
 };
 window.addEventListener('message',receive);
}
})();
