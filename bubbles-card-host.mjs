import {cards} from './bubbles-card-catalog.mjs';
const card=cards.find(card=>card.id===new URLSearchParams(location.search).get('card')&&card.mount);
const status=document.getElementById('host-status');
const errors=[];window.addEventListener('error',event=>{errors.push(String(event.message||'Card error').slice(0,180));});
window.BubblesCardDiagnostics=()=>({id:card?.id,loaded:status.hidden,errors:errors.slice(-8)});
if(!card){status.textContent='This card is not registered.';}else{
 const mount=document.createElement('section');mount.id=card.mount;document.body.append(mount);
 // Multi-part catalog cards (Media Star's person picker and Fred player) need both roots
 // in place before the registered scripts execute. Never load undeclared remote scripts.
 for(const id of card.extraMounts||[]){
  if(id===card.mount)continue;
  const extra=document.createElement('section');extra.id=id;document.body.append(extra);
 }
 for(const path of card.styles){const link=document.createElement('link');link.rel='stylesheet';link.href='/'+path;document.head.append(link);}
 try{
  for(const path of ['cloud-wallet-client.js',...card.scripts])await new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='/'+path;script.onload=resolve;script.onerror=()=>reject(Error('Card asset unavailable: '+path));document.head.append(script);
  });
  if(!mount.childElementCount)throw Error('Card did not render its controls');
  status.hidden=true;
 }catch(error){status.textContent=String(error.message||error);errors.push(status.textContent);}
}
