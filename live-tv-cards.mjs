import {fetchWorldSeries,REFRESH_MS,TEAMS,FOX_WATCH_URL,scoreText} from './world-series-score.mjs?v=20261028-game5c';
import {isLiveGame,liveNewsEmbed,KYOU,kyouReferralUrl} from './live-tv-state.mjs?v=20261028-kyou1';
import './tv-front-priority.js?v=20261028-front1';

const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const link=(label,href)=>{const n=el('a','ltv-link',label);n.href=href;n.target='_blank';n.rel='noopener noreferrer';return n};
function heading(root,kicker,title,copy){
 const header=el('header','ltv-head');
 header.append(el('span','ltv-kicker',kicker),el('h2','',title),el('p','ltv-copy',copy));root.append(header);
}
function stationEvent(name,destination){
 // Uses the site's existing analytics configuration only. Card opens/clicks
 // are never renamed as broadcast viewing, paid impressions or station totals.
 const detail={partner:'kyou',card_id:'fox-live-game',...(destination?{link_id:destination}:{})};
 if(typeof window.gtag==='function')window.gtag('event',name,detail);
 window.dispatchEvent(new CustomEvent('quantaphi:partner-referral',{detail:{event:name,...detail}}));
}
function stationLink(label,destination){
 const a=link(label,kyouReferralUrl(destination));
 // Preserve an origin-only referrer alongside the explicit campaign tags.
 a.rel='noopener';a.referrerPolicy='strict-origin-when-cross-origin';
 a.dataset.stationDestination=destination;
 a.addEventListener('click',()=>stationEvent('partner_referral_click',destination));
 return a;
}
function mountKyouPage(root){
 const wrapper=el('section','ltv-station-viewer'),label=el('h3','','KYOU’s original live page'),screen=el('div','ltv-station-window');
 const status=el('p','ltv-playback','The station page opens automatically when this card is visible.');status.setAttribute('role','status');
 wrapper.append(label,screen,status);root.append(wrapper);
 let selected=false,visible=false,frame=null;
 function stop(){if(frame){frame.src='about:blank';frame.remove();frame=null}status.textContent='Station page paused while off screen.'}
 function sync(){
  if(!selected||!visible||document.hidden){stop();return}
  if(frame)return;
  document.dispatchEvent(new CustomEvent('quantaphi:tv-playback-request',{detail:{owner:root.id}}));
  const pending=el('iframe','ltv-frame ltv-station-frame');frame=pending;
  pending.title='KYOU original live-news website, with its own player and advertising';
  pending.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';pending.allowFullscreen=true;
  pending.referrerPolicy='strict-origin-when-cross-origin';pending.loading='eager';
  // Load the intact publisher page. Do not extract/rehost its stream or hide
  // its navigation, controls, branding, consent, advertising or error messages.
  pending.src=kyouReferralUrl('live');
  pending.addEventListener('load',()=>{if(frame===pending)status.textContent='Station page opened. Programming, playback and ads are controlled by KYOU. A page load is not a verified video view.'});
  pending.addEventListener('error',()=>{if(frame===pending)status.textContent='The station page could not load here. Open KYOU live newscasts below.'});
  screen.append(pending);status.textContent='Loading KYOU’s original live page…';stationEvent('partner_site_frame_request','live');
 }
 root.addEventListener('oracle:activate',()=>{selected=true;sync()});
 document.addEventListener('oracle:card-deactivated',event=>{if(event.detail?.id===root.id){selected=false;stop()}});
 document.addEventListener('quantaphi:tv-playback-request',event=>{if(event.detail?.owner!==root.id){selected=false;stop()}});
 const observer=new IntersectionObserver(items=>{
  visible=items.some(item=>item.isIntersecting&&item.intersectionRatio>=0.2);
  if(document.body.classList.contains('oracle-shelf-open'))selected=visible;
  sync();
 },{threshold:[0,0.2]});observer.observe(screen);
 document.addEventListener('visibilitychange',sync);
 window.addEventListener('pagehide',()=>{selected=false;stop();observer.disconnect();document.removeEventListener('visibilitychange',sync)},{once:true});
}
export function mountLiveGame(root){
 if(!root||root.dataset.liveTvReady)return;
 root.dataset.liveTvReady='true';root.classList.add('ltv-card');
 root.dataset.station='kyou';
 heading(root,'IOWA · FOX 15.1',KYOU.name,
  'Ottumwa · Southeastern Iowa and Northeastern Missouri. Official KYOU destinations, with World Series status from MLB.');
 const brand=stationLink('','home'),logo=el('img');brand.className='ltv-station-brand';
 brand.setAttribute('aria-label','Open the official KYOU website');logo.src=KYOU.logo;logo.alt='KYOU';logo.width=176;logo.height=70;
 brand.append(logo);root.querySelector('.ltv-head').prepend(brand);
 root.addEventListener('oracle:activate',()=>stationEvent('partner_card_open'));
 mountKyouPage(root);
 const score=el('div','ltv-score'),names=el('div','ltv-teams');
 for(const side of ['away','home']){
  const team=TEAMS[side],part=el('div','ltv-team'),image=el('img');
  image.src=team.logo;image.alt='';image.width=56;image.height=56;
  part.append(image,el('strong','',team.abbr));names.append(part);
 }
 const numbers=el('strong','ltv-numbers','— – —'),state=el('p','ltv-state','Checking MLB game status…');state.setAttribute('role','status');
 score.append(names,numbers,state);root.append(score);
 const access=el('div','ltv-access');
 access.append(el('strong','','FOX game video is not available inside this card.'),
  el('p','','KYOU’s public online page offers news streams and newscasts. Full FOX game video has not been verified in that online feed.'),
  stationLink('KYOU live newscasts','live'),stationLink('KYOU program schedule','schedule'),
  stationLink('KYOU channel guide','guide'),link('FOX game viewing options',FOX_WATCH_URL),
  el('p','ltv-referral-note','Station links identify QuantaPhi as the referral source. KYOU controls its player, ads and audience reporting. Independent station guide.'));root.append(access);
 const stamp=el('small','ltv-stamp','Scores and broadcast availability are separate.');root.append(stamp);
 let current=null,stopped=false,checked=false;
 function render(){
  const live=isLiveGame(current);
  const front=globalThis.QuantaTVFrontPriority;let store=null;try{store=localStorage}catch{}
  front.remember(current,store);const pinned=front.shouldPin(current,Date.now(),front.readFinal(store));
  root.dataset.livePriority=live?'1':'0';
  root.dataset.tvFrontPriority=pinned?'1':'0';
  numbers.textContent=scoreText(current);
  state.textContent=!current?(checked?'MLB status unavailable':'Checking MLB game status…'):current.stale?'Last known score · live status unconfirmed':
   live?'LIVE GAME'+(current.inning?' · '+current.inning:''):
   current.status==='final'?'FINAL':current.status==='pregame'?'UPCOMING':
   current.status==='live'?'Live status no longer current':current.detail||'Game status unavailable';
  stamp.textContent=current?.fetchedAt?'MLB checked '+new Date(current.fetchedAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})+' · '+(pinned?'Infinity TV is first for game night':'Game-night placement ended'):'Score pending. Game-night placement does not confirm live video access.';
  window.dispatchEvent(new Event('quantaphi:live-tv-update'));
 }
 async function update(){if(stopped||document.hidden)return;current=await fetchWorldSeries();checked=true;if(!stopped)render()}
 render();void update();
 const refresh=setInterval(update,REFRESH_MS),expiry=setInterval(render,30000);
 const resume=()=>{if(!document.hidden){render();void update()}};
 document.addEventListener('visibilitychange',resume);
 window.addEventListener('pagehide',()=>{stopped=true;clearInterval(refresh);clearInterval(expiry);document.removeEventListener('visibilitychange',resume)},{once:true});
 return {update,root};
}

