import {CUBE_OBJ,parseOBJ,normalizeMesh,projectVertices,meshSummary} from './spatial-ai-model.mjs';
const $=id=>document.getElementById(id);
const scene=$('saScene'),ctx=scene.getContext('2d'),status=$('saMeshStatus');
let mesh=parseOBJ(CUBE_OBJ),sourceName='sample cube',yaw=.6,pitch=.35,zoom=1,drag=null;
function summary(){return 'Spatial AI · '+sourceName+': '+meshSummary(mesh)+'. Coordinates from user-provided OBJ or sample; not a validated physical scan.';}
function render(){
 if(!ctx)return;
 const {width:w,height:h}=scene;ctx.clearRect(0,0,w,h);
 ctx.fillStyle='#f2f7fb';ctx.fillRect(0,0,w,h);
 const points=projectVertices(normalizeMesh(mesh).vertices,{yaw,pitch,scale:Math.min(w,h)*.30*zoom});
 ctx.strokeStyle='#2a6483';ctx.lineWidth=2.2;ctx.lineJoin='round';ctx.lineCap='round';
 const edges=new Set();
 for(const face of mesh.faces)for(let i=0;i<3;i++){
  const a=face[i],b=face[(i+1)%3],key=[a,b].sort((x,y)=>x-y).join('-');
  if(edges.has(key))continue;edges.add(key);
  const p=points[a],q=points[b];ctx.beginPath();ctx.moveTo(w/2+p[0],h/2-p[1]);ctx.lineTo(w/2+q[0],h/2-q[1]);ctx.stroke();
 }
 ctx.fillStyle='#5c514b';ctx.font='20px system-ui';ctx.fillText('Drag to orbit · local OBJ',18,h-19);
 $('saSummary').value=summary();
}
function reset(){mesh=parseOBJ(CUBE_OBJ);sourceName='sample cube';yaw=.6;pitch=.35;zoom=1;status.textContent='Sample cube loaded · illustrative geometry';render();}
$('saReset').addEventListener('click',reset);
$('saZoomIn').addEventListener('click',()=>{zoom=Math.min(3,zoom*1.2);render();});
$('saZoomOut').addEventListener('click',()=>{zoom=Math.max(.35,zoom/1.2);render();});
scene.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;drag={x:e.clientX,y:e.clientY};scene.setPointerCapture?.(e.pointerId);});
scene.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};yaw+=dx*.008;pitch=Math.max(-1.5,Math.min(1.5,pitch+dy*.008));render();});
for(const type of ['pointerup','pointercancel','lostpointercapture'])scene.addEventListener(type,()=>drag=null);
$('saFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>1_000_000)throw new Error('OBJ file is too large (1 MB maximum).');
  const next=parseOBJ(await file.text());
  mesh=next;sourceName='imported local OBJ';yaw=.6;pitch=.35;zoom=1;
  status.textContent='Imported '+meshSummary(mesh)+'. Not a verified physical measurement.';render();
 }catch(error){status.textContent='Import declined: '+error.message;}
 e.target.value='';
});
const video=$('saVideo'),snapshot=$('saSnapshot'),camStatus=$('saCameraStatus');let stream=null;
function stopCamera(){
 if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}
 video.pause();video.srcObject=null;video.hidden=true;
 $('saStartCamera').disabled=false;$('saCapture').disabled=true;$('saStopCamera').disabled=true;
 camStatus.textContent='Camera is off. Any captured frame stays only in this tab.';
}
$('saStartCamera').addEventListener('click',async()=>{
 if(stream)return;
 $('saStartCamera').disabled=true;
 if(!navigator.mediaDevices?.getUserMedia){camStatus.textContent='Camera unavailable in this browser or context.';$('saStartCamera').disabled=false;return;}
 try{
  const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  if(document.hidden){acquired.getTracks().forEach(track=>track.stop());$('saStartCamera').disabled=false;return;}
  stream=acquired;video.srcObject=stream;video.hidden=false;
  $('saCapture').disabled=false;$('saStopCamera').disabled=false;
  camStatus.textContent='Live camera preview on this device; no uploads or automatic depth reconstruction.';
  void video.play().catch(()=>{if(stream===acquired)stopCamera();});
 }catch(error){camStatus.textContent='Camera not started. Check browser permission and HTTPS.';$('saStartCamera').disabled=false;}
});
$('saStopCamera').addEventListener('click',stopCamera);
$('saCapture').addEventListener('click',()=>{
 if(!stream||!video.videoWidth)return;
 const out=snapshot.getContext('2d');
 snapshot.width=Math.min(video.videoWidth,1280);
 snapshot.height=Math.round(snapshot.width*video.videoHeight/video.videoWidth);
 out.drawImage(video,0,0,snapshot.width,snapshot.height);snapshot.hidden=false;
 camStatus.textContent='2D frame captured in memory only; no depth inferred and nothing uploaded.';
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera();});
window.addEventListener('pagehide',stopCamera);
$('saCopy').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(summary());$('saCopyStatus').textContent='Geometry summary copied. Paste into Bubbles when you choose.';}
 catch{$('saCopyStatus').textContent='Copy unavailable here; select the summary text manually.';}
});
reset();
