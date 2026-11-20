/* Dynamic, independently selectable movie Quick Cards.
 * Google Trends metadata and trailers come from the scheduled provenance snapshot.
 * The card's own YouTube player is opened on tap; never another browser/viewer. */
import {movieCardId,selectTrendMovieCards,validateMovieSnapshot,MOVIE_FEED,MOVIE_FEED_BACKUP} from './trending-movie-core.mjs';
const el=(tag,cls,text)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
};
const SOURCE_TIMEOUT=12000;
let latest=null;
async function getSnapshot(url){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),SOURCE_TIMEOUT);
 try{
  const response=await fetch(url,{cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Accept:'application/json'}});
  if(!response.ok)return null;
  const value=await response.json();
  return validateMovieSnapshot(value)?value:null;
 }catch{return null}finally{clearTimeout(timer)}
}
function displayDate(value){
 try{return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'}).format(new Date(value))+' CT'}
 catch{return 'last verified refresh'}
}
function makeCard(item){
 const id=movieCardId(item.video_id);
 if(!id)return null;
 const root=el('section','movie-trend-card');
 root.id=id;root.dataset.trendingMovieId=item.video_id;
 root.dataset.movieSource=item.publisher;
 root.setAttribute('aria-label',item.title+' playable trailer card');
 const mast=root.appendChild(el('header','mtc-heading'));
 mast.append(el('span','mtc-kicker',item.google_trending?'GOOGLE TRENDING MOVIE':'NEWLY PUBLISHED TRAILER'));
 mast.appendChild(el('h3','mtc-title',item.title));
 const playerButton=root.appendChild(el('button','mtc-screen'));
 playerButton.type='button';
 playerButton.setAttribute('aria-label','Play '+item.title+' trailer inside this card');
 playerButton.setAttribute('aria-expanded','false');
 const image=playerButton.appendChild(el('img','mtc-poster'));
 image.src=item.poster;image.loading='lazy';image.decoding='async';
 image.alt='Publisher video thumbnail for '+item.title;
 image.addEventListener('error',()=>image.remove(),{once:true});
 const overlay=playerButton.appendChild(el('span','mtc-overlay'));
 overlay.append(el('span','mtc-play-symbol','▶'),el('span',null,'Play trailer'));
 const viewer=root.appendChild(el('div','mtc-viewer'));
 viewer.hidden=true;viewer.setAttribute('aria-label',item.title+' original publisher video');
 const slot=viewer.appendChild(el('div','mtc-video-slot'));
 const stopButton=viewer.appendChild(el('button','mtc-stop','■ Stop'));
 stopButton.type='button';
 const info=root.appendChild(el('p','mtc-info',item.video_title+' · '+item.publisher));
 const proof=root.appendChild(el('p','mtc-proof',item.google_trending
   ?'Google Trends: '+item.trend_query+' · '+item.approx_searches+' approximate searches · observed '+displayDate(item.trend_checked_at)
   :'New trailer from '+item.publisher+' · not independently confirmed as Google-trending'));
 const status=root.appendChild(el('p','mtc-status','Play the original trailer here. Full movie streaming rights are not included.'));
 status.setAttribute('role','status');
 let frame=null;
 function stop(){
  if(frame){frame.src='about:blank';frame.remove();frame=null}
  slot.replaceChildren();viewer.hidden=true;playerButton.hidden=false;
  playerButton.setAttribute('aria-expanded','false');
 }
 function play(){
  document.dispatchEvent(new CustomEvent('quantaphi:tv-playback-request',{detail:{owner:id}}));
  stop();
  const source=new URL('https://www.youtube-nocookie.com/embed/'+item.video_id);
  source.searchParams.set('autoplay','1');
  source.searchParams.set('controls','1');
  source.searchParams.set('playsinline','1');
  source.searchParams.set('origin',location.origin);
  frame=slot.appendChild(el('iframe','mtc-frame'));
  frame.src=source.href;frame.title=item.video_title+' · publisher trailer';
  frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  viewer.hidden=false;playerButton.hidden=true;playerButton.setAttribute('aria-expanded','true');
  status.textContent='Trailer player requested within this card. The publisher controls embedding and availability.';
 }
 playerButton.addEventListener('click',play);
 stopButton.addEventListener('click',()=>{stop();status.textContent='Stopped.';playerButton.focus()});
 document.addEventListener('quantaphi:tv-playback-request',event=>{if(event.detail?.owner!==id)stop()});
 document.addEventListener('oracle:card-deactivated',event=>{if(event.detail?.id===id)stop()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 window.addEventListener('pagehide',stop);
 return root;
}
export function mountTrendingMovieQuickCards(host=document.getElementById('trendingMovieCards')){
 if(!host||host.dataset.movieTrendReady==='true')return;
 host.dataset.movieTrendReady='true';
 const status=host.appendChild(el('p','mtc-refresh-status','Checking current Google movie trends and playable trailers…'));
 status.setAttribute('role','status');
 let request=0;
 async function refresh(){
  const version=++request;
  const urls=[MOVIE_FEED+'?checked='+Date.now(),MOVIE_FEED_BACKUP+'?checked='+Date.now()];
  const responses=await Promise.all(urls.map(getSnapshot));
  if(version!==request)return;
  const value=responses.filter(Boolean).sort((a,b)=>Date.parse(b.checked_at)-Date.parse(a.checked_at))[0];
  if(!value){
   status.textContent='Movie-trailer source update unavailable. No invented trending movies are shown.';
   return;
  }
  latest=value;
  const rows=selectTrendMovieCards(value);
  if(!rows.length){
   status.textContent='No currently verified playable trailers in the latest sources.';
   return;
  }
  const keep=new Set();
  let created=0;
  for(const movie of rows){
   const id=movieCardId(movie.video_id);
   keep.add(id);
   if(document.getElementById(id))continue;
   const card=makeCard(movie);if(!card)continue;
   host.appendChild(card);created++;
  }
  // Never remove a selected playing card from the Oracle stage; remove only
  // inactive expired cards at their original root.
  for(const card of host.querySelectorAll('.movie-trend-card')){
   if(!keep.has(card.id))card.remove();
  }
  const count=rows.filter(x=>x.google_trending).length;
  status.textContent=rows.length+' verified source trailers · '+count+' directly matched to Google Trends · checked '+displayDate(value.checked_at)+'.';
  if(created)window.dispatchEvent(new CustomEvent('quantaphi:trending-movie-cards-ready'));
 }
 void refresh();
 // New scheduled snapshots can add cards without reloading the page.
 const interval=setInterval(()=>{if(!document.hidden)void refresh()},10*60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh()});
 window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});
 return {refresh,getSnapshot:()=>latest};
}
if(typeof document!=='undefined'){
 const ready=()=>mountTrendingMovieQuickCards();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
 else ready();
}
