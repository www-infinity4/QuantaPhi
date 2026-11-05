/* One shared, visible on-page YouTube player for artist buttons.
 * The 220x220 dock stays in the current viewport while shoppers change
 * Oracle cards. YouTube's player, branding and ad controls are not hidden.
 * The site never proxies, extracts or rehosts copyrighted music.
 */
(() => {
 'use strict';
 if (window.InfinityArtistMusic) return;
 const SOURCES = Object.freeze({
  'steve-miller':{name:'Steve Miller',track:'Book of Dreams',videoId:'D6KCZXzLdVM',playlistId:'PL8a8cutYP7foGH0YDM8YtNqGtgL0EAJ7k'},
  'pink-floyd':{name:'Pink Floyd',track:'Wish You Were Here',videoId:'K6qj09OHvjw'},
  'reo-speedwagon':{name:'REO Speedwagon',track:'Keep On Loving You',videoId:'wJzNZ1c5C9c'},
  'cheap-trick':{name:'Cheap Trick',track:'Surrender',videoId:'T_Km11HNzUY'},
  'journey':{name:'Journey',track:"Don't Stop Believin' (live)",videoId:'VcjzHMhBtf0'},
  'styx':{name:'Styx',track:'Come Sail Away',videoId:'e5MAg_yWsq8'}
 });
 let dock=null,media=null,title=null,status=null,button=null;
 let player=null,ready=false,selected=null,playing=false,loading=null,generation=0;
 function broadcast(){
  window.dispatchEvent(new CustomEvent('infinity:artist-state',{
   detail:{id:selected,playing,status:status?.textContent||''}
  }));
 }
 function playingState(next){
  playing=Boolean(next);
  if(button){
   button.textContent=playing?'Ⅱ':'▶';
   button.setAttribute('aria-pressed',String(playing));
   button.setAttribute('aria-label',playing?'Pause selected artist':'Play selected artist');
  }
  broadcast();
 }
 function setStatus(message){if(status)status.textContent=message;broadcast();}
 function mount(){
  if(dock)return;
  const css=document.createElement('style');
  css.id='infinity-artist-music-style';
  css.textContent=[
   '#infinityArtistDock{position:fixed;right:12px;bottom:12px;z-index:99998;box-sizing:border-box;width:244px;max-width:calc(100vw - 24px);padding:12px;border:1px solid #b4d3d4;border-radius:16px;background:#f8fbfa;color:#20383e;box-shadow:0 7px 28px #102f3550;font:inherit}',
   '#infinityArtistDock[hidden]{display:none}',
   '#infinityArtistDock .iam-head{display:flex;align-items:center;gap:7px;margin-bottom:7px}',
   '#infinityArtistDock .iam-title{flex:1;min-width:0;font-size:14px;font-weight:850;line-height:1.3;overflow-wrap:anywhere}',
   '#infinityArtistDock .iam-play,#infinityArtistDock .iam-stop{width:44px;height:44px;flex:none;border-radius:50%;border:0;cursor:pointer;font-size:21px}',
   '#infinityArtistDock .iam-play{background:#136a76;color:#fff}',
   '#infinityArtistDock .iam-stop{background:#e1e9eb;color:#20404c}',
   '#infinityArtistDock .iam-play:focus-visible,#infinityArtistDock .iam-stop:focus-visible{outline:3px solid #8152ae;outline-offset:2px}',
   '#infinityArtistDock .iam-frame{width:220px;height:220px;max-width:100%;margin:0 auto;background:#132226}',
   '#infinityArtistDock .iam-frame iframe{display:block;width:100%;height:100%;border:0}',
   '#infinityArtistDock .iam-status{display:block;margin-top:7px;font-size:12px;color:#46636a;line-height:1.45}'
  ].join('\n');
  document.head.appendChild(css);
  dock=document.createElement('aside');dock.id='infinityArtistDock';
  dock.setAttribute('aria-label','Artist music stays on QuantaPhi');
  const head=document.createElement('div');head.className='iam-head';
  title=document.createElement('strong');title.className='iam-title';
  title.textContent='Artist music';
  button=document.createElement('button');button.className='iam-play';
  button.type='button';button.textContent='▶';
  button.setAttribute('aria-pressed','false');
  button.setAttribute('aria-label','Play selected artist');
  button.addEventListener('click',()=>{if(selected)toggle(selected);});
  const stop=document.createElement('button');stop.className='iam-stop';
  stop.type='button';stop.textContent='×';stop.setAttribute('aria-label','Stop and close music');
  stop.addEventListener('click',()=>{
   ++generation;
   try{if(player&&ready)player.stopVideo();}catch(_){}
   selected=null;playingState(false);dock.hidden=true;setStatus('Stopped');
  });
  head.append(title,button,stop);
  media=document.createElement('div');media.id='infinityArtistMediaFrame';media.className='iam-frame';
  status=document.createElement('small');status.className='iam-status';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  status.textContent='Preparing playback…';
  dock.append(head,media,status);
  document.body.appendChild(dock);
 }
 function loadAPI(){
  if(window.YT && typeof window.YT.Player==='function')return Promise.resolve(window.YT);
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{
   const previous=window.onYouTubeIframeAPIReady;
   window.onYouTubeIframeAPIReady=()=>{
    if(typeof previous==='function'){try{previous();}catch(error){console.warn(error)}}
    if(window.YT && typeof window.YT.Player==='function')resolve(window.YT);
    else reject(Error('YouTube player API unavailable'));
   };
   const script=document.createElement('script');
   script.src='https://www.youtube.com/iframe_api';script.async=true;
   script.onerror=()=>reject(Error('Unable to load official player'));
   document.head.appendChild(script);
  }).catch(error=>{loading=null;throw error});
  return loading;
 }
 function choose(id){
  const item=SOURCES[id];
  if(!item)return false;
  mount();dock.hidden=false;
  selected=id;title.textContent=item.name+' · '+item.track;
  playingState(false);
  setStatus('Connecting to official music…');
  window.dispatchEvent(new CustomEvent('infinity:music-focus',{detail:{player:'artists'}}));
  const request=++generation;
  if(player && ready){
   try{
    if(item.playlistId)player.loadPlaylist({listType:'playlist',list:item.playlistId,index:0});
    else player.loadVideoById(item.videoId);
   }catch(error){setStatus('Playback unavailable here.');console.warn(error)}
   return true;
  }
  if(player)return true;
  void loadAPI().then(YT=>{
   if(!selected||!dock||dock.hidden||request!==generation)return;
   const initial=SOURCES[selected];
   player=new YT.Player('infinityArtistMediaFrame',{
    width:'220',height:'220',videoId:initial.videoId,
    playerVars:{playsinline:1,controls:1,origin:window.location.origin,
     ...(initial.playlistId?{listType:'playlist',list:initial.playlistId}:{})},
    events:{
     onReady(){
      ready=true;
      const current=SOURCES[selected];
      if(!current||dock.hidden)return;
      try{
       player.getIframe().setAttribute('allow','autoplay; encrypted-media; picture-in-picture');
       if(current.playlistId)player.loadPlaylist({listType:'playlist',list:current.playlistId,index:0});
       else if(current.videoId!==initial.videoId)player.loadVideoById(current.videoId);
       else player.playVideo();
      }catch(error){setStatus('Tap the official player to start audio.')}
      setStatus('Use ▶ if your browser blocks sound.');
     },
     onStateChange(event){
      const codes=window.YT?.PlayerState||{};
      if(event.data===codes.PLAYING){playingState(true);setStatus('Playing · continue shopping on this page');}
      else if(event.data===codes.PAUSED){playingState(false);setStatus('Paused');}
      else if(event.data===codes.ENDED){playingState(false);setStatus('Finished');}
     },
     onError(){playingState(false);setStatus('This recording cannot be played here.');}
    }
   });
  }).catch(()=>{playingState(false);setStatus('Official player unavailable on this device.');});
  return true;
 }
 function toggle(id){
  if(!SOURCES[id])return false;
  if(selected!==id||dock?.hidden)return choose(id);
  if(!player||!ready){setStatus('Loading · tap the official player if needed');return true;}
  try{
   if(playing){player.pauseVideo();playingState(false);setStatus('Paused');}
   else{
    window.dispatchEvent(new CustomEvent('infinity:music-focus',{detail:{player:'artists'}}));
    player.playVideo();setStatus('Starting · use player controls if sound is blocked');
   }
  }catch(_){setStatus('Use the player controls to continue.')}
  return true;
 }
 window.addEventListener('infinity:music-focus',event=>{
  if(event.detail?.player!=='radio'||!playing||!ready)return;
  try{player.pauseVideo();}catch(_){}
  playingState(false);setStatus('Paused for Infinity Radio');
 });
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden||!playing||!ready)return;
  try{player.pauseVideo();}catch(_){}
  playingState(false);setStatus('Paused when the page is hidden');
 });
 window.InfinityArtistMusic=Object.freeze({toggle,selection:()=>selected,isPlaying:()=>playing});
})();
