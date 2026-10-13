(function(){
'use strict';
const API='https://quantaphi-public-trends.marvaseater.workers.dev';
const catalog={search:['.search','Search'],research:['#result','Research'],reads:['#infiniteBook','Reads & Realms'],physics:['#infinityConcepts','Physics'],story:['#phiStoryWriter','Story Writer'],images:['#phiImageBuilder','Image Generator'],fred:['#fredSpacesRadio','Fred Spaces'],magoo:['#magooSpacesRadio','Magoo Spaces'],'media-star':['#followingSpacesRadio','Media Star'],'media-builder':['#mediaStarCreator','Media Builder'],bubbles:['#bubblesAICard','Bubbles AI'],projects:['#phiProjectActions','Code & Create Phi'],halloween:['#halloweenPhi','Halloween'],shop:['#shopAdPhi','Shop Phi'],radio:['#radioClubhouse','Radio Clubhouse'],media:['#media','Media']};
const host=document.getElementById('publicCardTrends');if(!host)return;
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n};
const heading=el('h2','Live activity & trending cards'),live=el('p','Connecting to shared activity…'),list=el('ol'),detail=el('p','Last 24 hours · Active sessions: last 5 minutes. Counts begin when this tracker launches. Repeated actions are limited to one per card/action per session per minute. These are QuantaPhi counts, separate from Google Analytics.');
host.append(heading,live,list,detail);
let session;try{session=sessionStorage.getItem('quanta:public-session');if(!session){session=crypto.randomUUID();sessionStorage.setItem('quanta:public-session',session)}}catch{session=crypto.randomUUID()}
let queue=[],inflight=false;const seen=new WeakSet(),badges=new Map();
const tracking=()=>navigator.globalPrivacyControl!==true&&navigator.doNotTrack!=='1';
function record(card,action){if(!tracking())return;queue.push({card,action});if(queue.length>100)queue=queue.slice(-100);if(typeof window.gtag==='function')window.gtag('event','card_'+action,{card_id:card})}
async function flush(){if(inflight||document.hidden||!tracking())return;inflight=true;const events=queue.splice(0,20);try{const r=await fetch(API+'/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session,events})});if(!r.ok)queue.unshift(...events)}catch{queue.unshift(...events)}finally{queue=queue.slice(-100);inflight=false}}
function identify(node){const card=node?.closest?.('[data-public-card-id]');if(card)return card.dataset.publicCardId;if(node?.closest?.('.ba-panel,.ba-launcher'))return 'bubbles';return null}
document.addEventListener('click',e=>{if(e.isTrusted!==true||!e.target.closest('button,a'))return;const card=identify(e.target);if(card){const b=e.target.closest('button,a');const text=b.textContent||'';record(card,/uncollect/i.test(text)?'click':/collect/i.test(text)?'collect':/share/i.test(text)?'share':'click')}},true);
document.addEventListener('play',e=>{const card=identify(e.target);if(card)record(card,'play')},true);
const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting&&!seen.has(e.target)){seen.add(e.target);record(e.target.dataset.publicCardId,'view')}},{threshold:.25});
function attach(){for(const [id,[selector]] of Object.entries(catalog)){const node=document.querySelector(selector);if(!node||!node.children.length)continue;if(!node.dataset.publicCardId){node.dataset.publicCardId=id;observer?.observe(node)}if(node.querySelector(':scope > .public-card-count'))continue;const badge=el('p','Activity loading…');badge.className='public-card-count';node.append(badge);badges.set(id,badge)}}
new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});attach();
async function refresh(){if(document.hidden)return;try{const r=await fetch(API+'/summary');if(!r.ok)throw Error();const data=await r.json();if(!data.ok)throw Error();live.textContent=data.activeSessions+' active browser sessions · updated '+new Date(data.updatedAt).toLocaleTimeString();
 const rows=data.cards.map(c=>({...c,interactions:c.click+c.play+c.share+c.collect})).sort((a,b)=>b.interactions-a.interactions||b.view-a.view);list.replaceChildren();
 for(const c of rows){const label=catalog[c.id];if(!label)continue;const totals=c.view+' views · '+c.interactions+' interactions · '+c.play+' plays · '+c.share+' share clicks · '+c.collect+' collect clicks';const badge=badges.get(c.id);if(badge)badge.textContent=totals;if(!c.view&&!c.interactions)continue;const item=el('li'),link=el('a',label[1]);link.href=label[0];item.append(link,el('span',' — '+totals));list.append(item)}
 if(!list.children.length)list.append(el('li','New activity will appear here as people use the cards.'));
 }catch{live.textContent='Shared activity is temporarily unavailable.'}}
setInterval(flush,15000);setInterval(refresh,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){void flush();void refresh()}});void flush();void refresh();
})();
