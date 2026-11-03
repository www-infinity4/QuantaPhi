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
/* Race only a bounded batch of public image URLs: one broken host should not
 * delay the first valid, attributed source photograph. */
export async function firstAvailableImage(urls,attempt,{batchSize=3,limit=6}={}){
 if(!Array.isArray(urls)||!urls.length)return false;
 const count=Math.min(urls.length,Math.max(0,Math.min(12,limit)));
 const width=Math.max(1,Math.min(3,batchSize));
 for(let i=0;i<count;i+=width){
  const group=urls.slice(i,i+width);
  const success=await Promise.any(group.map(url=>Promise.resolve().then(()=>attempt(url)).then(ok=>{
   if(!ok)throw new Error('source_image_unavailable');
   return true;
  }))).catch(()=>false);
  if(success)return true;
 }
 return false;
}
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
   if(!ok){image.removeAttribute('src');image.remove()}resolve(ok);
  };
  const timer=setTimeout(()=>finish(false),3200);
  const fail=()=>finish(false);
  const ready=()=>{
   if(settled||!image.isConnected||shown)return fail();
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
  if(await firstAvailableImage(candidates.filter(url=>!isIdentityImage(url)),url=>show(url,card.official||card.url)))return;
  const inOracleStage=Boolean(art.closest?.('#oracleCardStage,.oracle-card-deck-stage'));
  if((!small||inOracleStage)&&shouldDiscoverSourcePhoto(card)){
   try{
    const rows=await discover({...card,category:card.category||card.kind});
    const verified=rows.slice(0,6).filter(row=>publicWebsiteUrl(row.url)&&sourceImageUrl(row.image));
    if(await firstAvailableImage(verified,row=>show(row.image,row.url,row.title)))return;
   }catch{/* Source search is best-effort; never remove working card controls. */}
  }
  await firstAvailableImage(candidates.filter(isIdentityImage),url=>show(url,card.official||card.url),{batchSize:2,limit:4});
 };
 if(typeof IntersectionObserver==='undefined'){if(!small)void run();else if(candidates.length)void run();return}
 const observer=new IntersectionObserver(entries=>{
  if(!entries.some(e=>e.isIntersecting))return;
  observer.disconnect();void run();
 },{rootMargin:'120px'});
 observer.observe(art);
}
