/* One data-backed organic dispensary directory Quick Card.
 * Not a product advertisement, age-verification system or medical recommendation.
 * No store data is requested before per-visit display acknowledgment.
 * No cookies, wallet, ID, user profiling or persistent consent storage. */
// The publisher model is imported only after the user elects 21+ browsing.
// This keeps the original directory script compatible with older browsers.
let directoryCardView=null,uniqueStoreCards=null;
async function sourceCardModel(){
 if(!directoryCardView){
  const module=await import('./cannabis-directory-cards.mjs');
  directoryCardView=module.directoryCardView;
  uniqueStoreCards=module.uniqueStoreCards;
 }
}
const root=document.getElementById('cannabisDirectoryCard');
if(root){
 const make=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
 const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
 const STATES='AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
 root.className='icd-card';root.dataset.personalization='disabled';
 const kicker=make('small','icd-kicker','INFINITY® · VERIFIED-SOURCE DIRECTORY');
 const title=make('h2','icd-title','Find independent dispensary sources');
 const intro=make('p','icd-intro','Source-backed locations, not product ads. State programs and license eligibility differ. No ratings or paid placements.');
 const gate=make('div','icd-gate');
 const enter=make('button','icd-control icd-enter','I am 21+ · View source directory');enter.type='button';
 gate.append(enter,make('p','icd-note','Per-visit display acknowledgment only — NOT identity or age verification. Medical-only states require their own patient authorization.'));
 const form=make('form','icd-form');form.hidden=true;
 const state=make('select','icd-field'),city=make('input','icd-field'),query=make('input','icd-field');
 state.setAttribute('aria-label','State');for(const s of STATES){const o=make('option','',s);o.value=s;state.append(o)}state.value='CO';
 city.placeholder='City (optional)';city.maxLength=90;city.setAttribute('aria-label','City');
 query.placeholder='Store name (optional)';query.maxLength=65;query.setAttribute('aria-label','Search name');
 const submit=make('button','icd-control','Search sources');submit.type='submit';
 form.append(state,city,query,submit);
 const status=make('p','icd-status','Choose a state to search.');status.setAttribute('role','status');
 const nationwide=make('p','icd-status','Nationwide individual cards load after this visit’s age acknowledgment.');nationwide.hidden=true;
 const listing=make('article','icd-listing');listing.hidden=true;
 const badge=make('p','icd-badge'),name=make('h3','icd-name'),address=make('p','icd-address'),
  source=make('p','icd-source'),quality=make('p','icd-quality','Unrated · no independent customer-experience evidence reviewed');
 const links=make('div','icd-links'),visit=make('a','icd-control','View official source'),maps=make('a','icd-control','Directions');
 visit.target=maps.target='_blank';visit.rel=maps.rel='noopener noreferrer';
 links.append(visit,maps);listing.append(badge,name,address,source,quality,links);
 const nav=make('div','icd-nav'),prev=make('button','icd-control','‹ Previous'),next=make('button','icd-control','Next ›'),count=make('span','icd-count');
 prev.type=next.type='button';nav.append(prev,count,next);nav.hidden=true;
 const hide=make('button','icd-quiet','Hide 21+ directory');hide.type='button';hide.hidden=true;
 root.append(kicker,title,intro,gate,form,status,listing,nav,hide,nationwide);
 let acknowledged=false,rows=[],index=0,page=0,hasMore=false,loading=false,version=0,filters=null;
 const cardHost=document.getElementById('cannabisDirectoryCards');
 let nationalSession=0;
 const cardChildren=()=>{
  if(!cardHost)return [];
  return [...document.querySelectorAll('[data-directory-store-id]')];
 };
 function buildIndividual(row){
  if(!cardHost||!acknowledged)return false;
  const model=directoryCardView(row,true);if(!model||document.getElementById(model.id)||
   document.getElementById('dispensary-'+model.sourceId))return false;
  const item=make('section','icd-store-card');item.id=model.id;
  item.dataset.directoryStoreId=model.sourceId;item.dataset.directoryStoreName=model.name;
  item.dataset.personalization='disabled';
  const meta=make('small','icd-kicker',model.sponsorLabel+' · '+model.state);
  const photo=make('div','icd-store-photo');
  if(model.imageUrl){
   const img=make('img','icd-store-image');img.alt='Approved source image for '+model.name;
   img.src=model.imageUrl;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
   img.addEventListener('error',()=>{img.remove();photo.textContent='Source image unavailable';},{once:true});
   photo.append(img);
  }else{
   photo.append(make('p','icd-photo-placeholder','Original store image pending documented rights'));
  }
  const h=make('h2','icd-store-name',model.name);
  const loc=make('p','icd-store-location',[model.store,model.city+', '+model.state].filter(Boolean).join(' · '));
  const address=make('p','icd-store-address',model.address);
  const quality=make('p','icd-quality',model.qualityLabel);
  const source=make('p','icd-source','Store source: '+model.sourceName+' · License: '+model.licenseStatus);
  const link=make('a','icd-control','View original store source');link.href=model.sourceUrl;
  link.target='_blank';link.rel='noopener noreferrer nofollow';link.referrerPolicy='no-referrer';
  item.append(meta,photo,h,loc,address,quality,source);
  if(model.testimonial){
   const quotation=make('blockquote','icd-store-testimonial',model.testimonial.text);
   const citation=make('a','icd-testimonial-link','Attributed customer statement · '+model.testimonial.publisher);
   citation.href=model.testimonial.sourceUrl;citation.target='_blank';citation.rel='noopener noreferrer nofollow';
   item.append(quotation,citation);
  }else item.append(make('p','icd-note','No consented, independently reviewed customer testimonial available.'));
  item.append(link,make('p','icd-note','Independent location directory; no asserted current stock, price, product benefits, paid sponsorship or purchase checkout.'));
  cardHost.append(item);return true;
 }
 async function expandNationwide(session){
  if(!cardHost||!acknowledged)return;
  nationwide.hidden=false;nationwide.textContent='Preparing individually browsable Cloudflare store cards…';
  try{
   const response=await fetch('/api/21-directory/coverage',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('coverage_unavailable');
   const data=await response.json();if(!acknowledged||session!==nationalSession)return;
   await sourceCardModel();if(!acknowledged||session!==nationalSession)return;
   const populated=(Array.isArray(data.states)?data.states:[]).filter(r=>Number(r.listed_records)>0&&STATES.includes(r.state));
   let accepted=0;
   // One state page at a time: mobile friendly, no huge 50-state DOM at startup.
   for(const stateRow of populated){
    if(!acknowledged||session!==nationalSession)return;
    let page=0,more=true;
    while(more&&page<3&&cardChildren().length<150){
     const p=new URLSearchParams({state:stateRow.state,page:String(page)});
     const found=await fetch('/api/21-directory/stores?'+p,{
       headers:{'X-Visitor-21-Acknowledged':'true'},credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});
     if(!found.ok)break;
     const result=await found.json();if(!acknowledged||session!==nationalSession)return;
     const known=cardChildren().map(c=>c.id);
     const fresh=uniqueStoreCards(result.items||[],known);
     for(const row of fresh)if(buildIndividual(row))accepted++;
     globalThis.window?.dispatchEvent?.(new CustomEvent('quantaphi:directory-cards-ready'));
     more=result.has_more===true;page++;
    }
    nationwide.textContent='Cloudflare sources: '+Number(data.total_listed||0)+
      ' entries in '+populated.length+' populated states · '+cardChildren().filter(x=>!x.hidden).length+
      ' newly loaded individual cards. Open Oracle’s card chooser to view them. Unimported states are not cards.';
   }
   if(!populated.length)nationwide.textContent='No source-backed dispensaries imported yet. State jobs do not count as cards.';
  }catch{
   if(acknowledged&&session===nationalSession)nationwide.textContent='National card expansion unavailable; no stores or testimonials were invented.';
  }
 }

 function render(){
  const row=rows[index];listing.hidden=!row;nav.hidden=!row;
  if(!row)return;
  name.textContent=row.name+(row.store&&row.store!==row.name?' · '+row.store:'');
  address.textContent=[row.address||'',row.city&&row.state?row.city+', '+row.state:''].filter(Boolean).join(' · ');
  badge.textContent=row.medical_only?'MEDICAL PROGRAM ONLY · NOT ADULT-USE':'ORGANIC SOURCE LISTING · LICENSE STATUS NOT GUARANTEED';
  source.textContent='Source: '+row.source_name+' · '+(row.license_status==='unverified'?'License not independently verified':row.license_status);
  quality.textContent='Unrated · no independent customer-experience evidence reviewed';
  const href=safeUrl(row.source_url);
  visit.hidden=!href;if(href)visit.href=href;else visit.removeAttribute('href');
  const streetAddress=typeof row.address==='string'?row.address.trim():'';
  maps.hidden=!streetAddress;
  if(streetAddress)maps.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(streetAddress+', '+row.city+', '+row.state);
  else maps.removeAttribute('href');
  count.textContent=(index+1)+' / '+rows.length+(hasMore?' · more available':'');
  prev.disabled=index===0;next.disabled=index===rows.length-1&&!hasMore;
 }
 // A page cursor belongs to the submitted query, never to edited form controls.
 function submittedFilters(){return {state:state.value,city:city.value.trim(),q:query.value.trim()}}
 async function search(append=false){
  if(!acknowledged||loading)return;
  const selected=append?filters:submittedFilters();
  if(!selected)return;
  loading=true;submit.disabled=true;const request=++version;
  const requestedPage=append?page+1:0;
  status.textContent='Loading verified-source directory records…';
  try{
   const params=new URLSearchParams({...selected,page:String(requestedPage)});
   const response=await fetch('/api/21-directory/stores?'+params,{
    method:'GET',headers:{'X-Visitor-21-Acknowledged':'true'},
    credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(10000)
   });
   if(!response.ok)throw Error('directory_unavailable');
   const data=await response.json();if(request!==version||!acknowledged)return;
   const found=Array.isArray(data.items)?data.items.filter(x=>x?.name&&safeUrl(x.source_url)&&x.sponsored===false):[];
   if(append){rows.push(...found);index=Math.max(0,rows.length-found.length)}
   else{rows=found;index=0;filters=selected}
   page=requestedPage; // Commit the next page only after a successful response.
   hasMore=data.has_more===true;
   status.textContent=rows.length?rows.length+' source records loaded for '+selected.state+'.'+(data.medical_only?' Medical program only.':''):'No source-backed listings imported for this search yet. Queued states are not populated.';
   render();
  }catch{if(request===version){status.textContent='Directory unavailable. No stores, ratings or advertisements were invented.';if(!append){rows=[];hasMore=false;render()}}}
  finally{if(request===version){loading=false;submit.disabled=false}}
 }
 function close(){
  nationalSession++;for(const c of cardChildren())c.hidden=true;
  globalThis.window?.dispatchEvent?.(new CustomEvent('quantaphi:directory-cards-ready'));
  nationwide.hidden=true;
  acknowledged=false;version++;loading=false;submit.disabled=false;filters=null;
  rows=[];index=0;page=0;hasMore=false;
  gate.hidden=false;form.hidden=true;hide.hidden=true;status.textContent='Directory hidden for this visit.';render();
 }
 enter.addEventListener('click',()=>{acknowledged=true;gate.hidden=true;form.hidden=false;hide.hidden=false;
  nationalSession++;for(const c of cardChildren())c.hidden=false;
  void search();void expandNationwide(nationalSession);
 });
 form.addEventListener('submit',e=>{e.preventDefault();version++;loading=false;submit.disabled=false;page=0;void search()});
 prev.addEventListener('click',()=>{if(index>0){index--;render()}});
 next.addEventListener('click',()=>{if(index<rows.length-1){index++;render()}else if(hasMore&&!loading){void search(true)}});
 hide.addEventListener('click',close);
 // Deliberate Previous/Next navigation only; never auto-advance while someone reads.
}
