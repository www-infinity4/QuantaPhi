// The actual OpenAI GPT-Live 1 WebRTC model, NOT browser voice synthesis.
// This frontend never sends ChatGPT sign-in tokens or OpenAI API keys.
// Owner authorization is entered for this session only and never persisted.
const $ = id => document.getElementById(id);
const gateway="https://bubbles-live.marvaseater.workers.dev/v1/live/session";
const start=$("liveStart"),stop=$("liveStop"),cancel=$("liveInterrupt"),
      status=$("liveStatus"),transcript=$("liveTranscript"),secret=$("liveOwner"),
      speaker=$("liveAudio");
let pc=null,channel=null,mic=null,ready=false,endTimer=null;
let lastAppend="";
function show(value){status.textContent=value;}
function line(role,message) {
 const t=String(message||"").trim();
 if(!t||t===lastAppend)return;
 lastAppend=t;
 const p=document.createElement("p");
 const label=document.createElement("strong");label.textContent=role+": ";
 p.append(label,document.createTextNode(t));
 transcript.append(p);transcript.scrollTop=transcript.scrollHeight;
}
function cleanup(){
 clearTimeout(endTimer);
 mic?.getTracks().forEach(track=>track.stop());
 mic=null;try{channel?.close()}catch{}
 try{pc?.close()}catch{}
 channel=null;pc=null;speaker.srcObject=null;ready=false;
 start.disabled=false;stop.disabled=true;cancel.disabled=true;
}
function update(event) {
 if(event.type==="session.started"){
   ready=true;show("GPT-Live connected · speak naturally");
   stop.disabled=false;cancel.disabled=false;
 } else if(event.type==="session.closed"){
   show("GPT-Live conversation ended");
   cleanup();
 } else if(event.type==="error"||event.type==="session.error"){
   show("GPT-Live reported an error. End the session and check the account.");
 } else if(event.type==="input_audio_transcription.completed") {
   line("You",event.transcript||event.text);
 } else if(event.type==="output_audio_transcript.done"){
   line("Bubbles",event.transcript||event.text);
 } else if(event.type==="response.event") {
   const nested=event.response_event||event.event||{};
   if(nested.type==="response.output_text.done")line("Bubbles",nested.text);
 }
}
function iceReady(peer){
 if(peer.iceGatheringState==="complete")return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{peer.removeEventListener("icegatheringstatechange",changed);reject(Error("Microphone connection negotiation timed out"))},10000);
  function changed(){if(peer.iceGatheringState!=="complete")return;
     clearTimeout(timeout);peer.removeEventListener("icegatheringstatechange",changed);resolve();}
  peer.addEventListener("icegatheringstatechange",changed);changed();
 });
}
start.addEventListener("click",async()=>{
 if(pc)return;
 const credential=secret.value.trim();
 if(credential.length<32){show("Owner authorization must be configured on the gateway.");return;}
 start.disabled=true;show("Requesting microphone permission…");
 try{
   pc=new RTCPeerConnection();
   pc.addEventListener("track",e=>{
     speaker.srcObject=e.streams[0]||new MediaStream([e.track]);
     speaker.play().catch(()=>show("Tap the audio player to hear GPT-Live."));
   });
   mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   mic.getAudioTracks().forEach(track=>pc.addTrack(track,mic));
   channel=pc.createDataChannel("oai-events");
   channel.addEventListener("message", e=>{
     try {update(JSON.parse(e.data))}catch{}
   });
   channel.addEventListener("close",()=>{
     if(pc){show("Voice connection ended.");cleanup();}
   });
   const offer=await pc.createOffer();
   await pc.setLocalDescription(offer);await iceReady(pc);
   show("Establishing genuine GPT-Live session…");
   const response=await fetch(gateway,{
     method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+credential},
     body:JSON.stringify({sdp:pc.localDescription.sdp})
   });
   // Never store or log the secret, not even in localStorage.
   secret.value="";
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"GPT-Live session creation failed");
   if(typeof result?.transport?.sdp!=="string")throw Error("Missing SDP answer");
   await pc.setRemoteDescription({type:"answer",sdp:result.transport.sdp});
   show("Connecting to GPT-Live audio…");
 }catch(error){
   show(String(error.message||error).slice(0,220));cleanup();
 }
});
stop.addEventListener("click",()=>{
 if(!ready||channel?.readyState!=="open"){cleanup();return;}
 stop.disabled=true;show("Ending GPT-Live and collecting session receipt…");
 channel.send(JSON.stringify({type:"session.close"}));
 endTimer=setTimeout(()=>{show("Session disconnected; final usage could not be confirmed.");cleanup();},15000);
});
cancel.addEventListener("click",()=>{
 // End the full stream rather than pretending a generic Realtime cancel
 // event is part of the GPT-Live client event protocol.
 if(ready){stop.click()}else cleanup();
});
window.addEventListener("pagehide",()=>{
 if(ready&&channel?.readyState==="open"){
   try{channel.send(JSON.stringify({type:"session.close"}))}catch{}
 }
 cleanup();
});
