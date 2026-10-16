/* Four TV card screens: VIDEO or actual YouTube player, never an entire
 * TV website embedded in an iframe. Playback is user-started and audible when
 * allowed by Android/browser and the source provider. One active sound source. */
(function(){
'use strict';
const host=document.getElementById('phiChannelCards'),catalog=window.PhiTVPrograms;
if(!host||!catalog)return;
const channels=[
 {name:'StarQuest',eyebrow:'CLASSIC MOVIES · WATCH NOW',description:'Direct movie player · daily feature or next title.',key:'starquest',poster:'/TV-Database/assets/starquest-share-card.jpg',icon:'SQ',tone:'starquest'},
 {name:'Omni TV',eyebrow:'ONE REMOTE · THREE CHANNELS',description:'Actual video only. CH− / CH+ switches between StarQuest, Chiller and Shop LC.',key:'omni',poster:'/omni-tv/preview.png',icon:'TV',tone:'omni'},
 {name:'Chiller',eyebrow:'1980s SUSPENSE · ON AIR',description:'Current scheduled Hitchcock or Twilight Zone episode in the screen.',key:'chiller',poster:'https://i.ytimg.com/vi/YD5xBeGeX5w/hqdefault.jpg',icon:'C',tone:'chiller'},
 {name:'ShopLC',eyebrow:'SHOPPING TV · LIVE',description:'The live Shop LC video broadcast, directly in the screen.',key:'shoplc',poster:'https://i.ytimg.com/vi/eqpG55UKM8M/hqdefault.jpg',icon:'LC',tone:'shoplc'}
];
const remoteChannels=['starquest','chiller','shoplc'];
const el=(tag,cls,label)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(label!==undefined)node.textContent=label;return node};
const heading=host.appendChild(el('div','channelphi-heading'));
heading.append(el('span','channelphi-kicker','INFINITY 2026® · ORACLE OCTAVES'),el('h2',null,'Watch · Infinity Channels'),
 el('p',null,'Tap a TV screen to watch the actual movie or channel with sound. No television websites open inside these cards.'));
const grid=host.appendChild(el('div','channelphi-grid'));
let active=null,generation=0,ytReady=null,hlsReady=null;
function scriptOnce(src,test){
 if(test())return Promise.resolve(true);
 return new Promise(resolve=>{
  const tag=el('script');tag.async=true;tag.src=src;
  const timer=setTimeout(()=>finish(test()),10000);
  let settled=false;
  function finish(ok){if(settled)return;settled=true;clearTimeout(timer);resolve(!!ok)}
  tag.onload=()=>finish(test());tag.onerror=()=>finish(false);
  document.head.append(tag);
 });
}
function ytAPI(){
 if(window.YT?.Player)return Promise.resolve(true);
 if(ytReady)return ytReady;
 // YT iframe player events reveal embed-denied sources; HTML frame still has
 // built-in controls if the API script is blocked by the browser.
 ytReady=new Promise(resolve=>{
  const old=window.onYouTubeIframeAPIReady;let settled=false;
  const done=ok=>{if(settled)return;settled=true;clearTimeout(timer);resolve(ok)};
  window.onYouTubeIframeAPIReady=()=>{try{old?.()}catch(_){}done(!!window.YT?.Player)};
  const timer=setTimeout(()=>done(!!window.YT?.Player),10000);
  const script=el('script');script.async=true;script.src='https://www.youtube.com/iframe_api';
  script.onerror=()=>done(false);document.head.append(script);
 });
 return ytReady;
}
function stop(){
 generation++;
 if(!active)return;
 const playback=active;active=null;
 if(playback.hls){try{playback.hls.destroy()}catch(_){}}
 if(playback.yt){try{playback.yt.stopVideo();playback.yt.destroy()}catch(_){}}
 if(playback.video){try{playback.video.pause();playback.video.removeAttribute('src');playback.video.load()}catch(_){}}
 if(playback.frame){playback.frame.src='about:blank'}
 playback.screenSlot.replaceChildren();
 playback.viewer.hidden=true;playback.screen.hidden=false;
 playback.screen.setAttribute('aria-expanded','false');
 playback.card.classList.remove('channelphi-playing');
 playback.status.textContent='Player stopped';
}
function resetMedia(){
 if(!active)return;
 if(active.hls){try{active.hls.destroy()}catch(_){}active.hls=null}
 if(active.yt){try{active.yt.stopVideo();active.yt.destroy()}catch(_){}active.yt=null}
 if(active.video){try{active.video.pause();active.video.removeAttribute('src');active.video.load()}catch(_){}active.video=null}
 if(active.frame)active.frame.src='about:blank';
 active.frame=null;active.screenSlot.replaceChildren();
}
function programFor(playback){
 return catalog.now(playback.channel,new Date());
}
function setSound(playback){
 if(active!==playback)return;
 if(playback.video){
  playback.video.muted=false;playback.video.volume=1;
  const promise=playback.video.play();if(promise?.catch)promise.catch(()=>{
   playback.status.textContent='Tap ▶ on the video controls to start sound on this device.';
  });
  playback.sound.textContent='🔊 Sound on';
  return;
 }
 if(playback.yt){
  try{playback.yt.unMute();playback.yt.setVolume(100);playback.yt.playVideo();playback.sound.textContent='🔊 Sound on';
   playback.status.textContent='Sound requested. Use ▶ or volume on the YouTube player if playback is blocked.';}catch(_){}
 }else if(playback.frame){
  playback.status.textContent='Tap ▶ or 🔊 in the video window for sound. Android may require a second tap.';
 }
}
function showProgram(playback,program,token){
 if(active!==playback||token!==generation)return;
 if(!program){playback.status.textContent='No verified video is available for this channel.';return}
 playback.program=program;
 playback.title.textContent=program.title+(program.year?' · '+program.year:'');
 playback.status.textContent='Preparing '+program.title+'…';
 if(playback.channel==='shoplc'){void playShopLC(playback,token,0);return}
 if(!catalog.valid(program.videoId)){playback.status.textContent='Invalid media ID. Playback cancelled.';return}
 const frame=el('iframe','channelphi-frame');
 frame.title=program.title+' — video player only';
 frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
 frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
 frame.loading='eager';
 const url=new URL('https://www.youtube-nocookie.com/embed/'+program.videoId);
 url.searchParams.set('autoplay','1');url.searchParams.set('playsinline','1');
 url.searchParams.set('controls','1');url.searchParams.set('enablejsapi','1');
 url.searchParams.set('origin',location.origin);url.searchParams.set('rel','0');
 if(program.start)url.searchParams.set('start',String(program.start));
 frame.src=url.toString();
 playback.frame=frame;playback.screenSlot.append(frame);
 playback.status.textContent='Playing '+program.title+'. If sound is blocked, tap ▶ or 🔊 inside the TV.';
 void ytAPI().then(ok=>{
  if(!ok||active!==playback||token!==generation||playback.frame!==frame)return;
  try{
   playback.yt=new window.YT.Player(frame,{
    events:{
     onReady:event=>{if(active!==playback||token!==generation)return;
      try{event.target.unMute();event.target.setVolume(100);event.target.playVideo()}catch(_){}
      playback.sound.textContent='🔊 Sound on';
     },
     onError:event=>{if(active!==playback||token!==generation)return;
      const code=Number(event?.data);
      if([2,5,100,101,150].includes(code)){
       playback.status.textContent='That video cannot play here. Selecting another verified title…';
       if(playback.fallbacks<2){playback.fallbacks++;changeProgram(playback,1)}
       else playback.status.textContent='The source blocked playback. Choose another program using CH+.';
      }
     },
     onStateChange:event=>{if(active===playback&&token===generation&&event?.data===1)
       playback.status.textContent=program.title+' · Playing. Volume is controlled inside the TV.'}
    }
   });
  }catch(_){playback.status.textContent='Use the video Play button to start the sound.'}
 });
}
function changeProgram(playback,step){
 if(active!==playback)return;
 const channel=playback.channel==='omni'?'starquest':playback.channel;
 if(channel==='shoplc'){playback.streamIndex=(playback.streamIndex+1)%catalog.SHOPLC_STREAMS.length;resetMedia();const token=++generation;void playShopLC(playback,token,playback.streamIndex);return}
 if(playback.channel==='omni'){
  const i=remoteChannels.indexOf(playback.remoteChannel);
  playback.remoteChannel=remoteChannels[(i+step+remoteChannels.length)%remoteChannels.length];
  playback.channel=playback.remoteChannel;
  playback.fallbacks=0;resetMedia();const token=++generation;showProgram(playback,programFor(playback),token);
  return;
 }
 const next=catalog.next(channel,playback.program,step);
 playback.fallbacks=playback.fallbacks||0;resetMedia();const token=++generation;showProgram(playback,next,token);
}
function hlsAPI(){if(window.Hls?.isSupported?.())return Promise.resolve(true);if(hlsReady)return hlsReady;
 hlsReady=scriptOnce('https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js',()=>!!window.Hls?.isSupported?.());return hlsReady}
async function playShopLC(playback,token,index){
 if(active!==playback||token!==generation)return;
 const video=el('video','channelphi-video');
 video.controls=true;video.playsInline=true;video.autoplay=true;video.muted=false;video.volume=1;
 video.preload='auto';video.setAttribute('aria-label','Shop LC live video with sound');
 playback.video=video;playback.screenSlot.append(video);
 playback.status.textContent='Connecting directly to Shop LC live broadcast…';
 let tries=index;
 async function feed(){
  if(active!==playback||token!==generation)return;
  if(tries>=catalog.SHOPLC_STREAMS.length){
   playback.status.textContent='Live feeds did not respond. Try CH+ to retry a feed.';return;
  }
  const source=catalog.SHOPLC_STREAMS[tries++];
  const fallback=()=>{if(active!==playback||token!==generation)return;
   if(playback.hls){try{playback.hls.destroy()}catch(_){}playback.hls=null}
   video.pause();video.removeAttribute('src');video.load();void feed()};
  if(video.canPlayType('application/vnd.apple.mpegurl')){
   video.src=source;video.onerror=fallback;
   video.onloadedmetadata=()=>{if(active!==playback||token!==generation)return;setSound(playback);playback.status.textContent='Shop LC is live.'};
   video.load();return;
  }
  const available=await hlsAPI();
  if(active!==playback||token!==generation)return;
  if(!available){playback.status.textContent='This browser needs HLS support for this live stream. Try a modern browser.';return}
  const hls=new window.Hls({enableWorker:true,lowLatencyMode:true,manifestLoadingTimeOut:12000,fragLoadingTimeOut:15000});
  playback.hls=hls;hls.attachMedia(video);
  hls.on(window.Hls.Events.MEDIA_ATTACHED,()=>{if(active===playback&&token===generation)hls.loadSource(source)});
  hls.on(window.Hls.Events.MANIFEST_PARSED,()=>{if(active===playback&&token===generation){setSound(playback);playback.status.textContent='Shop LC is live.'}});
  hls.on(window.Hls.Events.ERROR,(_,detail)=>{if(detail?.fatal)fallback()});
 }
 video.onplaying=()=>{if(active===playback&&token===generation)playback.status.textContent='Shop LC · live broadcast with sound controls'};
 await feed();
}
function open(playback){
 stop();const token=generation;
 playback.screen.hidden=true;playback.screen.setAttribute('aria-expanded','true');
 playback.viewer.hidden=false;playback.card.classList.add('channelphi-playing');
 playback.remoteChannel=playback.key==='omni'?'starquest':playback.key;
 playback.channel=playback.remoteChannel;playback.program=null;playback.fallbacks=0;playback.streamIndex=0;
 active=playback;showProgram(playback,programFor(playback),token);
}
for(const c of channels){
 const card=grid.appendChild(el('article','channelphi-card channelphi-'+c.tone));card.setAttribute('aria-label',c.name+' channel');
 const mast=card.appendChild(el('div','channelphi-mast'));
 mast.append(el('span','channelphi-monogram',c.icon));
 const title=mast.appendChild(el('div','channelphi-name'));title.append(el('span','channelphi-kicker',c.eyebrow),el('h3',null,c.name));
 card.append(el('p','channelphi-description',c.description));
 const screen=card.appendChild(el('button','channelphi-screen'));screen.type='button';screen.setAttribute('aria-label','Watch '+c.name+' video in this card');screen.setAttribute('aria-expanded','false');
 const image=screen.appendChild(el('img','channelphi-art'));image.src=c.poster;image.alt='';image.loading='lazy';
 const shade=screen.appendChild(el('span','channelphi-screen-label'));shade.append(el('span','channelphi-play-icon','▶'),el('strong',null,'Watch '+c.name));
 const viewer=card.appendChild(el('div','channelphi-viewer'));viewer.hidden=true;
 const screenSlot=viewer.appendChild(el('div','channelphi-video-slot'));screenSlot.setAttribute('aria-label','Video screen');
 const now=viewer.appendChild(el('strong','channelphi-now','On air'));
 const status=viewer.appendChild(el('p','channelphi-status','Ready'));status.setAttribute('role','status');
 const controls=viewer.appendChild(el('div','channelphi-controls'));
 const previous=controls.appendChild(el('button','channelphi-prev','◀ CH−'));previous.type='button';
 const next=controls.appendChild(el('button','channelphi-next','CH+ ▶'));next.type='button';
 const sound=controls.appendChild(el('button','channelphi-sound','🔊 Sound'));sound.type='button';
 const close=controls.appendChild(el('button','channelphi-stop','■ Stop'));close.type='button';
 const playback={key:c.key,card,screen,viewer,screenSlot,status,title:now,sound,video:null,frame:null,yt:null,hls:null,program:null,channel:c.key,remoteChannel:c.key};
 screen.addEventListener('click',()=>open(playback));
 previous.addEventListener('click',()=>changeProgram(playback,-1));
 next.addEventListener('click',()=>changeProgram(playback,1));
 sound.addEventListener('click',()=>setSound(playback));
 close.addEventListener('click',()=>{stop();screen.focus()});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
document.addEventListener('oracle:card-deactivated',event=>{if(event.detail?.id==='phiChannelCards')stop()});
window.addEventListener('pagehide',stop);
host.append(el('p','channelphi-foot','Only one video streams at a time. Sound is requested after you tap; YouTube, live sources and Android may require the Play/volume control in the screen. Unavailable media cannot be made playable by embedding its website.'));
})();
