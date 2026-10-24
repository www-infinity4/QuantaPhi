/* Infinity source-card functional adapters.
 * No provider login cloning, server-side storage, automatic geo capture or uploading.
 * Every external iframe starts only after a user's explicit interaction.
 */
export function parseSpotifyLink(input){
 try{
  const url=new URL(String(input||'').trim());
  if(url.protocol!=='https:'||url.hostname!=='open.spotify.com'||url.username||url.password)return null;
  const match=url.pathname.match(/^\/(track|album|playlist|artist|show|episode)\/([a-zA-Z0-9]{10,32})\/?$/);
  return match?{kind:match[1],id:match[2],embed:'https://open.spotify.com/embed/'+match[1]+'/'+match[2]}:null;
 }catch{return null}
}
export function mapBounds(lat,lon){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
 const dy=.008,dx=.012;
 return [Math.max(-180,lon-dx),Math.max(-90,lat-dy),Math.min(180,lon+dx),Math.min(90,lat+dy)].join(',');
}
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const button=(text)=>{const n=node('button','iqc-primary',text);n.type='button';return n};
const paragraph=(text)=>node('p','iqc-muted',text);
const openLink=(text,url)=>{const a=node('a','iqc-primary',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a};
function maps(root){
 root.append(paragraph('Location is requested only when you press the button. A map preview uses OpenStreetMap; open Google Maps separately for directions, Street View or its live traffic features.'));
 const go=button('Show my location on a map');
 const status=paragraph('No location requested. Nothing is stored in your QuantaPhi account.');
 const display=node('div','iqc-map-preview');
 root.append(go,status,display);
 go.addEventListener('click',()=>{
  if(!navigator.geolocation){status.textContent='This browser does not provide location access.';return}
  go.disabled=true;status.textContent='Requesting your browser’s location permission…';
  navigator.geolocation.getCurrentPosition(
   ({coords})=>{
    go.disabled=false;
    const lat=Number(coords.latitude.toFixed(5)),lon=Number(coords.longitude.toFixed(5));
    const bounds=mapBounds(lat,lon);
    if(!bounds){status.textContent='This location could not be displayed.';return}
    display.replaceChildren();
    const frame=node('iframe');frame.title='OpenStreetMap near the location you approved';
    frame.loading='lazy';frame.referrerPolicy='no-referrer';
    frame.src='https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent(bounds)+'&layer=mapnik&marker='+encodeURIComponent(lat+','+lon);
    frame.setAttribute('allow','fullscreen');display.append(frame);
    display.append(openLink('Open this location in Google Maps ↗','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(lat+','+lon)));
    status.textContent='Map preview loaded. Your approved coordinates are sent to OpenStreetMap for the preview, and to Google only if you open its link. QuantaPhi does not store them.';
   },
   error=>{go.disabled=false;status.textContent=error.code===1?'Location permission was denied; use Google Maps manually.':'Location could not be determined. Check device permissions and try again.'},
   {enableHighAccuracy:true,maximumAge:0,timeout:15000}
  );
 });
}
function spotify(root){
 root.append(paragraph('Paste a public Spotify track, album, podcast or playlist link. Playback is handled by the official Spotify player; sign-in and full playback depend on Spotify. No credentials are collected here.'));
 const form=node('form','iqc-search');
 const label=node('label','', 'Spotify content link');
 const input=node('input');input.type='url';input.placeholder='https://open.spotify.com/playlist/…';input.required=true;input.maxLength=300;input.setAttribute('aria-label','Spotify content link');
 const submit=node('button','iqc-primary','Load Spotify player');submit.type='submit';
 const player=node('div','iqc-spotify-player'),status=paragraph('No Spotify content loaded.');
 form.append(label,input,submit);root.append(form,status,player);
 form.addEventListener('submit',event=>{
  event.preventDefault();const info=parseSpotifyLink(input.value);
  if(!info){status.textContent='Please paste a valid open.spotify.com track, playlist, album, artist, show or episode link.';return}
  const frame=node('iframe');frame.title='Spotify '+info.kind+' player';frame.loading='lazy';
  frame.src=info.embed;frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.setAttribute('allow','autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
  player.replaceChildren(frame);status.textContent='Official Spotify embed loaded. QuantaPhi cannot access your Spotify sign-in or library.';
 });
 const filesLabel=node('label','', 'Or load music files from this device (private local playlist)');
 const files=node('input');files.type='file';files.multiple=true;files.accept='audio/*';files.setAttribute('aria-label','Choose local music files');
 const audio=node('audio');audio.controls=true;audio.preload='metadata';audio.style.width='100%';
 const title=paragraph('No local tracks selected.');
 const previous=button('◀ Previous'),next=button('Next ▶');
 const local=node('div','iqc-feature');local.append(filesLabel,files,title,audio,previous,next);
 root.append(local);
 let urls=[],index=0;
 const play=i=>{if(!urls.length)return;index=(i+urls.length)%urls.length;audio.src=urls[index].url;title.textContent=(index+1)+' / '+urls.length+': '+urls[index].name;audio.play().catch(()=>{})};
 files.addEventListener('change',()=>{
  audio.pause();audio.removeAttribute('src');audio.load();urls.forEach(x=>URL.revokeObjectURL(x.url));
  urls=[...files.files].filter(f=>f.type.startsWith('audio/')).slice(0,100).map(f=>({name:f.name,url:URL.createObjectURL(f)}));
  index=0;if(urls.length)play(0);else title.textContent='No supported audio tracks selected.';
 });
 previous.addEventListener('click',()=>play(index-1));next.addEventListener('click',()=>play(index+1));
 audio.addEventListener('ended',()=>play(index+1));
 window.addEventListener('pagehide',()=>{audio.pause();urls.forEach(x=>URL.revokeObjectURL(x.url))},{once:true});
 root.append(paragraph('Device files stay in your browser for this visit, not uploaded or saved to QuantaPhi. Playlist ends when you close or reload this page.'));
}
function quickEdit(root){
 root.append(paragraph('Infinity Quick Edit makes a short silent video from your own image or a trimmed video, with a caption. It is an independent browser editor, not CapCut. Export is local; open CapCut separately for its complete editing suite.'));
 const label=node('label','', 'Choose an image or video');
 const choose=node('input');choose.type='file';choose.accept='image/*,video/*';choose.setAttribute('aria-label','Choose an image or video');
 const captionLabel=node('label','', 'Caption on video');
 const caption=node('input');caption.type='text';caption.maxLength=100;caption.placeholder='Add your caption';caption.setAttribute('aria-label','Caption on exported video');
 const durationLabel=node('label','', 'Maximum clip duration (seconds)');
 const duration=node('select');duration.setAttribute('aria-label','Clip duration in seconds');
 for(const sec of [3,5,10,15]){const option=node('option','',sec+' seconds');option.value=String(sec);if(sec===5)option.selected=true;duration.append(option)}
 const trimLabel=node('label','', 'Video start (seconds, ignored for images)');
 const trim=node('input');trim.type='number';trim.min='0';trim.step='.1';trim.value='0';trim.setAttribute('aria-label','Start of video in seconds');
 const canvas=node('canvas','iqc-editor-canvas');canvas.width=640;canvas.height=360;canvas.setAttribute('aria-label','Video editor preview');
 const status=paragraph('Select your own image or video to begin. Videos export without audio.');
 const exportButton=button('Export short video');
 exportButton.disabled=true;
 const download=node('div','iqc-actions');
 const row=node('div','iqc-edit-fields');row.append(label,choose,captionLabel,caption,durationLabel,duration,trimLabel,trim);
 root.append(row,canvas,status,exportButton,download);
 const ctx=canvas.getContext('2d');
 let media=null,sourceUrl=null,downloadUrl=null,recording=false;
 const draw=()=>{
  ctx.fillStyle='#201923';ctx.fillRect(0,0,640,360);
  if(media&&((media.tagName==='IMG'&&media.complete)||(media.tagName==='VIDEO'&&media.readyState>=2))){
   const w=media.videoWidth||media.naturalWidth,h=media.videoHeight||media.naturalHeight;
   if(w&&h){const ratio=Math.max(640/w,360/h);const dw=w*ratio,dh=h*ratio;ctx.drawImage(media,(640-dw)/2,(360-dh)/2,dw,dh)}
  }
  const txt=caption.value.trim().slice(0,100);
  if(txt){ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(20,277,600,65);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 25px system-ui';ctx.fillText(txt,320,315,565)}
 };
 draw();caption.addEventListener('input',()=>{if(!recording)draw()});
 choose.addEventListener('change',()=>{
  if(recording)return;
  if(sourceUrl)URL.revokeObjectURL(sourceUrl);
  sourceUrl=null;media=null;exportButton.disabled=true;download.replaceChildren();
  const file=choose.files?.[0];
  if(!file){status.textContent='Choose a file to continue.';draw();return}
  if(!/^image\/|^video\//.test(file.type)||file.size>150*1024*1024){status.textContent='Only images or videos up to 150 MB are supported.';draw();return}
  sourceUrl=URL.createObjectURL(file);
  if(file.type.startsWith('video/')){
   const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=sourceUrl;
   v.addEventListener('loadeddata',()=>{media=v;trim.max=String(Math.max(0,v.duration-.1)||0);exportButton.disabled=false;status.textContent='Video loaded. Choose a start time and export a short silent clip.';draw()},{once:true});
   v.addEventListener('error',()=>{status.textContent='This video format cannot be decoded by your browser.'},{once:true});
  }else{
   const img=new Image();img.onload=()=>{media=img;exportButton.disabled=false;status.textContent='Image loaded. Add a caption and export a short video.';draw()};
   img.onerror=()=>{status.textContent='This image cannot be decoded by your browser.'};img.src=sourceUrl;
  }
 });
 exportButton.addEventListener('click',async()=>{
  if(!media||recording)return;
  if(!window.MediaRecorder||!canvas.captureStream){status.textContent='Video export is not supported in this browser. Try current Chrome or the CapCut app.';return}
  const mime=['video/webm;codecs=vp8','video/webm','video/mp4'].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime){status.textContent='No supported video export format found in this browser.';return}
  const durationMs=Number(duration.value)*1000;
  recording=true;exportButton.disabled=true;choose.disabled=true;download.replaceChildren();
  if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null}
  let stream,recorder,raf,stopTimer,finished=false;const chunks=[];
  const finish=()=>{
   if(finished)return;finished=true;cancelAnimationFrame(raf);clearTimeout(stopTimer);
   if(media.tagName==='VIDEO')media.pause();
   if(recorder?.state==='recording')recorder.stop();else if(stream)stream.getTracks().forEach(track=>track.stop());
  };
  try{
   if(media.tagName==='VIDEO'){
    const start=Math.max(0,Math.min(Number(trim.value)||0,Math.max(0,(media.duration||0)-.15)));
    media.currentTime=start;
    await new Promise((resolve,reject)=>{
     const ok=()=>{cleanup();resolve()},bad=()=>{cleanup();reject(new Error('Video seek failed'))};
     const cleanup=()=>{media.removeEventListener('seeked',ok);media.removeEventListener('error',bad)};
     media.addEventListener('seeked',ok,{once:true});media.addEventListener('error',bad,{once:true});
     if(Math.abs(media.currentTime-start)<.08){cleanup();resolve()}
    });
    await media.play();
   }
   stream=canvas.captureStream(20);
   recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1500000});
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   recorder.onerror=()=>{status.textContent='Video recording failed on this device.';finish()};
   recorder.onstop=()=>{
    stream.getTracks().forEach(track=>track.stop());
    recording=false;exportButton.disabled=false;choose.disabled=false;
    const blob=new Blob(chunks,{type:mime});
    if(!blob.size){status.textContent='No video frames were exported. Please try again.';return}
    downloadUrl=URL.createObjectURL(blob);
    const a=openLink('Save edited video',downloadUrl);a.download=mime.includes('mp4')?'infinity-quick-edit.mp4':'infinity-quick-edit.webm';
    download.append(a);status.textContent='Video ready to save on this device. Export is silent and was not uploaded.';
   };
   recorder.start(250);
   const started=performance.now();status.textContent='Exporting locally… keep this card visible.';
   const render=now=>{
    draw();
    const elapsed=now-started;
    if(elapsed>=durationMs||(media.tagName==='VIDEO'&&(media.ended||media.currentTime>=(media.duration||Infinity)-.05))){finish();return}
    raf=requestAnimationFrame(render);
   };
   raf=requestAnimationFrame(render);
   stopTimer=setTimeout(finish,durationMs+250);
  }catch(e){
   if(stream)stream.getTracks().forEach(track=>track.stop());
   recording=false;choose.disabled=false;exportButton.disabled=false;status.textContent='Could not export this file: '+String(e.message||e).slice(0,140);
  }
 });
 window.addEventListener('pagehide',()=>{if(sourceUrl)URL.revokeObjectURL(sourceUrl);if(downloadUrl)URL.revokeObjectURL(downloadUrl);if(media?.tagName==='VIDEO')media.pause()},{once:true});
}
export function mountSourceFeature(root,card){
 if(!root||!card)return false;
 if(card.id==='google-maps'){maps(root);return true}
 if(card.id==='spotify'){spotify(root);return true}
 if(card.id==='capcut'){quickEdit(root);return true}
 return false;
}
