import {CREATOR_CHANNELS,parseCreatorInput,mixCreatorVideos,pageCreatorVideos,validCreatorVideo} from './youtube-creator-mixed-core.mjs';
import {REVIEWED_OWNER_VIDEO_LINKS} from './youtube-owner-video-links.mjs';

/* One original Oracle media Quick Card; only the selected video is embedded.
 * Browsing and personal additions are local; no provider login or media rehost. */
const KEY='quantaphi:youtube-creator-mix:v1',BATCH=6;
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const button=(name,fn)=>{const b=el('button','qcx-button',name);b.type='button';b.style.minHeight='48px';b.addEventListener('click',fn);return b;};
const anchor=(name,url)=>{const a=el('a','qcx-link',name+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
let frame=null,frameStop=null;
function stopPlayer(){
 if(frame){frame.remove();frame=null;}
 if(frameStop){const hide=frameStop;frameStop=null;hide();}
}
if(typeof window!=='undefined')window.addEventListener('quantaphi:youtube-player-stop',stopPlayer);
const savedUrls=()=>{
 try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(data)?
  data.filter(v=>typeof v==='string'&&parseCreatorInput(v)).slice(0,80):[];}
 catch{return []}
};
export function mountMixedCreatorCard(root,card){
 if(!root||card?.youtubeMixedFeed!==true)return false;
 const dedicatedChannel=CREATOR_CHANNELS.find(c=>c.key===card.initialCreatorChannel)||null;
 const ownerView=card.initialCreatorChannel==='owner';
 const panel=el('section','qcx-tool youtube-creator-mixed-card');
 const channelNames=CREATOR_CHANNELS.map(c=>c.name).join(' / ');
 panel.setAttribute('aria-label',ownerView?'More owner-submitted videos and original creator uploads':dedicatedChannel?dedicatedChannel.name+' full channel YouTube videos':channelNames+' mixed YouTube video feed');
 const title=el('h3','',ownerView?'View more videos · owner links + verified creators':dedicatedChannel?dedicatedChannel.name+' · Full channel Quick Card':'YouTube creator mix · '+channelNames);
 const info=el('p','qcx-note',ownerView?'Browse more videos you submitted, then switch the channel selector to load verified creators’ recent uploads using YouTube public RSS. These links are not presumed related or from the same uploader. Full channel archives stay on YouTube.':dedicatedChannel?'Original channel link, '+dedicatedChannel.seed.length+' reviewed videos and recent uploads. Search or load more; the full historical archive stays on YouTube.':'Recent videos from YouTube’s official public upload feeds, plus reviewed and personally added links. Full history, Shorts and Community posts may not be present.');
 const status=el('p','qcx-note','Loading available public uploads…');
 status.setAttribute('role','status');
 const controls=el('div','qcx-mix-controls');
 const select=el('select','qcx-input');select.setAttribute('aria-label','Filter by video channel');select.style.minHeight='48px';
 const search=el('input','qcx-input');search.type='search';search.placeholder='Search loaded videos';search.maxLength=120;search.setAttribute('aria-label','Search loaded creator videos');
 const feed=el('div','qcx-mix-feed');feed.setAttribute('aria-label','Mixed creator video selections');
 const more=button('Load more videos',()=>{visible+=BATCH;paint()});
 const add=el('form','qcx-mix-add');const input=el('input','qcx-input');
 input.type='url';input.placeholder='Paste YouTube channel or video link';input.maxLength=320;input.required=true;input.setAttribute('aria-label','Add channel or video');
 const addButton=el('button','qcx-button','Add channel or video');addButton.type='submit';addButton.style.minHeight='48px';
 const addStatus=el('p','qcx-note','Add a YouTube watch/Short link, @handle or /channel/UC… link. Saved on this device; channel IDs enable recent-upload refresh.');
 addStatus.setAttribute('role','status');
 const channelsBox=el('div','qcx-mix-channels');
 add.append(input,addButton);
 controls.append(select,search);
 panel.append(title,info,controls,status,feed,more,add,addStatus,channelsBox);
 root.append(panel);

 let saved=savedUrls(),visible=BATCH,filter=ownerView?'owner':dedicatedChannel?.key||'all',query='',busy=false;
 const live=new Map();
 const channels=()=>{
  const found=[...CREATOR_CHANNELS];
  for(const raw of saved){
   const parsed=parseCreatorInput(raw);
   if(parsed?.type!=='channel'||found.some(c=>c.channelId===parsed.channelId))continue;
   if(found.length>=8)break;
   found.push({key:parsed.channelId,name:'Added YouTube channel · '+parsed.channelId.slice(-6),
    channelId:parsed.channelId,url:'https://www.youtube.com/channel/'+parsed.channelId,seed:[]});
  }
  return found;
 };
 const titleFor=(item,chs)=>item.channelId==='saved'?'Your added YouTube link':
  item.channelId==='owner'?'Owner-submitted video · channel unverified':
  chs.find(c=>c.key===item.channelId)?.name||'YouTube publisher';
 function getRows(chs){
  const rows=[];
  // Preserve a separate owner-only view without claiming verified uploader IDs.
  const owner=REVIEWED_OWNER_VIDEO_LINKS.map(v=>({
   channelId:'owner',videoId:v.videoId,sourceUrl:v.sourceUrl,
   title:v.title,publishedAt:null,origin:'owner'
  }));
  if(filter==='owner')rows.push(...owner);
  for(const channel of chs){
   const current=live.get(channel.key)||[];
   // New RSS records take priority over older reviewed snapshots on duplicate IDs.
   rows.push(...current,...channel.seed.map(v=>({...v,channelId:channel.key})));
  }
  if(filter!=='owner')rows.push(...owner);
  for(const raw of saved){
   const p=parseCreatorInput(raw);
   if(p?.type==='video')rows.push({channelId:'saved',videoId:p.videoId,
    sourceUrl:'https://www.youtube.com/watch?v='+p.videoId,
    title:'Your added video · '+p.videoId,publishedAt:null,origin:'personal'});
  }
  const mixed=mixCreatorVideos(rows,[...chs.map(c=>c.key),'owner','saved']);
  if(dedicatedChannel&&filter===dedicatedChannel.key){
   const requested=mixed.findIndex(v=>v.videoId===card.initialCreatorVideoId&&v.channelId===dedicatedChannel.key);
   if(requested>0)mixed.unshift(...mixed.splice(requested,1));
  }
  return mixed.filter(v=>(filter==='all'||filter===v.channelId)&&
   (!query||[v.title,titleFor(v,chs)].join(' ').toLocaleLowerCase().includes(query)));
 }
 function setChannelFilter(chs){
  const options=[{id:'all',name:'All channels'},{id:'owner',name:'Owner-submitted videos'},...chs.map(c=>({id:c.key,name:c.name}))];
  if(saved.some(raw=>parseCreatorInput(raw)?.type==='video'))options.push({id:'saved',name:'Added videos'});
  if(!options.some(x=>x.id===filter))filter='all';
  select.replaceChildren(...options.map(x=>{const option=el('option','',x.name);option.value=x.id;return option}));
  select.value=filter;
 }
 function paint(){
  stopPlayer();
  const chs=channels();setChannelFilter(chs);
  channelsBox.replaceChildren();
  for(const channel of chs)channelsBox.append(anchor('Full '+channel.name+' videos on YouTube',
   channel.videosUrl||channel.url+'/videos'));
  for(const raw of saved){
   if(parseCreatorInput(raw)?.type!=='handle')continue;
   const name=parseCreatorInput(raw).handle;
   channelsBox.append(anchor('Added @'+name+' channel','https://www.youtube.com/@'+name+'/videos'));
  }
  const rows=getRows(chs),shown=pageCreatorVideos(rows,0,visible);
  feed.replaceChildren();
  status.textContent='Showing '+shown.length+' of '+rows.length+' loaded videos · '+
   (busy?'checking recent public uploads · ':'')+
   'full historic channel archives remain at YouTube.';
  for(const video of shown){
   if(!validCreatorVideo(video))continue;
   const item=el('article','qcx-mix-entry');
   const image=el('img','qcx-thumb');
   image.src='https://i.ytimg.com/vi/'+video.videoId+'/hqdefault.jpg';
   image.alt='Original YouTube thumbnail for '+video.title;
   image.loading='lazy';image.decoding='async';image.addEventListener('error',()=>image.remove(),{once:true});
   const heading=el('h4','',video.title);
   const original=el('p','qcx-note',titleFor(video,chs)+' · '+
    (video.origin==='rss'&&video.publishedAt?'YouTube published '+new Date(video.publishedAt).toLocaleDateString():
      video.origin==='personal'?'owner-added link, publisher/title unverified':
      video.origin==='owner'?'owner source link, uploader/date not confirmed':'reviewed public link, date unverified'));
   const actions=el('div','qcx-controls'),playback=el('div','qcx-player');
   const stop=button('Stop playback',()=>{
    stopPlayer();playback.replaceChildren();stop.hidden=true;
   });stop.hidden=true;
   actions.append(button('Play in card',()=>{
    window.dispatchEvent(new Event('quantaphi:youtube-player-stop'));
    playback.replaceChildren();const iframe=el('iframe','qcx-video');
    iframe.src='https://www.youtube-nocookie.com/embed/'+video.videoId;
    iframe.title='YouTube: '+video.title;iframe.loading='lazy';iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen=true;iframe.style.width='100%';
    playback.append(iframe);frame=iframe;stop.hidden=false;
    frameStop=()=>{playback.replaceChildren();stop.hidden=true;};
   }),stop,anchor('Original video',video.sourceUrl));
   item.append(image,heading,original,actions,playback);feed.append(item);
  }
  more.hidden=shown.length>=rows.length;more.disabled=shown.length>=rows.length;
  if(!rows.length)feed.append(el('p','qcx-note','No loaded videos match. Change the channel filter or search.'));
 }
 async function fetchLatest(channel){
  if(!channel.channelId)return;
  const url='/api/creator-uploads?channel='+encodeURIComponent(channel.channelId);
  try{
   const response=await fetch(url,{credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)return;
   const data=await response.json();
   if(!data?.ok||data.channelId!==channel.channelId||data.source!=='YouTube public uploads RSS'||!Array.isArray(data.videos))return;
   const rows=data.videos.slice(0,15).map(v=>({...v,channelId:channel.key,origin:'rss'})).filter(validCreatorVideo);
   live.set(channel.key,rows);
  }catch{/* Preserve reviewed links and report partial availability. */}
 }
 async function refresh(){
  if(busy)return;busy=true;paint();
  const list=channels();await Promise.all(list.map(fetchLatest));
  busy=false;paint();
 }
 select.addEventListener('change',()=>{filter=select.value;visible=BATCH;paint()});
 search.addEventListener('input',()=>{query=search.value.trim().toLocaleLowerCase();visible=BATCH;paint()});
 add.addEventListener('submit',event=>{
  event.preventDefault();
  const source=input.value.trim(),parsed=parseCreatorInput(source);
  if(!parsed){addStatus.textContent='Use an original YouTube video, /channel/UC… or @handle URL.';return;}
  if(saved.some(raw=>JSON.stringify(parseCreatorInput(raw))===JSON.stringify(parsed))){
   addStatus.textContent='That channel or video is already in your list.';return;
  }
  if(parsed.type==='channel'&&channels().length>=8){
   addStatus.textContent='Eight channels at a time are supported. Use existing channels or add individual videos.';return;
  }
  if(saved.length>=80){addStatus.textContent='Your saved list is full (80 links).';return;}
  const normalized=parsed.type==='video'?'https://www.youtube.com/watch?v='+parsed.videoId:
   parsed.type==='channel'?'https://www.youtube.com/channel/'+parsed.channelId:'https://www.youtube.com/@'+parsed.handle;
  saved=[...saved,normalized];
  let persisted=false;
  try{localStorage.setItem(KEY,JSON.stringify(saved));persisted=true}catch{}
  input.value='';visible=BATCH;filter='all';paint();
  addStatus.textContent=(persisted?'Saved on this device. ':'Added for this session only; device storage unavailable. ')+
   (parsed.type==='handle'?'Channel link saved; add /channel/UC… to load recent videos.':
    parsed.type==='channel'?'Recent uploads will be checked from YouTube.':'Video link appears in the mixed feed.');
  if(parsed.type==='channel')void refresh();
 });
 paint();void refresh();return true;
}
