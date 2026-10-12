/* Radio Clubhouse · Oracle Octaves · live, source-attributed cards.
 * Only the top few threads are shown. Refresh does not duplicate existing cards.
 * Threads always link to the original Antique Radio Forums page. */
(() => {
 'use strict';
 const mount=document.getElementById('radioClubhouse');
 if(!mount)return;
 const ENDPOINT='https://radio-clubhouse-feed.marvaseater.workers.dev/api/radio-clubhouse';
 const SNAPSHOT='quantaphi:radio-clubhouse:latest:v1';
 const SEEN='quantaphi:radio-clubhouse:seen:v1';
 const COLLECTED='quantaPhiCollected';
 const STARS='quantaphi:radio-clubhouse:stars:v1';
 const INTERVAL=300000;
 const make=(tag,cls,label)=>{
  const n=document.createElement(tag);if(cls)n.className=cls;
  if(label!==undefined)n.textContent=String(label);return n;
 };
 const add=(parent,child)=>{parent.append(child);return child;};
 const stored=(key,otherwise)=>{
  try{const item=JSON.parse(localStorage.getItem(key)||'null');return item??otherwise}catch{return otherwise}
 };
 const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
 const url=(value)=>{
  try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='antiqueradios.com'&&
   u.pathname.endsWith('/viewtopic.php')&&/^\d{1,12}$/.test(u.searchParams.get('t')||'')?u.href:''}catch{return''}
 };
 const formatDate=value=>{
  const time=Date.parse(value||'');
  return Number.isFinite(time)?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(time):'';
 };
 const cardData=t=>({key:'radio-clubhouse:'+t.id,type:'Radio Clubhouse',title:t.title,
  story:t.snippet||'Antique Radio Forums — Radio Clubhouse discussion.',sourceUrl:t.url,media:''});
 const creditNotice=(action,receipt)=>{
  if(receipt?.awarded)return action+' confirmed by StarQuest.';
  if(receipt?.pending)return action+' submitted; StarQuest confirmation is pending.';
  return action+' saved; no StarCoin reward confirmed.';
 };
 const shell=add(mount,make('section','rc-shell'));
 const head=add(shell,make('header','rc-header'));
 const titleGroup=add(head,make('div','rc-heading'));
 add(titleGroup,make('span','rc-eyebrow','ORACLE OCTAVES  ·  INFINITY 2026®  ·  COMMUNITY RADIO'));
 add(titleGroup,make('h2','rc-title','📻 Radio Clubhouse'));
 add(titleGroup,make('p','rc-subtitle','Radio Clubhouse discussion cards: latest verified forum topics first, with real archived threads if live access is unavailable.'));
 const refresh=add(head,make('button','rc-refresh','Refresh discussions'));
 refresh.type='button';
 const status=add(shell,make('p','rc-status','Connecting to Radio Clubhouse…'));
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const collection=add(shell,make('div','rc-feed'));
 const footer=add(shell,make('footer','rc-footer'));
 add(footer,make('span','','Discussions belong to their original authors at Antique Radio Forums.'));
 const source=add(footer,make('a','','Visit Antique Radio Forums ↗'));
 source.href='https://antiqueradios.com/forums/viewforum.php?f=2';source.target='_blank';source.rel='noopener noreferrer';
 let pending=false,live=[],known=new Set(stored(SEEN,[]).map(String)),everLoaded=!!stored(SNAPSHOT,null),lastChecked=null;
 function actions(article,t){
  const buttons=add(article,make('div','rc-actions'));
  const reader=add(buttons,make('a','rc-button rc-reader inPageSite','Read in Infinity Reader ↗'));
  reader.href=t.url;reader.dataset.siteUrl=t.url;reader.dataset.siteTitle='Radio Clubhouse · '+t.title;
  const outside=add(buttons,make('a','rc-button rc-original','Original page ↗'));
  outside.href=t.url;outside.target='_blank';outside.rel='noopener noreferrer';
  const star=add(buttons,make('button','rc-button rc-secondary','☆ Star'));
  const collect=add(buttons,make('button','rc-button rc-secondary','Collect'));
  const share=add(buttons,make('button','rc-button rc-secondary','Share'));
  for(const button of [star,collect,share])button.type='button';
  const notice=add(article,make('p','rc-notice',''));
  notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  const data=cardData(t),key=data.key;
  function current(){
   star.textContent=stored(STARS,[]).includes(key)?'★ Starred':'☆ Star';
   collect.textContent=stored(COLLECTED,[]).some(item=>item?.key===key)?'Collected ✓':'Collect';
  }
  star.addEventListener('click',()=>{
   const stars=stored(STARS,[]);
   if(!stars.includes(key)&&!save(STARS,[...stars,key].slice(-500))){notice.textContent='Unable to save Star.';return}
   let receipt;try{receipt=window.QuantaStarCredit?.('star',key,data)}catch{}
   notice.textContent=creditNotice('Star',receipt);current();
  });
  collect.addEventListener('click',()=>{
   const records=stored(COLLECTED,[]);
   if(!records.some(row=>row?.key===key)){
    const item={...data,collectedAt:new Date().toISOString(),generator:'radio-clubhouse'};
    if(!save(COLLECTED,[...records,item].slice(-1000))){notice.textContent='Unable to save collection.';return}
    window.dispatchEvent(new CustomEvent('quantaphi:collected',{detail:item}));
   }
   let receipt;try{receipt=window.QuantaStarCredit?.('collect',key,data)}catch{}
   notice.textContent=creditNotice('Collect',receipt);current();
  });
  share.addEventListener('click',async()=>{
   share.disabled=true;
   try{
    if(navigator.share)await navigator.share({title:t.title,text:'Radio Clubhouse discussion at Antique Radio Forums',url:t.url});
    else if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(t.url);
    else throw new Error('Sharing is not available on this device');
    let receipt;try{receipt=window.QuantaStarCredit?.('share',key+':'+Date.now(),data)}catch{}
    notice.textContent=creditNotice('Share',receipt);
   }catch(error){notice.textContent=error?.name==='AbortError'?'Share canceled.':'Sharing did not complete.'}
   finally{share.disabled=false}
  });
  current();
 }
 function render(topics,isLive,message){
  collection.replaceChildren();
  if(!topics.length){
   const empty=add(collection,make('div','rc-empty',message||'No verified Radio Clubhouse discussions are available.'));
   add(empty,make('p','','Use the original forum link or refresh when the feed becomes available.'));
   return;
  }
  for(const [i,t] of topics.entries()){
   const article=add(collection,make('article','rc-topic'));
   article.dataset.topicId=t.id;
   const top=add(article,make('div','rc-topic-top'));
   add(top,make('span','rc-topic-index','#'+String(i+1).padStart(2,'0')+' · RADIO CLUBHOUSE'));
   if(t.archived)add(top,make('span','rc-archive','ARCHIVED THREAD'));
   else if(isLive&&t.isNew)add(top,make('span','rc-new','NEW TO FEED'));
   add(article,make('h3','',t.title));
   if(t.snippet)add(article,make('p','rc-excerpt',t.snippet));
   else add(article,make('p','rc-excerpt','Read the original Radio Clubhouse discussion and replies.'));
   const meta=add(article,make('p','rc-meta','Source: Antique Radio Forums'));
   if(t.author)meta.append(document.createTextNode(' · '+t.author));
   if(t.updated)meta.append(document.createTextNode(' · Last activity '+formatDate(t.updated)));
   else if(t.publishedAt)meta.append(document.createTextNode(' · Posted '+t.publishedAt));
   actions(article,t);
  }
 }
 const isTopic=t=>t&&/^\d{1,12}$/.test(String(t.id||''))&&url(t.url)&&
  typeof t.title==='string'&&t.title.trim().length>0;
 function normalize(topics){
  const uniq=new Map();
  for(const raw of (Array.isArray(topics)?topics:[]).slice(0,30)){
   if(!isTopic(raw))continue;
   const t={id:String(raw.id),url:url(raw.url),title:raw.title.trim().slice(0,180),
    author:String(raw.author||'').slice(0,70),snippet:String(raw.snippet||'').slice(0,340),
    updated:raw.updated&&Number.isFinite(Date.parse(raw.updated))?raw.updated:null,
    archived:raw.archived===true,publishedAt:/^\d{4}-\d{2}-\d{2}$/.test(String(raw.publishedAt||''))?raw.publishedAt:null};
   if(!uniq.has(t.id))uniq.set(t.id,t);
  }
  return [...uniq.values()].slice(0,8);
 }
 async function load(){
  if(pending)return;
  pending=true;refresh.disabled=true;refresh.textContent='Checking…';
  status.textContent='Checking Antique Radio Forums for new Radio Clubhouse discussions…';
  try{
   const controller=new AbortController(),stop=setTimeout(()=>controller.abort(),13000);
   let response,payload;
   try{
    response=await fetch(ENDPOINT,{headers:{Accept:'application/json'},signal:controller.signal,cache:'no-store'});
    payload=await response.json();
   }finally{clearTimeout(stop)}
   if(!response.ok||!payload?.ok)throw new Error('forum_feed_unavailable');
   const topics=normalize(payload.topics);
   if(!topics.length)throw new Error('no_valid_discussions');
   const archived=payload.archived===true||payload.feedType==='archive';
   if(archived){
    const snapshot=stored(SNAPSHOT,null);
    const recent=normalize(snapshot?.topics);
    if(recent.length){
     render(recent,false);
     status.textContent='Live forum access unavailable. Showing the last previously retrieved forum discussions ('+formatDate(new Date(snapshot.checkedAt).toISOString())+'). The archive is available if needed; these are not confirmed current.';
    }else{
     render(topics,false);
     status.textContent='Showing '+topics.length+' VERIFIED ARCHIVED discussions (2025). The direct forum and RSS are currently inaccessible; these are not the newest live posts. Checks retry every 5 minutes.';
    }
    return;
   }
   const first=!everLoaded;
   for(const t of topics)t.isNew=!first&&!known.has(t.id);
   known=new Set([...known,...topics.map(t=>t.id)].slice(-500));
   save(SEEN,[...known]);
   live=topics;everLoaded=true;lastChecked=Date.now();
   save(SNAPSHOT,{topics:topics.map(({isNew,...t})=>t),checkedAt:lastChecked});
   render(topics,true);
   status.textContent='Latest '+topics.length+' discussion topics from Radio Clubhouse · Checked '+formatDate(new Date(lastChecked).toISOString())+
    ' · Updates checked every 5 minutes.'+(first?' Starting with the current forum topics.':'');
  }catch{
   const snapshot=stored(SNAPSHOT,null);
   const previous=normalize(snapshot?.topics);
   if(previous.length){
    render(previous,false);
    status.textContent='Forum feed unavailable. Showing the last saved snapshot from '+formatDate(new Date(snapshot.checkedAt).toISOString())+'; these are not verified as current.';
   }else{
    render([],false,'The source is not returning a usable live forum feed at the moment.');
    status.textContent='Radio Clubhouse discussions are temporarily unavailable. See the original board; automatic checks will continue.';
   }
  }finally{pending=false;refresh.disabled=false;refresh.textContent='Refresh discussions'}
 }
 refresh.addEventListener('click',load);
 window.addEventListener('online',load);
 load();
 const poll=setInterval(()=>{if(!document.hidden)load()},INTERVAL);
 // Timers are suspended inside the back-forward cache, then resume automatically.
 // A one-time pagehide handler would stop updates permanently after restoration.
 window.addEventListener('pageshow',event=>{if(event.persisted)load()});
})();
