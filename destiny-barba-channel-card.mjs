/* Verified original Destiny Barba YouTube channel. The uploads playlist remains
 * YouTube-hosted; these two source-identified titles are NOT a complete import.
 * No media rehosting, remote scraping, autoplay, or creator endorsement. */
export const DESTINY_BARBA_CHANNEL=Object.freeze({
 channelId:'UCIQHAxjqVnwHwOKtILiWI0Q',
 name:'Destiny Barba',
 profileUrl:'https://www.youtube.com/@DestinyBarba',
 videosUrl:'https://www.youtube.com/@DestinyBarba/videos',
 uploadsPlaylistId:'UUIQHAxjqVnwHwOKtILiWI0Q',
 uploadsPlaylistUrl:'https://www.youtube.com/playlist?list=UUIQHAxjqVnwHwOKtILiWI0Q',
 verifiedAt:'2026-11-21',archiveIndexed:false
});
const sourceVideo=(videoId,title)=>Object.freeze({
 channelId:DESTINY_BARBA_CHANNEL.channelId,videoId,title,
 sourceUrl:'https://www.youtube.com/watch?v='+videoId,
 observedAt:'2026-11-21',publishedAt:null
});
export const DESTINY_BARBA_VIDEOS=Object.freeze([
 sourceVideo('KTDIFJJB8-4','What My Breastfeeding Toddler Eats In A Day | Easy Toddler Meal Ideas 2020'),
 sourceVideo('lQqwcDeZpFg','Our Breastfeeding Journey Is Over! | Day In The Life Of A SAHM 2020')
]);
export function validateDestinyBarbaVideo(v){
 return Boolean(v&&v.channelId===DESTINY_BARBA_CHANNEL.channelId&&
  /^[A-Za-z0-9_-]{11}$/.test(v.videoId||'')&&
  v.sourceUrl==='https://www.youtube.com/watch?v='+v.videoId&&
  typeof v.title==='string'&&v.title.length>0&&v.title.length<=150&&
  v.title===v.title.trim()&&!/[<>\u0000-\u001f]/.test(v.title)&&
  v.publishedAt===null&&v.observedAt==='2026-11-21');
}
export const DESTINY_BARBA_SOURCE=Object.freeze({
 id:'destiny-barba-youtube',name:'Destiny Barba · YouTube channel',
 kind:'Video · YouTube',category:'Video · YouTube',
 feature:'Watch a video and browse the original full channel uploads playlist',
 official:DESTINY_BARBA_CHANNEL.profileUrl,
 featureUrl:DESTINY_BARBA_VIDEOS[0].sourceUrl,
 image:'https://i.ytimg.com/vi/KTDIFJJB8-4/hqdefault.jpg',
 youtubeChannelId:DESTINY_BARBA_CHANNEL.channelId,
 focus:'Original YouTube video player and provider-hosted uploads playlist. No copied media, creator login or automatic feed scraping.',
 details:'Two independently identified original videos are indexed here. The complete uploads playlist is accessed through YouTube, and individual uploads are not all indexed in QuantaPhi.',
 contentBoundary:'general-media'
});
if(!DESTINY_BARBA_VIDEOS.every(validateDestinyBarbaVideo))throw new Error('Invalid Destiny Barba video catalog');
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const button=(txt,fn)=>{const b=el('button','qcx-button',txt);b.type='button';b.style.minHeight='44px';b.addEventListener('click',fn);return b;};
const link=(txt,url)=>{const a=el('a','qcx-link',txt+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
let activeFrame=null;
function stopPlayer(){
 if(activeFrame){activeFrame.remove();activeFrame=null;}
}
export function mountDestinyBarbaChannelCard(root,card){
 if(!root||card?.id!==DESTINY_BARBA_SOURCE.id||card.youtubeChannelId!==DESTINY_BARBA_CHANNEL.channelId)return false;
 const panel=el('section','qcx-tool youtube-creator-post-card');
 panel.setAttribute('aria-label','Destiny Barba original YouTube channel Quick Card');
 panel.append(
  el('h3','','Destiny Barba · YouTube channel'),
  el('p','qcx-note','2 original videos indexed here · full uploads playlist available from YouTube'),
  el('p','qcx-note','The YouTube-hosted playlist can contain more uploads than this reviewed index. Some videos may not permit embedding.')
 );
 let selected=0;
 const controls=el('div','qcx-controls');
 const picker=el('select','qcx-input');picker.style.minHeight='44px';picker.setAttribute('aria-label','Choose reviewed Destiny Barba video');
 for(const v of DESTINY_BARBA_VIDEOS){const option=el('option','',v.title);option.value=v.videoId;picker.append(option);}
 const display=el('div','youtube-creator-content');
 const status=el('p','qcx-note');status.setAttribute('role','status');
 const figure=el('div','qcx-player');
 const thumbnail=el('img','qcx-thumb');thumbnail.loading='lazy';thumbnail.decoding='async';
 thumbnail.style.maxWidth='100%';thumbnail.style.height='auto';thumbnail.style.borderRadius='12px';
 thumbnail.addEventListener('error',()=>thumbnail.remove(),{once:true});figure.append(thumbnail);
 const title=el('h4','');
 const original=link('View original video',DESTINY_BARBA_VIDEOS[0].sourceUrl);
 const player=el('div','qcx-player');
 const close=()=>{stopPlayer();player.replaceChildren();stop.hidden=true;};
 const render=()=>{
  close();
  const v=DESTINY_BARBA_VIDEOS[selected];
  picker.value=v.videoId;thumbnail.src='https://i.ytimg.com/vi/'+v.videoId+'/hqdefault.jpg';
  thumbnail.alt='Original YouTube thumbnail for '+v.title;
  title.textContent=v.title;original.href=v.sourceUrl;
  status.textContent=(selected+1)+' of '+DESTINY_BARBA_VIDEOS.length+' reviewed video links';
 };
 const previous=button('← Previous',()=>{selected=(selected-1+DESTINY_BARBA_VIDEOS.length)%DESTINY_BARBA_VIDEOS.length;render();});
 const next=button('Next →',()=>{selected=(selected+1)%DESTINY_BARBA_VIDEOS.length;render();});
 picker.addEventListener('change',()=>{const i=DESTINY_BARBA_VIDEOS.findIndex(v=>v.videoId===picker.value);if(i!==-1){selected=i;render();}});
 controls.append(picker,previous,next);panel.append(controls,status);
 const actions=el('div','qcx-controls');
 const play=(url,label)=>{
  close();
  // The existing Oracle uses a single visible YouTube player at a time.
  for(const other of document.querySelectorAll('iframe.qcx-video'))other.remove();
  const frame=el('iframe','qcx-video');frame.title=label;frame.src=url;
  frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen=true;frame.style.width='100%';
  player.append(frame);activeFrame=frame;stop.hidden=false;
 };
 actions.append(
  button('Play selected video in card',()=>{
   const v=DESTINY_BARBA_VIDEOS[selected];
   play('https://www.youtube-nocookie.com/embed/'+v.videoId,'Destiny Barba: '+v.title);
  }),
  button('Browse all channel uploads in card',()=>{
   play('https://www.youtube-nocookie.com/embed/videoseries?list='+DESTINY_BARBA_CHANNEL.uploadsPlaylistId,
    'Destiny Barba YouTube-hosted uploads playlist');
  })
 );
 const stop=button('Stop playback',close);stop.hidden=true;actions.append(stop);
 display.append(figure,title,el('p','qcx-note','Publisher controls YouTube playback and embedding.'),original,actions,player);
 const footer=el('div','qcx-controls');
 footer.append(link('Load more on YouTube',DESTINY_BARBA_CHANNEL.videosUrl),
  link('Open original uploads playlist',DESTINY_BARBA_CHANNEL.uploadsPlaylistUrl),
  link('View original channel',DESTINY_BARBA_CHANNEL.profileUrl));
 panel.append(display,footer);
 root.append(panel);render();return true;
}