export function mountLiveNews(root){
 if(!root||root.dataset.liveTvReady)return;
 root.dataset.liveTvReady='true';root.classList.add('ltv-card');
 heading(root,'LIVE TV · NEWS','LiveNOW from FOX',
  'Watch the publisher’s original live news coverage. Try the in-card player, or use the official channel when embedding is unavailable.');
 const screen=el('div','ltv-screen ltv-screen-source');
 const fallback=el('div','ltv-source-first');
 const identity=el('p','ltv-source-label','OFFICIAL LIVE NEWS SOURCE');
 const title=el('h3','','LiveNOW from FOX');
 const help=el('p','','The live program is controlled by FOX. An embedded video may be blocked, unavailable or require opening the publisher site.');
 const watch=link('Watch at LiveNOW from FOX','https://www.livenowfox.com/live');
 watch.classList.add('ltv-source-watch');
 fallback.append(identity,title,help,watch);screen.append(fallback);
 const controls=el('div','ltv-video-controls');
 const tryPlayer=el('button','ltv-try-player','Try in-card video');tryPlayer.type='button';
 const returnSource=el('button','ltv-try-player ltv-return-source','Video unavailable? Show source');returnSource.type='button';returnSource.hidden=true;
 controls.append(tryPlayer,returnSource);
 const status=el('p','ltv-playback','The publisher’s live channel is available above. Video playback inside QuantaPhi has not been verified.');
 status.setAttribute('role','status');
 root.append(screen,controls,status,el('p','ltv-note','LiveNOW is FOX’s news service. The World Series game is a separate FOX broadcast.'),link('Open the original LiveNOW channel','https://www.livenowfox.com/live'));
 let selected=false,visible=false,frame=null,requested=false;
 function sourceState(message){
  if(frame){frame.src='about:blank';frame.remove();frame=null}
  requested=false;fallback.hidden=false;screen.classList.add('ltv-screen-source');
  tryPlayer.hidden=false;returnSource.hidden=true;
  status.textContent=message;
 }
 function stop(){
  sourceState('The publisher channel remains available. The in-card player is paused off screen.');
 }
 function sync(){
  if(!selected||!visible||document.hidden){if(frame||requested)stop();return}
  if(!requested||frame)return;
  document.dispatchEvent(new CustomEvent('quantaphi:tv-playback-request',{detail:{owner:root.id}}));
  const player=el('iframe','ltv-frame');frame=player;
  player.title='LiveNOW from FOX YouTube embedded player';
  player.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';player.allowFullscreen=true;
  player.referrerPolicy='strict-origin-when-cross-origin';player.loading='eager';
  player.addEventListener('error',()=>{
   if(frame===player)sourceState('The embedded player could not load. Watch on the original LiveNOW channel instead.');
  },{once:true});
  player.addEventListener('load',()=>{
   if(frame===player)status.textContent='Player frame loaded. This does not confirm video playback; FOX and YouTube control availability. If the picture is unavailable, choose Show source.';
  },{once:true});
  try{
   player.src=liveNewsEmbed(location.origin);
   fallback.hidden=true;screen.classList.remove('ltv-screen-source');
   tryPlayer.hidden=true;returnSource.hidden=false;
   screen.append(player);
   status.textContent='Requesting the publisher’s embedded player. Playback is not confirmed.';
  }catch{
   sourceState('The embedded player could not be prepared. Use the original channel above.');
  }
 }
 tryPlayer.addEventListener('click',()=>{
  requested=true;selected=true;sync();
  if(!frame&&requested)status.textContent='The player will load when this card is visible.';
 });
 returnSource.addEventListener('click',()=>sourceState('Publisher playback was selected. Watch at LiveNOW from FOX above.'));
 const reportedError=event=>{
  if(!frame||event.source!==frame.contentWindow||
     !['https://www.youtube.com','https://www.youtube-nocookie.com'].includes(event.origin))return;
  let payload;try{payload=typeof event.data==='string'?JSON.parse(event.data):event.data}catch{return}
  if(payload?.event==='onError')sourceState('The video provider reported a playback error. Use the original LiveNOW channel above.');
 };
 window.addEventListener('message',reportedError);
 root.addEventListener('oracle:activate',()=>{selected=true;sync()});
 document.addEventListener('oracle:card-deactivated',event=>{if(event.detail?.id===root.id){selected=false;stop()}});
 document.addEventListener('quantaphi:tv-playback-request',event=>{if(event.detail?.owner!==root.id){selected=false;stop()}});
 const observer=new IntersectionObserver(items=>{
  visible=items.some(item=>item.isIntersecting&&item.intersectionRatio>=0.2);
  if(document.body.classList.contains('oracle-shelf-open'))selected=visible;
  sync();
 },{threshold:[0,0.2]});observer.observe(screen);
 document.addEventListener('visibilitychange',sync);
 window.addEventListener('pagehide',()=>{
  selected=false;stop();observer.disconnect();
  document.removeEventListener('visibilitychange',sync);
  window.removeEventListener('message',reportedError);
 },{once:true});
 return {root,stop};
}
if(typeof document!=='undefined'){
 const ready=()=>{mountLiveGame(document.getElementById('liveFoxGameCard'));mountLiveNews(document.getElementById('liveFoxNewsCard'));window.dispatchEvent(new Event('quantaphi:live-tv-update'))};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
}
