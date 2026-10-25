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
  const url=previewUrl(card);
  try{
   if(navigator.share){await navigator.share({title:name,text:'Explore the '+name+' interactive Quick Card on QuantaPhi',url});notify(status,'Share sheet opened.');return}
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);notify(status,'Quick Card link copied.');return}
  }catch(error){if(error?.name==='AbortError')return notify(status,'Share cancelled.');}
  const field=element('input','qca-copy');field.value=url;field.readOnly=true;field.setAttribute('aria-label','Copy card link');bar.append(field);field.focus();field.select();
  notify(status,'Select and copy this Quick Card link.');
 });
 b('+1 Build',()=>{
  const request='Build one improvement for the '+name+' QuantaPhi Quick Card. Preserve original graphics and functional controls; use real verified provider sources. Card: '+previewUrl(card)+'. Keep Star, Collect, Share, +1 Build and exactly three title-based search buttons with no generic card search input; preserve the card\'s specific on-card interaction and verify mobile navigation. Verify build results and receipts before marking complete.';
  const builder=document.getElementById('robotDirectionsInput');
  if(builder){
   builder.value=request;builder.dispatchEvent(new Event('input',{bubbles:true}));
   builder.scrollIntoView({block:'center',behavior:'smooth'});builder.focus();
   notify(status,'Build instructions entered. Submit through Bubbles to start the job.');return;
  }
  try{sessionStorage.setItem(STORE_DRAFT,request);location.assign('/#robotDirectionsInput')}catch{notify(status,'Build draft could not be opened.')}
 });
 // One-tap discovery uses the actual subject of this card. A search box belongs
 // only to a dedicated search experience (Google, Bing, catalogs), not every card.
 const category=String(card.category||card.kind||'').toLowerCase();
 const title=String(card.searchTitle||name).trim().slice(0,160);
 const encoded=encodeURIComponent(title);
 const destinations={
  google:'https://www.google.com/search?q='+encoded,
  bing:'https://www.bing.com/search?q='+encoded,
  images:'https://www.google.com/search?tbm=isch&q='+encoded,
  videos:'https://www.youtube.com/results?search_query='+encoded,
  news:'https://news.google.com/search?q='+encoded,
  x:'https://x.com/search?q='+encoded+'&src=typed_query'
 };
 // Preserve a consistent three-search interface while matching the topic:
 // shopping benefits from photos, news from reporting, and video from video.
 const searchKinds=/shopping|product|coin|auction|collect|fashion|real estate|market/.test(category)?
  [['Google','google'],['Images','images'],['Videos','videos']]:
  /news|sport|event|politic/.test(category)?
  [['Google','google'],['News','news'],['X','x']]:
  /music|television|video|radio|film|entertain|sunday|social/.test(category)?
  [['Videos','videos'],['Google','google'],['X','x']]:
  [['Google','google'],['Bing','bing'],['Videos','videos']];
 const quick=element('div','qca-quick-search');
 quick.setAttribute('aria-label','Search for '+title);
 const heading=element('span','qca-search-label','Quick Search · '+title);
 const links=element('div','qca-search-links');
 for(const [label,kind] of searchKinds){
  const link=element('a','qca-button qca-search-link',label);
  link.href=destinations[kind];link.target='_blank';link.rel='noopener noreferrer';
  link.setAttribute('aria-label','Search '+label+' for '+title);
  links.append(link);
 }
 quick.append(heading,links);
 bar.append(controls,quick,status);host.append(bar);return bar;
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
