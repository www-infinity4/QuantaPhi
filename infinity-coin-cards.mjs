import { mountCardActions } from '/quanta-card-actions.mjs';
const safeUrl = location.origin + '/infinity-coin-cards.html';
const setStatus = (id, text) => { const node = document.querySelector('#'+id+' [data-status]'); if (node) node.textContent=text; };
function safeShare(id, title) {
 const url = safeUrl+'#'+id;
 if (navigator.share) return navigator.share({title,url}).catch(()=>navigator.clipboard?.writeText(url));
 return navigator.clipboard?.writeText(url).then(()=>setStatus(id,'Coin link copied.')).catch(()=>setStatus(id,'Share this link: '+url));
}
async function probe(url, timeout=6000) {
 const abort=new AbortController(), timer=setTimeout(()=>abort.abort(),timeout);
 try {
  const response=await fetch(url,{method:'GET',cache:'no-store',credentials:'omit',signal:abort.signal,redirect:'follow'});
  return {reachable:response.ok,code:response.status};
 } catch { return {reachable:false,code:null}; } finally {clearTimeout(timer);}
}
let inflight=false,checkedAt=0;
export async function refreshCoinConnections({force=false}={}) {
 if(inflight||(!force&&Date.now()-checkedAt<300000)) return;
 inflight=true;
 const status=document.getElementById('connectionState');
 if(status)status.textContent='Checking the current source routes. No wallet changes are made.';
 try {
  // First-party checks observe route availability, not AI model readiness, owner identity or mint completion.
  const [alien,diagnostic]=await Promise.all([
   probe('/alien-coin/'),
   fetch('/api/infinity-connections',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(6000)})
    .then(async response=>({http:response.status,data:await response.json()}))
    .catch(()=>({http:null,data:null}))
  ]);
  const alienMessage=alien.reachable?'Alien Coin page reachable; server mint not yet verified.':
    'Alien Coin route unavailable'+(alien.code?' (HTTP '+alien.code+')':'')+'.';
  const aiMessage=diagnostic.data?.quantAi==='AUTH_ROUTE_REACHABLE'
    ?'Quant-AI private authentication route reachable; model, account and wallet operations not yet verified.'
    :'Quant-AI backend not verified'+(diagnostic.data?.quantAi?' ('+diagnostic.data.quantAi+')':'')+'.';
  setStatus('alien-coin',alienMessage);
  if(status)status.textContent=alienMessage+' '+aiMessage+' No tokens minted by this check.';
  checkedAt=Date.now();
 } finally {inflight=false;}
}
function mount() {
 const specs=[
  ['cardone-notes',{id:'infinity-cardone-notes',name:'Cardone Capital Notes · Infinity Braided Coin',category:'Investment research',official:'https://cardonecapital.com/investments/',featureUrl:'https://cardonecapital.com/investments/',route:'/infinity-coin-cards.html#cardone-notes'}],
  ['alien-coin',{id:'infinity-alien-coin',name:'Alien Coin · Infinity Braided Coin',category:'Collectible research',official:location.origin+'/alien-coin/',featureUrl:location.origin+'/alien-coin/',route:'/infinity-coin-cards.html#alien-coin'}]
 ];
 for(const [id,card] of specs){
  const root=document.getElementById(id);
  const actions=root?.querySelector('[data-card-actions]');
  if(actions)try{mountCardActions(actions,card);}catch{setStatus(id,'Shared card actions unavailable. Original links still work.');}
  root?.querySelector('[data-share]')?.addEventListener('click',()=>void safeShare(id,card.name));
  root?.querySelector('[data-refresh]')?.addEventListener('click',()=>void refreshCoinConnections({force:true}));
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshCoinConnections();});
 window.addEventListener('online',()=>void refreshCoinConnections({force:true}));
 void refreshCoinConnections();
}
if(typeof document!=='undefined') {if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
