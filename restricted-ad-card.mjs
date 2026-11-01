/* Infinity 21+ preference card. No ads are fetched until a deliberate opt-in.
 * The same-origin server is solely responsible for verifying 21+, lawful region,
 * license and creative review; this UI cannot grant access through a button.
 * No wallet, Quants, inferred interests or browsing telemetry are read. */
import {eligibleCreative,chooseNextCreative} from './restricted-ad-policy.mjs';
import {PUBLIC_21_SOURCES,eligiblePublisher,selectPublisher} from './restricted-source-directory.mjs?v=20261101-banner1';
const root=document.getElementById('infinityAdultContentCard');
if(root){
 const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
 root.classList.add('rac-card');root.dataset.personalization='disabled';
 const head=el('div','rac-head'),kicker=el('small','rac-kicker','INFINITY® · CONTENT PREFERENCES'),
   heading=el('h2','rac-heading','21+ content settings'),
   intro=el('p','rac-intro','Browse original 21+ websites after acknowledging your age. Sponsored product ads are separate and require approved verification and campaigns.'),
   message=el('p','rac-status','Sponsored cannabis advertisements are not active.');
 message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 head.append(kicker,heading);root.append(head,intro);
 // Separate visitor-initiated source navigation from licensed/verified advertising.
 // A simple 21+ acknowledgment never unlocks sponsored creative.
 const browse=el('button','rac-button rac-enter','I am 21+ · Browse original websites');
 const closeBrowse=el('button','rac-button rac-leave','Close 21+ websites');
 browse.type=closeBrowse.type='button';closeBrowse.hidden=true;
 const browseHint=el('p','rac-note','This acknowledges your age for browsing in this visit only; it is not identity verification or permission for targeted advertisements.');
 const publisher=el('section','rac-publisher');publisher.hidden=true;publisher.setAttribute('aria-label','21 plus independent source spotlights');
 const publisherHead=el('p','rac-publisher-type','INDEPENDENT SOURCE · NOT A PAID AD');
 const publisherArt=el('div','rac-publisher-art');
 const publisherName=el('strong','rac-publisher-name'),publisherSmall=el('small','rac-publisher-small');
 publisherArt.append(publisherName,publisherSmall);
 const publisherDesc=el('p','rac-publisher-desc');
 const publisherLink=el('a','rac-publisher-open','Open original website');
 publisherLink.target='_blank';publisherLink.rel='noopener noreferrer';
 const publisherControls=el('div','rac-actions');
 const publisherNext=el('button','rac-button','Next website ›');
 const publisherPause=el('button','rac-button','Pause');
 publisherNext.type=publisherPause.type='button';publisherControls.append(publisherPause,publisherNext);
 const publisherNote=el('p','rac-note','You are opening the publisher’s real website. Any sign-in, location or additional age check happens there. QuantaPhi does not reproduce a retailer’s live deals or claim sponsorship.');
 publisher.append(publisherHead,publisherArt,publisherDesc,publisherLink,publisherControls,publisherNote);
 root.append(browse,closeBrowse,browseHint,publisher,message);
 let acknowledged=false,publisherLast='',publisherSeen=[],publisherPaused=false;
 function paintPublisher(){
  const sources=PUBLIC_21_SOURCES.map(x=>eligiblePublisher(x,acknowledged)).filter(Boolean);
  const item=selectPublisher(sources,publisherLast,publisherSeen);if(!item)return;
  if(publisherSeen.length>=sources.length)publisherSeen=[];
  publisherLast=item.id;publisherSeen.push(item.id);
  publisherName.textContent=item.title;publisherSmall.textContent=item.subtitle;
  publisherDesc.textContent=item.summary;publisherLink.href=item.url;
  publisher.hidden=false;publisherNext.disabled=sources.length<2;publisherPause.hidden=sources.length<2;
 }
 browse.addEventListener('click',()=>{
  acknowledged=true;publisherLast='';publisherSeen=[];browse.hidden=true;closeBrowse.hidden=false;
  paintPublisher();
 });
 closeBrowse.addEventListener('click',()=>{
  acknowledged=false;publisherLast='';publisherSeen=[];publisher.hidden=true;
  publisherLink.removeAttribute('href');publisherName.textContent='';publisherDesc.textContent='';
  browse.hidden=false;closeBrowse.hidden=true;
 });
 publisherNext.addEventListener('click',paintPublisher);
 publisherPause.addEventListener('click',()=>{
  publisherPaused=!publisherPaused;publisherPause.textContent=publisherPaused?'Resume':'Pause';
  publisherPause.setAttribute('aria-pressed',String(publisherPaused));
 });
 const frame=el('div','rac-frame'),image=el('img','rac-image'),
   title=el('h3','rac-title'),description=el('p','rac-description'),
   sponsor=el('p','rac-sponsor'),out=el('a','rac-out','View approved publisher');
 image.hidden=true;image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';
 out.target='_blank';out.rel='noopener noreferrer';frame.hidden=true;
 frame.append(image,title,description,sponsor,out);
 const controls=el('div','rac-actions'),
   enable=el('button','rac-button','Verify for licensed advertisements'),
   disable=el('button','rac-button','Turn off'),
   next=el('button','rac-button','Next verified ad'),
   pause=el('button','rac-button','Pause');
 for(const b of [enable,disable,next,pause])b.type='button';
 disable.hidden=true;next.hidden=true;pause.hidden=true;
 controls.append(enable,disable,next,pause);
 const note=el('p','rac-note','The publisher links above are independent website references, not paid ads. Real sponsored cannabis products and advertiser images stay locked until the separate 21+ identity, rights and jurisdiction checks pass.');
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
  if(acknowledged&&!publisherPaused&&!reduce&&!document.hidden&&!publisher.hidden&&
   root.getClientRects().length>0&&!publisher.contains(document.activeElement))paintPublisher();
 },20000);
}
