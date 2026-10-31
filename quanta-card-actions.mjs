import {cardProvider,quickCardManifest} from './quanta-card-provider.mjs';
import {FEED_STORAGE_KEY,cleanFeedState,toggleFollowing} from './quanta-feed-rank.mjs';
import {mountTinyFishCardReader} from './tinyfish-card-reader.mjs';
import {openQuickCardPreview,safeLocalCardUrl,safePreviewImage} from './quick-card-preview.mjs';
import {currentSpotlightCreative,spotlightCardDestination} from './card-spotlight-creative.mjs';
/* Shared actions for QuantaPhi quick cards. No browser sign-in implies API permission. */
const STORE_STARS='quantaPhiCardStarsV1';
const STORE_COLLECT='quantaPhiCollected';
const STORE_DRAFT='quantaPhiBuildDraftV1';
const element=(tag,cls,label)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(label!==undefined)e.textContent=label;return e;};
const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v===null?fallback:v;}catch{return fallback}};
const write=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v));return true}catch{return false}};
function route(card){
 if(card.route?.startsWith('/'))return card.route;
 if(card.id&&card.official)return '/source-quick-card.html?card='+encodeURIComponent(card.id);
 if(card.id&&card.origin==='discovery')return '/quanta-feed-card.html?card='+encodeURIComponent(card.id);
 return location.pathname+location.search;
}
function previewUrl(card,origin=location.origin){return new URL(route(card),origin).href}
export function sharePreviewUrl(card,host,{origin=location.origin}={}){
 // Crawler-rendered card-specific metadata; the destination remains the real
 // interactive card, not an external site or a generic homepage banner.
 const creative=currentSpotlightCreative(host?.closest('article'),card);
 const target=spotlightCardDestination(previewUrl(card,origin),creative,origin),u=new URL('/q-share',origin);
 const name=String(creative?.title||card.name||card.title||card.id||'QuantaPhi Quick Card').slice(0,160);
 u.searchParams.set('kind','quick-card');
 u.searchParams.set('title',name);
 u.searchParams.set('text',String(creative?(creative.description||'Explore '+name+' from '+new URL(creative.url).hostname+' on QuantaPhi.'):card.shareDescription||card.feature||card.description||card.study||card.details||('Open the '+name+' interactive Quick Card.')).replace(/\s+/g,' ').slice(0,420));
 u.searchParams.set('dest',target);
 let visual=creative?.image||card.shareImage||card.ogImage||card.previewImage||card.poster||card.image||card.imageUrl||card.mediaSrc||'';
 if(!visual){
   const picture=host?.closest('article')?.querySelector('img');
   visual=picture?.currentSrc||picture?.src||'';
 }
 const image=safePreviewImage(visual,origin+'/');if(image)u.searchParams.set('image',image);
 return u.href;
}
function notify(host,s){host.textContent=s}
export function mountCardActions(host,card,options={}){
 if(!host||!card)return;
 const id=String(card.id||'').replace(/[^a-z0-9-]/g,'').slice(0,90);
 if(!id)return;
 const name=String(card.name||card.title||id).slice(0,160);
 const provider=cardProvider(card),manifest=quickCardManifest(card);
 const bar=element('section','qca-toolbar');bar.dataset.cardActions=id;bar.dataset.cardCapabilities=JSON.stringify(manifest);bar.setAttribute('aria-label',name+' card actions');
 const controls=element('div','qca-controls'),status=element('p','qca-status','');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const b=(label,fn)=>{const n=element('button','qca-button',label);n.type='button';n.addEventListener('click',fn);controls.append(n);return n};
 const key='quick-card|'+id,followId=id.slice(0,70);
 const followed=()=>cleanFeedState(read(FEED_STORAGE_KEY,{})).following.includes(followId);
 const follow=b(followed()?'✓ Following':'+ Follow',()=>{
  const state=cleanFeedState(read(FEED_STORAGE_KEY,{}));
  const next=toggleFollowing(state,followId);
  if(!write(FEED_STORAGE_KEY,next))return notify(status,'Could not save Follow on this device.');
  const yes=next.following.includes(followId);
  follow.textContent=yes?'✓ Following':'+ Follow';follow.setAttribute('aria-pressed',String(yes));
  notify(status,yes?'Following saved on this device.':'Unfollowed on this device.');
  window.dispatchEvent(new CustomEvent('quantaphi:feed-updated',{detail:{origin:'card-actions',id:followId}}));
 });follow.setAttribute('aria-pressed',String(followed()));
 const starred=()=>Boolean(read(STORE_STARS,{})[id]);
 const star=b(starred()?'★ Starred':'☆ Star',()=>{
  const next={...read(STORE_STARS,{})};
  if(next[id])delete next[id];else next[id]=true;
  if(!write(STORE_STARS,next))return notify(status,'Could not save Star on this device.');
  star.textContent=next[id]?'★ Starred':'☆ Star';
  star.setAttribute('aria-pressed',String(Boolean(next[id])));
  notify(status,next[id]?'Star saved on this device.':'Star removed on this device.');
  window.dispatchEvent(new CustomEvent('quantaphi:card-star',{detail:{id,starred:Boolean(next[id])}}));
 });star.setAttribute('aria-pressed',String(starred()));
 const collected=()=>{const items=read(STORE_COLLECT,[]);return Array.isArray(items)&&items.some(x=>x?.key===key)};
 const collect=b(collected()?'✓ Collected':'+ Collect',()=>{
  if(collected())return notify(status,'Already in your local collection.');
  const items=read(STORE_COLLECT,[]);if(!Array.isArray(items))return notify(status,'Collection is unavailable.');
  const item={key,type:'quick-card',title:name,category:String(card.category||card.kind||'Quick Card'),
   sourceUrl:String(card.featureUrl||card.official||card.url||previewUrl(card)),
   cardUrl:previewUrl(card),collectedAt:new Date().toISOString()};
  if(!write(STORE_COLLECT,[...items,item]))return notify(status,'Could not save collection on this device.');
  collect.textContent='✓ Collected';
  window.dispatchEvent(new CustomEvent('quantaphi:collected',{detail:item}));
  notify(status,'Collected on this device. Cloud sync and coin rewards are not confirmed.');
 });
 // Every public, embeddable card gets the same professional in-site preview.
 // The modal contains the original live controls, not screenshots posing as actions.
 if(options.showPreview!==false&&!new URLSearchParams(location.search).has('preview') && safeLocalCardUrl(previewUrl(card),location.origin+'/')){
  b('◫ Preview',()=>{
   const creative=currentSpotlightCreative(host?.closest('article'),card);
   const ok=openQuickCardPreview({url:spotlightCardDestination(previewUrl(card),creative,location.origin),title:creative?.title||name,
    description:creative?.description||card.shareDescription||card.description||card.feature||card.study||'',
    image:creative?.image||card.shareImage||card.image||card.poster||card.mediaSrc||'',
    official:creative?.url||card.official||card.website||'',
    previewMode:card.previewMode});
   if(!ok)notify(status,'This card uses its original full-page viewer.');
  });
 }
 b('↗ Share',async()=>{
  const url=sharePreviewUrl(card,host);
  const sharedName=new URL(url).searchParams.get('title')||name;
  try{
   if(navigator.share){await navigator.share({title:sharedName,text:'Explore the '+sharedName+' interactive Quick Card on QuantaPhi',url});notify(status,'Share sheet opened.');return}
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);notify(status,'Quick Card link copied.');return}
  }catch(error){if(error?.name==='AbortError')return notify(status,'Share cancelled.');}
  const field=element('input','qca-copy');field.value=url;field.readOnly=true;field.setAttribute('aria-label','Copy card link');bar.append(field);field.focus();field.select();
  notify(status,'Select and copy this Quick Card link.');
 });
 if(provider){
  const signin=element('a','qca-button qca-signin',provider.hasDedicatedSignin?'Sign in with '+provider.name:'Open '+provider.name+' to sign in');
  signin.href=provider.signin;signin.target='_blank';signin.rel='noopener noreferrer';
  signin.setAttribute('aria-label','Open the real '+provider.name+' sign-in on its official site');
  signin.addEventListener('click',()=>notify(status,provider.name+' sign-in opens at the original site. This does not connect an account to Bubbles.'));
  controls.append(signin);
  if(provider.connector){
   const connect=element('a','qca-button qca-connect','Connect to Bubbles');
   connect.href='/bubbles-accounts.html';connect.setAttribute('aria-label','Manage '+provider.name+' permissions in Bubbles');
   controls.append(connect);
  }
  if(provider.compose){
   const compose=element('a','qca-button qca-compose','Write on '+provider.name);
   compose.href=provider.compose;compose.target='_blank';compose.rel='noopener noreferrer';
   compose.setAttribute('aria-label','Compose directly on '+provider.name+' with your own account');
   controls.append(compose);
  }
 }
 b('+1 Build',()=>{
  const request='Build one improvement for the '+name+' QuantaPhi Quick Card. Preserve original graphics and functional controls; use real verified provider sources. Card: '+previewUrl(card)+'. Keep Star, Collect, Share, +1 Build and Quick Search. Verify build results and receipts before marking complete.';
  const builder=document.getElementById('robotDirectionsInput');
  if(builder){
   builder.value=request;builder.dispatchEvent(new Event('input',{bubbles:true}));
   builder.scrollIntoView({block:'center',behavior:'smooth'});builder.focus();
   notify(status,'Build instructions entered. Submit through Bubbles to start the job.');return;
  }
  try{sessionStorage.setItem(STORE_DRAFT,request);location.assign('/#robotDirectionsInput')}catch{notify(status,'Build draft could not be opened.')}
 });
 // The shared reader returns actual website content in this card.
 // Account sign-in remains on the original provider until a session is connected.
 let original=null;
 try{const u=new URL(card.official||card.website||card.url||'');if(u.protocol==='https:'&&!u.username&&!u.password)original=u.href}catch{}
 if(original&&options.showOriginal!==false){const open=element('a','qca-button qca-source','↗ Open original website');open.href=original;open.target='_blank';open.rel='noopener noreferrer';controls.append(open)}
 bar.append(controls);if(options.websiteReader!==false)mountTinyFishCardReader(bar,card);bar.append(status);host.append(bar);return bar;
}
function restoreDraft(){
 let request;try{request=sessionStorage.getItem(STORE_DRAFT)}catch{return}
 if(!request)return;
 const box=document.getElementById('robotDirectionsInput');if(!box)return;
 box.value=request;box.dispatchEvent(new Event('input',{bubbles:true}));
 try{sessionStorage.removeItem(STORE_DRAFT)}catch{}
 box.scrollIntoView({block:'center'});box.focus();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restoreDraft,{once:true});
 else restoreDraft();
}
