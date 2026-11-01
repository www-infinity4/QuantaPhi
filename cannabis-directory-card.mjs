/* One data-backed organic dispensary directory Quick Card.
 * Not a product advertisement, age-verification system or medical recommendation.
 * No store data is requested before per-visit display acknowledgment.
 * No cookies, wallet, ID, user profiling or persistent consent storage. */
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
 const listing=make('article','icd-listing');listing.hidden=true;
 const badge=make('p','icd-badge'),name=make('h3','icd-name'),address=make('p','icd-address'),
  source=make('p','icd-source'),quality=make('p','icd-quality','Unrated · no independent customer-experience evidence reviewed');
 const links=make('div','icd-links'),visit=make('a','icd-control','View official source'),maps=make('a','icd-control','Directions');
 visit.target=maps.target='_blank';visit.rel=maps.rel='noopener noreferrer';
 links.append(visit,maps);listing.append(badge,name,address,source,quality,links);
 const nav=make('div','icd-nav'),prev=make('button','icd-control','‹ Previous'),next=make('button','icd-control','Next ›'),count=make('span','icd-count');
 prev.type=next.type='button';nav.append(prev,count,next);nav.hidden=true;
 const hide=make('button','icd-quiet','Hide 21+ directory');hide.type='button';hide.hidden=true;
 root.append(kicker,title,intro,gate,form,status,listing,nav,hide);
 let acknowledged=false,rows=[],index=0,page=0,hasMore=false,loading=false,version=0,filters=null;
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
  maps.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(row.address||row.city+', '+row.state);
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
  acknowledged=false;version++;loading=false;submit.disabled=false;filters=null;
  rows=[];index=0;page=0;hasMore=false;
  gate.hidden=false;form.hidden=true;hide.hidden=true;status.textContent='Directory hidden for this visit.';render();
 }
 enter.addEventListener('click',()=>{acknowledged=true;gate.hidden=true;form.hidden=false;hide.hidden=false;void search()});
 form.addEventListener('submit',e=>{e.preventDefault();version++;loading=false;submit.disabled=false;page=0;void search()});
 prev.addEventListener('click',()=>{if(index>0){index--;render()}});
 next.addEventListener('click',()=>{if(index<rows.length-1){index++;render()}else if(hasMore&&!loading){void search(true)}});
 hide.addEventListener('click',close);
 // Deliberate Previous/Next navigation only; never auto-advance while someone reads.
}
