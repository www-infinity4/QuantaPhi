/* Independent Colorado dispensary directory Quick Cards.
 * Visible business identity appears only after 21+ acknowledgment for this
 * browser page visit. The checkbox is NOT an identity proof and these are
 * NOT paid offers or regulated product advertisements.
 * No wallet, cookies, location, personal tracking or ad network used. */
import {DISPENSARY_SOURCES,eligibleDispensary,approvedDirectoryMedia} from './restricted-dispensary-directory.mjs';
const make=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
let acknowledged=false;
const runningGalleries=new Set();
const stopGalleries=()=>{for(const stop of runningGalleries)stop();runningGalleries.clear()};
const roots=DISPENSARY_SOURCES.map(row=>({row,root:document.getElementById('dispensary-'+row.id)})).filter(x=>x.root);
function paintAll(){
 stopGalleries();
 for(const {row,root} of roots){
  root.replaceChildren();root.className='dc-card';root.dataset.personalization='disabled';
  const kicker=make('small','dc-kicker','INFINITY® · COLORADO 21+ DIRECTORY');
  root.append(kicker);
  const allowed=eligibleDispensary(row,acknowledged);
  if(!allowed){
   root.append(make('h2','dc-headline','Colorado dispensary directory'),
    make('p','dc-disclaimer','Independent, source-backed adult-use store information. Select the 21+ option to view individual dispensaries.'));
   const enter=make('button','dc-control dc-enter','I am 21+ · View dispensaries');enter.type='button';
   enter.addEventListener('click',()=>{acknowledged=true;paintAll()});
   root.append(enter,make('p','dc-fine','This age acknowledgment applies only to this visit. Original websites may ask for proof of age. No regulated products or paid ads appear before confirmation.'));
   continue;
  }
  const hero=make('div','dc-hero');
  const mark=make('div','dc-mark');
  const icon=make('img','dc-favicon');icon.alt='';icon.loading='lazy';icon.decoding='async';icon.referrerPolicy='no-referrer';
  const host=new URL(row.source_url);
  icon.src=host.origin+'/favicon.ico';icon.onerror=()=>{icon.hidden=true;mark.classList.add('dc-mark-fallback')};
  mark.append(icon);
  const headings=make('div','dc-hero-text');
  headings.append(make('p','dc-tag',row.city.toUpperCase()+', COLORADO · INDEPENDENT LISTING'),make('h2','dc-name',row.name),make('div','dc-location',row.store));
  if(row.former_brand)headings.append(make('p','dc-former-brand','Formerly '+row.former_brand));
  hero.append(mark,headings);

  // Six-frame support is reusable across all store cards. Unknown, unlicensed,
  // stale, product-ad and offsite images are filtered before any image request.
  const approvedPhotos=approvedDirectoryMedia(row,acknowledged);
  let gallery=null;
  if(approvedPhotos.length){
   gallery=make('div','dc-gallery');
   const photo=make('img','dc-gallery-image');
   photo.loading='lazy';photo.decoding='async';photo.referrerPolicy='no-referrer';
   const counter=make('span','dc-gallery-count');
   const attribution=make('p','dc-gallery-credit');
   const controls=make('div','dc-gallery-controls');
   const prev=make('button','dc-control','‹ Previous'),next=make('button','dc-control','Next ›');
   const play=make('button','dc-control','Play gallery');
   prev.type=next.type=play.type='button';
   const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
   let current=0,timer=null;
   function stop(){
    if(timer!==null)clearInterval(timer);
    timer=null;play.textContent='Play gallery';play.setAttribute('aria-pressed','false');
    runningGalleries.delete(stop);
   }
   function show(){
    const item=approvedPhotos[current];
    photo.src=item.url;photo.alt=item.alt;
    counter.textContent=(current+1)+' of '+approvedPhotos.length;
    attribution.textContent='Source: '+item.publisher+' · Reviewed image, not a live product offer';
   }
   function step(delta){current=(current+delta+approvedPhotos.length)%approvedPhotos.length;show()}
   prev.addEventListener('click',()=>step(-1));
   next.addEventListener('click',()=>step(1));
   play.addEventListener('click',()=>{
    if(timer!==null){stop();return}
    if(reducedMotion||approvedPhotos.length<2)return;
    timer=setInterval(()=>{
     if(document.visibilityState==='hidden'||!root.isConnected||root.hidden){stop();return}
     step(1);
    },5200);
    runningGalleries.add(stop);
    play.textContent='Pause gallery';play.setAttribute('aria-pressed','true');
   });
   if(reducedMotion||approvedPhotos.length<2)play.hidden=true;
   photo.addEventListener('error',()=>{
    stop();gallery.replaceChildren(make('p','dc-disclaimer','Source image unavailable. Use the official store link for verified material.'));
   },{once:true});
   controls.append(prev,counter,next,play);
   gallery.append(photo,attribution,controls);
   show();
  }
  const details=make('div','dc-details');
  details.append(make('p','dc-address',row.address),make('p','dc-description','View this store’s original website for current store information.'));
  if(row.phone){
   const phone=make('a','dc-phone',row.phone);
   phone.href='tel:'+String(row.phone).replace(/[^\d+]/g,'');
   phone.setAttribute('aria-label','Call '+row.name+' '+row.store);
   details.append(phone);
  }
  const actions=make('div','dc-actions');
  const site=make('a','dc-control dc-primary','Open official store');
  site.href=row.source_url;site.target='_blank';site.rel='noopener noreferrer';
  const maps=make('a','dc-control','Directions');
  maps.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(row.address);
  maps.target='_blank';maps.rel='noopener noreferrer';
  actions.append(site,maps);
  const source=make('p','dc-source','Official location source: '+host.hostname+' · Independent QuantaPhi directory entry, not a paid endorsement.');
  const close=make('button','dc-quiet','Hide all 21+ listings');close.type='button';
  close.addEventListener('click',()=>{acknowledged=false;paintAll()});
  root.append(hero);
  if(gallery)root.append(gallery);
  root.append(details,actions,source,close);
 }
}
if(roots.length)paintAll();
