import {searchPanasonic} from './panasonic-card.mjs';
import {mountCardActions} from '/quanta-card-actions.mjs';
const $=id=>document.getElementById(id);
const field=$('panasonicQuery'),go=$('panasonicGo'),stop=$('panasonicStop'),status=$('panasonicStatus'),results=$('panasonicResults');
let controller=null,requestId=0;
function resetControls(){go.disabled=false;stop.disabled=true;field.disabled=false;}
function cancel(){
 if(!controller)return;
 controller.abort();controller=null;requestId+=1;
 resetControls();status.textContent='Stopped. No purchase or account action was taken.';
}
async function run(){
 if(controller)return;
 const current=++requestId;
 controller=new AbortController();const signal=controller.signal;
 go.disabled=true;stop.disabled=false;field.disabled=true;results.replaceChildren();status.textContent='Searching the public index…';
 try{
  const receipt=await searchPanasonic(field.value,{signal});
  if(current!==requestId||signal.aborted)return;
  status.textContent=receipt.found+' matching official-domain link'+(receipt.found===1?'':'s')+' in the public index. Page availability is not confirmed.';
  for(const item of receipt.results){
   const link=document.createElement('a');link.className='result';link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
   const title=document.createElement('strong');title.textContent=item.title;
   const detail=document.createElement('span');detail.textContent=item.description||item.url;
   link.append(title,detail);results.append(link);
  }
  if(!receipt.found){const p=document.createElement('p');p.textContent='No official-domain results found. Try a more specific topic.';results.append(p);}
 }catch(error){if(current===requestId)status.textContent=signal.aborted?'Stopped. No account action was taken.':error.message||'Search unavailable.';}
 finally{if(current===requestId){controller=null;resetControls();}}
}
go.addEventListener('click',()=>void run());stop.addEventListener('click',cancel);field.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void run();}});
mountCardActions($('panasonicCardActions'),{id:'panasonic-power-chain',name:'Panasonic · Power Chain',category:'Shopping',url:'https://quantaphi.org/design-lab/panasonic.html'},{showSearch:false});
