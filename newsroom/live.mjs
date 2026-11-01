// News Phi public headline rotation. Editorial full articles live in static HTML.
// No imported user interests, cookies, wallet reads, third-party article copying or ad calls.
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
if(typeof document!=='undefined'){
 const list=document.getElementById('fresh-headlines');
 const status=document.getElementById('fresh-status');
 const refreshButton=document.getElementById('fresh-refresh');
 let stories=[],active=0,rotation=null;
 function render(){
  if(!list)return;
  list.replaceChildren();
  if(!stories.length)return;
  const article=stories[active%stories.length];
  const item=document.createElement('article');
  item.className='headline-item';
  const h=document.createElement('h3');
  const a=document.createElement('a');
  a.href=article.url;a.rel='noopener noreferrer';a.target='_blank';
  a.textContent=article.title;
  h.appendChild(a);
  const desc=document.createElement('p');desc.textContent=article.extract;
  const meta=document.createElement('small');meta.textContent=article.host+' · '+new Date(article.publishedAt).toLocaleString();
  item.append(h,desc,meta);
  list.append(item);
  if(stories.length>1){
   const controls=document.createElement('div');controls.className='headline-controls';
   const next=document.createElement('button');next.type='button';next.textContent='Next headline';
   next.addEventListener('click',()=>{active=(active+1)%stories.length;render();});
   const count=document.createElement('span');count.textContent=(active+1)+' / '+stories.length;
   controls.append(next,count);list.append(controls);
  }
 }
 function rotate(){
  if(rotation)clearInterval(rotation);
  if(stories.length>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches)
   rotation=setInterval(()=>{if(document.hidden)return;active=(active+1)%stories.length;render();},11000);
 }
 async function load(){
  status.textContent='Checking current publisher feeds…';
  try{
   const response=await fetch(ENDPOINT,{cache:'no-store',signal:AbortSignal.timeout(18000)});
   if(!response.ok)throw new Error('Feed unavailable');
   const payload=await response.json();
   if(payload.cloud!==true||!Array.isArray(payload.articles))throw new Error('Unverified feed response');
   stories=pickFreshArticles(payload.articles);
   active=0;render();rotate();
   status.textContent=stories.length?
    stories.length+' recent sourced headlines · updated '+new Date().toLocaleTimeString():
    'No headlines verified within 48 hours. The original articles below remain available.';
  }catch{
   stories=[];active=0;if(rotation)clearInterval(rotation);list?.replaceChildren();
   status.textContent='Current news is temporarily unavailable. Read the original QuantaPhi reports below or use News Phi.';
  }
 }
 refreshButton?.addEventListener('click',load);
 load();
 setInterval(load,15 * 60 * 1000);
}
