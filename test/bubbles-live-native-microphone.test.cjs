const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const base='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
test('native grant is confirmed, exact audio-only, foreground and recording-aware',()=>{
 const host=fs.readFileSync(base+'FloatingOracleWindow.java','utf8');
 const service=fs.readFileSync(base+'BubblesService.java','utf8');
 const permission=host.slice(host.indexOf('void onPermissionRequest('),host.indexOf('void onPermissionRequestCanceled'));
 assert.match(permission,/setPositiveButton\("Use microphone"/);
 assert.ok(permission.indexOf('service.prepareLiveMicrophone()')<permission.indexOf('request.grant('));
 assert.match(permission,/request.grant\(new String\[\]\{PermissionRequest.RESOURCE_AUDIO_CAPTURE\}\)/);
 assert.doesNotMatch(permission,/grant\(request.getResources/);
 assert.match(host,/root.isShown\(\) && livePage/);
 assert.match(host,/checkSelfPermission\(Manifest.permission.RECORD_AUDIO\)/);
 assert.match(service,/liveMicrophoneOwned \|\| recording.active\(\) \|\| screenAudio.active\(\) \|\| pendingAudioRecording/);
 assert.match(service,/muted \|\| liveMicrophoneOwned \|\| captureRunning/);
 const release=service.slice(service.indexOf('void releaseLiveMicrophone()'),service.indexOf('private void resumeSession()'));
 assert.match(release,/boolean shouldResume = liveMicrophoneOwned && resumeAfterLiveCall/);
 assert.match(release,/if \(shouldResume && connected\)/);
 assert.match(release,/resumeSession\(\)/);
 assert.match(service,/resumeAfterLiveCall = false; \/\/ Explicit mute beats automatic handback/);
});
test('actual web lifecycle stop closes every local media resource and requests provider hangup',async()=>{
 const nodes=new Map();
 function node(){return {value:'A'.repeat(40),handlers:{},attrs:{},append(){},after(){},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},addEventListener(k,v){this.handlers[k]=v}};}
 for(const id of ['liveStart','liveStop','liveInterrupt','liveStatus','liveTranscript','liveOwner','liveAudio'])nodes.set(id,node());
 const tracks=[{stopped:0,stop(){this.stopped++}}],stream={getTracks:()=>tracks,getAudioTracks:()=>tracks};
 let peer,channel;
 class Peer{
  constructor(){peer=this;this.handlers={};this.iceGatheringState='complete';this.connectionState='connected';}
  addEventListener(k,v){this.handlers[k]=v} addTrack(){} async createOffer(){return {type:'offer',sdp:'v=0\n'}}
  async setLocalDescription(offer){this.localDescription=offer} async setRemoteDescription(){}
  close(){this.closed=true}
  createDataChannel(){channel={handlers:{},readyState:'open',sent:[],addEventListener(k,v){this.handlers[k]=v},send(v){this.sent.push(JSON.parse(v))},close(){this.closed=true}};return channel;}
 }
 const context={document:{getElementById:id=>nodes.get(id),createElement:node,createTextNode:s=>s},window:{addEventListener(){}},navigator:{mediaDevices:{getUserMedia:async()=>stream}},RTCPeerConnection:Peer,AbortController,setTimeout:()=>1,clearTimeout(){},fetch:async()=>({ok:true,json:async()=>({transport:{sdp:'v=0\nanswer'}})})};
 vm.createContext(context);vm.runInContext(fs.readFileSync('bubbles-gpt-live.js','utf8'),context);
 await nodes.get('liveStart').handlers.click();
 channel.handlers.message({data:JSON.stringify({type:'session.started'})});
 assert.equal(context.window.BubblesLiveVoice.inCall(),true);
 context.window.BubblesLiveVoice.stop();
 assert.equal(tracks[0].stopped,1);assert.equal(channel.closed,true);assert.equal(peer.closed,true);
 assert.equal(nodes.get('liveAudio').srcObject,null);assert.equal(context.window.BubblesLiveVoice.inCall(),false);
 assert.deepEqual(channel.sent,[{type:'session.close'}]);
 context.window.BubblesLiveVoice.stop();assert.equal(tracks[0].stopped,1,'stop is idempotent');
});
