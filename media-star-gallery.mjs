/* Public Media Star gallery: authentic approved cards, no fake radio or paid clicks.
 * The interest matcher reads the page's search box only on the visitor's tap;
 * it does not persist private search history or mint StarCoins.
 */
import {rankPublicMediaStars,extractPublicInterest} from './media-star-gallery-core.mjs';
const root=document.getElementById('mediaStarGallery');
if(root){
 const endpoint=String(window.PhiMediaStarGalleryEndpoint||'').replace(/\/$/,'');
 const status=document.getElementById('mediaStarGalleryStatus');
 const cardsNode=document.getElementById('mediaStarGalleryCards');
 const match=document.getElementById('mediaStarGalleryMatch');
 let approved=[],explicitTerms=[],request=0;
 let sessionId;
 try{
  sessionId=sessionStorage.getItem('phi-media-star-gallery-session');
  if(!/^[0-9a-f-]{36}$/i.test(sessionId||'')){
   sessionId=crypto.randomUUID();sessionStorage.setItem('phi-media-star-gallery-session',sessionId);
  }
 }catch{sessionId=crypto.randomUUID()}
 const impressions=new Set(),visible=new Set(),timers=new Map();
 let viewport=null;
 const send=(contentId,kind)=>{
  if(!/^https:\/\/[A-Za-z0-9.-]+$/.test(endpoint))return;
  void fetch(endpoint+'/v1/events',{method:'POST',mode:'cors',credentials:'omit',keepalive:true,
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({eventId:crypto.randomUUID(),sessionId,contentId,kind})}).catch(()=>{});
 };
 const schedule=(article,id)=>{
  clearTimeout(timers.get(id));
  timers.set(id,setTimeout(()=>{
   const picture=article.querySelector('.msg-photo');
   if(!impressions.has(id)&&visible.has(id)&&document.visibilityState==='visible'&&!article.hidden&&
    picture?.complete&&picture.naturalWidth>0){
    impressions.add(id);send(id,'impression');
   }
  },750));
 };
 function observe(){
  viewport?.disconnect();
  visible.clear();
  for(const timer of timers.values())clearTimeout(timer);
  timers.clear();
  if(typeof IntersectionObserver==='undefined')return;
  viewport=new IntersectionObserver(entries=>{
   for(const entry of entries){
    const id=entry.target.dataset.mediaStarId;
    if(!id)continue;
    if(entry.isIntersecting&&entry.intersectionRatio>=.5){
     visible.add(id);if(!impressions.has(id))schedule(entry.target,id);
    }else{visible.delete(id);clearTimeout(timers.get(id))}
   }
  },{threshold:[0,.5,1]});
  for(const article of cardsNode.querySelectorAll('.msg-card'))viewport.observe(article);
 }
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){
   visible.clear();for(const timer of timers.values())clearTimeout(timer);
  }
 });
 const el=(tag,cls,value)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=String(value);
  return node;
 };
 const link=(text,href)=>{
  const a=el('a','msg-link',text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;
 };
 const valid=(raw)=>{
  try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&u.href===raw?u.href:null}catch{return null}
 };
 function render(){
  cardsNode.replaceChildren();
  const ranked=rankPublicMediaStars(approved,{interestTerms:explicitTerms});
  if(!ranked.length){
   status.textContent='No approved Media Stars are available from this feed yet. Build yours and submit for review.';
   return;
  }
  status.textContent=explicitTerms.length
   ?'Approved Media Stars, ranked for this search: '+explicitTerms.join(', ')+'. No browsing history was saved.'
   :'Approved public Media Stars. Tap Match My Search to rank by the words you enter.';
  for(const item of ranked.slice(0,18)){
   const source=valid(item.sourceUrl),image=valid(item.imageUrl);
   if(!source||!image)continue;
   const article=el('article','msg-card');
   article.setAttribute('data-media-star-id',item.id);
   const img=el('img','msg-photo');img.src=image;img.loading='lazy';img.decoding='async';
   img.alt=item.title+' · creator-supplied image reviewed for publication';
   img.onerror=()=>{article.hidden=true;};
   img.addEventListener('load',()=>{if(visible.has(item.id)&&!impressions.has(item.id))schedule(article,item.id)});
   article.append(img);
   const body=el('div','msg-body');
   body.append(el('h3','',item.title),el('p','',item.description||''));
   const tags=el('p','msg-topics',item.topics.slice(0,5).join(' · '));body.append(tags);
   const actions=el('div','msg-actions');
   const ext=(/\.(mp3|m4a|ogg|wav|aac)(?:\?|$)/i).test(source);
   const video=(/\.(mp4|webm|ogv)(?:\?|$)/i).test(source);
   if(item.mediaMode==='linked_audio'&&ext){
    const audio=el('audio','msg-audio');audio.controls=true;audio.preload='none';audio.src=source;
    audio.setAttribute('aria-label','Play '+item.title+' in QuantaPhi');
    audio.addEventListener('play',()=>send(item.id,'play_intent'));
    body.append(audio);
    actions.append(el('span','msg-note','Licensed source link · audio begins only when you press play'));
   }else if(item.mediaMode==='linked_video'&&video){
    const player=el('video','msg-video');player.controls=true;player.preload='none';player.playsInline=true;player.src=source;
    player.setAttribute('aria-label','Play '+item.title+' in QuantaPhi');body.append(player);
    player.addEventListener('play',()=>send(item.id,'play_intent'));
   }else{
    actions.append(link('Open original publisher media',source));
    actions.append(el('span','msg-note','An in-page player has not been authorized for this source'));
   }
   const more=el('a','msg-creator-link','Build a Media Star like this');
   more.href='#mediaStarCreator';actions.append(more);
   body.append(actions);article.append(body);cardsNode.append(article);
   article.addEventListener('click',event=>{if(event.isTrusted&&event.target?.closest?.('.msg-actions a'))send(item.id,'click')});
  }
  if(!cardsNode.children.length)status.textContent='No approved Media Stars have usable original images and media links.';
  observe();
 }
 async function load(){
  const current=++request;
  if(!/^https:\/\/[A-Za-z0-9.-]+$/.test(endpoint)){
   status.textContent='No approved Media Stars are connected yet. Build yours below; publication requires review.';
   return;
  }
  status.textContent='Looking for rights-reviewed public Media Stars…';
  try{
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
   let res;try{res=await fetch(endpoint+'/v1/cards',{cache:'no-store',signal:ctrl.signal})}finally{clearTimeout(timer)}
   const data=await res.json();
   if(!res.ok||!data.ok||!Array.isArray(data.cards)||data.source!=='rights_reviewed_gallery')throw Error('unverified_catalog');
   if(current!==request)return;
   approved=data.cards;render();
  }catch{
   if(current!==request)return;
   approved=[];cardsNode.replaceChildren();
   status.textContent='Verified public Media Star catalog is unavailable. No invented cards or view counts are displayed.';
  }
 }
 const step=direction=>{
  const first=cardsNode.querySelector('.msg-card:not([hidden])');
  const size=(first?.getBoundingClientRect().width||cardsNode.clientWidth)+14;
  cardsNode.scrollBy({left:direction*size,behavior:'smooth'});
 };
 document.getElementById('mediaStarGalleryPrev')?.addEventListener('click',()=>step(-1));
 document.getElementById('mediaStarGalleryNext')?.addEventListener('click',()=>step(1));
 match?.addEventListener('click',()=>{
  const q=String(document.getElementById('q')?.value||'');
  explicitTerms=extractPublicInterest(q,true);
  render();
  if(!explicitTerms.length)status.textContent='Enter an interest in the QuantaPhi search box, such as football, then tap Match My Search.';
 });
 void load();
}
