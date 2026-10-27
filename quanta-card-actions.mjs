import {cardProvider,providerSearchUrl,quickCardManifest} from './quanta-card-provider.mjs';
import {mountTinyfishCard} from './quanta-tinyfish-card.mjs';
import {FEED_STORAGE_KEY,cleanFeedState,toggleFollowing} from './quanta-feed-rank.mjs';
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
function previewUrl(card){return new URL(route(card),location.origin).href}
function sharePreviewUrl(card){
 // The QuantaPhi edge renders distinct real OG/Twitter metadata on /q-share
 // even for an original Oracle card whose visible route is homepage ?card=id.
 const target=previewUrl(card),u=new URL('/q-share',location.origin);
 u.searchParams.set('kind','quick-card');
 u.searchParams.set('title',String(card.name||card.title||card.id||'QuantaPhi Quick Card').slice(0,120));
 u.searchParams.set('text',String(card.feature||card.description||card.study||'Open this original interactive QuantaPhi Quick Card.').slice(0,230));
 u.searchParams.set('dest',target);
 let visual=card.image||card.imageUrl||card.mediaSrc||'';
 try{
  const image=new URL(visual,location.origin);
  if(image.protocol==='https:'&&/\\.(png|jpe?g|webp|gif)$/i.test(image.pathname))u.searchParams.set('image',image.href);
 }catch{}
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
 b('↗ Share',async()=>{
  const url=sharePreviewUrl(card);
  try{
   if(navigator.share){await navigator.share({title:name,text:'Explore the '+name+' interactive Quick Card on QuantaPhi',url});notify(status,'Share sheet opened.');return}
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
 // Only a verified provider search URL earns an on-card search bar.
 // A general card must not silently send its search to Google and pretend
 // that a connected TinyFish browser or the original website produced it.
 const verifiedSearch=providerSearchUrl(provider,'example');
 if(options.showSearch!==false&&verifiedSearch&&!['google','bing'].includes(card.id)){
  const search=element('form','qca-search'),q=element('input','qca-search-input');
  q.type='search';q.placeholder='Search '+provider.name+'…';q.required=true;q.maxLength=180;
  q.setAttribute('aria-label','Search '+provider.name);
  const submit=element('button','qca-button qca-search-submit','⌕ Quick Search');submit.type='submit';
  search.append(q,submit);search.addEventListener('submit',event=>{
   event.preventDefault();const value=q.value.trim();if(!value)return;
   const destination=providerSearchUrl(provider,value);
   if(!destination)return notify(status,'Original provider search is unavailable.');
   window.open(destination,'_blank','noopener,noreferrer');
  });
  bar.append(search);
 }else if(options.showSearch!==false){
  // This is a real original-source handoff, not a pretend search result.
  let source=null;
  try{const u=new URL(card.official||card.website||card.url||'',location.origin);
   if(u.protocol==='https:'&&u.origin!==location.origin&&!u.username&&!u.password)source=u.href;
  }catch{}
  if(source){
   const open=element('a','qca-button qca-source','↗ Open original website');
   open.href=source;open.target='_blank';open.rel='noopener noreferrer';controls.append(open);
  }
 }
 bar.append(controls);bar.append(status);host.append(bar);mountTinyfishCard(host,card);return bar;
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
