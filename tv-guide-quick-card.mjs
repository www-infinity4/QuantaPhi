/* Infinity TV Guide: attributed US episode airings, not a local cable EPG.
 * TVmaze public metadata: CC BY-SA 4.0, source and license shown in the UI.
 * No fabricated times, programs, provider playback or channel availability.
 */
const BASE='https://api.tvmaze.com/schedule?country=US&date=';
const DAY_COUNT=7;
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|apos|lt|gt);/g,' ').replace(/\s+/g,' ').trim();
const url=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}};
const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export function normalizeTvSchedule(payload){
 if(!Array.isArray(payload))return [];
 return payload.map(row=>{
  const show=row?.show||{};
  const stamp=Date.parse(row?.airstamp||'');
  const network=show.network?.name||show.webChannel?.name||'';
  if(!Number.isFinite(stamp)||!network||!show.name)return null;
  const artwork=url(row.image?.original||row.image?.medium||show.image?.original||show.image?.medium);
  const source=url(row.url)||url(show.url);
  if(!source)return null;
  return {id:String(row.id||show.id||'').slice(0,60),title:plain(show.name).slice(0,140),
   episode:plain(row.name).slice(0,160),description:plain(row.summary||show.summary).slice(0,530),
   season:Number.isInteger(row.season)?row.season:null,number:Number.isInteger(row.number)?row.number:null,
   network:plain(network).slice(0,90),stamp,source,artwork,
   runtime:Number.isFinite(row.runtime)&&row.runtime>0?Math.min(row.runtime,240):null};
 }).filter(Boolean).sort((a,b)=>a.stamp-b.stamp||a.title.localeCompare(b.title)).slice(0,350);
}
export function filterTvSchedule(rows,{network='all',slot='all'}={}){
 return rows.filter(row=>{
  const hour=new Date(row.stamp).getHours();
  const inSlot=slot==='all'||(slot==='morning'&&hour>=6&&hour<12)||
   (slot==='afternoon'&&hour>=12&&hour<17)||(slot==='prime'&&hour>=17&&hour<22)||
   (slot==='late'&&(hour>=22||hour<6));
  return inSlot&&(network==='all'||row.network===network);
 });
}
const timeOf=stamp=>new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(stamp));
export function mountInfinityTvGuide(root,{fetcher=fetch,now=()=>new Date()}={}){
 if(!root||root.dataset.tvGuideMounted)return;
 root.dataset.tvGuideMounted='true';
 const panel=el('section','itg-guide qcx-tool');
 const header=el('div','itg-head');
 header.append(el('p','itg-kicker','INFINITY TV · EPISODE GUIDE'),el('h3','','Find what’s on'));
 const caption=el('p','itg-description','Current U.S. network episode airings, episode photos and descriptions when supplied by the source. Not a full local cable grid or live stream.');
 header.append(caption);panel.append(header);
 const filters=el('div','itg-filters');
 function chooser(label,name){
  const wrap=el('label','itg-filter',label),select=el('select','itg-select');
  select.setAttribute('aria-label',label);select.name=name;wrap.append(select);filters.append(wrap);return select;
 }
 const day=chooser('Day','day'),slot=chooser('Time slot','time'),network=chooser('Network','network');
 const start=now();
 for(let i=0;i<DAY_COUNT;i++){
  const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
  const op=el('option','',i===0?'Today · '+d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}):d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}));
  op.value=dateKey(d);day.append(op);
 }
 for(const [value,label] of [['all','All times'],['morning','Morning · 6 AM–noon'],['afternoon','Afternoon · noon–5 PM'],['prime','Evening · 5–10 PM'],['late','Late night · 10 PM–6 AM']]){
  const op=el('option','',label);op.value=value;slot.append(op);
 }
 const all=el('option','','All networks');all.value='all';network.append(all);
 panel.append(filters);
 const status=el('p','itg-status','Loading the current program guide…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(status);
 const frame=el('div','itg-frame'),carousel=el('div','itg-carousel');
 carousel.setAttribute('role','region');carousel.setAttribute('aria-label','Television episode carousel');carousel.tabIndex=0;
 const navigation=el('nav','itg-navigation');
 const prev=el('button','itg-nav','‹ Previous'),counter=el('span','itg-counter','0 / 0'),next=el('button','itg-nav','Next ›');
 prev.type=next.type='button';prev.setAttribute('aria-label','Previous program');next.setAttribute('aria-label','Next program');
 navigation.append(prev,counter,next);frame.append(carousel,navigation);panel.append(frame);
 const bottom=el('p','itg-credit');
 const tvguide=el('a','','Open full local TV Guide listings');tvguide.href='https://www.tvguide.com/listings/';tvguide.target='_blank';tvguide.rel='noopener noreferrer';
 const tvmaze=el('a','','TVmaze');tvmaze.href='https://www.tvmaze.com/';tvmaze.target='_blank';tvmaze.rel='noopener noreferrer';
 const license=el('a','','CC BY-SA 4.0');license.href='https://creativecommons.org/licenses/by-sa/4.0/';license.target='_blank';license.rel='noopener noreferrer';
 bottom.append('Episode information: ',tvmaze,' (',license,'). Local antenna/cable channels vary by ZIP code and provider. ',tvguide,'.');panel.append(bottom);
 root.append(panel);
 let rows=[],selected=0,request=0,loaded=false;
 const cache=new Map();
 function networkOptions(){
  const chosen=network.value;network.replaceChildren();
  const all=el('option','','All networks');all.value='all';network.append(all);
  for(const name of [...new Set(rows.map(x=>x.network))].sort((a,b)=>a.localeCompare(b))){
   const op=el('option','',name);op.value=name;network.append(op);
  }
  network.value=[...network.options].some(x=>x.value===chosen)?chosen:'all';
 }
 function updateNavigation(filtered){
  counter.textContent=filtered.length?String(selected+1)+' / '+filtered.length:'0 / 0';
  prev.disabled=!filtered.length||selected===0;next.disabled=!filtered.length||selected===filtered.length-1;
 }
 function cardFor(item){
  const card=el('article','itg-program');
  const visual=el('div','itg-program-art');
  if(item.artwork){
   const img=el('img','','');img.src=item.artwork;img.alt='Artwork for '+item.title;
   img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
   img.addEventListener('error',()=>{img.remove();visual.classList.add('itg-no-art');visual.append(el('span','','Episode artwork unavailable'));},{once:true});
   visual.append(img);
  }else{visual.classList.add('itg-no-art');visual.append(el('span','','Episode artwork not supplied'));}
  const body=el('div','itg-program-body');
  body.append(el('p','itg-when',timeOf(item.stamp)+' · '+item.network),
   el('h4','',item.title));
  const episode=[item.season!=null?'S'+item.season:'',item.number!=null?'E'+item.number:'',item.episode].filter(Boolean).join(' · ');
  if(episode)body.append(el('p','itg-episode',episode));
  body.append(el('p','itg-summary',item.description||'No episode synopsis has been provided.'));
  const footer=el('div','itg-program-footer');
  if(item.runtime)footer.append(el('span','itg-runtime',item.runtime+' min'));
  const source=el('a','itg-open','Episode details');source.href=item.source;source.target='_blank';source.rel='noopener noreferrer';
  footer.append(source);body.append(footer);card.append(visual,body);return card;
 }
 let shown=[];
 function upgradeHero(){
  const art=root.closest('.iqc-card')?.querySelector('.qcx-art[data-brand="tv-guide"]');
  if(!art)return;
  art.querySelector('.qcx-tv-poster')?.remove();
  const item=rows.filter(x=>x.artwork).sort((a,b)=>Math.abs(a.stamp-Date.now())-Math.abs(b.stamp-Date.now()))[0];
  if(item){const pic=el('img','qcx-tv-poster');pic.src=item.artwork;pic.alt='Featured episode artwork: '+item.title;pic.loading='lazy';pic.referrerPolicy='no-referrer';pic.addEventListener('error',()=>pic.remove(),{once:true});art.prepend(pic);}
 }
 function render(){
  shown=filterTvSchedule(rows,{network:network.value,slot:slot.value});selected=0;
  carousel.replaceChildren();
  if(!shown.length){
   status.textContent=rows.length?'No known episode airings match these filters. Change time or network.':'No scheduled episodes were supplied for this day. Try another day.';
   updateNavigation(shown);return;
  }
  const fragment=document.createDocumentFragment();
  for(const entry of shown)fragment.append(cardFor(entry));
  carousel.append(fragment);updateNavigation(shown);
  status.textContent=shown.length+' sourced episode airing'+(shown.length===1?'':'s')+' · '+new Date().toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})+' checked · times in your device’s time zone';
  carousel.scrollLeft=0;
 }
 function go(diff){
  if(!shown.length)return;selected=Math.min(shown.length-1,Math.max(0,selected+diff));
  carousel.children[selected]?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'start'});
  updateNavigation(shown);
 }
 prev.addEventListener('click',()=>go(-1));next.addEventListener('click',()=>go(1));
 carousel.addEventListener('scroll',()=>{
  if(!shown.length)return;
  const step=carousel.children[0]?.getBoundingClientRect().width||1;
  const index=Math.round(carousel.scrollLeft/step);
  if(index!==selected&&index>=0&&index<shown.length){selected=index;updateNavigation(shown);}
 },{passive:true});
 async function load(){
  const key=day.value,seq=++request;status.textContent='Checking U.S. episode airings for '+key+'…';
  if(cache.has(key)){rows=cache.get(key);networkOptions();render();upgradeHero();return;}
  try{
   const response=await fetcher(BASE+encodeURIComponent(key),{credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('schedule_unavailable');
   const data=await response.json();if(seq!==request)return;
   rows=normalizeTvSchedule(data);cache.set(key,rows);networkOptions();render();upgradeHero();
  }catch{
   if(seq!==request)return;
   rows=[];carousel.replaceChildren();status.textContent='Current TV schedule could not be loaded. Open the original listings or choose another day.';
   updateNavigation([]);
  }
 }
 day.addEventListener('change',()=>void load());
 slot.addEventListener('change',render);network.addEventListener('change',render);
 const refresh=el('button','itg-refresh','Refresh listings');refresh.type='button';
 refresh.addEventListener('click',()=>{cache.delete(day.value);void load()});panel.insertBefore(refresh,frame);
 function activate(){if(loaded)return;loaded=true;void load();}
 if(typeof IntersectionObserver==='function'){
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();activate();}},{rootMargin:'160px'});
  observer.observe(root);
 }else activate();
 root.addEventListener('tv-guide:activate',activate);
 return {load,render};
}
