import {STUDIO_SONGS,findSongs,OFFICIAL_SONGBOOK} from './songbook.mjs';
const $=id=>document.getElementById(id);
const make=(tag,text='',className='')=>{
 const x=document.createElement(tag);x.textContent=text;if(className)x.className=className;return x;
};
function renderSongs(){
 const songs=findSongs($('songQuery').value),host=$('songResults');host.replaceChildren();
 $('songCount').textContent=songs.length+' verified individual song link'+(songs.length===1?'':'s')+' · browse more on the official StarMaker songbook';
 for(const song of songs){
  const tile=make('article','','song');
  const cover=make('div','♫','cover');cover.setAttribute('role','img');cover.setAttribute('aria-label','Original abstract musical illustration, not album cover');
  const name=make('h3',song.title),artist=make('p',song.artist,'small'),acts=make('div','','buttons');
  const go=make('a','Sing on StarMaker ↗','button');go.href=song.url;go.target='_blank';go.rel='noopener noreferrer';
  const record=make('a','Record my voice here','#');record.href='#studio';record.className='button alt';
  acts.append(go,record);tile.append(cover,name,artist,acts);host.append(tile);
 }
 if(!songs.length){
  const empty=make('div','','song');
  empty.append(make('p','Not in this curated list. The complete searchable songbook stays with StarMaker.'));
  const link=make('a','Search the official songbook ↗','button');
  link.href=OFFICIAL_SONGBOOK;link.target='_blank';link.rel='noopener noreferrer';empty.append(link);host.append(empty);
 }
}
$('songQuery').addEventListener('input',renderSongs);
renderSongs();
let mic=null,ctx=null,mixedPlayer=null,recorder=null,blobs=[],backingURL=null,takeURL=null;
const start=$('recordStart'),stop=$('recordStop'),status=$('recordStatus'),
 backingFile=$('backingFile'),backingPreview=$('backingPlayer'),player=$('recordedPlayer'),download=$('recordedDownload');
const recordingState=state=>{start.disabled=state;stop.disabled=!state;backingFile.disabled=state};
const preferredMime=()=>{
 if(typeof MediaRecorder==='undefined')return '';
 for(const mime of ['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg'])
  if(MediaRecorder.isTypeSupported?.(mime))return mime;
 return '';
};
async function releaseCapture(){
 try{mic?.getTracks().forEach(t=>t.stop())}catch{}
 mic=null;
 try{mixedPlayer?.pause()}catch{}
 mixedPlayer=null;
 try{if(ctx)await ctx.close()}catch{}
 ctx=null;
}
function clearTake(){
 if(takeURL){URL.revokeObjectURL(takeURL);takeURL=null}
 player.hidden=true;player.removeAttribute('src');download.hidden=true;download.removeAttribute('href');
}
backingFile.addEventListener('change',()=>{
 if(backingURL){URL.revokeObjectURL(backingURL);backingURL=null}
 backingPreview.pause();backingPreview.hidden=true;backingPreview.removeAttribute('src');
 const file=backingFile.files?.[0];
 if(!file)return;
 if(!file.type.startsWith('audio/')||file.size>80*1024*1024){
  status.textContent='Choose an audio file under 80 MB you have permission to use.';
  backingFile.value='';return;
 }
 backingURL=URL.createObjectURL(file);
 backingPreview.src=backingURL;backingPreview.hidden=false;
 status.textContent='Backing audio loaded from your device. Microphone remains OFF.';
});
start.addEventListener('click',async()=>{
 if(recorder&&recorder.state!=='inactive')return;
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
  status.textContent='Recording unavailable in this browser. Use a browser that supports MediaRecorder and microphone consent.';return;
 }
 recordingState(true);blobs=[];clearTake();
 try{
  mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
  let stream=mic;
  if(backingURL){
   const Ctx=window.AudioContext||window.webkitAudioContext;
   if(!Ctx)throw Error('Backing-track mixing is unavailable here. Try microphone-only recording.');
   ctx=new Ctx();
   const dest=ctx.createMediaStreamDestination();
   ctx.createMediaStreamSource(mic).connect(dest);
   mixedPlayer=new Audio(backingURL);
   mixedPlayer.preload='auto';
   const source=ctx.createMediaElementSource(mixedPlayer);
   source.connect(dest);
   source.connect(ctx.destination);
   await ctx.resume();
   stream=dest.stream;
  }
  const mime=preferredMime();
  recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{});
  recorder.addEventListener('dataavailable',event=>{if(event.data?.size>0)blobs.push(event.data)});
  recorder.addEventListener('stop',async()=>{
   const outputMime=recorder?.mimeType?.split(';')[0]||'audio/webm';
   await releaseCapture();recordingState(false);
   if(!blobs.length){status.textContent='No audio data was produced. Recording not saved.';return}
   const blob=new Blob(blobs,{type:outputMime});
   takeURL=URL.createObjectURL(blob);
   player.src=takeURL;player.hidden=false;
   const ext=/mp4/.test(outputMime)?'m4a':/ogg/.test(outputMime)?'ogg':'webm';
   download.href=takeURL;download.download='quantaphi-voice-take.'+ext;download.hidden=false;
   status.textContent='Take produced in this browser ('+Math.ceil(blob.size/1024)+' KB). Play it back or download it. Not uploaded.';
  },{once:true});
  recorder.addEventListener('error',()=>{status.textContent='The recorder reported an error. The take may be unavailable.'});
  recorder.start(1000);
  if(mixedPlayer){
   try{await mixedPlayer.play()}
   catch{recorder.stop();throw Error('Cannot start backing audio. Check device media permissions.')}
  }
  status.textContent='Recording now. Your microphone is ON. Stop to produce the local take.';
 }catch(e){
  if(recorder?.state==='recording')try{recorder.stop()}catch{}
  await releaseCapture();recordingState(false);
  status.textContent='Recording could not start: '+String(e.message||'permission or device unavailable').slice(0,140);
 }
});
stop.addEventListener('click',()=>{
 if(recorder?.state!=='recording')return;
 stop.disabled=true;
 status.textContent='Finalizing your recording locally…';
 try{recorder.stop()}catch{status.textContent='Stopping failed; no saved take was verified';recordingState(false);void releaseCapture()}
});
window.addEventListener('pagehide',()=>{
 try{if(recorder?.state==='recording')recorder.stop()}catch{}
 void releaseCapture();
 if(backingURL)URL.revokeObjectURL(backingURL);
 if(takeURL)URL.revokeObjectURL(takeURL);
});
