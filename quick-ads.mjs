import {GAME_END,inGameWindow,gameLiveStatus,chooseQuickAd} from './quick-ads-core.mjs?v=20261028-game5b';
/* QuantaPhi Quick Ads: event-driven, silent, dismissible and limited to Game 5 day.
 * Server feed establishes live vs final; network errors fail closed.
 * No merchant, wallet, search or account data leaves this module. */
(()=>{
 if(typeof window==='undefined'||typeof document==='undefined')return;
 const KEY='quantaphi:worldseries-quickads:20261028:v1';
 const read=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{return {}}};
 const state={...read(),counts:{...(read().counts||{})},recent:[...(read().recent||[])]};
 const save=()=>{try{sessionStorage.setItem(KEY,JSON.stringify(state))}catch{}};
 let currentId='',moves=0,shown=null,closeTimer=null,seq=0,poll=null,scoreAdSuppressedUntil=0;
 let liveState='unknown',lastFetch=0,checking=null;
 const node=document.createElement('aside');node.id='quantaQuickAd';
 node.className='qad-toast';node.hidden=true;node.setAttribute('aria-label','Quick Ad website spotlight');
 document.body.append(node);
 function hide(){
  if(closeTimer)clearTimeout(closeTimer);
  closeTimer=null;
  node.classList.remove('qad-visible');
  node.hidden=true;shown=null;
 }
 function make(tag,className,content){
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(content!==undefined)el.textContent=content;
  return el;
 }
 const STATUS_URL='https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=10/28/2026';
 async function live(){
  if(!inGameWindow()){hide();return 'inactive';}
  const now=Date.now();
  if(liveState==='final')return 'final';
  if(now-lastFetch<90000)return liveState;
  if(checking)return checking;
  lastFetch=now;
  checking=(async()=>{
   const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),4500);
   try{
    const response=await fetch(STATUS_URL,{cache:'no-store',signal:ctrl.signal,credentials:'omit'});
    if(!response.ok)throw new Error('MLB status unavailable');
    liveState=gameLiveStatus(await response.json());
   }catch{liveState='unknown';}
   finally{clearTimeout(timeout);checking=null;}
   if(!['scheduled','live'].includes(liveState)||!inGameWindow())hide();
   return liveState;
  })();
  return checking;
 }
 function display(ad){
  if(shown===ad.id)hide();
  node.replaceChildren();
  node.style.setProperty('--qad-tone',ad.tone);
  const glyph=make('span','qad-mark',ad.name.slice(0,1));
  glyph.setAttribute('aria-hidden','true');
  const heading=make('span','qad-heading');
  heading.append(make('small','qad-kicker','QUICK AD · WORLD SERIES NIGHT'),make('strong','',ad.name),make('span','qad-tagline',ad.tagline));
  const link=make('a','qad-cta','Visit');
  link.href=ad.href;link.target='_blank';link.rel='noopener noreferrer';
  link.setAttribute('aria-label','Visit '+ad.name+' official website');
  const dismiss=make('button','qad-dismiss','×');
  dismiss.type='button';dismiss.setAttribute('aria-label','Dismiss Quick Ads for 10 minutes');
  dismiss.addEventListener('click',()=>{
   state.dismissedUntil=Date.now()+10*60*1000;save();hide();
  });
  node.append(glyph,heading,link,dismiss,make('small','qad-disclosure','Independent website spotlight · not a paid ad'));
  node.hidden=false;shown=ad.id;
  requestAnimationFrame(()=>node.classList.add('qad-visible'));
  closeTimer=setTimeout(hide,6500);
  state.lastAt=Date.now();state.total=(Number(state.total)||0)+1;
  state.counts[ad.id]=(Number(state.counts[ad.id])||0)+1;
  state.recent=[ad.id,...state.recent.filter(x=>x!==ad.id)].slice(0,4);
  save();
 }
 const onSwitch=async(detail,revision)=>{
  if(!inGameWindow()||document.hidden||Date.now()>GAME_END||Date.now()<scoreAdSuppressedUntil)return;
  if(Date.now()<Number(state.dismissedUntil||0))return;
  if(Date.now()-Number(state.lastAt||0)<24000)return;
  if(Number(state.total||0)>=30)return;
  if(moves%2!==0)return; // one non-blocking pop-up per two card transitions at most
  const status=await live();
  if(!['scheduled','live'].includes(status)||revision!==seq||document.hidden||!inGameWindow())return;
  const pick=chooseQuickAd(detail,state.counts,state.recent,Date.now());
  if(pick)display(pick);
 };
 window.addEventListener('quantaphi:world-series-toast',e=>{
  if(e.detail?.visible){scoreAdSuppressedUntil=Date.now()+14000;hide()}
 });
 window.addEventListener('quantaphi:switchboard-change',e=>{
  const detail=e.detail;
  if(!detail?.id){currentId='';hide();return;}
  // Ignore tab-only updates for the same card.
  if(currentId===detail.id)return;
  currentId=detail.id;
  if(!inGameWindow()){hide();return;}
  moves++;const revision=++seq;
  void onSwitch(detail,revision);
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)hide();
  else if(!inGameWindow())hide();
 });
 // Hide and permanently stop after tonight's window, even if the page remains open.
 poll=setInterval(()=>{
  if(!inGameWindow()){
   hide();
   if(Date.now()>GAME_END){clearInterval(poll);poll=null;}
  }else if(liveState!=='final'&&!document.hidden)void live();
 },60000);
})();
