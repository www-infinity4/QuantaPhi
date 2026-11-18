/* Presentation changes are visual and content-only.
 * Uses fixed Central-time boundary; no server wallet or login state. */
import {familyPresentationAt} from './presentation.mjs';

function applyPresentation(){
 const mode=familyPresentationAt(new Date());
 document.documentElement.dataset.familyMode=mode;
 if(mode==='octaves'){
   document.querySelector('#gary-birthday-hero')?.remove();
   document.querySelector('.topline')?.remove();
   document.title='Gary & Family · TV, Radio, Weather & Bubbles | QuantaPhi';
   const meta=document.querySelector('meta[name="description"]');
   if(meta)meta.content='Gary and family living room with TV, Westerns, Iowa weather, radio, Bubbles and discovery.';
 }else{
   document.title='Happy Birthday, Gary! · Family Living Room | QuantaPhi';
 }
}
applyPresentation();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)applyPresentation()});
// If the page remains open across midnight, change it during the same session.
let clock=null;
function startPresentationClock(){
  applyPresentation();
  if(clock!==null)return;
  clock=window.setInterval(applyPresentation,60_000);
}
function stopPresentationClock(){
  if(clock===null)return;
  window.clearInterval(clock);
  clock=null;
}
startPresentationClock();
window.addEventListener('pagehide',stopPresentationClock);
window.addEventListener('pageshow',startPresentationClock);
