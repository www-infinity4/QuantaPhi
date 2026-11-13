import {SOURCES,parseWatchFeed} from './family-safety-core.mjs';
const root=document.getElementById('familySafetyQuickCard');
if(root&&!root.dataset.familySafetyMounted){
 root.dataset.familySafetyMounted='true';
 root.classList.add('fsw-card');
 const el=(tag,className,value)=>{const n=document.createElement(tag);if(className)n.className=className;if(value!==undefined)n.textContent=value;return n;};
 const link=(label,href)=>{const n=el('a','fsw-link',label);n.href=href;n.target='_blank';n.rel='noopener noreferrer';return n;};
 const fmt=value=>value?new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Chicago'}).format(new Date(value))+' CT':'Not available';
 const head=el('div','fsw-head'),picture=el('img','fsw-art');
 picture.src='/assets/family-safety-watch.svg';picture.alt='Original Family Safety Watch shield and globe illustration';picture.loading='lazy';
 const titles=el('div','fsw-headings');
 titles.append(el('p','fsw-kicker','BUBBLES · FAMILY SAFETY'),el('h2','','Aviation & travel safety watch'));
 head.append(picture,titles);root.append(head);
 root.append(el('p','fsw-lead','Official public safety notices for Qatar and Israel, plus civilian travel disruption guidance. No live military aircraft tracking, combat monitoring or attack prediction.'));
 const summary=el('p','fsw-summary','Loading the public check receipt…');
 summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');
 root.append(summary);
 const controls=el('div','fsw-controls');
 const refresh=el('button','fsw-button','Refresh source checks');
 const changes=el('button','fsw-button','Show changed pages only');
 const auto=el('button','fsw-button','Auto-check: off');
 for(const b of [refresh,changes,auto])b.type='button';
 refresh.setAttribute('aria-label','Read latest published public source check receipt');
 changes.setAttribute('aria-pressed','false');auto.setAttribute('aria-pressed','false');
 controls.append(refresh,changes,auto);root.append(controls);
 root.append(el('p','fsw-note','Auto-check polls the published receipt every 10 minutes while this card is visible. It does not subscribe you to push alerts, track your location or contact your family.'));
 const list=el('div','fsw-sources'),cards=new Map();
 for(const source of SOURCES){
  const item=el('article','fsw-source'),line=el('div','fsw-source-top');
  line.append(el('h3','',source.title),el('span','fsw-region',source.region));
  const state=el('p','fsw-source-state','Awaiting first verified public check');
  const detail=el('p','fsw-time','Last verified check: none');
  item.append(line,state,detail,link('Read official notice',source.url));
  list.append(item);cards.set(source.id,{item,state,detail});
 }
 root.append(list);
 const other=el('section','fsw-guidance');
 other.append(el('h3','','Other official aviation and consular sources'));
 const refs=el('div','fsw-references');
 refs.append(link('U.S. Embassy Doha','https://qa.usembassy.gov/'),link('Qatar Civil Aviation Authority','https://www.caa.gov.qa/en'));
 other.append(refs,el('p','fsw-note','Check your airline directly for reservations, cancellations and rebooking. Source-page changes are research signals, not emergency warnings.'));
 root.append(other);
 const plan=el('section','fsw-guidance');
 plan.append(el('h3','','Simple family check-in plan'));
 const steps=el('ol','fsw-steps');
 for(const text of ['Agree on a check-in time and a second trusted contact.','Keep essential documents, medication and phone charging available.','Use official local instructions and airline notices if travel is affected.'])steps.append(el('li','',text));
 plan.append(steps);root.append(plan);
 const footer=el('p','fsw-footer','This card is a public-information aid, not an emergency warning service. If someone faces immediate danger, follow local emergency authorities. Source dates and successful checks are shown separately.');
 root.append(footer);
 let changeOnly=false,autoTimer=null,loading=false,latest=null;
 function paint(feed){
  latest=feed;const changed=feed.sources.filter(s=>s.status==='changed').length;
  summary.textContent=feed.lastRunUtc
   ?'Public-source scan attempted '+fmt(feed.lastRunUtc)+'. '+changed+' page change signal(s); changes do not establish any specific threat.'
   :'No verified scheduled scan yet. Open the official notices below for current guidance.';
  let visible=0;
  for(const source of feed.sources){
   const row=cards.get(source.id);if(!row)continue;
   row.item.hidden=changeOnly&&source.status!=='changed';
   if(!row.item.hidden)visible++;
   const labels={changed:'Page content changed · check official notice',checked:'Public page checked · no new change seen',
    stale:'Check is old · open official notice',unavailable:'Public source unavailable · no verified new update',pending:'First source check pending'};
   row.state.textContent=labels[source.status]||labels.unavailable;
   row.detail.textContent='Last verified check: '+fmt(source.lastSuccessUtc)+(source.lastChangeUtc?' · Last observed change: '+fmt(source.lastChangeUtc):'');
  }
  if(changeOnly&&!visible)summary.textContent+=' No recently changed pages recorded; that is not proof of safety.';
 }
 async function readback(){
  if(loading)return;
  loading=true;refresh.disabled=true;summary.textContent='Reading the latest published public-source receipt…';
  try{
   const response=await fetch('/data/family-safety-watch.json',{cache:'no-store',credentials:'omit'});
   if(!response.ok)throw Error('source_receipt_unavailable');
   paint(parseWatchFeed(await response.json()));
  }catch{
   summary.textContent='Public check receipt unavailable or invalid. No fresh notice is claimed; use the direct official links.';
   if(latest)paint({...latest,lastRunUtc:null,sources:latest.sources.map(s=>({...s,status:'stale'}))});
  }finally{loading=false;refresh.disabled=false;}
 }
 refresh.addEventListener('click',readback);
 changes.addEventListener('click',()=>{
  changeOnly=!changeOnly;changes.setAttribute('aria-pressed',String(changeOnly));
  changes.textContent=changeOnly?'Show all official sources':'Show changed pages only';
  if(latest)paint(latest);
 });
 auto.addEventListener('click',()=>{
  if(autoTimer){clearInterval(autoTimer);autoTimer=null;}
  else autoTimer=setInterval(()=>{if(document.visibilityState==='visible')void readback();},10*60*1000);
  auto.textContent='Auto-check: '+(autoTimer?'on':'off');
  auto.setAttribute('aria-pressed',String(Boolean(autoTimer)));
 });
 window.addEventListener('pagehide',()=>{if(autoTimer)clearInterval(autoTimer);autoTimer=null;},{once:true});
 void readback();
}
