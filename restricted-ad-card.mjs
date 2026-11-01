/* Infinity 21+ preference card. No ads are fetched until a deliberate opt-in.
 * The same-origin server is solely responsible for verifying 21+, lawful region,
 * license and creative review; this UI cannot grant access through a button.
 * No wallet, Quants, inferred interests or browsing telemetry are read. */
import {eligibleCreative,chooseNextCreative} from './restricted-ad-policy.mjs';
const root=document.getElementById('infinityAdultContentCard');
if(root){
 const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
 root.classList.add('rac-card');root.dataset.personalization='disabled';
 const head=el('div','rac-head'),kicker=el('small','rac-kicker','INFINITY® · CONTENT PREFERENCES'),
   heading=el('h2','rac-heading','21+ content settings'),
   intro=el('p','rac-intro','Adult-category advertising stays off unless you opt in and the service confirms your age and legal eligibility.'),
   message=el('p','rac-status','No restricted advertising is being displayed.');
 message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 head.append(kicker,heading);root.append(head,intro,message);
 const frame=el('div','rac-frame'),image=el('img','rac-image'),
   title=el('h3','rac-title'),description=el('p','rac-description'),
   sponsor=el('p','rac-sponsor'),out=el('a','rac-out','View approved publisher');
 image.hidden=true;image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';
 out.target='_blank';out.rel='noopener noreferrer';frame.hidden=true;
 frame.append(image,title,description,sponsor,out);
 const controls=el('div','rac-actions'),
   enable=el('button','rac-button','Request 21+ access'),
   disable=el('button','rac-button','Turn off'),
   next=el('button','rac-button','Next verified ad'),
   pause=el('button','rac-button','Pause');
 for(const b of [enable,disable,next,pause])b.type='button';
 disable.hidden=true;next.hidden=true;pause.hidden=true;
 controls.append(enable,disable,next,pause);
 const note=el('p','rac-note','Age checks require an approved server-side verification service. Tapping this button does not verify your age. No advertiser images, products, or links are shown before approval.');
 root.append(frame,controls,note);
 let approved=[],last='',seen=[],optedIn=false,paused=false,serial=0;
 const status=value=>{message.textContent=value};
 function clear(){
  approved=[];last='';seen=[];frame.hidden=true;image.removeAttribute('src');out.removeAttribute('href');
  image.hidden=true;next.hidden=true;pause.hidden=true;disable.hidden=!optedIn;enable.hidden=optedIn;
 }
 function paint(){
  const item=chooseNextCreative(approved,last,seen);
  if(!item)return;
  if(seen.length>=approved.length)seen=[];
  last=item.id;seen.push(item.id);
  image.hidden=true;image.alt=item.title;image.onload=()=>{image.hidden=false};
  image.onerror=()=>{image.hidden=true;status('An approved publisher image could not load.')};
  image.src=item.image;title.textContent=item.title;description.textContent=item.description;
  sponsor.textContent='Advertisement · '+item.advertiser;
  out.href=item.url;frame.hidden=false;next.hidden=approved.length<2;pause.hidden=approved.length<2;
  status('Approved content · access confirmed for this session');
 }
 async function serverRequest(path,options={}){
  const response=await fetch(path,{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(9000),...options});
  if(!response.ok)throw new Error('unavailable');
  return response.json();
 }
 async function loadVerifiedAds(version){
  const response=await serverRequest('/v1/restricted-ads/creatives?category=cannabis');
  if(version!==serial||!optedIn)return;
  const decision=response?.decision;
  if(decision?.allowed!==true||decision?.verified_over_21!==true||decision?.opted_in!==true){
   status('Verified age or local advertising eligibility has not been established. No ads displayed.');clear();return;
  }
  approved=(Array.isArray(response.creatives)?response.creatives:[])
   .map(row=>eligibleCreative(row,decision)).filter(Boolean).slice(0,16);
  if(!approved.length){status('Verified access confirmed, but no licensed and reviewed cannabis campaigns are available for your location.');clear();return;}
  paint();
 }
 enable.addEventListener('click',async()=>{
  const version=++serial;enable.disabled=true;status('Checking available consent and age-verification service…');
  try{
   const receipt=await serverRequest('/v1/restricted-ads/consent',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({category:'cannabis',opt_in:true})
   });
   if(version!==serial)return;
   if(receipt?.consent_recorded!==true)throw new Error('not recorded');
   optedIn=true;clear();status('Preference received. Checking independent age and jurisdiction approval…');
   await loadVerifiedAds(version);
  }catch{
   if(version===serial){optedIn=false;clear();status('21+ service is not configured or approval is unavailable. No restricted ads were loaded.');}
  }finally{enable.disabled=false}
 });
 disable.addEventListener('click',async()=>{
  ++serial;optedIn=false;clear();status('Restricted content hidden. Requesting consent withdrawal…');
  try{
   const receipt=await serverRequest('/v1/restricted-ads/consent',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({category:'cannabis',opt_in:false})
   });
   status(receipt?.consent_recorded===true?'21+ preference disabled.':'Content hidden locally; server opt-out confirmation unavailable.');
  }catch{status('Content hidden locally; server opt-out confirmation unavailable.')}
 });
 next.addEventListener('click',paint);
 pause.addEventListener('click',()=>{
  paused=!paused;pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(paused));
 });
 const reduce=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const timer=setInterval(()=>{
  if(!root.isConnected){clearInterval(timer);return;}
  if(!paused&&!reduce&&!document.hidden&&!frame.hidden&&approved.length>1&&root.getClientRects().length>0)paint();
 },20000);
}
