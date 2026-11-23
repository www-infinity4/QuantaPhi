/* Color Passage Window demonstration: generates synthetic wallet IDs only.
 * No phone files, wallet session, network, local storage or data transfer.
 */
import {issueNumericDeviceId} from './workers/unified-wallet/device-number-core.mjs';
import {buildWalletColorWindow} from './workers/unified-wallet/device-color-graph.mjs';
import {colorPassageStatus} from './bubbles-byte-assist.mjs';
import {COLOR_CAVITY_STAGES,routeCavityFrame} from './bubbles-color-cavity.mjs';

const target=document.getElementById('passageWindow');
const status=document.getElementById('passageStatus');
const newSample=document.getElementById('makeSample');
const misalign=document.getElementById('misalign');
const realign=document.getElementById('realign');
let expected=null,observed=null;

function render(){
 target.replaceChildren();
 if(!expected||!observed){
  target.setAttribute('aria-label','No synthetic window currently displayed');
  status.textContent='No wallet access granted · no demonstration generated.';
  return;
 }
 const view=colorPassageStatus(expected,observed,0);
 for(let i=0;i<view.totalTiles;i++){
  const bulb=document.createElement('span');
  bulb.className='passage';
  bulb.style.backgroundColor=expected.colors[i];
  bulb.dataset.match=String(view.passageMask[i]);
  bulb.setAttribute('aria-label','Synthetic color passage '+(i+1)+' of '+view.totalTiles+
   (view.passageMask[i]?' matches':' is blocked'));
  bulb.title='Tile '+(i+1)+': '+expected.colors[i]+' — '+(view.passageMask[i]?'aligned':'misaligned');
  target.append(bulb);
 }
 target.dataset.aligned=String(view.aligned);
 target.setAttribute('aria-label',view.matchedTiles+' of 11 synthetic color passages aligned');
 status.textContent=view.aligned
  ?'11 of 11 bulbs aligned · the DISPLAY window is open. No wallet access granted.'
  :view.matchedTiles+' of 11 bulbs aligned · the DISPLAY passage is blocked. No wallet access granted.';
}
newSample.addEventListener('click',async()=>{
 newSample.disabled=true;
 try{
  const deviceNumbers=[issueNumericDeviceId(crypto),issueNumericDeviceId(crypto)];
  const wallet='synthetic-demo-only';
  expected=await buildWalletColorWindow({
   verifiedAccountId:wallet,linkedAccountId:wallet,deviceNumbers,crypto
  });
  observed={...expected,colors:[...expected.colors]};
  render();
 }catch{
  expected=null;observed=null;render();
  status.textContent='Synthetic demonstration unavailable on this device. No wallet operation occurred.';
 }finally{newSample.disabled=false}
});
misalign.addEventListener('click',()=>{
 if(!expected||!observed)return;
 observed={...observed,colors:[...observed.colors]};
 observed.colors[5]=expected.colors[5]==='#ff0000'?'#00ff00':'#ff0000';
 render();
});
realign.addEventListener('click',()=>{
 if(!expected)return;
 observed={...expected,colors:[...expected.colors]};
 render();
});
render();

// Optical-cavity-inspired SOFTWARE MODEL. Actual screen decoders have no
// required black→white→yellow route. Only bounded synthetic packet metadata
// is generated; no camera, device files, wallet access or data stream.
const cavityPower=document.getElementById('cavityPower');
const cavityChannel=document.getElementById('cavityChannel');
const cavityAperture=document.getElementById('cavityAperture');
const cavityNext=document.getElementById('cavityNext');
const cavityPlay=document.getElementById('cavityPlay');
const cavityStages=document.getElementById('cavityStages');
const cavityPixels=document.getElementById('cavityPixels');
const cavityStatus=document.getElementById('cavityStatus');
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
let lightOn=false,frameTick=0,closedAperture=false,playing=null;
const channelKinds=['blue','green','purple','red'];
const channelLabels={black:'Standby',white:'Signal enabled',yellow:'Incoming metadata',
 red:'Inspect',orange:'Decide',blue:'Research',green:'Build',purple:'Review'};
