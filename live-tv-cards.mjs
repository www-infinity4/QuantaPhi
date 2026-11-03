import {liveNewsEmbed,KYOU,kyouReferralUrl} from './live-tv-state.mjs?v=20261102-player1';

// One visible screen per card. Only FOX's approved YouTube embed is a real
// in-card player; KYOU does not currently publish an approved player URL.
const node=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n};
const heading=(root,kicker,name)=>{const h=node('header','ltv-head');h.append(node('span','ltv-kicker',kicker),node('h2','',name));root.append(h)};
function stationEvent(name,destination){
 const detail={partner:'kyou',card_id:'fox-live-game',...(destination?{link_id:destination}:{})};
 if(typeof window.gtag==='function')window.gtag('event',name,detail);
 window.dispatchEvent(new CustomEvent('quantaphi:partner-referral',{detail:{event:name,...detail}}));
}
function posterImage(url,alt,klass=''){
 const img=node('img','ltv-poster-image '+klass);img.src=url;img.alt=alt;
 img.width=1280;img.height=720;img.loading='eager';img.decoding='async';
 img.addEventListener('error',()=>img.classList.add('ltv-poster-image-failed'),{once:true});
 return img;
}
function posterAction(tag,label,art,cta){
 const screen=node(tag,'ltv-poster');screen.setAttribute('aria-label',label);
 screen.append(posterImage(art,'',cta==='KYOU'?'ltv-station-image':''),node('span','ltv-poster-play','▶'),node('strong','ltv-poster-label',cta));
 return screen;
}
export function mountLiveGame(root){
 if(!root||root.dataset.liveTvReady)return;
 root.dataset.liveTvReady='true';root.classList.add('ltv-card');root.dataset.station='kyou';
 heading(root,'IOWA · FOX 15.1',KYOU.name);
 const screen=posterAction('a','Watch KYOU newscasts using the official KYOU player',KYOU.logo,'Watch KYOU news');
 screen.href=kyouReferralUrl('live');screen.target='_blank';screen.rel='noopener';
 screen.referrerPolicy='strict-origin-when-cross-origin';screen.dataset.stationDestination='live';
 screen.addEventListener('click',()=>stationEvent('partner_referral_click','live'));
 root.addEventListener('oracle:activate',()=>stationEvent('partner_card_open'));
 root.append(screen,node('p','ltv-note','KYOU’s news stream opens in the broadcaster’s player. A permitted in-card KYOU live feed has not been verified; FOX 15.1 broadcast television is not represented as a news stream.'));
 return {root};
}
export function mountLiveNews(root){
 if(!root||root.dataset.liveTvReady)return;
 root.dataset.liveTvReady='true';root.classList.add('ltv-card');
 heading(root,'LIVE TV · NEWS','LiveNOW from FOX');
 const screen=node('div','ltv-screen');const status=node('p','ltv-playback','Tap ▶ to play LiveNOW from FOX.');status.setAttribute('role','status');
 // The poster is from the official LiveNOW from FOX YouTube broadcast.
 const poster=posterAction('button','Play LiveNOW from FOX news video','https://i.ytimg.com/vi/qoytj8mNq7s/hqdefault.jpg','Watch LiveNOW');
 poster.type='button';screen.append(poster);root.append(screen,status);
 let frame=null;
 function stop(){
  if(frame){frame.src='about:blank';frame.remove();frame=null}
  poster.hidden=false;status.textContent='Tap ▶ to play LiveNOW from FOX.';
 }
 function play(){
  if(frame)return;
  document.dispatchEvent(new CustomEvent('quantaphi:tv-playback-request',{detail:{owner:root.id}}));
  const player=node('iframe','ltv-frame');frame=player;
  player.title='LiveNOW from FOX video player';player.loading='eager';
  player.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';player.allowFullscreen=true;
  player.referrerPolicy='strict-origin-when-cross-origin';
  player.src=liveNewsEmbed(location.origin);
  player.addEventListener('load',()=>{if(frame===player)status.textContent='FOX video player loaded. Use the video controls for sound.'});
  player.addEventListener('error',()=>{if(frame===player){stop();status.textContent='FOX player unavailable. Try again later.'}});
  screen.append(player);poster.hidden=true;status.textContent='Loading FOX video player…';
 }
 poster.addEventListener('click',play);
 document.addEventListener('oracle:card-deactivated',event=>{if(event.detail?.id===root.id)stop()});
 document.addEventListener('quantaphi:tv-playback-request',event=>{if(event.detail?.owner!==root.id)stop()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 window.addEventListener('pagehide',stop,{once:true});
 return {root,stop,play};
}
if(typeof document!=='undefined'){
 const ready=()=>{mountLiveGame(document.getElementById('liveFoxGameCard'));mountLiveNews(document.getElementById('liveFoxNewsCard'))};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
}
