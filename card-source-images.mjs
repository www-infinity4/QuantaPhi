/* Source-backed Quick Card imagery.
 * Real publisher-hosted photographs first; verified catalog artwork second;
 * source icon when a publisher blocks a preview. Never invent products,
 * claim a sponsored ad, or copy private account content.
 */
import {fetchSpotlights, publicImageUrl} from './quick-card-spotlights.mjs';

const IDENTITY=/logo|favicon|brandmark|og[-_]?image|ogimage|opengraph|social[-_]?share|social[-_]?image|app[-_]?icon/i;
const BAD_IMAGE=/pixel|tracking|spacer|beacon|transparent\.gif|blank\./i;
const disallowHost=hostname=>!hostname.includes('.')||hostname==='localhost'||hostname.endsWith('.localhost')||
 hostname.endsWith('.local')||hostname.endsWith('.internal')||/^[0-9.]+$/.test(hostname)||hostname.includes(':');
export function publicWebsiteUrl(value){
 try{
  const u=new URL(String(value||''));
  if(u.protocol!=='https:'||u.username||u.password||u.port||disallowHost(u.hostname)||u.href.length>1800)return '';
  return u.href;
 }catch{return ''}
}
export function sourceImageUrl(value){
 const url=publicWebsiteUrl(value);if(!url)return '';
 const u=new URL(url);
 if(BAD_IMAGE.test(u.pathname)||/\.(?:gif|html?|mjs|js|json|pdf)$/i.test(u.pathname))return '';
 return publicImageUrl(url)||'';
}
export function isIdentityImage(value){
 try{return IDENTITY.test(new URL(value).pathname)}catch{return false}
}
export function cardImageCandidates(card){
 const all=[...(Array.isArray(card?.images)?card.images:[]),card?.image,card?.shareImage,card?.poster,card?.logo];
 const found=[...new Set(all.map(sourceImageUrl).filter(Boolean))];
 return [...found.filter(u=>!isIdentityImage(u)),...found.filter(isIdentityImage)];
}
export function websiteFaviconUrl(card){
 const source=publicWebsiteUrl(card?.official||card?.website||card?.url);
 if(!source)return '';
 return 'https://www.google.com/s2/favicons?domain='+encodeURIComponent(new URL(source).hostname)+'&sz=128';
}
export function shouldDiscoverSourcePhoto(card){
 if(!card?.id||!publicWebsiteUrl(card.official)||card.nonTargeted)return false;
 const kind=String(card.category||card.kind||'').toLowerCase(),id=String(card.id).toLowerCase();
 if(/search|social|messag|private|bank|finance|invest|ai|therapy|health|medical/.test(kind))return false;
 if(/^(google|bing|facebook|instagram|chatgpt|gemini|claude|copilot|x|reddit|tiktok|whatsapp|robinhood|chime)$/.test(id))return false;
 return true;
}
const make=(tag,className)=>{const e=document.createElement(tag);e.className=className;return e;};
/* Called for the featured/large card only. Small grid cards use catalog photos
 * or the official favicon without launching scores of background image queries. */
export function mountCardSourceImage(art,card,{small=false,discover=fetchSpotlights}={}){
 if(!art||!card)return;
 const candidates=cardImageCandidates(card);
 let shown=false;
 const show=(url,source,title)=>new Promise(resolve=>{
  if(shown||!sourceImageUrl(url))return resolve(false);
  const image=make('img','qcx-source-photo');
  image.alt=title?'Source image: '+title:'Image from '+String(card.name||'the original website');
  image.loading='eager';image.decoding='async';image.referrerPolicy='no-referrer';
  image.style.visibility='hidden';art.prepend(image);
  let settled=false;
  const finish=(ok)=>{if(settled)return;settled=true;clearTimeout(timer);
   if(!ok)image.remove();resolve(ok);
  };
  const timer=setTimeout(()=>finish(false),7000);
  const fail=()=>finish(false);
  const ready=()=>{
   if(shown)return fail();
   shown=true;image.style.visibility='';art.classList.add('qcx-has-source-photo');
   const credit=make('a','qcx-photo-credit');
   const dest=publicWebsiteUrl(source||card.official||card.url);
   if(dest){credit.href=dest;credit.target='_blank';credit.rel='noopener noreferrer';credit.textContent='Photo source · '+new URL(dest).hostname;art.append(credit)}
   finish(true);
  };
  image.addEventListener('load',()=>{if(image.naturalWidth>0)ready();else fail()},{once:true});
  image.addEventListener('error',fail,{once:true});
  image.src=url;
 });
 const run=async()=>{
  // OG logos are useful fallback identity, but never block discovery of an
  // actual product/press/attraction photograph.
  for(const url of candidates.filter(url=>!isIdentityImage(url))){
   if(await show(url,card.official||card.url))return;
  }
  const inOracleStage=Boolean(art.closest?.('#oracleCardStage,.oracle-card-deck-stage'));
  if((!small||inOracleStage)&&shouldDiscoverSourcePhoto(card)){
   try{
    const rows=await discover({...card,category:card.category||card.kind});
    for(const row of rows.slice(0,5)){
     if(!publicWebsiteUrl(row.url)||!sourceImageUrl(row.image))continue;
     if(await show(row.image,row.url,row.title))return;
    }
   }catch{/* Source search is best-effort; never remove working card controls. */}
  }
  for(const url of candidates.filter(isIdentityImage)){
   if(await show(url,card.official||card.url))return;
  }
 };
 if(typeof IntersectionObserver==='undefined'){if(!small)void run();else if(candidates.length)void run();return}
 const observer=new IntersectionObserver(entries=>{
  if(!entries.some(e=>e.isIntersecting))return;
  observer.disconnect();void run();
 },{rootMargin:'120px'});
 observer.observe(art);
}
