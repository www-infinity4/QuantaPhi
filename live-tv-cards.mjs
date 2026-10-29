import {fetchWorldSeries,REFRESH_MS,TEAMS,FOX_WATCH_URL,scoreText} from './world-series-score.mjs?v=20261028-game5c';
import {isLiveGame,liveNewsEmbed,KYOU,kyouReferralUrl} from './live-tv-state.mjs?v=20261028-kyou1';

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
 let current=null,stopped=false;
 function render(){
  const live=isLiveGame(current);
  root.dataset.livePriority=live?'1':'0';
  numbers.textContent=scoreText(current);
  state.textContent=!current?'MLB status unavailable':current.stale?'Last known score · live status unconfirmed':
   live?'LIVE GAME'+(current.inning?' · '+current.inning:''):
   current.status==='final'?'FINAL':current.status==='pregame'?'UPCOMING':
   current.status==='live'?'Live status no longer current':current.detail||'Game status unavailable';
  stamp.textContent=current?.fetchedAt?'MLB checked '+new Date(current.fetchedAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})+' · '+(live?'Pinned during this game':'No live-game pin'):'Cannot confirm that the game is live.';
  window.dispatchEvent(new Event('quantaphi:live-tv-update'));
 }
 async function update(){if(stopped||document.hidden)return;current=await fetchWorldSeries();if(!stopped)render()}
 void update();
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
  'The official live news player starts muted when this card is on screen. Use the player’s volume control for sound.');
 const screen=el('div','ltv-screen'),status=el('p','ltv-playback','Live news · player loads when this card is visible.');status.setAttribute('role','status');
 root.append(screen,status,el('p','ltv-note','LiveNOW is FOX’s news stream. The World Series game is a separate FOX broadcast.'),link('LiveNOW from FOX · original channel','https://www.livenowfox.com/live'));
 let selected=false,visible=false,frame=null;
 function stop(){
  if(frame){frame.src='about:blank';frame.remove();frame=null}
  status.textContent='Live news · player paused while this card is off screen.';
 }
 function sync(){
  if(!selected||!visible||document.hidden){stop();return}
  if(frame)return;
  frame=el('iframe','ltv-frame');frame.title='LiveNOW from FOX official live news video';
  frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;
  frame.referrerPolicy='strict-origin-when-cross-origin';frame.loading='eager';
  frame.src=liveNewsEmbed(location.origin);screen.append(frame);
  status.textContent='Live news requested · starts muted. If the provider cannot play here, use the original channel below.';
 }
 root.addEventListener('oracle:activate',()=>{selected=true;sync()});
 document.addEventListener('oracle:card-deactivated',event=>{if(event.detail?.id===root.id){selected=false;stop()}});
 const observer=new IntersectionObserver(items=>{
  visible=items.some(item=>item.isIntersecting&&item.intersectionRatio>=0.2);
  // Shelf mode exposes original cards without an Oracle activation event.
  if(document.body.classList.contains('oracle-shelf-open'))selected=visible;
  sync();
 },{threshold:[0,0.2]});observer.observe(screen);
 document.addEventListener('visibilitychange',sync);
 window.addEventListener('pagehide',()=>{selected=false;stop();observer.disconnect();document.removeEventListener('visibilitychange',sync)},{once:true});
 return {root,stop};
}
if(typeof document!=='undefined'){
 const ready=()=>{mountLiveGame(document.getElementById('liveFoxGameCard'));mountLiveNews(document.getElementById('liveFoxNewsCard'));window.dispatchEvent(new Event('quantaphi:live-tv-update'))};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
}
