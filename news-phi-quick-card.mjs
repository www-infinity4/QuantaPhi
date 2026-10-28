/* News Phi: one outer Oracle quick card, independent inner story carousel. */
const API='https://news-phi-feed.marvaseater.workers.dev/v1/news/feed';
const MAX_AGE=48*60*60*1000;
const root=document.createElement('article');
root.className='iqc-card newsphi-nested-card';
root.dataset.sourceId='news-phi-live';
root.dataset.sourceName='News Phi';
root.dataset.sourceReady='true';
root.style.cssText='background:#fff;border:2px solid #b7d3eb;border-radius:18px;padding:16px;color:#17314a;max-width:100%;overflow:hidden';
const heading=document.createElement('h2');heading.textContent='📰 News Phi · Current Stories';
const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Loading verified, dated news…';
const story=document.createElement('section');story.setAttribute('aria-live','polite');story.style.cssText='min-height:160px;overflow-wrap:anywhere';
const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';
const previous=document.createElement('button');previous.type='button';previous.textContent='← Previous story';
const next=document.createElement('button');next.type='button';next.textContent='Next story →';
const counter=document.createElement('span');
for(const button of [previous,next])button.style.cssText='padding:12px;border-radius:12px;background:#145a8b;color:white;cursor:pointer';
controls.append(previous,next,counter);
const more=document.createElement('a');more.href='/news-phi/';more.textContent='Open full News Phi newsroom';more.style.cssText='display:inline-block;margin-top:12px;color:#145a8b;font-weight:bold';
root.append(heading,status,story,controls,more);
let articles=[],index=0;
function render(){
 story.replaceChildren();
 previous.disabled=index===0;next.disabled=index>=articles.length-1;
 counter.textContent=articles.length?(index+1)+' / '+articles.length:'0 stories';
 if(!articles.length)return;
 const item=articles[index];
 const title=document.createElement('h3');title.textContent=item.title;
 const extract=document.createElement('p');extract.textContent=item.extract;
 const meta=document.createElement('p');meta.textContent=new Date(item.publishedAt).toLocaleString()+' · '+new URL(item.url).hostname;
 const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Read original report ↗';
 story.append(title,meta,extract,link);
}
previous.addEventListener('click',()=>{if(index>0){index--;render()}});
next.addEventListener('click',()=>{if(index<articles.length-1){index++;render()}});
async function load(){
 try{
  const response=await fetch(API,{cache:'no-store',signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw Error('News desk HTTP '+response.status);
  const payload=await response.json();
  if(payload.cloud!==true||!Array.isArray(payload.articles))throw Error('Unverified news feed');
  const seen=new Set(),now=Date.now();
  articles=payload.articles.filter(x=>{
   if(typeof x.title!=='string'||typeof x.extract!=='string'||x.extract.trim().length<35)return false;
   let u;try{u=new URL(x.url)}catch{return false}
   if(u.protocol!=='https:'||seen.has(u.href))return false;
   const t=Date.parse(x.publishedAt||'');
   if(!Number.isFinite(t)||t>now+300000||now-t>MAX_AGE)return false;
   seen.add(u.href);return true;
  }).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,40);
  index=0;status.textContent=articles.length?'Current source-linked reports · last 48 hours':'No verified current stories available.';
  render();
 }catch{articles=[];index=0;status.textContent='Live news temporarily unavailable. Open the newsroom to retry.';render()}
}
function mount(){
 const bank=document.getElementById('siteQuickCards');if(!bank)return;
 const grid=bank.querySelector('.iqc-grid')||bank;
 if(grid.querySelector('[data-source-id="news-phi-live"]'))return;
 grid.append(root);render();
 window.dispatchEvent(new CustomEvent('quantaphi:source-cards-ready',{detail:{source:'news-phi',count:1}}));
 load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,0),{once:true});
else setTimeout(mount,0);
