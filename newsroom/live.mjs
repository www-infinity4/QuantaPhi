// Original News Phi articles are static first-party writing. Live cards only link to sources.
// No wallet/auth/session reads. Never copy full third-party articles.
const ENDPOINT='https://news-phi-feed.marvaseater.workers.dev/v1/news/feed';
const MAX_AGE=48*60*60*1000;
export function pickFreshArticles(rows,now=Date.now()){
 const output=[],seen=new Set();
 for(const item of Array.isArray(rows)?rows:[]){
  const title=String(item?.title||'').replace(/\s+/g,' ').trim().slice(0,180);
  const extract=String(item?.extract||'').replace(/\s+/g,' ').trim().slice(0,380);
  const publishedAt=String(item?.publishedAt||'');
  const when=Date.parse(publishedAt);
  let url;
  try {url=new URL(String(item?.url||''));}catch {continue;}
  if(url.protocol!=='https:'||!title||extract.length<35||
     !Number.isFinite(when)||when>now+300000||now-when>MAX_AGE||seen.has(url.href))continue;
  seen.add(url.href);
  output.push({title,extract,url:url.href,publishedAt,host:url.hostname.replace(/^www\./,'')});
 }
 return output.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,30);
}
// Recheck age at display time: headlines may expire while a browser tab stays open.
export function pruneCurrentHeadlines(rows,now=Date.now()){
 return pickFreshArticles(rows,now);
}
// Resolve latest-request-wins on a late network response/error.
export function createRequestGate(){
 let latest=0;
 return {next(){return ++latest;},isCurrent(version){return version===latest;}};
}
if(typeof document!=='undefined'){
 const list=document.getElementById('fresh-headlines');
 const status=document.getElementById('fresh-status');
 const refreshButton=document.getElementById('fresh-refresh');
 const controls=document.getElementById('fresh-controls');
 const nextButton=document.getElementById('fresh-next');
 const pauseButton=document.getElementById('fresh-pause');
 const counter=document.getElementById('fresh-count');
 const requestGate=createRequestGate();
 let stories=[],active=0,rotation=null,paused=false;
 function render(){
  if(!list)return;
  const previousCount=stories.length;
  stories=pruneCurrentHeadlines(stories);
  if(active>=stories.length)active=0;
  list.replaceChildren();
  if(controls)controls.hidden=stories.length<=1;
  if(counter)counter.textContent=stories.length?(active+1)+' / '+stories.length:'';
  if(!stories.length){
   if(previousCount&&status)status.textContent='Headlines have passed the 48-hour freshness window. Refresh to check for new stories.';
   if(rotation){clearInterval(rotation);rotation=null;}
   return;
  }
  const article=stories[active];
  const item=document.createElement('article');item.className='headline-item';
  const h=document.createElement('h3');
  const a=document.createElement('a');a.href=article.url;a.rel='noopener noreferrer';a.target='_blank';a.textContent=article.title;
  h.appendChild(a);
  const desc=document.createElement('p');desc.textContent=article.extract;
  const meta=document.createElement('small');meta.textContent=article.host+' · '+new Date(article.publishedAt).toLocaleString();
  item.append(h,desc,meta);list.append(item);
 }
 function advance(){
  // Preserve button focus by keeping controls outside the replaced article.
  render(); // prune before increment, including an expiration while the page is open
  if(!stories.length)return;
  active=(active+1)%stories.length;render();
 }
 function rotate(){
  if(rotation){clearInterval(rotation);rotation=null;}
  const reducedMotion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!paused&&stories.length>1&&!reducedMotion){
   rotation=setInterval(()=>{if(document.hidden)return;advance();},11000);
  }
 }
 nextButton?.addEventListener('click',advance);
 pauseButton?.addEventListener('click',()=>{
  paused=!paused;
  pauseButton.setAttribute('aria-pressed',String(paused));
  pauseButton.textContent=paused?'Resume rotation':'Pause rotation';
  rotate();
 });
 async function load(){
  const version=requestGate.next();
  if(status)status.textContent='Checking current publisher feeds…';
  try{
   const response=await fetch(ENDPOINT,{cache:'no-store',signal:AbortSignal.timeout(18000)});
   if(!response.ok)throw new Error('Feed unavailable');
   const payload=await response.json();
   if(payload.cloud!==true||!Array.isArray(payload.articles))throw new Error('Unverified feed response');
   if(!requestGate.isCurrent(version))return;
   stories=pruneCurrentHeadlines(payload.articles);
   active=0;render();rotate();
   if(status)status.textContent=stories.length?
    stories.length+' recent sourced headlines · updated '+new Date().toLocaleTimeString():
    'No headlines verified within 48 hours. The original articles below remain available.';
  }catch{
   if(!requestGate.isCurrent(version))return;
   stories=[];active=0;
   if(rotation){clearInterval(rotation);rotation=null;}
   list?.replaceChildren();
   if(controls)controls.hidden=true;
   if(status)status.textContent='Current news is temporarily unavailable. Read the original QuantaPhi reports below or use News Phi.';
  }
 }
 refreshButton?.addEventListener('click',load);
 load();
 setInterval(load,15 * 60 * 1000);
}
