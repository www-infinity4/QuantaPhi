// Fresh editorial and source-backed full-story reader, separate from archival pages.
// No stale-as-current fallback; never copies publisher HTML into our page.
const LIVE_API='https://news-phi-feed.marvaseater.workers.dev/v1/news';
const READ_API=LIVE_API+'/read'; // https://news-phi-feed.marvaseater.workers.dev/v1/news/read
const FRESH_SOURCE_MS=24*60*60*1000;
const FRESH_EDITORIAL_MS=36*60*60*1000;
const tidy=(s,n=300)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,n);
const https=(s)=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
function editorialDate(value){
 // Date-only editorial dates do not pretend to be publication timestamps.
 if(/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return Date.parse(value+'T00:00:00Z');
 return Date.parse(String(value||''));
}
export function freshFeatures(data,now=Date.now()){
 const rows=Array.isArray(data?.articles)?data.articles:[];
 const seen=new Set();
 return rows.filter(a=>{
  const date=editorialDate(a.publishedAt),path=tidy(a.url,100);
  if(!Number.isFinite(date)||date>now+300000||now-date>FRESH_EDITORIAL_MS)return false;
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*\.html$/.test(path)||!tidy(a.title,180)||!https(a.sourceUrl)||seen.has(path))return false;
  seen.add(path);return true;
 }).sort((a,b)=>editorialDate(b.publishedAt)-editorialDate(a.publishedAt));
}
export function pickFreshSource(rows,now=Date.now()){
 const seen=new Set();
 return (Array.isArray(rows)?rows:[]).filter(a=>{
  const t=Date.parse(String(a?.publishedAt||'')),url=https(a?.url),title=tidy(a?.title,190),extract=tidy(a?.extract,600);
  if(!url||!title||extract.length<35||!Number.isFinite(t)||t>now+300000||now-t>FRESH_SOURCE_MS||seen.has(url))return false;
  seen.add(url);return true;
 }).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))[0]||null;
}
if(typeof document!=='undefined'){
 const featured=document.getElementById('featured-articles');
 const status=document.getElementById('editorial-fresh-status');
 const report=document.getElementById('live-full-story');
 const reportStatus=document.getElementById('full-story-status');
 const next=document.getElementById('full-next');
 const pause=document.getElementById('full-pause');
 const archive=document.getElementById('archive-articles');
 let sources=[],position=0,paused=false,rotation=null,revision=0;
 const articleCache=new Map();
 function el(tag,text,cls){
  const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;
 }
 function link(label,href){
  const a=el('a',label);
  a.href=href;
  if(href.startsWith('https://')){a.target='_blank';a.rel='noopener noreferrer';}
  return a;
 }
 async function loadOriginal(){
  try{
   const res=await fetch('/newsroom/latest.json',{cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!res.ok)throw Error('unavailable');
   const registry=await res.json();
   const current=freshFeatures(registry);
   featured.replaceChildren();
   for(const story of current.slice(0,8)){
    const item=el('article',undefined,'feature');
    item.append(el('p',tidy(story.category,80)+' · Published '+story.publishedAt,'eyebrow'));
    const h=el('h3');h.append(link(tidy(story.title,200),story.url));
    item.append(h,el('p',tidy(story.description,550)),link('Read our complete original article',story.url));
    featured.append(item);
   }
   status.textContent=current.length?
    current.length+' newly published original QuantaPhi article'+(current.length===1?'':'s')+' · newest first':
    'No new original QuantaPhi article published within the current window. Older reports are in the archive.';
   // A dated historical article is not a featured story just because an archive URL exists.
   archive.replaceChildren();
   for(const story of (Array.isArray(registry.articles)?registry.articles:[])
     .filter(x=>!current.some(y=>y.url===x.url)).sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt)))){
    const p=el('p');p.append(link(tidy(story.title,200),story.url),document.createTextNode(' · '+tidy(story.publishedAt,40)+' · Archive'));archive.append(p);
   }
  }catch{
   featured.replaceChildren();
   status.textContent='Original article registry unavailable. No older article is being labeled current.';
  }
 }
 const reportUnavailable=(message)=>{
  report.replaceChildren();
  reportStatus.textContent=message;
 };
 function sourceList(rows){
  const seen=new Set(),now=Date.now();
  return (Array.isArray(rows)?rows:[]).filter(item=>{
   if(!pickFreshSource([item],now))return false;
   const u=https(item.url);
   if(!u||seen.has(u))return false;
   seen.add(u);return true;
  }).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,15);
 }
 async function displayReport(){
  const turn=++revision;
  sources=sourceList(sources); // discard source as soon as it goes stale
  if(position>=sources.length)position=0;
  if(!sources.length){reportUnavailable('No verified new full article is available from the Cloudflare news desk. We will not substitute old stories.');return;}
  const article=sources[position],url=https(article.url);
  reportStatus.textContent='Reading a newly published original source…';
  let payload=articleCache.get(url);
  if(!payload){
   try{
    const response=await fetch(READ_API,{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},
     body:JSON.stringify({url}),signal:AbortSignal.timeout(28000)});
    if(!response.ok)throw Error('read_failed');
    payload=await response.json();
    if(payload.ok&&payload.sourceUrl===url&&Array.isArray(payload.paragraphs))articleCache.set(url,payload);
   }catch{payload=null;}
  }
  if(turn!==revision)return;
  report.replaceChildren();
  const h=el('h3');h.append(link(tidy(article.title,200),url));
  report.append(h,el('p',new Date(article.publishedAt).toLocaleString()+' · '+new URL(url).hostname,'meta'));
  const paragraphs=Array.isArray(payload?.paragraphs)?payload.paragraphs.filter(x=>tidy(x,1800).length>=75):[];
  if(payload?.sourceUrl===url&&payload.researchMode==='gpt-source-grounded'&&paragraphs.length>=6&&paragraphs.join(' ').length>=1500){
   for(const paragraph of paragraphs.slice(0,12))report.append(el('p',tidy(paragraph,1800)));
   report.append(el('p','Fresh original-source explanation generated from publisher reporting; verify details with the linked primary source.','meta'));
   reportStatus.textContent='New source-backed long-form reader · original publisher linked';
  }else{
   report.append(el('p','This newly published headline has not yet produced a verified full-length explanation. Open the original publisher report instead.'));
   reportStatus.textContent='Full report unavailable; no invented or stale article shown';
  }
  report.append(link('Read the original publisher report',url));
 }
 function step(){if(!sources.length)return;position=(position+1)%sources.length;void displayReport();}
 async function updateSources(){
  try{
   const response=await fetch(LIVE_API+'/feed',{cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error('no_feed');
   const payload=await response.json();
   if(payload.cloud!==true||!Array.isArray(payload.articles))throw Error('invalid_feed');
   const old=sources[position]?.url;
   sources=sourceList(payload.articles);
   position=Math.max(0,sources.findIndex(a=>a.url===old));
   await displayReport();
  }catch{sources=[];reportUnavailable('Current verified publisher reporting is unavailable. Old articles remain archived, not featured.');}
 }
 next?.addEventListener('click',step);
 pause?.addEventListener('click',()=>{
  paused=!paused;pause.textContent=paused?'Resume article rotation':'Pause article rotation';
  pause.setAttribute('aria-pressed',String(paused));
 });
 loadOriginal();
 updateSources();
 setInterval(loadOriginal,15*60*1000);
 setInterval(updateSources,15*60*1000);
 rotation=setInterval(()=>{
  if(!document.hidden&&!paused&&sources.length>1&&!(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches))step();
 },30000);
}
