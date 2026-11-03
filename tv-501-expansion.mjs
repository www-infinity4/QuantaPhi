/* Extend the EXISTING Infinity TV grid; never embed a whole broadcaster site.
 * Only the selected, source-identified movie creates a YouTube video frame.
 * All other channels remain links to their own authorized viewers. */
import {TV_EXPANSION_CHANNELS,rankMoviePrograms,movieContextFromSignals,QUANT_TV_TOPICS,quantTvConsentKey} from './tv-quant-discovery.mjs';
import {loadOwnQuantScores} from './quanta-feed-quants.mjs';
const el=(tag,cls,value)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node};
const storageKey='quanta:discovery:anonymous:v1';
function localSignals(){
 try{const raw=JSON.parse(localStorage.getItem(storageKey)||'{}');return raw&&typeof raw==='object'?raw:{}}catch{return{}}
}
export function mountQuantTvExpansion(host=document.getElementById('tvQuantExpansion')){
 if(!host||host.dataset.quantTvReady||!window.PhiTVPrograms)return;
 // Current Infinity TV uses separate original channel cards; the guide has no grid.
 // Create the expansion shelf there instead of silently dropping every new station.
 const grid=host.querySelector('.channelphi-grid')||host.appendChild(el('div','channelphi-grid'));
 host.dataset.quantTvReady='true';
 for(const entry of TV_EXPANSION_CHANNELS){
  const article=grid.appendChild(el('article','channelphi-card channelphi-source channelphi-'+entry.id));
  article.dataset.tvSourceId=entry.id;article.setAttribute('aria-label',entry.name+' official viewing card');
  const mast=article.appendChild(el('div','channelphi-mast'));
  mast.append(el('span','channelphi-monogram',entry.name==='CNBC'?'CN':entry.name==='CNN'?'CNN':entry.id.startsWith('pbs')?'PBS':'NASA'));
  const label=mast.appendChild(el('div','channelphi-name'));label.append(el('span','channelphi-kicker',entry.category.toUpperCase()),el('h3',null,entry.name));
  article.append(el('p','channelphi-description',entry.description));
  const screen=article.appendChild(el('a','channelphi-screen channelphi-source-screen'));
  screen.href=entry.url;screen.target='_blank';screen.rel='noopener noreferrer';screen.referrerPolicy='strict-origin-when-cross-origin';
  screen.setAttribute('aria-label','Open '+entry.name+' on official provider website');
  const art=screen.appendChild(el('img','channelphi-art'));art.src=entry.poster;art.alt=entry.name+' original publisher icon';art.width=128;art.height=128;art.loading='lazy';art.decoding='async';
  art.addEventListener('error',()=>screen.classList.add('channelphi-image-unavailable'),{once:true});
  const shade=screen.appendChild(el('span','channelphi-screen-label'));shade.append(el('span','channelphi-play-icon','↗'),el('strong',null,'Open official '+entry.name+' player'));
  article.append(el('p','channelphi-provider-note',entry.access+' External playback only until the publisher licenses a supported in-card player.'));
 }
 const movie=grid.appendChild(el('article','channelphi-card channelphi-quant-movies'));
 movie.dataset.tvSourceId='quant-movies';movie.setAttribute('aria-label','Quant recommended movies in one video window');
 const mast=movie.appendChild(el('div','channelphi-mast'));mast.append(el('span','channelphi-monogram','QM'));
 const heading=mast.appendChild(el('div','channelphi-name'));heading.append(el('span','channelphi-kicker','MOVIES · WATCH INSIDE'),el('h3',null,'Your Quant Movies'));
 movie.append(el('p','channelphi-description','Science-fiction, vintage films and suspense from the existing original-source video catalog. Personalize privately from signed-in Quant interests if you choose.'));
 const preview=movie.appendChild(el('button','channelphi-screen channelphi-quant-screen'));preview.type='button';preview.setAttribute('aria-label','Play selected movie in this card');
 const image=preview.appendChild(el('img','channelphi-art'));image.alt='Selected film preview from its original video source';image.loading='lazy';image.decoding='async';
 const shade=preview.appendChild(el('span','channelphi-screen-label'));shade.append(el('span','channelphi-play-icon','▶'),el('strong',null,'Play movie inside carousel'));
 const viewer=movie.appendChild(el('div','channelphi-viewer'));viewer.hidden=true;
 const slot=viewer.appendChild(el('div','channelphi-video-slot'));slot.setAttribute('aria-label','One movie player window');
 const now=movie.appendChild(el('strong','channelphi-now'));
 const status=movie.appendChild(el('p','channelphi-quant-status','Choose a film to play.'));status.setAttribute('role','status');
 const controls=movie.appendChild(el('div','channelphi-quant-controls'));
 const consent=controls.appendChild(el('button','channelphi-quant-consent','Use my Quant interests'));consent.type='button';
 const next=controls.appendChild(el('button',null,'Next movie ›'));next.type='button';
 const close=controls.appendChild(el('button',null,'■ Stop'));close.type='button';
 const cast=controls.appendChild(el('button',null,'Cast to TV'));cast.type='button';
 const official=movie.appendChild(el('a','channelphi-movie-official','Open original video source ↗'));official.target='_blank';official.rel='noopener noreferrer';
 movie.append(el('p','channelphi-provider-note','YouTube availability and embedding rights belong to the video publisher. This is an independent discovery recommendation, not an advertisement or a promise of playback rights.'));
 let allowed=false;try{allowed=localStorage.getItem(quantTvConsentKey)==='1'}catch{}
 let scores={},playlist=[],index=0,frame=null,requestGeneration=0;
 const catalog=window.PhiTVPrograms;
 const current=()=>playlist[index]||null;
 function stop(){
  requestGeneration++;
  if(frame){frame.src='about:blank';frame.remove();frame=null}
  slot.replaceChildren();viewer.hidden=true;preview.hidden=false;preview.setAttribute('aria-expanded','false');
 }
 function render(){
  playlist=rankMoviePrograms(catalog,movieContextFromSignals(allowed?{...localSignals(),quantScores:scores}:{}));
  if(!playlist.length){preview.disabled=true;status.textContent='No existing source movies available.';return}
  if(index>=playlist.length)index=0;
  const item=current();image.src=item.poster;now.textContent=item.title+(item.year?' · '+item.year:'');
  official.href='https://www.youtube.com/watch?v='+encodeURIComponent(item.videoId);
  consent.textContent=allowed?'✓ Quant interests enabled':'Use my Quant interests';
  consent.setAttribute('aria-pressed',String(allowed));
 }
 async function refreshQuant(){
  if(!allowed){scores={};render();return}
  status.textContent='Reading your signed-in Quant topic scores when authorized…';
  const version=++requestGeneration;
  const result=await loadOwnQuantScores(window.QuantaCloudConnection,QUANT_TV_TOPICS);
  if(version!==requestGeneration||!allowed)return;
  scores=result.connected?result.scores:{};
  index=0;render();
  status.textContent=result.connected?'Movie order refreshed from your signed-in Quant topic scores; no search text stored.':
   'Quant ledger not connected. Recommendations use only your local followed-card activity.';
 }
 function play(){
  const item=current();if(!item||!catalog.valid(item.videoId))return;
  document.dispatchEvent(new CustomEvent('quantaphi:tv-playback-request',{detail:{owner:'quant-tv-movies'}}));
  stop();
  const url=new URL('https://www.youtube-nocookie.com/embed/'+item.videoId);
  url.searchParams.set('autoplay','1');url.searchParams.set('controls','1');url.searchParams.set('playsinline','1');url.searchParams.set('origin',location.origin);
  frame=slot.appendChild(el('iframe','channelphi-frame'));frame.title=item.title+' · licensed original YouTube embed';
  frame.src=url.href;frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';frame.loading='eager';
  viewer.hidden=false;preview.hidden=true;preview.setAttribute('aria-expanded','true');
  status.textContent='Source player requested. If the publisher blocks embedding, use “Open original video source”.';
 }
 preview.addEventListener('click',play);
 next.addEventListener('click',()=>{stop();index=(index+1)%Math.max(1,playlist.length);render();status.textContent='Selected '+current()?.title+'. Tap ▶ to watch.'});
 close.addEventListener('click',()=>{stop();status.textContent='Playback stopped.';preview.focus()});
 consent.addEventListener('click',()=>{stop();allowed=!allowed;try{localStorage.setItem(quantTvConsentKey,allowed?'1':'0')}catch{}void refreshQuant()});
 cast.addEventListener('click',()=>{status.textContent='Android: open Screen Cast or screen mirroring, choose your TV, then use fullscreen on the video player. Casting requires a compatible device/TV.';
  if(!viewer.hidden&&typeof viewer.requestFullscreen==='function')void viewer.requestFullscreen().catch(()=>{})});
 document.addEventListener('quantaphi:tv-playback-request',event=>{if(event.detail?.owner!=='quant-tv-movies')stop()});
 document.addEventListener('oracle:card-deactivated',event=>{if(event.detail?.id==='tvQuantExpansion')stop()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 window.addEventListener('pagehide',stop);
 render();if(allowed)void refreshQuant();
 return {host,movie,stop};
}
if(typeof document!=='undefined'){
 const ready=()=>mountQuantTvExpansion();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
}
