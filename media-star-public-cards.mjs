/* Source-backed original Media Star Quick Cards for the Public Oracle carousel.
 * Only moderator-approved D1 records may appear. No token mint or checkout here.
 */
import {normalizeMediaStarPublicCatalog,safePublicMediaUrl} from './media-star-public-feed-core.mjs';
const bank=document.getElementById('infinityAcceptedCards');
const API='https://starquest-ledger.marvaseater.workers.dev';
const element=(tag,cls,text)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
const sourceIdOf=card=>card.contentId.split(':').at(-1);
function youtubeId(raw){
 try{
  const u=new URL(raw);
  const host=u.hostname.toLowerCase();
  const id=host==='youtu.be'?u.pathname.slice(1):
   (host==='youtube.com'||host==='www.youtube.com'||host==='m.youtube.com')?
    (u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.startsWith('/shorts/')?u.pathname.split('/')[2]:null):null;
  return /^[A-Za-z0-9_-]{11}$/.test(String(id||''))?id:null;
 }catch{return null}
}
function trackGenuineNativeProgress(player,card,episode){
 let previous=null,seconds=0,submitted=false;
 player.addEventListener('playing',()=>{previous=player.currentTime});
 player.addEventListener('seeking',()=>{previous=null});
 player.addEventListener('pause',()=>{previous=null});
 player.addEventListener('timeupdate',()=>{
  if(submitted||player.paused||player.seeking||document.visibilityState!=='visible'){previous=player.currentTime;return}
  const now=player.currentTime,delta=previous===null?0:now-previous;
  previous=now;
  if(delta>0&&delta<=3)seconds+=delta;
  if(seconds<30)return;
  submitted=true;
  // This is a client observation, not server-verifiable payment proof.
  const recorder=window.StarQuestCloudLedger?.recordProductionPlay;
  if(typeof recorder!=='function')return;
  Promise.resolve(recorder({platform:'media-star',sourceId:sourceIdOf(card),
   contentId:card.contentId,title:episode.title,observedSeconds:Math.floor(seconds)})).catch(()=>{});
 });
}
function playFree(root,card,episode){
 const source=safePublicMediaUrl(episode.sourceUrl);
 if(!source)return;
 const media=root.querySelector('.ms-public-player');
 if(!media)return;
 media.replaceChildren();
 const id=youtubeId(source);
 if(id){
  const frame=element('iframe','ms-public-video');
  frame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1';
  frame.title=episode.title+' · YouTube video';
  frame.loading='eager';frame.allow='autoplay; encrypted-media; picture-in-picture';
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.allowFullscreen=true;media.append(frame);return;
 }
 const ext=new URL(source).pathname.toLowerCase();
 if(/\.(mp3|wav|ogg|m4a|aac)$/.test(ext)||/\.(mp4|webm|ogv)$/.test(ext)){
  const player=element(/\.(mp3|wav|ogg|m4a|aac)$/.test(ext)?'audio':'video','ms-public-native');
  player.controls=true;player.preload='metadata';player.src=source;
  if(player.tagName==='VIDEO')player.playsInline=true;
  media.append(player);
  trackGenuineNativeProgress(player,card,episode);
  void player.play().catch(()=>{});
  return;
 }
 const link=element('a','ms-public-source','Open original media at source');
 link.href=source;link.target='_blank';link.rel='noopener noreferrer';
 media.append(link);
}
async function uniqueCardSlug(contentId){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(contentId));
 return [...new Uint8Array(digest).slice(0,10)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function buildCard(card,slug){
 const node=element('article','iqc-card ms-public-card');
 node.id='public-media-star-'+slug;
 node.dataset.sourceId='media-star-'+slug;
 node.dataset.sourceName='Media Star · '+card.title;
 node.dataset.sourceReady='true';
 node.dataset.personalization='disabled'; // No watch/click-based targeting from this feed.
 node.setAttribute('aria-label','Media Star · '+card.title);
 const cover=element('div','ms-public-cover');
 const artwork=element('img','ms-public-art');
 artwork.src='/apps/icons/media-star-512.png';artwork.alt='Official Infinity Media Star artwork';
 artwork.loading='lazy';artwork.decoding='async';
 const heading=element('div','ms-public-title');
 heading.append(element('small','','INFINITY® · APPROVED MEDIA STAR'),element('h3','',card.title),
  element('p','iqc-description','Creator-curated original media · '+card.episodes.length+' listed episodes'));
 cover.append(artwork,heading);node.append(cover);
 const list=element('ol','ms-public-episodes');
 for(const episode of card.episodes){
  const item=element('li','ms-public-episode');
  item.append(element('strong','',episode.title));
  if(episode.free&&episode.sourceUrl){
   const btn=element('button','ms-public-play','Play free episode');
   btn.type='button';btn.addEventListener('click',()=>playFree(node,card,episode));
   item.append(btn);
  }else if(episode.requiresUnlock){
   const locked=element('button','ms-public-locked','1 StarCoin · Creator checkout unavailable');
   locked.type='button';locked.disabled=true;
   item.append(locked);
  }else item.append(element('small','','Original media currently unavailable'));
  list.append(item);
 }
 node.append(list,element('div','ms-public-player'));
 node.append(element('p','ms-public-disclosure','One StarCoin from Infinity for qualifying creator views is a separate pending award. A curated episode charge never occurs without a verified wallet, explicit confirmation and permanent entitlement.'));
 return node;
}
async function loadPublicMedia(){
 if(!bank)return;
 try{
  const response=await fetch(API+'/v1/production/media-star-cards',{cache:'no-store'});
  if(!response.ok)return;
  const payload=await response.json();
  const cards=normalizeMediaStarPublicCatalog(payload);
  for(const card of cards){
   const slug=await uniqueCardSlug(card.contentId);
   if(document.getElementById('public-media-star-'+slug))continue;
   bank.append(buildCard(card,slug));
  }
  if(cards.length)window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
 }catch(error){console.warn('Approved Media Star feed unavailable; no cards or payouts were invented.',error)}
}
void loadPublicMedia();
