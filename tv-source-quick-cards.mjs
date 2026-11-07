/* Standalone Oracle Octaves broadcaster cards.
 * Real publisher-posted YouTube videos play INSIDE their own 16:9 screens.
 * Do not iframe a news website, launch a new browser, or label clips "live".
 * Live TV rights and embed permissions belong to the broadcaster. */
const SOURCE_IDS=Object.freeze({
 cnn:'tvSourceCnnQuickCard',
 cnbc:'tvSourceCnbcQuickCard',
 'nasa-plus':'tvSourceNasaPlusQuickCard',
 'pbs-nova':'tvSourcePbsNovaQuickCard',
 'pbs-history':'tvSourcePbsHistoryQuickCard'
});
const el=(tag,cls,text)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
};
export const tvSourceCardId=key=>SOURCE_IDS[key]||'';

export function mountTvSourceQuickCards(host,channels){
 if(!host?.parentNode||!Array.isArray(channels))return [];
 const mounted=[];
 for(const entry of channels){
  const id=tvSourceCardId(entry.id);
  if(!id||entry.mode!=='official-video'||!/^[-_A-Za-z0-9]{11}$/.test(entry.videoId))continue;
  const prior=document.getElementById(id);
  if(prior){mounted.push(prior);continue;}
  const card=el('section','channelphi-card channelphi-standalone-source channelphi-'+entry.id);
  card.id=id;card.dataset.tvSourceId=entry.id;
  card.dataset.sourceName=entry.name;
  card.setAttribute('aria-label',entry.name+' independent playable video card');
  const mast=card.appendChild(el('div','channelphi-mast'));
  const symbol=entry.id==='cnn'?'CNN':entry.id==='cnbc'?'CN':entry.id.startsWith('pbs')?'PBS':'NASA';
  mast.appendChild(el('span','channelphi-monogram',symbol));
  const title=mast.appendChild(el('div','channelphi-name'));
  title.append(el('span','channelphi-kicker',entry.category.toUpperCase()),el('h3',null,entry.name));
  card.appendChild(el('p','channelphi-description',entry.description));
  const screen=card.appendChild(el('button','channelphi-screen channelphi-source-video-screen'));
  screen.type='button';screen.setAttribute('aria-label','Play '+entry.name+' video inside this card');
  screen.setAttribute('aria-expanded','false');
  const art=screen.appendChild(el('img','channelphi-art'));
  art.src=entry.poster;art.alt='Video thumbnail: '+entry.videoTitle;
  art.loading='lazy';art.decoding='async';
  art.addEventListener('error',()=>{art.remove();screen.classList.add('channelphi-image-unavailable')},{once:true});
  const overlay=screen.appendChild(el('span','channelphi-screen-label'));
  overlay.append(el('span','channelphi-play-icon','▶'),el('strong',null,'Play in card'));
  const viewer=card.appendChild(el('div','channelphi-viewer'));
  viewer.hidden=true;viewer.setAttribute('aria-label',entry.name+' video player');
  const slot=viewer.appendChild(el('div','channelphi-video-slot'));
  const stopButton=viewer.appendChild(el('button','channelphi-source-stop','■ Stop'));
  stopButton.type='button';stopButton.setAttribute('aria-label','Stop '+entry.name+' video');
  card.appendChild(el('strong','channelphi-source-title',entry.videoTitle));
  const status=card.appendChild(el('p','channelphi-source-status','Official publisher video · not a live television feed.'));
  status.setAttribute('role','status');
  card.appendChild(el('p','channelphi-provider-note',entry.access));
  let frame=null;
  function stop(){
   if(frame){frame.src='about:blank';frame.remove();frame=null;}
   slot.replaceChildren();
   viewer.hidden=true;screen.hidden=false;screen.setAttribute('aria-expanded','false');
  }
  function play(){
   // One video plays at a time across all Oracle TV Quick Cards.
   document.dispatchEvent(new CustomEvent('quantaphi:tv-playback-request',{detail:{owner:'tv-source-'+entry.id}}));
   stop();
   const url=new URL('https://www.youtube-nocookie.com/embed/'+entry.videoId);
   url.searchParams.set('autoplay','1');
   url.searchParams.set('controls','1');
   url.searchParams.set('playsinline','1');
   url.searchParams.set('origin',location.origin);
   frame=slot.appendChild(el('iframe','channelphi-frame'));
   frame.title=entry.videoTitle+' · original publisher player';
   frame.src=url.href;
   frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
   frame.allowFullscreen=true;frame.loading='eager';
   frame.referrerPolicy='strict-origin-when-cross-origin';
   viewer.hidden=false;screen.hidden=true;screen.setAttribute('aria-expanded','true');
   status.textContent='Source player opened in this card. The publisher controls embedding availability.';
  }
  screen.addEventListener('click',play);
  stopButton.addEventListener('click',()=>{stop();status.textContent='Video stopped.';screen.focus()});
  document.addEventListener('quantaphi:tv-playback-request',event=>{
   if(event.detail?.owner!=='tv-source-'+entry.id)stop();
  });
  document.addEventListener('oracle:card-deactivated',event=>{if(event.detail?.id===id)stop()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
  window.addEventListener('pagehide',stop);
  // Sibling nodes become distinct, original Oracle cards; no shared news wall.
  host.parentNode.insertBefore(card,host);
  mounted.push(card);
 }
 return mounted;
}
