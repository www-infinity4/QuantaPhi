/* First-party Media Star card interactions.
 * Captures visible-card impressions and trusted browser UI clicks only.
 * Network records are browser observations, NOT independently proven humans.
 * Disabled until production config sets window.PhiExecutorInsightsEndpoint.
 */
(()=>{
 'use strict';
 const endpoint=String(window.PhiExecutorInsightsEndpoint||'').replace(/\/$/,'');
 if(!/^https:\/\/[A-Za-z0-9.-]+$/.test(endpoint))return;
 const mounts=[['fredSpacesRadio','fred-spaces'],['followingSpacesRadio','following-spaces'],['mediaStarCreator','media-star-creator'],['mediaStarGallery','media-star']];
 const place=location.pathname.includes('card-host')?'quick_card':location.pathname.includes('bubbles')?'bubbles':'homepage';
 let sessionId;
 try{
  sessionId=sessionStorage.getItem('phi-media-star-session-v1');
  if(!/^[0-9a-f-]{36}$/i.test(sessionId||'')){sessionId=crypto.randomUUID();sessionStorage.setItem('phi-media-star-session-v1',sessionId)}
 }catch{sessionId=crypto.randomUUID()}
 const once=new Set(),visible=new Set(),pending=new Map();
 const submit=(kind,cardId)=>{
  if(document.visibilityState==='hidden'&&kind==='impression')return;
  const data={eventId:crypto.randomUUID(),sessionId,cardId,kind,placement:place};
  void fetch(endpoint+'/v1/media-star/event',{method:'POST',mode:'cors',credentials:'omit',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).catch(()=>{});
 };
 function observeCard(root,cardId,observer){
  if(once.has(cardId)||!root.querySelector('a,button'))return;
  const timer=setTimeout(()=>{
   if(visible.has(cardId)&&document.visibilityState==='visible'&&!once.has(cardId)){
    once.add(cardId);submit('impression',cardId);observer.unobserve(root);
   }
  },750);
  pending.set(cardId,timer);
 }
 document.addEventListener('DOMContentLoaded',()=>{
  if(!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries){
    const cardId=mounts.find(([id])=>id===entry.target.id)?.[1];
    if(!cardId)continue;
    clearTimeout(pending.get(cardId));
    if(entry.isIntersecting&&entry.intersectionRatio>=.5){visible.add(cardId);observeCard(entry.target,cardId,observer)}
    else visible.delete(cardId);
   }
  },{threshold:[0,.5,1]});
  const mutation=new MutationObserver(()=>{
   for(const [id,cardId] of mounts){
    const root=document.getElementById(id);
    if(root&&visible.has(cardId)&&!once.has(cardId))observeCard(root,cardId,observer);
   }
  });
  for(const [id] of mounts){
   const root=document.getElementById(id);
   if(root){observer.observe(root);mutation.observe(root,{childList:true,subtree:true})}
  }
  document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='hidden'){visible.clear();for(const t of pending.values())clearTimeout(t)}
  });
 });
 document.addEventListener('click',event=>{
  if(!event.isTrusted)return;
  const action=event.target?.closest?.('a,button');
  if(!action)return;
  const pair=mounts.find(([id])=>action.closest('#'+id));
  if(!pair)return;
  const cardId=pair[1];
  submit('card_click',cardId);
  if(action.matches('.fs-play,.fsr-play,[data-media-star-play]'))submit('play_intent',cardId);
 },true);
})();
