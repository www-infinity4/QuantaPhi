import {detectPitch,harmonyFrequency} from '../card-workshop/harmony.mjs';
import {saveSourceProposal} from '../card-workshop/ledger.mjs';
const $=id=>document.getElementById(id),songKey='phi:starmaker:selected:v1';
let selected=[];try{selected=JSON.parse(localStorage.getItem(songKey)||'[]')}catch{}
function shareLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname==='starmakerstudios.com'||u.hostname.endsWith('.starmakerstudios.com'))?u.href:''}catch{return ''}}
function render(){const ul=$('songs');ul.replaceChildren();for(const item of selected){const li=document.createElement('li'),a=document.createElement('a');a.href=shareLink(item.url);a.textContent=item.title;a.target='_blank';a.rel='noopener noreferrer';li.append(a);ul.append(li)}}
$('linksForm').onsubmit=event=>{event.preventDefault();const url=shareLink($('songLink').value);if(!url){$('status').textContent='Use an HTTPS StarMaker share link.';return}if(selected.length>=8){$('status').textContent='This card holds up to eight selected performances.';return}if(!selected.some(x=>x.url===url))selected.push({title:$('songTitle').value.slice(0,120),url});try{localStorage.setItem(songKey,JSON.stringify(selected));render()}catch{$('status').textContent='Could not save selected links.'}};render();
let recorder,stream,context,backing,oscillator,gain,tick,deadline,recordURL='',backingURL='',chunks=[],busy=false;
async function cleanup(){clearInterval(tick);clearTimeout(deadline);backing?.pause();stream?.getTracks().forEach(t=>t.stop());try{oscillator?.stop()}catch{}await context?.close().catch(()=>{});if(backingURL)URL.revokeObjectURL(backingURL);stream=context=backing=oscillator=gain=null;busy=false;$('record').disabled=false;$('stop').disabled=true}
async function keepTake(blob){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('phi-karaoke-takes-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('takes',{keyPath:'id'});r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result)});
 try{await new Promise((resolve,reject)=>{const tx=db.transaction('takes','readwrite'),store=tx.objectStore('takes');store.put({id:'latest',blob,createdAt:new Date().toISOString()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}finally{db.close()}
}
function showTake(blob){if(recordURL)URL.revokeObjectURL(recordURL);recordURL=URL.createObjectURL(blob);$('take').src=recordURL;$('take').hidden=false;$('download').href=recordURL;$('download').download='bubbles-karaoke.'+(blob.type.includes('mp4')?'m4a':'webm');$('download').textContent='Download recording';$('download').hidden=false}
async function restoreTake(){try{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('phi-karaoke-takes-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('takes',{keyPath:'id'});r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result)});const item=await new Promise((resolve,reject)=>{const r=db.transaction('takes').objectStore('takes').get('latest');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();if(item?.blob)showTake(item.blob)}catch{}}
void restoreTake();
$('record').onclick=async()=>{
 if(busy)return;busy=true;$('record').disabled=true;$('status').textContent='Requesting microphone…';chunks=[];
 try{
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Audio recording is unavailable in this browser');
  const file=$('backing').files[0];if(file&&file.size>25*1024*1024)throw Error('Backing tracks can be up to 25 MB');
  // Resume audio inside the user gesture before awaiting microphone permission.
  context=new AudioContext();await context.resume();
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
  const mic=context.createMediaStreamSource(stream),dest=context.createMediaStreamDestination();mic.connect(dest);
  if(file){backing=new Audio();backingURL=URL.createObjectURL(file);backing.src=backingURL;const source=context.createMediaElementSource(backing);source.connect(dest);source.connect(context.destination)}
  if($('harmony').checked){
   const analyser=context.createAnalyser();analyser.fftSize=2048;mic.connect(analyser);const samples=new Float32Array(2048);
   oscillator=context.createOscillator();oscillator.type='sine';gain=context.createGain();gain.gain.value=0;oscillator.connect(gain);gain.connect(dest);gain.connect(context.destination);oscillator.start();
   tick=setInterval(()=>{analyser.getFloatTimeDomainData(samples);const pitch=detectPitch(samples,context.sampleRate);gain.gain.setTargetAtTime(pitch?0.06:0,context.currentTime,0.04);if(pitch)oscillator.frequency.setTargetAtTime(harmonyFrequency(pitch),context.currentTime,0.04)},100);
  }
  const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(x=>MediaRecorder.isTypeSupported(x));if(!mime)throw Error('No supported audio recording format');
  recorder=new MediaRecorder(dest.stream,{mimeType:mime});let bytes=0;
  recorder.ondataavailable=event=>{if(event.data.size){chunks.push(event.data);bytes+=event.data.size;if(bytes>30*1024*1024&&recorder.state==='recording')recorder.stop()}};
  recorder.onerror=()=>{$('status').textContent='Recorder failed. Stop to recover available audio.'};
  recorder.onstop=async()=>{const blob=new Blob(chunks,{type:mime});await cleanup();if(!blob.size){$('status').textContent='The recorder returned no audio.';return}showTake(blob);try{await keepTake(blob);$('status').textContent='Recording saved on this device. Download a copy below.'}catch{$('status').textContent='Recording ready to download. Device history storage failed; download before leaving.'}};
  recorder.start(1000);if(backing)await backing.play();$('stop').disabled=false;$('status').textContent='Recording. Stops automatically after five minutes.';deadline=setTimeout(()=>{if(recorder.state==='recording')recorder.stop()},300000);
 }catch(error){if(recorder?.state==='recording')recorder.stop();else await cleanup();$('status').textContent=error.message}
};
$('stop').onclick=()=>{if(recorder?.state==='recording'){recorder.stop();$('stop').disabled=true;$('status').textContent='Saving recording…'}};
window.addEventListener('pagehide',()=>{if(recorder?.state==='recording')recorder.stop();void cleanup()});
let pendingLedger=null;
$('ledger').onclick=async()=>{const button=$('ledger');button.disabled=true;try{const proposal={provider:'StarMaker',sourceUrl:$('ledgerSource').value,amountMinor:Number($('amount').value),currency:'STARCOIN',usage:'link',cardId:'starmaker-karaoke'};const serialized=JSON.stringify(proposal);if(pendingLedger&&pendingLedger.serialized!==serialized)throw Error('Retry the unchanged pending ledger entry first');if(!pendingLedger)pendingLedger={serialized,record:{requestId:crypto.randomUUID(),...proposal}};const entry=await saveSourceProposal(pendingLedger.record);pendingLedger=null;$('ledgerStatus').textContent='Source proposal saved: '+entry.id+'. Agreement and recipient unverified. No payment sent.'}catch(error){$('ledgerStatus').textContent=error.message}finally{button.disabled=false}};
