/* Independent Zeus + creator discovery slideshow. Does not move/clone Oracle cards. */
import {cardsForTab,advanceIndex,shouldAdvance} from './zeus-discovery-core.mjs';
const root=document.getElementById('zeusDiscoveryCarousel');
if(root){
 const track=root.querySelector('#zeusDiscoverStage');
 const status=root.querySelector('#zeusDiscoverStatus');
 const select=root.querySelector('#zeusDiscoverChoose');
 const back=root.querySelector('#zeusDiscoverPrevious');
 const forward=root.querySelector('#zeusDiscoverNext');
 const play=root.querySelector('#zeusDiscoverPlay');
 const fullscreen=root.querySelector('#zeusDiscoverFullscreen');
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 let tab='all',cards=[],index=0,playing=!reduced?.matches,visible=false,clock=null;
 const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
 const isWatching=()=>shouldAdvance({playing,visible,hidden:document.hidden,reducedMotion:!!reduced?.matches});
 const describe=()=>{
  const current=cards[index];
  status.textContent=current?'Showing '+(index+1)+' of '+cards.length+' · '+current.name+(playing?' · Watching':' · Paused'):'No reviewed cards yet';
  play.textContent=playing?'Pause': 'Watch';
  play.setAttribute('aria-pressed',String(playing));
  if(select)select.textContent=current?current.name:'Choose a card';
 };
 const advance=(step,manual=false)=>{
  if(!cards.length)return;
  index=advanceIndex(index,cards.length,step);
  if(track.children[index])track.scrollTo({left:index*track.clientWidth,behavior:reduced?.matches?'instant':'smooth'});
  if(manual){playing=false;syncClock()}
  describe();
 };
 function syncClock(){
  if(clock!==null){clearInterval(clock);clock=null}
  if(isWatching())clock=setInterval(()=>{if(!isWatching()){syncClock();return}advance(1)},9000);
  describe();
 }
 const link=(url,label)=>{const a=el('a','zdc-cta',label);a.href=url;
  if(url.startsWith('https://')){a.target='_blank';a.rel='noopener noreferrer'}return a};
 function render(){
  cards=cardsForTab(tab);
  track.replaceChildren();
  for(const card of cards){
   const slide=el('article','zdc-slide');slide.dataset.zeusId=card.id;
   const art=el('div','zdc-art');
   art.setAttribute('aria-hidden','true');
   art.append(el('span','zdc-glyph',card.glyph));
   const text=el('div','zdc-detail');
   const kicker=el('p','zdc-kicker',card.category+' · '+card.provider);
   const h=el('h3','',card.name);const headline=el('p','zdc-headline',card.headline);
   const desc=el('p','zdc-description',card.description);
   const note=el('p','zdc-note',card.detail);
   const actions=el('div','zdc-actions');
   actions.append(link(card.url,card.cta));
   text.append(kicker,h,headline,desc,actions,note);
   slide.append(art,text);
   track.append(slide);
  }
  index=0;
  root.querySelectorAll('[data-zeus-tab]').forEach(b=>{const active=b.dataset.zeusTab===tab;
   b.setAttribute('aria-pressed',String(active));b.classList.toggle('is-current',active)});
  describe();
  syncClock();
 }
 function chooseTab(next){if(!['all','infinity','creator'].includes(next))return;tab=next;render();}
 root.querySelectorAll('[data-zeus-tab]').forEach(button=>button.addEventListener('click',()=>chooseTab(button.dataset.zeusTab)));
 back?.addEventListener('click',()=>advance(-1,true));
 forward?.addEventListener('click',()=>advance(1,true));
 play?.addEventListener('click',()=>{playing=!playing;syncClock()});
 root.addEventListener('keydown',event=>{
  if(event.target.closest('a,button,input,textarea,select'))return;
  if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();advance(event.key==='ArrowRight'?1:-1,true)}
 });
 track?.addEventListener('scroll',()=>{
  // Browser swipe changes the selected frame; never set offsite URLs from scroll.
  const width=track.clientWidth;
  if(!width||track.children.length===0)return;
  const nearest=Math.max(0,Math.min(cards.length-1,Math.round(track.scrollLeft/width)));
  if(nearest!==index){index=nearest;describe()}
 },{passive:true});
 fullscreen?.addEventListener('click',async()=>{
  if(document.fullscreenElement===root){await document.exitFullscreen?.();return}
  if(typeof root.requestFullscreen!=='function'){
   status.textContent='Fullscreen unavailable here. Use your Android Screen Cast control to mirror this section.';
   return;
  }
  try{await root.requestFullscreen();fullscreen.textContent='Exit fullscreen'}
  catch{status.textContent='Fullscreen unavailable here. You can still mirror the page with your phone’s Cast control.'}
 });
 document.addEventListener('fullscreenchange',()=>{fullscreen.textContent=document.fullscreenElement===root?'Exit fullscreen':'Fullscreen for screen cast'});
 document.addEventListener('visibilitychange',syncClock);
 window.addEventListener('pagehide',()=>{visible=false;syncClock()});
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{visible=entries[0]?.intersectionRatio>=0.28;syncClock()},{threshold:[0,.28,.55]});
  observer.observe(root);
 }
 const observeReduced=()=>{if(reduced?.matches)playing=false;syncClock()};
 reduced?.addEventListener?.('change',observeReduced);
 render();
}
