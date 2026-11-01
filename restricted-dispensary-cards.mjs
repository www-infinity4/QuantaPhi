/* 12 independent Denver dispensary directory Quick Cards.
 * Visible business identity appears only after 21+ acknowledgment for this
 * browser page visit. The checkbox is NOT an identity proof and these are
 * NOT paid offers or regulated product advertisements.
 * No wallet, cookies, location, personal tracking or ad network used. */
import {DISPENSARY_SOURCES,eligibleDispensary} from './restricted-dispensary-directory.mjs';
const make=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
let acknowledged=false;
const roots=DISPENSARY_SOURCES.map(row=>({row,root:document.getElementById('dispensary-'+row.id)})).filter(x=>x.root);
function paintAll(){
 for(const {row,root} of roots){
  root.replaceChildren();root.className='dc-card';root.dataset.personalization='disabled';
  const kicker=make('small','dc-kicker','INFINITY® · DENVER 21+ DIRECTORY');
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
  headings.append(make('p','dc-tag','DENVER, COLORADO · INDEPENDENT LISTING'),make('h2','dc-name',row.name),make('div','dc-location',row.store));
  hero.append(mark,headings);
  const details=make('div','dc-details');
  details.append(make('p','dc-address',row.address),make('p','dc-description','View this store’s original website for current store information.'));
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
  root.append(hero,details,actions,source,close);
 }
}
if(roots.length)paintAll();
