import {socialShareUrl,shareImage,cardAction} from './card-social-share.mjs';
/* Shared actions for QuantaPhi quick cards. Client actions must never imply a wallet payout or runner receipt. */
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
function contextualImage(host,card){
 const direct=shareImage(card.image||card.photo||'');
 if(direct)return direct;
 // Search within THIS card, not the full document: nearby cards may belong to
 // different brands/products in the Oracle carousel.
 const surface=host.closest('.premium-selected, .qbp-product-card, .iqc-card, .qcp-card, article')
  ||host.closest('.oracle-card-deck-stage')||host.parentElement;
 for(const selector of ['img.qbp-photo','img.premium-photo','img.qcp-art','img.iam-photo',
  'img.qcx-google-wordmark','img.qcx-fox-one-logo','img']){
  const img=surface?.querySelector(selector);
  const uri=shareImage(img?.currentSrc||img?.src||'');
  if(uri)return uri;
 }
 return '';
}
function notify(host,s){host.textContent=s}
export function mountCardActions(host,card){
 if(!host||!card)return;
 const id=String(card.id||'').replace(/[^a-z0-9-]/g,'').slice(0,90);
 if(!id)return;
 const name=String(card.name||card.title||id).slice(0,160);
 const bar=element('section','qca-toolbar');bar.dataset.cardActions=id;bar.setAttribute('aria-label',name+' card actions');
 const controls=element('div','qca-controls'),status=element('p','qca-status','');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const b=(label,fn)=>{const n=element('button','qca-button',label);n.type='button';n.addEventListener('click',fn);controls.append(n);return n};
 const stars=read(STORE_STARS,{}),key='quick-card|'+id;
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
  const url=socialShareUrl({...card,id,name},{origin:location.origin,
   image:contextualImage(host,card),destination:route(card)});
  try{
   if(navigator.share){await navigator.share({title:name,text:cardAction(card)+' · '+name,url});notify(status,'Share sheet opened.');return}
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);notify(status,'Interactive card share link copied.');return}
  }catch(error){if(error?.name==='AbortError')return notify(status,'Share cancelled.');}
  const field=element('input','qca-copy');field.value=url;field.readOnly=true;field.setAttribute('aria-label','Copy card link');bar.append(field);field.focus();field.select();
  notify(status,'Select and copy this product-specific Quick Card link.');
 });
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
 const search=element('form','qca-search'),q=element('input','qca-search-input');
 q.type='search';q.placeholder='Quick search '+name+'…';q.required=true;q.maxLength=180;q.setAttribute('aria-label','Find within '+name+' card');
 const submit=element('button','qca-button qca-search-submit','⌕ Quick Search');submit.type='submit';
 search.append(q,submit);search.addEventListener('submit',event=>{
  event.preventDefault();const value=q.value.trim();if(!value)return;
  const destination='/infinity-search-results.html?'+new URLSearchParams({engine:'google',q:name+' '+value});
  if(typeof window.QuantaOpenSite==='function'){
   const a=element('a');a.href=destination;a.dataset.siteUrl=destination;a.dataset.siteTitle=name+' · Quick Search';
   try{window.QuantaOpenSite(a);return}catch{}
  }
  location.assign(destination);
 });
 bar.append(controls,search,status);host.append(bar);return bar;
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
