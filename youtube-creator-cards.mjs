import {YOUTUBE_CHANNEL,YOUTUBE_VIDEO_DATABASE,YOUTUBE_TOPICS,findYouTubeVideo,searchYouTubeVideos} from './youtube-creator-catalog.mjs';
import {JULIE_DERU_CHANNEL,JULIE_DERU_VIDEO_DATABASE,JULIE_DERU_TOPICS,findJulieDeruVideo,searchJulieDeruVideos} from './julie-deru-catalog.mjs';

/* In-card public-source browser. Each user click mounts at most one YouTube
 * player; switching videos removes the previous iframe. No autoplay, rehost,
 * channel sign-in capture, or claim that the whole channel was imported. */
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const link=(title,href)=>{const a=el('a','qcx-link',title+' ↗');a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;};
const button=(title,handler)=>{const b=el('button','qcx-button',title);b.type='button';b.style.minHeight='44px';b.addEventListener('click',handler);return b;};
let activeFrame=null;
function stopPlayer(){
 if(activeFrame){activeFrame.remove();activeFrame=null;}
}
if(typeof window!=='undefined')window.addEventListener('quantaphi:youtube-player-stop',stopPlayer);
export function mountYouTubeCreatorCard(root,card){
 const isJulie=card?.youtubeChannelId===JULIE_DERU_CHANNEL.channelId;
 if(!isJulie&&card?.youtubeChannelId!==YOUTUBE_CHANNEL.channelId)return false;
 const channel=isJulie?JULIE_DERU_CHANNEL:YOUTUBE_CHANNEL;
 const database=isJulie?JULIE_DERU_VIDEO_DATABASE:YOUTUBE_VIDEO_DATABASE;
 const topics=isJulie?JULIE_DERU_TOPICS:YOUTUBE_TOPICS;
 const find=isJulie?findJulieDeruVideo:findYouTubeVideo;
 const searchVideos=isJulie?searchJulieDeruVideos:searchYouTubeVideos;
 const indexRoute=isJulie?'julie-deru-youtube':'abbecadventures-youtube';
 const panel=el('section','qcx-tool youtube-creator-post-card');
 panel.setAttribute('aria-label',channel.name+' indexed video database');
 panel.append(el('h3','',channel.name+' · Public YouTube videos'),
  el('p','qcx-note',database.videos.length+' source-identified videos · partial archive · checked '+database.coverage.checkedAt),
  el('p','qcx-note','Titles, links and thumbnails are from the original publisher. Community posts, full upload history and exact publish dates have not been indexed.'));
 let query='',selected=card.youtubeVideoId||database.videos[0]?.videoId;
 const single=Boolean(card.youtubeVideoId);
 const controls=el('div','qcx-controls');
 let search,picker,previous,next;
 const status=el('p','qcx-note');status.setAttribute('role','status');
 const contents=el('div','youtube-creator-content');
 const rows=()=>single?[find(card.youtubeVideoId)].filter(Boolean):searchVideos(query);
 if(!single){
  search=el('input','qcx-input');search.type='search';search.placeholder='Search indexed videos';search.maxLength=140;search.setAttribute('aria-label','Search '+channel.name+' indexed videos');
  picker=el('select','qcx-input');picker.setAttribute('aria-label','Choose indexed YouTube video');
  search.addEventListener('input',()=>{query=search.value;paint();});
  picker.addEventListener('change',()=>{selected=picker.value;paint();});
  previous=button('← Previous',()=>step(-1));next=button('Next →',()=>step(1));
  controls.append(search,picker,previous,next);panel.append(controls);
 }
 panel.append(status,contents);
 function step(delta){
  const list=rows(),i=list.findIndex(p=>p.videoId===selected);
  if(!list.length)return;
  selected=list[(i+delta+list.length)%list.length]?.videoId;paint();
 }
 function paint(){
  stopPlayer();
  const list=rows();
  if(!list.some(v=>v.videoId===selected))selected=list[0]?.videoId;
  if(picker){
   picker.replaceChildren(...list.map(v=>{const option=el('option','',v.title);option.value=v.videoId;return option;}));
   picker.value=selected||'';picker.disabled=!list.length;
   previous.disabled=next.disabled=list.length<2;
  }
  contents.replaceChildren();
  const video=list.find(v=>v.videoId===selected);
  if(!video){status.textContent='No indexed videos match. Try a different search.';return;}
  status.textContent=(list.findIndex(v=>v.videoId===selected)+1)+' of '+list.length+' matching videos';
  const figure=el('div','qcx-player');
  const thumb=el('img','qcx-thumb');thumb.loading='lazy';thumb.decoding='async';
  thumb.alt='YouTube thumbnail · '+video.title;
  thumb.src='https://i.ytimg.com/vi/'+video.videoId+'/hqdefault.jpg';
  thumb.style.maxWidth='100%';thumb.style.height='auto';thumb.style.borderRadius='12px';
  thumb.addEventListener('error',()=>thumb.remove(),{once:true});figure.append(thumb);
  const playback=el('div','qcx-player');
  const title=el('h4','',video.title);
  const topic=el('p','qcx-note',topics[video.topic]+' · '+channel.name+' · publish date not verified');
  const actions=el('div','qcx-controls');
  actions.append(link('Read original on YouTube',video.sourceUrl));
  const play=button('Play video in card',()=>{
   window.dispatchEvent(new Event('quantaphi:youtube-player-stop'));
   stopPlayer();
   playback.replaceChildren();
   const frame=el('iframe','qcx-video');
   frame.title=channel.name+': '+video.title;
   frame.src='https://www.youtube-nocookie.com/embed/'+video.videoId;
   frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
   frame.allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share';
   frame.allowFullscreen=true;frame.style.width='100%';
   playback.append(frame);activeFrame=frame;stop.hidden=false;
  });
  const stop=button('Stop playback',()=>{
   stopPlayer();playback.replaceChildren();stop.hidden=true;
  });stop.hidden=true;actions.append(play,stop);
  contents.append(figure,title,topic,actions,playback,
   el('p','qcx-note','Playback requires a click. YouTube may restrict embedding; the original link remains available.'));
 }
 const footer=el('div','qcx-controls');
 footer.append(link('View original channel',channel.profileUrl));
 if(single)footer.append(link('Browse indexed videos','/source-quick-card.html?card='+indexRoute));
 else footer.append(button('Export indexed database',()=>{
  const blob=new Blob([JSON.stringify(database,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=channel.handle.toLowerCase()+'-reviewed-video-index.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }));
 panel.append(footer);root.append(panel);paint();return true;
}
