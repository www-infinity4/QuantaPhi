/* Classic Rock · real official YouTube videos inside the original Quick Card.
 * YouTube streams the content through its own player; no copying, proxying,
 * external viewer, fake playback state, or wallet operations.
 */
import {CLASSIC_ROCK_BANDS,linkIsAllowed} from './classic-rock-official-catalog.mjs';
const root = document.getElementById('classicRockOfficialMusicCard');
if(root && root.dataset.officialRockMounted!=='true'){
 root.dataset.officialRockMounted='true';
 root.classList.add('cr-official-card');
 const node=(tag,cls,text)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;
  return n;
 };
 const style=node('style');
 style.textContent=[
  '#classicRockOfficialMusicCard{display:block;box-sizing:border-box;margin:0;padding:16px;border:1px solid #c4d5d9;background:#f7faf9;color:#213640;border-radius:17px;font:inherit;}',
  '#classicRockOfficialMusicCard .cr-head{display:flex;gap:12px;align-items:center;margin:0 0 12px;}',
  '#classicRockOfficialMusicCard .cr-record{position:relative;flex:none;width:53px;height:53px;border:3px solid #d8e6e6;border-radius:50%;background:repeating-radial-gradient(circle,#141f28 0 5px,#293640 5px 6px);}',
  '#classicRockOfficialMusicCard .cr-record:after{content:"∞";position:absolute;inset:15px;display:grid;place-items:center;border-radius:50%;background:#bbd5d5;color:#124854;font-size:13px;font-weight:900;}',
  '#classicRockOfficialMusicCard h2{margin:0;font-size:21px;font-weight:850;line-height:1.25;letter-spacing:.01em;color:#243c45;}',
  '#classicRockOfficialMusicCard .cr-intro{margin:4px 0 0;color:#536c74;font-size:13px;line-height:1.45;}',
  '#classicRockOfficialMusicCard .cr-artist-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:10px 0 13px;}',
  '#classicRockOfficialMusicCard .cr-artist{display:flex;align-items:center;gap:9px;min-width:0;min-height:61px;padding:8px;border:1px solid #cadbde;border-radius:14px;background:#fff;color:#25444a;text-align:left;font:inherit;cursor:pointer;}',
  '#classicRockOfficialMusicCard .cr-artist[aria-pressed="true"]{border-color:#0d737a;background:#eef9f9;}',
  '#classicRockOfficialMusicCard .cr-play{display:grid;flex:none;place-items:center;width:48px;height:48px;border-radius:50%;background:#136a76;color:#fff;font-size:22px;font-weight:850;line-height:1;}',
  '#classicRockOfficialMusicCard .cr-artist-label{min-width:0;overflow-wrap:anywhere;font-size:15px;font-weight:800;line-height:1.25;}',
  '#classicRockOfficialMusicCard .cr-artist:focus-visible,#classicRockOfficialMusicCard .cr-offer:focus-visible,#classicRockOfficialMusicCard .cr-video-source:focus-visible{outline:3px solid #8b56b5;outline-offset:3px;}',
  '#classicRockOfficialMusicCard .cr-player{position:relative;aspect-ratio:16/9;width:100%;background:#0f181e;border-radius:13px;overflow:hidden;}',
  '#classicRockOfficialMusicCard .cr-player iframe{width:100%;height:100%;border:0;display:block;}',
  '#classicRockOfficialMusicCard .cr-video-poster{position:absolute;inset:0;display:grid;place-items:center;background:#10181b;color:white;}',
  '#classicRockOfficialMusicCard .cr-video-poster img{display:block;width:100%;height:100%;object-fit:cover;}',
  '#classicRockOfficialMusicCard .cr-video-poster span{position:absolute;bottom:0;left:0;right:0;padding:11px;background:linear-gradient(transparent,#10181bee);font-size:14px;font-weight:750;}',
  '#classicRockOfficialMusicCard .cr-player-status{font-size:13px;line-height:1.5;color:#425f68;margin:8px 0;}',
  '#classicRockOfficialMusicCard .cr-video-source{display:inline-flex;align-items:center;min-height:44px;color:#145368;font-weight:750;margin:3px 0 12px;text-decoration:underline;}',
  '#classicRockOfficialMusicCard .cr-offers{border-top:1px solid #cadbde;padding-top:12px;}',
  '#classicRockOfficialMusicCard .cr-offer-heading{margin:0 0 5px;font-size:17px;color:#2a414a;}',
  '#classicRockOfficialMusicCard .cr-current{margin:0 0 10px;font-size:13px;line-height:1.5;color:#526a70;}',
  '#classicRockOfficialMusicCard .cr-offer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;}',
  '#classicRockOfficialMusicCard .cr-offer{display:flex;flex-direction:column;gap:5px;justify-content:center;min-width:0;min-height:76px;padding:11px;border:1px solid #c1d5d8;border-radius:13px;background:#fff;color:#125262;text-decoration:none;font-size:14px;font-weight:750;line-height:1.4;overflow-wrap:anywhere;}',
  '#classicRockOfficialMusicCard .cr-offer small{font-size:11px;font-weight:650;color:#657a80;line-height:1.3;}',
  '#classicRockOfficialMusicCard .cr-note{margin:12px 0 0;color:#647982;font-size:12px;line-height:1.55;}',
  '@media(max-width:335px){#classicRockOfficialMusicCard .cr-artist-list,#classicRockOfficialMusicCard .cr-offer-grid{grid-template-columns:1fr;}}'
 ].join('\n');
 document.head.appendChild(style);
 const heading=node('div','cr-head');
 const record=node('span','cr-record');
 record.setAttribute('aria-hidden','true');
 const introWrap=node('div');
 introWrap.append(node('h2','', 'Classic Rock · Listen & Shop'),
  node('p','cr-intro','Official artist videos and real band-linked release shops.'));
 heading.append(record,introWrap);
 const artistList=node('nav','cr-artist-list');
 artistList.setAttribute('aria-label','Play classic rock in this card');
 const frame=node('div','cr-player');
 const playerMount=node('div');
 playerMount.id='crOfficialYouTubeMount';
 const poster=node('div','cr-video-poster');
 const posterImage=node('img');
 posterImage.alt='Official YouTube video thumbnail';
 posterImage.loading='lazy';
 const posterLabel=node('span','');
 poster.append(posterImage,posterLabel);
 frame.append(playerMount,poster);
 const playerStatus=node('p','cr-player-status','Select an artist ▶ to play music in this card.');
 playerStatus.setAttribute('role','status');
 playerStatus.setAttribute('aria-live','polite');
 const videoSource=node('a','cr-video-source','Watch on YouTube ↗');
 videoSource.target='_blank';videoSource.rel='noopener noreferrer';
 const offersSection=node('section','cr-offers');
 offersSection.setAttribute('aria-label','Official artist releases and merchandise');
 const offerTitle=node('h3','cr-offer-heading');
 const current=node('p','cr-current');
 const offerGrid=node('div','cr-offer-grid');
 offersSection.append(offerTitle,current,offerGrid);
 const note=node('p','cr-note','Music plays in this card using YouTube’s own controls for pause, volume and seeking. If embedding is restricted, use the direct YouTube link. Shop links lead to the artists’ own sources.');
 const buttons=new Map();
 let selected=null, player=null, ready=false, playing=false, pending=false, sequence=0;
 function updateButtons(){
  for(const [id,button] of buttons){
   const picked=selected?.id===id;
   button.setAttribute('aria-pressed',String(picked));
   const icon=button.querySelector('.cr-play');
   if(icon)icon.textContent=picked&&playing?'Ⅱ':'▶';
  }
 }
 function showPoster(band){
  posterImage.src='https://i.ytimg.com/vi/'+band.videoId+'/hqdefault.jpg';
  posterImage.alt=band.name+' · '+band.videoTitle+' official YouTube thumbnail';
  posterLabel.textContent=band.videoTitle+' · tap '+band.name+' ▶ to play';
  if(!poster.isConnected)frame.append(poster);
 }
 function discardPlayer(){
  sequence++;
  if(player){
   try{player.destroy();}catch(_){}
  }
  player=null;ready=false;playing=false;pending=false;
  playerMount.id='crOfficialYouTubeMount';
  frame.replaceChildren(playerMount);
  if(selected)showPoster(selected);
  updateButtons();
 }
 function renderOffers(band){
  offerTitle.textContent=band.name+' · Artist release spotlight';
  current.textContent=band.feature+' · Official video: '+band.videoTitle;
  offerGrid.replaceChildren();
  for(const offer of band.offers){
   if(!linkIsAllowed(offer.url))continue;
   const link=node('a','cr-offer',offer.label+' ↗');
   link.href=offer.url;link.target='_blank';link.rel='noopener noreferrer';
   link.setAttribute('aria-label',offer.label+' · '+band.name+' official source');
   link.prepend(node('small','',offer.category));
   offerGrid.append(link);
  }
  root.dataset.selectedArtist=band.id;
  videoSource.href='https://www.youtube.com/watch?v='+band.videoId;
  updateButtons();
 }
 function loadYouTube(){
  if(window.YT && typeof window.YT.Player==='function')return Promise.resolve(window.YT);
  if(window.__smbYouTubeAPIPromise)return window.__smbYouTubeAPIPromise;
  const promise=new Promise((resolve,reject)=>{
   const earlier=window.onYouTubeIframeAPIReady;
   window.onYouTubeIframeAPIReady=function(){
    if(typeof earlier==='function'){try{earlier();}catch(_){}}
    if(window.YT&&typeof window.YT.Player==='function')resolve(window.YT);
    else reject(new Error('Player API unavailable'));
   };
   const script=document.createElement('script');
   script.src='https://www.youtube.com/iframe_api';
   script.async=true;
   script.onerror=()=>reject(new Error('YouTube blocked or offline'));
   document.head.appendChild(script);
  });
  window.__smbYouTubeAPIPromise=promise.catch(error=>{
   window.__smbYouTubeAPIPromise=null;
   throw error;
  });
  return window.__smbYouTubeAPIPromise;
 }
 async function playArtist(band){
  if(!band || document.hidden || !root.isConnected)return;
  if(selected?.id!==band.id){
   discardPlayer();
   selected=band;
   showPoster(band);
   renderOffers(band);
  }
  if(player&&ready){
   if(playing){
    player.pauseVideo();
    return;
   }
   player.playVideo();
   return;
  }
  if(player||pending)return;
  const ticket=++sequence;
  pending=true;
  playerStatus.textContent='Loading '+band.name+' official YouTube player…';
  try{
   const yt=await loadYouTube();
   if(ticket!==sequence||selected?.id!==band.id||document.hidden)return;
   player=new yt.Player(playerMount.id,{
    videoId:band.videoId,width:'100%',height:'100%',
    playerVars:{autoplay:1,playsinline:1,controls:1,origin:window.location.origin},
    events:{
     onReady(){
      if(ticket!==sequence||!player)return;
      ready=true;
      poster.remove();
      try{player.getIframe().setAttribute('allow','autoplay; encrypted-media; picture-in-picture');}catch(_){}
      playerStatus.textContent='YouTube player ready · use its play/pause and volume controls.';
      player.playVideo();
     },
     onStateChange(event){
      if(ticket!==sequence)return;
      if(event.data===yt.PlayerState.PLAYING){
       playing=true;
       playerStatus.textContent='Playing '+band.name+' · '+band.videoTitle;
       document.dispatchEvent(new CustomEvent('quanta:youtube-card-start',{detail:{id:root.id}}));
      }else if(event.data===yt.PlayerState.PAUSED||event.data===yt.PlayerState.ENDED){
       playing=false;
       playerStatus.textContent=event.data===yt.PlayerState.ENDED?'Finished · tap ▶ to replay':'Paused · tap ▶ to resume';
      }
      updateButtons();
     },
     onError(){
      playing=false;updateButtons();
      playerStatus.textContent='Video cannot play here · use Watch on YouTube.';
     }
    }
   });
  }catch(_){
   if(ticket===sequence)playerStatus.textContent='YouTube is unavailable here · use Watch on YouTube.';
  }finally{
   if(ticket===sequence)pending=false;
  }
 }
 for(const band of CLASSIC_ROCK_BANDS){
  if(!linkIsAllowed(band.youtube)||!/^[A-Za-z0-9_-]{11}$/.test(band.videoId))continue;
  const artistButton=node('button','cr-artist');
  artistButton.type='button';
  artistButton.setAttribute('aria-label','Play '+band.name+' inside the Classic Rock card');
  artistButton.setAttribute('aria-pressed','false');
  artistButton.append(node('span','cr-play','▶'),node('span','cr-artist-label',band.name));
  artistButton.querySelector('.cr-play')?.setAttribute('aria-hidden','true');
  artistButton.addEventListener('click',()=>{void playArtist(band)});
  buttons.set(band.id,artistButton);
  artistList.append(artistButton);
 }
 root.append(heading,artistList,frame,playerStatus,videoSource,offersSection,note);
 if(CLASSIC_ROCK_BANDS.length){
  selected=CLASSIC_ROCK_BANDS[0];
  renderOffers(selected);showPoster(selected);
 }
 function pause(){
  if(player&&ready)player.pauseVideo();
  playing=false;updateButtons();
 }
 document.addEventListener('oracle:card-deactivated',event=>{
  if(event.detail?.id!==root.id)return;
  pause();playerStatus.textContent='Paused · return to this card to listen.';
 });
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)return;
  pause();playerStatus.textContent='Paused while page is hidden.';
 });
 document.addEventListener('quanta:youtube-card-start',event=>{
  if(event.detail?.id!==root.id)pause();
 });
}
