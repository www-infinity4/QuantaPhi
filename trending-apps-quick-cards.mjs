/* Each Android app has its own original Oracle Octaves card.
 * This browser cannot execute an Android Termux process. The Termux card is a
 * real editable code pad with a blinking cursor, not a fictitious shell.
 * Bubbles One native RUN_COMMAND remains a separate owner-approved integration. */
import {APPS,TRENDS_FEEDS,selectTrendingApps,sanitizeDraft,terminalDraftResult} from './trending-apps-core.mjs';
const el=(tag,cls,content)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(content!==undefined)node.textContent=content;
 return node;
};
const byId=id=>document.getElementById(id);
function stamp(iso){
 try{return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'}).format(new Date(iso))+' CT'}catch{return 'unknown'};
}
function mountTermuxPad(card){
 const pad=card.appendChild(el('section','termux-code-pad'));
 pad.setAttribute('aria-label','Termux command editor, not connected to Android terminal');
 const head=pad.appendChild(el('div','termux-pad-head'));
 head.append(el('strong',null,'Termux · Command Pad'),el('span','termux-pad-led','● LOCAL DRAFT'));
 const display=pad.appendChild(el('div','termux-output'));
 display.setAttribute('aria-live','polite');
 display.append(el('p',null,'Termux-style editor ready. Browser connection to Android Termux: NOT CONNECTED.'));
 display.append(el('p',null,'Commands remain on this device. Nothing runs automatically.'));
 const form=pad.appendChild(el('form','termux-command-form'));
 const label=form.appendChild(el('label','termux-prompt-line'));
 const cursor=label.appendChild(el('span','termux-prompt-cursor','❯'));
 cursor.setAttribute('aria-hidden','true');
 label.appendChild(el('span','termux-prompt-label','Enter code or a command'));
 const input=form.appendChild(el('textarea','termux-code-input'));
 input.rows=4;input.spellcheck=false;input.autocomplete='off';input.autocapitalize='off';
 input.maxLength=7000;input.placeholder='python -c "print(2 + 2)"';
 input.setAttribute('aria-label','Termux command draft. Not executed until you run it in Termux yourself.');
 const buttons=form.appendChild(el('div','termux-pad-controls'));
 const review=buttons.appendChild(el('button','termux-pad-primary','Review'));
 review.type='submit';
 const copy=buttons.appendChild(el('button','termux-pad-secondary','Copy command'));
 copy.type='button';
 const clear=buttons.appendChild(el('button','termux-pad-secondary','Clear'));
 clear.type='button';
 const notice=pad.appendChild(el('p','termux-pad-notice',
  'This is not a remote terminal session. Use the separately installed, owner-approved Bubbles Android Termux bridge to run commands and receive real exit codes.'));
 notice.setAttribute('role','status');
 function appendLog(message){
  display.appendChild(el('p',null,message));
  while(display.childElementCount>18)display.firstElementChild.remove();
  display.scrollTop=display.scrollHeight;
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const code=sanitizeDraft(input.value);
  if(!code){notice.textContent='Enter some code to review.';return;}
  const receipt=terminalDraftResult(code);
  pad.dataset.executionState=receipt.state;
  appendLog('❯ '+code.slice(0,150).replace(/\n/g,' ↵ ')+(code.length>150?'…':''));
  appendLog('['+receipt.label+'] Copy and run this in your own installed Termux after review.');
  notice.textContent='Not executed. No native Termux bridge is authorized in this browser tab.';
 });
 input.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();form.requestSubmit();}
 });
 copy.addEventListener('click',async()=>{
  const code=sanitizeDraft(input.value);
  if(!code){notice.textContent='Nothing to copy.';return;}
  try{
   if(typeof navigator.clipboard?.writeText!=='function')throw new Error('clipboard unavailable');
   await navigator.clipboard.writeText(code);
   notice.textContent='Copied. No command was executed. Paste into Termux and approve there.';
  }catch{
   input.focus();input.select();
   notice.textContent='Clipboard unavailable. Your code is selected; use Android Copy.';
  }
 });
 clear.addEventListener('click',()=>{
  input.value='';pad.dataset.executionState='not_executed';
  display.replaceChildren(el('p',null,'Code pad cleared. No commands were executed.'));
  notice.textContent='Ready for a new draft.';
  input.focus();
 });
 card.addEventListener('oracle:activate',()=>{ /* Focus stays user-directed; no OS keyboard popup on every rotation. */});
 return pad;
}
function makeCard(app){
 const root=el('section','trending-app-card');
 root.id='trendingApp'+app.id.replace(/(^|-)([a-z])/g,(_,d,c)=>c.toUpperCase());
 root.dataset.trendingAppId=app.id;
 root.dataset.appOriginal='true';
 root.setAttribute('aria-label',app.name+' independent interactive app card');
 const head=root.appendChild(el('header','trapp-mast'));
 const logo=head.appendChild(el('img','trapp-logo'));
 logo.src='https://www.google.com/s2/favicons?domain='+encodeURIComponent(app.logoHost)+'&sz=128';
 logo.alt=app.name+' publisher icon';logo.loading='lazy';logo.decoding='async';
 logo.addEventListener('error',()=>logo.remove(),{once:true});
 const text=head.appendChild(el('div','trapp-title-block'));
 const kicker=text.appendChild(el('span','trapp-kicker','FEATURED ANDROID APP'));
 text.appendChild(el('h2','trapp-title',app.name));
 root.appendChild(el('p','trapp-feature',app.feature));
 const proof=root.appendChild(el('p','trapp-proof','Checking the actual Google Trends RSS snapshot…'));
 proof.setAttribute('role','status');
 if(app.terminal)mountTermuxPad(root);
 const foot=root.appendChild(el('p','trapp-source'));
 const a=foot.appendChild(el('a','trapp-official','Official app information'));
 a.href=app.url;a.rel='noopener noreferrer';a.target='_blank';
 a.setAttribute('aria-label','Visit the publisher for '+app.name+'. Opens official app information, not an in-card app session.');
 const setStatus=row=>{
  root.dataset.trend=row.trend;
  kicker.textContent=row.trend==='verified'?'GOOGLE TRENDING APP':'FEATURED ANDROID APP';
  proof.textContent=row.trend==='verified'
    ?'Google Trends U.S. · '+row.trendSource.query+' · '+row.trendSource.approx_searches+' approximate searches · published '+stamp(row.trendSource.published_at)
    :'No verified current Google Trends match for this app. Featured source only.';
 };
 return {root,setStatus};
}
async function feed(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),11000);
 try{
  const r=await fetch(url,{cache:'no-store',signal:controller.signal,credentials:'omit',headers:{Accept:'application/json'}});
  if(!r.ok)return null;
  return await r.json();
 }catch{return null}finally{clearTimeout(timer)}
}
export function mountTrendingApps(host=byId('trendingAppCards')){
 if(!host||host.dataset.appsReady)return null;
 host.dataset.appsReady='1';
 const cards=new Map();
 // One always-visible Termux original card; independent of an RSS match.
 for(const app of APPS){
  const {root,setStatus}=makeCard(app);
  host.appendChild(root);
  cards.set(app.id,{root,setStatus});
 }
 window.dispatchEvent(new CustomEvent('quantaphi:trending-app-cards-ready'));
 let run=0;
 async function refresh(){
  const version=++run;
  const results=await Promise.all(TRENDS_FEEDS.map(u=>feed(u+'?check='+Date.now())));
  if(version!==run)return;
  const candidates=results.filter(v=>v&&typeof v.checked_at==='string')
   .sort((a,b)=>Date.parse(b.checked_at)-Date.parse(a.checked_at));
  const rows=selectTrendingApps(candidates[0]||null);
  for(const row of rows)cards.get(row.id)?.setStatus(row);
  const count=rows.filter(row=>row.trend==='verified').length;
  host.dataset.verifiedTrendCount=String(count);
  // The cards are independent; Oracle reorders using its ordinary direction engine.
  window.dispatchEvent(new CustomEvent('quantaphi:trending-app-cards-ready'));
 }
 void refresh();
 const interval=setInterval(()=>{if(!document.hidden)void refresh()},10*60000);
 window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh()});
 return {refresh,cards};
}
if(typeof document!=='undefined'){
 const start=()=>mountTrendingApps();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
}