function stopCavityPlayback(){
 if(playing!==null){clearInterval(playing);playing=null}
 cavityPlay.setAttribute('aria-pressed','false');
 cavityPlay.textContent='Play slow frames';
}
function syntheticPackets(){
 // A small, repeatable batch is enough to visualize an imagined huge stream.
 // Every frame contains only type/byte-count metadata, never user data.
 return Array.from({length:8},(_,i)=>({
  kind:channelKinds[(i+frameTick)%channelKinds.length],
  bytes:(i+1)*4
 }));
}
function renderCavity(){
 const packets=syntheticPackets();
 const apertures=[true,true,true,closedAperture?false:true,true,true,true,true];
 const selected=cavityChannel.value;
 const result=routeCavityFrame(packets,{requested:selected,lightOn,apertures});
 cavityPower.setAttribute('aria-pressed',String(lightOn));
 cavityPower.textContent=lightOn?'Switch back to black standby':'Enable white signal';
 cavityAperture.textContent=closedAperture?'Reopen cavity opening':'Close one cavity opening';
 cavityStages.replaceChildren();
 for(const [i,stage] of result.guideOrder.entries()){
  if(i){
   const arrow=document.createElement('span');arrow.className='cavity-arrow';arrow.textContent='›';
   arrow.setAttribute('aria-hidden','true');cavityStages.append(arrow);
  }
  const chip=document.createElement('span');chip.className='cavity-stage';
  chip.textContent=stage.charAt(0).toUpperCase()+stage.slice(1);
  const role=document.createElement('small');role.textContent=channelLabels[stage];
  chip.append(role);cavityStages.append(chip);
 }
 cavityPixels.replaceChildren();
 const paint=COLOR_CAVITY_STAGES[selected].hex;
 packets.forEach((item,i)=>{
  const eligible=lightOn&&apertures[i]&&item.kind===selected;
  const slot=document.createElement('span');slot.className='cavity-slot';
  slot.dataset.pass=String(eligible);
  slot.style.setProperty('--route-light',paint);
  slot.textContent=eligible?'●':'○';
  slot.setAttribute('aria-label','Simulated packet slot '+(i+1)+': '+(eligible?'selected':'filtered'));
  cavityPixels.append(slot);
 });
 cavityPixels.setAttribute('aria-label',
  'Simulated frame '+frameTick+': '+result.accepted+' of '+result.processed+
  ' selected synthetic packets. No real data accessed.');
 cavityStatus.textContent=lightOn?
  'Frame '+frameTick+' · yellow intake / red inspection / orange choice → '+
   selected+' · '+result.accepted+'/'+result.processed+
   ' packets shown · '+result.byteWeight+' synthetic bytes. No wallet access granted.':
  'Black standby · simulated white signal off · no selected packets. No wallet access granted.';
}
cavityPower.addEventListener('click',()=>{
 lightOn=!lightOn;
 if(!lightOn)stopCavityPlayback();
 renderCavity();
});
cavityChannel.addEventListener('change',()=>{stopCavityPlayback();renderCavity()});
cavityNext.addEventListener('click',()=>{frameTick++;renderCavity()});
cavityAperture.addEventListener('click',()=>{closedAperture=!closedAperture;renderCavity()});
cavityPlay.addEventListener('click',()=>{
 if(playing!==null){stopCavityPlayback();return}
 if(reduced){
  cavityStatus.textContent='Reduced-motion preference respected. Use Next frame instead. No wallet access granted.';
  return;
 }
 lightOn=true;frameTick++;renderCavity();
 playing=setInterval(()=>{frameTick++;renderCavity()},450);
 cavityPlay.setAttribute('aria-pressed','true');
 cavityPlay.textContent='Pause frames';
});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden)stopCavityPlayback();
});
window.addEventListener('pagehide',stopCavityPlayback);
renderCavity();
