/* Public source previews. Private searches, account data and wallet balances never
 * leave the device. Prices require recently checked, structured source offers. */
import {FEED_STORAGE_KEY,cleanFeedState} from './quanta-feed-rank.mjs';
import {rememberSpotlightCreative,forgetSpotlightCreative,requestedSpotlight} from './card-spotlight-creative.mjs';
const BROKER='https://orange-brook-a2ac.marvaseater.workers.dev/search';
const DATA=['/data/quick-card-spotlights-latest.json','https://raw.githubusercontent.com/www-infinity4/QuantaPhi/trends-rss-data/data/quick-card-spotlights-latest.json'];
const TTL=15*60*1000,DAY=86400000;
const cache=new Map();let snapshotPromise=null,snapshotAt=0;
const text=(v,n=180)=>String(v||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,n);
export function publicImageUrl(value){
 try{const u=new URL(value),h=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.port||h==='localhost'||h.endsWith('.local')||!h.includes('.')||/^[\d.]+$/.test(h)||h.includes(':'))return null;
  return u.href.length<=1800?u.href:null;
 }catch{return null}
}
export function sourceUrl(value,official){
 try{const u=new URL(value),base=new URL(official),h=base.hostname.replace(/^www\./,'');
  return publicImageUrl(value)&&(u.hostname===h||u.hostname.endsWith('.'+h))?u.href:null;
 }catch{return null}
}
export function normalizeSpotlights(payload,card,now=Date.now()){
 if(!payload||payload.schema_version!==1||!Array.isArray(payload.items))return [];
 const seen=new Set();return payload.items.flatMap(row=>{
  const url=sourceUrl(row?.url,card.official),image=publicImageUrl(row?.image);
  const checked=Date.parse(row?.checked_at),title=text(row?.title),key=url+'|'+image;
  if(!url||!image||/logo|favicon|goldenarches|android-chrome|\/icons?\/|sprite|tracking|pixel/i.test(new URL(image).pathname)||!title||seen.has(key)||!Number.isFinite(checked)||checked>now+300000||now-checked>7*DAY)return [];
  seen.add(key);
  let price='';const offer=row.offer;
  if(now-checked<=DAY&&offer&&offer.evidence==='jsonld-offer'&&/^[A-Z]{3}$/.test(offer.currency||'')&&
   /^\d{1,9}(\.\d{1,2})?$/.test(String(offer.price))&&Number(offer.price)>0&&
   (!offer.valid_until||Date.parse(offer.valid_until)>=now)&&(!offer.valid_from||Date.parse(offer.valid_from)<=now)&&
   !/OutOfStock|Discontinued|SoldOut/i.test(offer.availability||'')){
   try{price=new Intl.NumberFormat(undefined,{style:'currency',currency:offer.currency}).format(Number(offer.price))}catch{}
  }
  return [{url,image,title,description:text(row.description,260),checked_at:row.checked_at,
   category:text(row.category||card.category,90),price,price_expires_at:price?Math.min(checked+DAY,offer?.valid_until?Date.parse(offer.valid_until):Infinity):0,kind:row.kind==='product'?'Product':'Website spotlight',
   source:new URL(url).hostname,method:row.method==='indexed'?'Indexed preview':'Source page',id:key}];
 }).slice(0,12);
}
export function visibleSpotlightPrice(row,now=Date.now()){
 const deadline=Math.min(Date.parse(row?.checked_at)+DAY,row?.price_expires_at||Infinity);
 return row?.price&&Number.isFinite(deadline)&&now<=deadline?row.price:'';
}
export function chooseSpotlight(items,{seen=[],interests=[],last=''}={}){
 const used=new Set(seen);let pool=items.filter(x=>x.id!==last&&!used.has(x.id));
 if(!pool.length)pool=items.filter(x=>x.id!==last);if(!pool.length)pool=items;
 const words=interests.flatMap(v=>text(v,90).toLowerCase().match(/[a-z]{4,}/g)||[]).slice(0,100);
 const score=x=>(x.kind==='Product'?2:0)+words.reduce((n,w)=>n+Number((x.title+' '+x.category+' '+x.description).toLowerCase().includes(w)),0);
 return [...pool].sort((a,b)=>score(b)-score(a)||Date.parse(b.checked_at)-Date.parse(a.checked_at))[0]||null;
}
async function snapshot(){
 if(snapshotPromise&&Date.now()-snapshotAt<TTL)return snapshotPromise;
 snapshotAt=Date.now();snapshotPromise=(async()=>{
  let newest=null;
  for(const endpoint of DATA){try{
   const r=await fetch(endpoint+'?checked='+Date.now(),{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(9000)});
   if(!r.ok)continue;const d=await r.json(),t=Date.parse(d.checked_at);
   if(d.schema_version===1&&d.cards&&Number.isFinite(t)&&t<=Date.now()+300000){return d;}
  }catch{}}
  return newest;
 })();return snapshotPromise;
}
export async function fetchSpotlights(card,fetcher=fetch){
 const previous=cache.get(card.id);if(previous&&Date.now()-previous.at<TTL)return previous.items;
 const feed=fetcher===fetch?await snapshot():null;
 let items=normalizeSpotlights(feed?.cards?.[card.id],card);
 // A verified published photo should appear immediately; do not wait for a second search.
 if(items.length){cache.set(card.id,{at:Date.now(),items});return items;}
 // A public, domain-restricted image search fills gaps between scheduled checks.
 // Search snippets never become product prices or claimed discounts.
 try{
  const intent=['Shopping','Restaurants','Auctions','Trading cards'].includes(card.category)?' listings':' source photos';
  const q='site:'+new URL(card.official).hostname.replace(/^www\./,'')+' '+text(card.query||card.feature||card.name,100)+intent;
  const url=BROKER+'?'+new URLSearchParams({q,format:'json',categories:'images',safesearch:'1'});
  const r=await fetcher(url,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(r.ok){const data=await r.json();const indexed=normalizeSpotlights({schema_version:1,items:(data.results||[]).slice(0,35).map(row=>({
   url:row.url,image:row.img_src||row.thumbnail_src||row.thumbnail,title:row.title,
   description:row.content||row.description,category:card.category,checked_at:new Date().toISOString(),method:'indexed'
  }))},card);const known=new Set(items.map(x=>x.id));items.push(...indexed.filter(x=>!known.has(x.id)));}
 }catch{}
 cache.set(card.id,{at:Date.now(),items:items.slice(0,12)});return items.slice(0,12);
}
const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value)n.textContent=value;return n};
function css(){if(document.querySelector('link[data-quick-spotlights]'))return;
 const link=el('link');link.rel='stylesheet';link.href=new URL('./quick-card-spotlights.css?v=20261030-rotate1',import.meta.url).href;link.dataset.quickSpotlights='true';document.head.append(link);
}
export function mountRotatingSpotlights(article,card,{onEmpty}={}){
 if(!article||card.nonTargeted||article.dataset.personalization==='disabled')return;css();
 const panel=el('section','qcs-panel');panel.hidden=true;panel.setAttribute('aria-label',card.name+' changing source spotlights');
 const visual=el('div','qcs-visual'),meta=el('p','qcs-meta'),title=el('h3','qcs-title'),desc=el('p','qcs-desc'),price=el('p','qcs-price');
 const open=el('a','qcs-open','View at original source ↗');open.target='_blank';open.rel='noopener noreferrer';
 const nav=el('div','qcs-nav'),next=el('button','','Next offer ›'),pause=el('button','','Pause'),count=el('span','qcs-count');next.type=pause.type='button';
 nav.append(count,pause,next);panel.append(visual,meta,title,desc,price,open,nav);
 const header=article.querySelector('.iac-title,.qbp-head,.premium-heading');if(header)header.before(panel);else article.prepend(panel);
 const key='quanta:spotlight:'+card.id+':v1';let history={seen:[],last:''};try{history=JSON.parse(localStorage.getItem(key))||history}catch{}
 if(!Array.isArray(history.seen))history={seen:[],last:''};
 let requested=new URLSearchParams(location.search).get('spotlight')||'';
 let items=[],active=false,loading=false,lastFetch=0,current=null,paused=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false,hover=false;
 const isVisible=()=>!document.hidden&&article.isConnected&&article.getClientRects().length>0;
 function show({advance=false}={}){
  if(advance)requested='';
  if(article.dataset.spotlightManual==='true')return;
  if(items.length&&items.every(x=>history.seen.includes(x.id)))history={seen:[],last:history.last};
  let state;try{state=cleanFeedState(JSON.parse(localStorage.getItem(FEED_STORAGE_KEY)))}catch{state=cleanFeedState({})}
  // Use explicit follows and bounded card categories; never raw searches.
  const interests=state.following.concat(Object.keys(state.counts).sort((a,b)=>state.counts[b]-state.counts[a]).slice(0,12));
  const row=requestedSpotlight(items,requested,card.official)||chooseSpotlight(items,{...history,interests});if(!row)return;
  current=row;history={seen:[...history.seen.filter(x=>x!==row.id),row.id].slice(-items.length),last:row.id};
  try{localStorage.setItem(key,JSON.stringify(history))}catch{}
  visual.replaceChildren();const image=el('img','qcs-photo');image.alt=row.title;image.decoding='async';image.referrerPolicy='no-referrer';
  image.hidden=true;
  image.addEventListener('load',()=>{if(image.isConnected)image.hidden=false},{once:true});
  const broken=()=>{items=items.filter(x=>x.id!==row.id);if(current!==row)return;
   if(items.length)show();else{panel.hidden=true;article.classList.remove('qcs-has-items');forgetSpotlightCreative(article)}
  };
  image.addEventListener('error',broken,{once:true});image.src=row.image;visual.append(image);
  if(image.complete&&image.naturalWidth===0)broken();
  title.textContent=row.title;desc.textContent=row.description;updatePrice();
  meta.textContent='∞ INFINITY · '+row.method+' · '+row.source+' · checked '+new Date(row.checked_at).toLocaleString();
  open.href=row.url;open.textContent=(row.kind==='Product'?'Shop this item':'View this spotlight')+' ↗';
  count.textContent=items.length+' source choices';next.disabled=items.length<2;pause.hidden=items.length<2;
  pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(paused));
  panel.hidden=false;article.classList.add('qcs-has-items');article.dataset.currentSpotlight=row.url;
  rememberSpotlightCreative(article,card,row);
 }
 function updatePrice(){const amount=visibleSpotlightPrice(current);price.textContent=amount?amount+' · source price':'See current price and availability at the source'}
 async function refresh(){if(loading||Date.now()-lastFetch<TTL)return;loading=true;
  try{const result=await fetchSpotlights(card);lastFetch=Date.now();if(result.length){items=result;if(isVisible()&&!panel.contains(document.activeElement))show()}else onEmpty?.()}
  finally{loading=false}
 }
 function activate(){active=true;if(!items.length||Date.now()-lastFetch>=TTL)void refresh();else if(!panel.contains(document.activeElement))show()}
 article.addEventListener('oracle:activate',activate);
 const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{
  active=entries.some(x=>x.isIntersecting);if(active)activate();
 });observer?.observe(article);
 next.addEventListener('click',()=>show({advance:true}));pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(paused))});
 panel.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')hover=true});panel.addEventListener('pointerleave',()=>{hover=false});
 document.addEventListener('visibilitychange',()=>{if(active&&isVisible()){updatePrice();void refresh()}});
 const timer=setInterval(()=>{
  if(!article.isConnected){clearInterval(timer);observer?.disconnect();return}
  if(active&&isVisible()){updatePrice();if(Date.now()-lastFetch>=TTL)void refresh();
   if(items.length>1&&!paused&&!hover&&!panel.contains(document.activeElement))show({advance:true});}
 },20000);
 return {panel,refresh,next};
}
