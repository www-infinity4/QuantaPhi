/* Independent QuantaPhi browser karaoke recorder.
 * No StarMaker JavaScript, credentials, copyrighted catalog or media copied.
 * Users choose their own authorized local audio file; recording stays on-device.
 */
const el=(tag,label='',cls='')=>{const node=document.createElement(tag);if(cls)node.className=cls;node.textContent=label;return node;};
export const KARAOKE_EFFECTS=Object.freeze(['clean','warm','room']);
export function normalizeKaraokeEffect(value){return KARAOKE_EFFECTS.includes(value)?value:'clean';}
export function allowedKaraokeBacking(file){
 return Boolean(file&&Number.isFinite(file.size)&&file.size>0&&file.size<=80*1024*1024&&
   typeof file.type==='string'&&file.type.startsWith('audio/'));
}
export function karaokeRecorderMime(recorder=globalThis.MediaRecorder){
 if(!recorder)return '';
 for(const mime of ['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg'])
  if(recorder.isTypeSupported?.(mime))return mime;
 return '';
}
export function mountKaraokeLab(root){
 if(!root)return;
 const panel=el('section','','qcx-tool qcx-karaoke-lab');
 panel.append(el('p','SING · INFINITY ORIGINAL KARAOKE','qcx-eyebrow'),el('h3','Record, mix and save a practice take'));
 panel.append(el('p','This is QuantaPhi’s own browser studio. Select audio you own or have permission to use. No StarMaker songs are downloaded, and nothing is uploaded.','qcx-note'));
 const fileLabel=el('label','Backing audio (optional · your licensed file)','qcx-karaoke-label');
 const file=el('input','','qcx-input');file.type='file';file.accept='audio/*';file.setAttribute('aria-label','Backing audio (optional · your licensed file)');fileLabel.append(file);
 const backing=el('audio','','qcx-audio');backing.controls=true;backing.hidden=true;backing.setAttribute('aria-label','Preview your backing audio');
 const fxLabel=el('label','Voice effect','qcx-karaoke-label');
 const fx=el('select','','qcx-input');fx.setAttribute('aria-label','Voice effect');
 for(const [key,title] of [['clean','Clean voice'],['warm','Warm radio vocal'],['room','Room echo']]){
  const opt=el('option',title);opt.value=key;fx.append(opt);
 }fxLabel.append(fx);
 const volumeLabel=el('label','Backing mix volume','qcx-karaoke-label');
 const volume=el('input','','qcx-input');volume.type='range';volume.min='0';volume.max='100';volume.step='5';volume.value='45';volume.setAttribute('aria-label','Backing mix volume');volumeLabel.append(volume);
 const status=el('p','Microphone is off','qcx-note');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const controls=el('div','','qcx-controls');
 const start=el('button','● Start recording','qcx-button');start.type='button';
 const stop=el('button','■ Stop','qcx-button');stop.type='button';stop.disabled=true;
 const player=el('audio','','qcx-audio');player.controls=true;player.hidden=true;player.setAttribute('aria-label','Play your locally recorded take');
 const save=el('a','Save recording','qcx-button');save.hidden=true;save.download='quantaphi-karaoke-take.webm';
 controls.append(start,stop);panel.append(fileLabel,backing,fxLabel,volumeLabel,status,controls,player,save);
 panel.append(el('p','Headphones help prevent backing music leaking through the microphone. Microphone access begins only when you tap Start. No account, payment or API connection is needed.','qcx-note'));
 root.append(panel);
 let fileURL=null,takeURL=null,stream=null,ctx=null,recorder=null,backingPlaying=null,parts=[],closing=false;
 const resetButtons=active=>{start.disabled=active;stop.disabled=!active;file.disabled=active;fx.disabled=active;volume.disabled=active;};
 const cleanup=async()=>{
  const oldStream=stream;stream=null;
  try{oldStream?.getTracks().forEach(track=>track.stop())}catch{}
  try{backingPlaying?.pause()}catch{}backingPlaying=null;
  const oldCtx=ctx;ctx=null;try{if(oldCtx&&oldCtx.state!=='closed')await oldCtx.close()}catch{}
 };
 const clearTake=()=>{if(takeURL){URL.revokeObjectURL(takeURL);takeURL=null;}player.pause();player.hidden=true;player.removeAttribute('src');save.hidden=true;save.removeAttribute('href');};
 file.addEventListener('change',()=>{
  if(fileURL){URL.revokeObjectURL(fileURL);fileURL=null;}
  backing.pause();backing.hidden=true;backing.removeAttribute('src');
  const chosen=file.files?.[0];if(!chosen){status.textContent='Backing cleared. Microphone is off.';return;}
  if(!allowedKaraokeBacking(chosen)){file.value='';status.textContent='Choose an audio file under 80 MB that you have permission to use.';return;}
  fileURL=URL.createObjectURL(chosen);backing.src=fileURL;backing.hidden=false;
  status.textContent='Backing audio ready from your device. Microphone is off.';
 });
 function applyEffect(source,destination,audioCtx,effect){
  source.connect(destination); // Always retain a clean vocal path.
  if(effect==='warm'){
   const filter=audioCtx.createBiquadFilter();filter.type='lowshelf';filter.frequency.value=290;filter.gain.value=5;
   const warmGain=audioCtx.createGain();warmGain.gain.value=.34;
   source.connect(filter);filter.connect(warmGain);warmGain.connect(destination);
  }else if(effect==='room'){
   const delay=audioCtx.createDelay(.5);delay.delayTime.value=.125;
   const echoGain=audioCtx.createGain();echoGain.gain.value=.24;
   source.connect(delay);delay.connect(echoGain);echoGain.connect(destination);
  }
 }
 start.addEventListener('click',async()=>{
  if(recorder?.state==='recording')return;
  if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder){
   status.textContent='Recording unavailable in this browser. Use HTTPS and a browser that supports microphone recording.';return;
  }
  resetButtons(true);parts=[];clearTake();
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   const AudioCtx=globalThis.AudioContext||globalThis.webkitAudioContext;
   let outputStream=stream;
   if(AudioCtx){
    ctx=new AudioCtx();
    const mixed=ctx.createMediaStreamDestination();
    applyEffect(ctx.createMediaStreamSource(stream),mixed,ctx,normalizeKaraokeEffect(fx.value));
    if(fileURL){
     backingPlaying=new Audio(fileURL);backingPlaying.preload='auto';
     const track=ctx.createMediaElementSource(backingPlaying);
     const level=ctx.createGain();level.gain.value=Number(volume.value)/100;
     track.connect(level);level.connect(mixed);level.connect(ctx.destination);
    }
    await ctx.resume();outputStream=mixed.stream;
   }else if(fileURL||normalizeKaraokeEffect(fx.value)!=='clean'){
    throw Error('Audio mixing is unavailable in this browser. Use a browser with Web Audio support.');
   }
   const mime=karaokeRecorderMime();
   recorder=new MediaRecorder(outputStream,mime?{mimeType:mime}:{});
   const current=recorder;
   current.addEventListener('dataavailable',event=>{if(event.data?.size)parts.push(event.data)});
   current.addEventListener('error',()=>{status.textContent='Recording error. Your take may be unavailable.'});
   current.addEventListener('stop',async()=>{
    const type=current.mimeType?.split(';')[0]||'audio/webm';
    const completed=parts.slice();
    await cleanup();resetButtons(false);
    if(closing)return;
    if(!completed.length){status.textContent='No audio data was recorded. No take saved.';return;}
    const blob=new Blob(completed,{type});
    const ext=/mp4/.test(type)?'m4a':/ogg/.test(type)?'ogg':'webm';
    takeURL=URL.createObjectURL(blob);player.src=takeURL;player.hidden=false;
    save.href=takeURL;save.download='quantaphi-karaoke-take.'+ext;save.hidden=false;
    status.textContent='Your private take is ready ('+Math.ceil(blob.size/1024)+' KB). Play it back or save it on your device.';
   },{once:true});
   current.start(1000);
   if(backingPlaying){try{await backingPlaying.play()}catch{current.stop();throw Error('Backing playback could not start. Check media controls.');}}
   status.textContent='Microphone is ON · Recording '+normalizeKaraokeEffect(fx.value)+' vocals'+(fileURL?' with your backing music':'')+'.';
  }catch(err){
   if(recorder?.state==='recording')try{recorder.stop()}catch{}
   await cleanup();resetButtons(false);
   status.textContent='Recording could not start: '+String(err?.message||'permission or device unavailable').slice(0,160);
  }
 });
 stop.addEventListener('click',()=>{
  if(recorder?.state!=='recording')return;
  stop.disabled=true;status.textContent='Finishing your local take…';
  try{recorder.stop()}catch{void cleanup();resetButtons(false);status.textContent='Could not finalize take.';}
 });
 const release=()=>{
  closing=true;
  try{if(recorder?.state==='recording')recorder.stop()}catch{}
  void cleanup();
  if(fileURL)URL.revokeObjectURL(fileURL);
  if(takeURL)URL.revokeObjectURL(takeURL);
 };
 window.addEventListener('pagehide',release,{once:true});
 return {panel,release};
}
