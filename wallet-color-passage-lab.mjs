/* Color Passage Window demonstration: generates synthetic wallet IDs only.
 * No phone files, wallet session, network, local storage or data transfer.
 */
import {issueNumericDeviceId} from './workers/unified-wallet/device-number-core.mjs';
import {buildWalletColorWindow} from './workers/unified-wallet/device-color-graph.mjs';
import {colorPassageStatus} from './bubbles-byte-assist.mjs';

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
