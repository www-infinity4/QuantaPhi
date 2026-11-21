/* Register only approved creator cards in the ORIGINAL Oracle direction viewer.
 * All unlisted cards work from direct links but are deliberately absent here. */
import {paintCard} from '/published-quick-card.js?v=2';
function attachCards(cards){
 const bank=document.getElementById('siteQuickCards');if(!bank||!Array.isArray(cards))return;
 // Building detached avoids one live layout mutation per approved Quick Card.
 const batch=document.createDocumentFragment();
 const queued=new Set();
 let count=0;
 for(const card of cards){
  if(!/^[a-z0-9-]{5,91}$/.test(card?.slug||'')||card.status!=='approved')continue;
  const id='published-'+card.slug;
  // The live bank cannot see elements already prepared in the fragment.
  if(queued.has(id)||bank.querySelector('[data-source-id="'+id+'"]'))continue;
  try{
   const holder=document.createElement('div');holder.className='qcp-published-holder';
   const node=paintCard(holder,card,{embedded:true});if(!node)continue;
   node.classList.add('iqc-card');node.dataset.sourceId=id;node.dataset.sourceName=card.title;
   node.dataset.sourceReady='true';batch.append(node);queued.add(id);count++;
  }catch{/* One malformed creator card must not stop other approved cards. */}
 }
 if(count){
  bank.append(batch);
  window.dispatchEvent(new CustomEvent('quantaphi:source-cards-ready',{detail:{source:'approved-creator-cards',count}}));
 }
}
async function load(){
 try{const r=await fetch('/api/quick-cards?limit=24',{cache:'no-store'});
  if(!r.ok)return;const data=await r.json();if(data.ok)attachCards(data.cards);
 }catch{/* The original viewer keeps working during a creator API outage. */}
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
}
