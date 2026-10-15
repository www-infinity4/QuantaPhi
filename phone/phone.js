/* Infinity Platinum Phone: browser WebRTC, opt-in owner identity and local draft recovery.
 * A web identity is NOT a telecom phone number. Never handle PSTN as a web call.
 */
(function(){
'use strict';
const BASE='https://infinity-switchboard.marvaseater.workers.dev';
const STORAGE='infinity-platinum:phone-owner:v1',DRAFT='infinity-platinum:phone-draft:v1',FORWARDS='infinity-platinum:number-plans:v1';
const $=id=>document.getElementById(id);
const validAlias=s=>/^[a-z][a-z0-9-]{2,25}$/.test(s);
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const getJson=(name,fallback)=>{try{return JSON.parse(localStorage.getItem(name)||'null')||fallback}catch{return fallback}};
let me=getJson(STORAGE,null),call=null,incoming=null,ownerTimer=null,statusTimer=null;
const remoteAudio=$('remote-audio'),remoteVideo=$('remote-video'),localVideo=$('local-video');
// These phone-number pages never publish private number-to-name assignments.
function say(s,error=false){$('app-message').textContent=s;$('app-message').classList.toggle('error',error)}
function link(alias){return location.origin+'/phone/'+alias}
// One virtual dial page is generated on demand for any valid international number.
// Creating the page does not assign the number, reveal an owner or connect to a carrier.
function numberAddress(raw){
 const s=String(raw||'').trim();
 if(!/^\+?[0-9 ().-]{7,30}$/.test(s))return '';
 let digits=s.replace(/\D/g,'');
 if(!s.startsWith('+')&&digits.length===10)digits='1'+digits;
 if(!/^[1-9][0-9]{7,14}$/.test(digits))return '';
 return digits;
}
function numberUrl(raw){
 const digits=numberAddress(raw);
 return digits?location.origin+'/phone/n/'+digits:'';
}
function targetFromInput(raw){
 let s=String(raw||'').trim().toLowerCase();

 if(/^\+?[\d ().-]{7,30}$/.test(s)){
  const digits=s.replace(/\D/g,'');
  const mapped=getJson(FORWARDS,[]).find(x=>String(x.number).replace(/\D/g,'')===digits);
  // This is the user's PRIVATE dial book, never a claim of public telephone-number ownership.
  return mapped&&validAlias(mapped.alias)?{kind:'web',alias:mapped.alias,privateNumber:s}:{kind:'pstn'};
 }
 if(/^https?:\/\//.test(s)){
  try{const u=new URL(s);if(u.hostname!=='quantaphi.org'&&u.hostname!=='www.quantaphi.org')return null;
   const match=u.pathname.match(/^\/phone\/([a-z0-9-]+)\/?$/);s=match?.[1]||'';}catch{return null}
 }else if(s.startsWith('quantaphi.org/'))s=s.match(/^quantaphi\.org\/phone\/([a-z0-9-]+)\/?$/)?.[1]||'';
 return validAlias(s)?{kind:'web',alias:s}:null;
}
function draftInit(){
 const ids=['alias','display-name','dial','legacy-number','legacy-alias','phone-draft'];
 const saved=getJson(DRAFT,{});
 for(const id of ids){const el=$(id);if(!el)continue;if(typeof saved[id]==='string')el.value=saved[id];el.addEventListener('input',()=>{
  const next=getJson(DRAFT,{});next[id]=el.value;
  try{localStorage.setItem(DRAFT,JSON.stringify(next));$('draft-state').textContent='Saved on this device as you type.'}
  catch{$('draft-state').textContent='Storage unavailable; copy your text before leaving.'}
 });}
}
function updateIdentity(){
 $('register-panel').hidden=!!me;$('my-panel').hidden=!me;
 if(!me)return;
 $('my-link').href=link(me.alias);$('my-link').textContent=link(me.alias);
 $('legacy-alias').value=$('legacy-alias').value||me.alias;
}
async function api(alias,path,method='GET',data=null,credentials={}){
 const headers={'Accept':'application/json'};
 if(data!==null)headers['Content-Type']='application/json';
 if(credentials.owner)headers['x-platinum-owner']=credentials.owner;
 if(credentials.ticket)headers['x-platinum-ticket']=credentials.ticket;
 const response=await fetch(BASE+'/v1/line/'+encodeURIComponent(alias)+path,{
  method,headers,body:data===null?undefined:JSON.stringify(data),cache:'no-store'});
 const result=await response.json().catch(()=>({ok:false,error:'invalid_gateway_response'}));
 if(!response.ok||!result.ok)throw Error(result.error||'switchboard_unavailable');
 return result;
}
async function checkHealth(){
 try{const r=await fetch(BASE+'/health',{cache:'no-store'});if(!r.ok)throw Error();
  say(me?'Switchboard connected. Keep this page open to receive calls.':'Switchboard online. Create your Platinum web line to make or receive internet calls.');
 }catch{say('Switchboard is unavailable. Your drafts and saved address remain on this device.',true)}
}
$('register-form').addEventListener('submit',async e=>{
 e.preventDefault();const alias=$('alias').value.trim().toLowerCase();
 if(!validAlias(alias)){say('Use 3–26 lowercase letters, numbers or hyphens, starting with a letter.',true);return}
 const secret=random();const button=e.submitter||$('register-form').querySelector('button');
 button.disabled=true;
 try{
  await api(alias,'/register','POST',{alias,name:$('display-name').value},{owner:secret});
  me={alias,secret};localStorage.setItem(STORAGE,JSON.stringify(me));
  updateIdentity();say('Your Infinity web phone line has been registered: '+link(alias));
  startWatch();
 }catch(e){say('Address could not be registered: '+e.message+'. No line was created on this device.',true)}
 finally{button.disabled=false}
});
$('restore-owner').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>10000)throw Error('backup_too_large');
  const backup=JSON.parse(await file.text());
  if(backup.kind!=='infinity-platinum-phone-owner-backup'||!validAlias(backup.alias)||!/^[a-f0-9]{64}$/.test(backup.secret))throw Error('invalid_owner_backup');
  await api(backup.alias,'/ping','POST',{}, {owner:backup.secret});
  me={alias:backup.alias,secret:backup.secret};localStorage.setItem(STORAGE,JSON.stringify(me));
  updateIdentity();startWatch();say('Original Platinum address restored on this device.');
 }catch(err){say('Could not restore that owner key: '+err.message,true)}
 finally{e.target.value=''}
});
$('copy-link').onclick=async()=>{try{await navigator.clipboard.writeText(link(me.alias));say('Web phone address copied.')}catch{say('Copy unavailable. Select the address above to copy it.',true)}};
$('share-link').onclick=async()=>{if(navigator.share){try{await navigator.share({title:'Infinity Platinum Phone',url:link(me.alias)})}catch{}}else $('copy-link').click()};
$('download-owner').onclick=()=>{
 if(!me)return;
 const data=JSON.stringify({kind:'infinity-platinum-phone-owner-backup',version:1,alias:me.alias,secret:me.secret},null,2);
 const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='Platinum-Phone-'+me.alias+'-KEEP-PRIVATE.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
 say('Owner key backup requested. Keep it private: anyone holding this key could control your line.');
};
function showNumberPage(){
 const u=numberUrl($('dial').value);
 if(!u){say('Enter a telephone number with a valid country code (or ten US digits).',true);return}
 $('number-page-link').href=u;
 $('number-page-link').textContent=u;
 $('number-page-panel').hidden=false;
 say('A web dial page is ready. A conventional phone will ring only after a carrier gateway is connected.');
}
$('number-page').addEventListener('click',showNumberPage);
$('call-with-carrier').addEventListener('click',async()=>{
 const digits=numberAddress($('dial').value);
 if(!digits){say('Enter a complete telephone number first.',true);return}
 if(!me){say('Register your own Infinity address before carrier calls.',true);return}
 try{
  const r=await fetch(BASE+'/v1/carrier/prepare',{
   method:'POST',headers:{'Content-Type':'application/json','x-platinum-owner':me.secret},
   body:JSON.stringify({caller:me.alias,to:'+'+digits}),cache:'no-store'
  });
  const outcome=await r.json();
  if(!r.ok||!outcome.ok){say('Carrier call not placed: '+String(outcome.error||'gateway_unavailable').replace(/_/g,' ')+'.',true);return}
  // Do not report a ring until the carrier returns verifiable call-leg evidence.
  say('Carrier gateway accepted a request, awaiting live confirmation. No phone ring verified.');
 }catch(e){say('Carrier gateway unavailable: '+e.message,true)}
});
function profileLookup(){
 const t=targetFromInput($('dial').value);
 if(!t){say('Enter a Platinum address such as mary or quantaphi.org/phone/mary.',true);return null}
 if(t.kind==='pstn'){say('That is an ordinary telephone number. Live phone-network routing is not connected. Add it as a private plan below; no call was placed.',true);return null}
 return t.alias;
}
$('check-address').onclick=async()=>{
 const to=profileLookup();if(!to)return;
 try{const d=await api(to,'');say(d.registered?(link(to)+' is registered. '+(d.online?'The owner is online.':'The owner has not opened their line recently.')):'That Platinum address is not registered.');}
 catch(e){say('Lookup failed: '+e.message,true)}
};
function showCall(title,status){$('active').hidden=false;$('call-heading').textContent=title;$('call-status').textContent=status}
function iceConnection(){
 const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]});
 pc.ontrack=event=>{
  const stream=event.streams?.[0]||new MediaStream([event.track]);
  if(stream.getVideoTracks().length){remoteVideo.hidden=false;remoteVideo.srcObject=stream;remoteVideo.play().catch(()=>{});}
  else{remoteAudio.srcObject=stream;remoteAudio.play().catch(()=>{});}
 };
 pc.onconnectionstatechange=()=>{
  if(!call||call.pc!==pc)return;
  if(pc.connectionState==='connected')$('call-status').textContent='Connected securely over the internet.';
  if(['failed','closed','disconnected'].includes(pc.connectionState))$('call-status').textContent='Connection '+pc.connectionState+'. You can hang up and try again.';
 };
 return pc;
}
function gathered(pc){
 if(pc.iceGatheringState==='complete')return Promise.resolve();
 return new Promise(resolve=>{
  const timeout=setTimeout(done,12000);
  function done(){clearTimeout(timeout);pc.removeEventListener('icegatheringstatechange',changed);resolve()}
  function changed(){if(pc.iceGatheringState==='complete')done()}
  pc.addEventListener('icegatheringstatechange',changed);
 });
}
async function media(video){
 if(!navigator.mediaDevices?.getUserMedia)throw Error('Browser microphone permission is unavailable.');
 return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:!!video});
}
function mountLocal(stream){
 if(stream.getVideoTracks().length){localVideo.srcObject=stream;localVideo.hidden=false;localVideo.play().catch(()=>{});}
}
function stopCallUI(){
 if(statusTimer){clearInterval(statusTimer);statusTimer=null}
 if(call?.pc)call.pc.close();
 for(const tr of call?.stream?.getTracks()||[])tr.stop();
 call=null;incoming=null;$('active').hidden=true;$('incoming').hidden=true;
 remoteAudio.srcObject=null;remoteVideo.srcObject=null;localVideo.srcObject=null;
 remoteVideo.hidden=true;localVideo.hidden=true;$('mute').textContent='Mute microphone';
}
async function disconnect(){
 if(!call){stopCallUI();return}
 const copy=call;stopCallUI();
 try{await api(copy.to,'/signal','POST',{id:copy.id,type:'hangup'},copy.role==='caller'?{ticket:copy.ticket}:{owner:me.secret})}catch{}
 say('Call finished.');
}
$('hangup').onclick=disconnect;
$('mute').onclick=()=>{
 if(!call?.stream)return;
 const tracks=call.stream.getAudioTracks();for(const tr of tracks)tr.enabled=!tr.enabled;
 $('mute').textContent=tracks[0]?.enabled?'Mute microphone':'Unmute microphone';
};
$('unmute-play').onclick=()=>Promise.all([remoteAudio.play().catch(()=>{}),remoteVideo.play().catch(()=>{})]);
$('dial-form').addEventListener('submit',async e=>{
 e.preventDefault();
 if(!me){say('Create your own Platinum address first, so the receiver knows who is calling.',true);return}
 if(call){say('Finish your current call before starting another.',true);return}
 const to=profileLookup();if(!to)return;
 if(to===me.alias){say('You cannot call your own line. Open a different registered line on another browser.',true);return}
 const btn=$('dial-start');btn.disabled=true;let stream=null;
 try{
  const who=await api(to,'');
  if(!who.registered)throw Error('recipient_not_registered');
  stream=await media($('video').checked);
  const invite=await api(to,'/call','POST',{from:me.alias,ownerKey:me.secret});
  call={to,id:invite.id,ticket:invite.ticket,role:'caller',stream,pc:iceConnection()};
  mountLocal(stream);stream.getTracks().forEach(track=>call.pc.addTrack(track,stream));
  showCall('Calling '+to,'Preparing the microphone and secure connection…');
  await call.pc.setLocalDescription(await call.pc.createOffer());await gathered(call.pc);
  await api(to,'/signal','POST',{id:call.id,type:'offer',sdp:call.pc.localDescription.sdp},{ticket:call.ticket});
  $('call-status').textContent='Ringing '+link(to)+' …';
  let updating=false;statusTimer=setInterval(async()=>{
   if(updating||!call||call.role!=='caller')return;updating=true;
   try{
    const x=await api(to,'/status','GET',null,{ticket:call.ticket});
    if(x.status==='connected'&&x.answer&&!call.pc.currentRemoteDescription){
     await call.pc.setRemoteDescription({type:'answer',sdp:x.answer});
     $('call-status').textContent='Answer received. Establishing audio…';
    }
    if(x.status==='ended')await disconnect();
   }catch(err){if(call&&err.message==='call_unavailable'){stopCallUI();say('The call ended or timed out.');}}
   finally{updating=false}
  },2200);
 }catch(error){if(call)await disconnect();else for(const t of stream?.getTracks()||[])t.stop();say('Call not started: '+error.message,true)}
 finally{btn.disabled=false}
});
async function watch(){
 if(!me)return;
 try{
  await api(me.alias,'/ping','POST',{}, {owner:me.secret});
  $('presence').textContent='● Web line connected and listening for incoming calls.';
  const result=await api(me.alias,'/inbox','GET',null,{owner:me.secret});
  const c=result.call;
  if(call&&call.role==='callee'&&(!c||c.status==='ended')){stopCallUI();say('The other person ended the call.');return}
  if(!call&&c?.status==='ringing'&&c.offer){
   incoming=c;$('incoming').hidden=false;
   $('incoming-info').textContent=c.from+' is calling your Platinum address. Accept to allow microphone access.';
  }else if(!call&&!c){incoming=null;$('incoming').hidden=true}
 }catch(e){$('presence').textContent='Connection unavailable: '+e.message}
}
function startWatch(){if(ownerTimer)clearInterval(ownerTimer);if(me){watch();ownerTimer=setInterval(watch,3000)}}
$('answer').onclick=async()=>{
 if(!incoming||call||!me)return;
 const c=incoming;$('answer').disabled=true;let stream;
 try{
  // The called person chooses to answer; only then are Android/browser permissions requested.
  stream=await media(/m=video/.test(c.offer));
  const pc=iceConnection();call={to:me.alias,id:c.id,role:'callee',stream,pc};
  mountLocal(stream);
  await pc.setRemoteDescription({type:'offer',sdp:c.offer});
  stream.getTracks().forEach(track=>pc.addTrack(track,stream));
  showCall('Talking with '+c.from,'Answering securely…');$('incoming').hidden=true;
  await pc.setLocalDescription(await pc.createAnswer());await gathered(pc);
  await api(me.alias,'/signal','POST',{id:c.id,type:'answer',sdp:pc.localDescription.sdp},{owner:me.secret});
  say('Call answered.');
 }catch(error){if(call)await disconnect();else stream?.getTracks().forEach(t=>t.stop());say('Could not answer call: '+error.message,true)}
 finally{$('answer').disabled=false}
};
$('decline').onclick=async()=>{
 if(!incoming||!me)return;const c=incoming;incoming=null;$('incoming').hidden=true;
 try{await api(me.alias,'/signal','POST',{id:c.id,type:'hangup'},{owner:me.secret})}catch{}
 say('Incoming call declined.');
};
function legacyRender(){
 const plans=getJson(FORWARDS,[]);const area=$('legacy-list');area.replaceChildren();
 for(const [i,p] of plans.entries()){
  const row=document.createElement('article'),text=document.createElement('span'),del=document.createElement('button');
  text.textContent=p.number+' → '+link(p.alias)+' (private plan, not connected) ';
  del.textContent='Remove';del.type='button';del.onclick=()=>{plans.splice(i,1);localStorage.setItem(FORWARDS,JSON.stringify(plans));legacyRender()};
  row.append(text,del);area.append(row);
 }
}
$('legacy-form').addEventListener('submit',e=>{
 e.preventDefault();const num=$('legacy-number').value.trim(),to=targetFromInput($('legacy-alias').value);
 if(!/^\+?[\d ()-]{7,24}$/.test(num)||!to||to.kind!=='web'){say('Enter a valid number and a valid Platinum alias.',true);return}
 const plans=getJson(FORWARDS,[]).filter(x=>x.number!==num);plans.unshift({number:num,alias:to.alias});
 try{localStorage.setItem(FORWARDS,JSON.stringify(plans.slice(0,20)));say('Private forwarding plan saved on this device. It is NOT live routing.');legacyRender()}
 catch{say('Cannot save number on this device.',true)}
});
const numberPath=location.pathname.match(/^\/phone\/n\/([1-9][0-9]{7,14})\/?$/);
const path=location.pathname.match(/^\/phone\/([a-z0-9-]+)\/?$/);
draftInit();if(numberPath){$('dial').value='+'+numberPath[1];$('dial').dispatchEvent(new Event('input'));showNumberPage();}
else if(path){$('dial').value=path[1];$('dial').dispatchEvent(new Event('input'))}
else{const phone=new URL(location.href).searchParams.get('dial');if(phone&&phone.length<=30){$('dial').value=phone;$('dial').dispatchEvent(new Event('input'))}}
if(me&&(!validAlias(me.alias)||!/^[a-f0-9]{64}$/.test(me.secret)))me=null;
updateIdentity();legacyRender();checkHealth();startWatch();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&me)watch()});
})();
