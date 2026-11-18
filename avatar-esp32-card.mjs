/* Optional local BLE input on Avatar AI's existing prompt card. Nothing auto-sends. */
import {ESP32_SERVICE_UUID,ESP32_NOTIFY_UUID,parseEsp32Observation,mergeEsp32Observation,esp32PromptExcerpt} from './avatar-esp32-core.mjs';
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
export function mountAvatarEsp32Input(parent,focus,refresh){
 if(!parent||!focus)return null;
 const details=parent.appendChild(el('details','avatar-esp32'));
 details.appendChild(el('summary','','ESP32 · local hardware branch (optional)'));
 details.appendChild(el('p','','Use an ESP32 with the companion button-demo firmware to add local observations to the Avatar concept tree. Nothing records or connects until you tap Pair. This is not mind reading.'));
 const actions=details.appendChild(el('div','avatar-esp32-actions'));
 const pair=actions.appendChild(el('button','','Pair ESP32'));
 const disconnect=actions.appendChild(el('button','','Disconnect'));
 const use=actions.appendChild(el('button','','Add selected leaf to prompt'));
 for(const b of [pair,disconnect,use])b.type='button';
 disconnect.disabled=true;use.disabled=true;
 const status=details.appendChild(el('p','avatar-esp32-status','Not connected. No hardware data has been read.'));
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const tree=details.appendChild(el('div','avatar-esp32-tree'));
 tree.appendChild(el('strong','','Avatar concept tree → Hardware → ESP32'));
 const leaves=tree.appendChild(el('ul','avatar-esp32-leaves'));
 details.appendChild(el('p','avatar-esp32-note','Experimental: only button/light/temperature observations are allowed. Do not transmit medical, EEG, passwords or personal data. Browser BLE support varies; use Android Chrome over HTTPS. The APK native bridge is a separate build.'));
 let device=null,characteristic=null,history=[],selected=null;
 const update=()=>{
  leaves.replaceChildren();
  for(const item of history){
   const li=el('li','','');
   const pick=el('button','','Leaf '+item.seq+': '+item.label);
   pick.type='button';pick.setAttribute('aria-pressed',String(item===selected));
   pick.addEventListener('click',()=>{selected=item;use.disabled=false;update();});
   li.appendChild(pick);leaves.appendChild(li);
  }
 };
 const onData=event=>{
  const parsed=parseEsp32Observation(event.target?.value);
  if(!parsed)return;
  const before=history.length;history=mergeEsp32Observation(history,parsed);
  if(history.length!==before||!selected||selected.seq!==parsed.seq){selected=parsed;use.disabled=false;}
  update();status.textContent='ESP32 local event received. Choose a leaf, then add it to your prompt if desired.';
 };
 const onDisconnect=()=>{
  characteristic?.removeEventListener?.('characteristicvaluechanged',onData);
  characteristic=null;disconnect.disabled=true;pair.disabled=false;
  status.textContent='Disconnected. Previously displayed leaves remain on this page only.';
 };
 pair.addEventListener('click',async()=>{
  if(!globalThis.isSecureContext||!navigator.bluetooth?.requestDevice){
   status.textContent='Bluetooth pairing is unavailable here. Open this HTTPS card in a compatible Android Chrome browser.';return;
  }
  pair.disabled=true;status.textContent='Select your own Avatar-ESP32 device from the browser permission prompt…';
  try{
   const chosen=await navigator.bluetooth.requestDevice({filters:[{services:[ESP32_SERVICE_UUID]}]});
   if(device&&device!==chosen&&device.gatt?.connected)device.gatt.disconnect();
   device=chosen;device.addEventListener('gattserverdisconnected',onDisconnect);
   const server=await chosen.gatt.connect();
   const service=await server.getPrimaryService(ESP32_SERVICE_UUID);
   characteristic=await service.getCharacteristic(ESP32_NOTIFY_UUID);
   await characteristic.startNotifications();
   characteristic.addEventListener('characteristicvaluechanged',onData);
   history=[];selected=null;use.disabled=true;update();
   disconnect.disabled=false;
   status.textContent='ESP32 paired for local observations. Press the wired button on the ESP32 to create a tree leaf.';
  }catch(error){
   onDisconnect();
   status.textContent=error?.name==='NotFoundError'?'No ESP32 selected. Nothing was connected.':'ESP32 pairing unavailable; check firmware, Bluetooth permissions and browser support.';
  }
 });
 disconnect.addEventListener('click',()=>{if(device?.gatt?.connected)device.gatt.disconnect();onDisconnect();device=null;});
 use.addEventListener('click',()=>{
  const text=esp32PromptExcerpt(selected);if(!text)return;
  const next=(String(focus.value||'').trim()+' '+text).trim();
  if(next.length>180){status.textContent='The optional project-focus field is full. Shorten its text before adding this leaf.';return;}
  focus.value=next;refresh?.();
  status.textContent='Selected ESP32 leaf added to your editable prompt focus. Nothing has been sent.';
 });
 return details;
}
