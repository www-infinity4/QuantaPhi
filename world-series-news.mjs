import {mountCardActions} from './quanta-card-actions.mjs?v=20261025-title-search1';

/* World Series: publisher RSS article metadata, NOT a generic search-links card.
 * Refuses unverifiable content; photographs are only displayed if advertised by
 * publisher's actual RSS item and hosted at an approved first-party image host.
 */
const SOURCES=[
 '/data/world-series-latest.json',
 'https://raw.githubusercontent.com/www-infinity4/QuantaPhi/trends-rss-data/data/world-series-latest.json'
];
const PUBLISHERS=new Set(['MLB.com','ESPN','CBS Sports']);
const IMAGE_HOSTS=['mlb.com','mlbstatic.com','espn.com','espncdn.com','cbssports.com','cbsistatic.com'];
const allowedImage=value=>{
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&IMAGE_HOSTS.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))}catch{return false}
};
const element=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const link=(label,url,cls='')=>{const a=element('a',cls,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a};
const validStory=a=>{
 if(!a||!PUBLISHERS.has(a.publisher)||!['Analysis','Reporting'].includes(a.kind))return false;
 try{
  const u=new URL(a.url),t=Date.parse(a.published_at);
  return u.protocol==='https:'&&['mlb.com','espn.com','cbssports.com'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h))&&
   !u.username&&!u.password&&Number.isFinite(t)&&t<=Date.now()+300000&&
   typeof a.title==='string'&&a.title.trim().length>9&&a.title.length<=170;
 }catch{return false}
};
export function validSeriesSnapshot(data){
 return Boolean(data&&data.schema_version===1&&data.topic==='2026 World Series'&&
  Array.isArray(data.articles)&&data.articles.length>0&&Number.isFinite(Date.parse(data.checked_at))&&
  Date.parse(data.checked_at)<=Date.now()+300000&&data.articles.some(validStory));
}
const identity=url=>{
 let h=2166136261;
 for(const c of url){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}
 return 'world-series-'+(h>>>0).toString(36);
};
function storyNode(article){
 const card=element('article','ws-news-story');
 const id=identity(article.url);card.id=id;
 card.dataset.publisher=article.publisher;
 const imageLink=link('',''+article.url,'ws-news-image-link');
 if(article.image_url&&allowedImage(article.image_url)){
  const img=element('img','ws-news-photo');
  img.src=article.image_url;img.alt='Original '+article.publisher+' story photograph for '+article.title;
  img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  img.addEventListener('error',()=>{img.remove();imageLink.remove()},{once:true});
  imageLink.append(img);card.append(imageLink);
 }
 const info=element('div','ws-news-info');
 const meta=element('p','ws-news-meta',article.publisher+' · '+article.kind+' · '+new Date(article.published_at).toLocaleString());
 const title=element('h4','ws-news-title',article.title);
 const excerpt=element('p','ws-news-excerpt',String(article.summary||'').slice(0,180));
 const refs=element('div','ws-news-source-actions');
 refs.append(link('Read the original report ↗',article.url,'ws-news-source'));
 if(article.author)refs.append(element('span','ws-news-author','By '+article.author));
 info.append(meta,title);
 if(excerpt.textContent)info.append(excerpt);
 info.append(refs);
 const actions=element('div','ws-news-quanta-actions');
 mountCardActions(actions,{
  id,name:'World Series · '+article.title,category:'World Series analysis',
  featureUrl:article.url,official:article.url,
  route:'/?card=mlb&story='+id,
 });
 info.append(actions);card.append(info);
 return card;
}
export function mountWorldSeriesNews(host){
 const panel=element('section','ws-news');
 panel.setAttribute('aria-label','Publisher reporting and analysis on the World Series');
 const heading=element('h3','ws-news-heading','World Series · Reports & analysis');
 const intro=element('p','ws-news-intro','Real publisher headlines, attributed story images and fresh research. Scores above remain sourced independently from MLB.');
 const controls=element('div','ws-news-controls');
 const status=element('p','ws-news-status','Checking publisher RSS records…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const list=element('div','ws-news-list');
 const filter=element('select','ws-news-filter');
 filter.setAttribute('aria-label','Filter World Series news');
 for(const kind of ['All reports','Analysis','Reporting']){const o=element('option','',kind);o.value=kind;filter.append(o)}
 const refresh=element('button','ws-news-refresh','↻ Refresh articles');refresh.type='button';
 controls.append(filter,refresh,link('MLB original news ↗','https://www.mlb.com/news','ws-news-link'));
 panel.append(heading,intro,controls,status,list);host.append(panel);
 let current=null,busy=false,controller;
 const render=()=>{
  list.replaceChildren();
  if(!current)return;
  const chosen=current.articles.filter(a=>validStory(a)&&(filter.value==='All reports'||a.kind===filter.value));
  const requested=new URLSearchParams(location.search).get('story');
  chosen.sort((a,b)=>(identity(a.url)===requested?-1:identity(b.url)===requested?1:Date.parse(b.published_at)-Date.parse(a.published_at)));
  if(!chosen.length){list.append(element('p','ws-news-empty','No verified reports in this filter. Choose All reports.'));return}
  list.append(...chosen.slice(0,18).map(storyNode));
 };
 async function sync(){
  if(busy)return;busy=true;
  controller?.abort();controller=new AbortController();
  status.textContent='Checking publisher RSS snapshots…';
  let best=null;
  for(const source of SOURCES){
   try{
    const u=source+(source.includes('?')?'&':'?')+'checked='+Math.floor(Date.now()/60000);
    const r=await fetch(u,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
    if(!r.ok)continue;
    const value=await r.json();
    if(validSeriesSnapshot(value)&&(!best||Date.parse(value.checked_at)>Date.parse(best.checked_at)))best=value;
   }catch{}
  }
  if(best&&(!current||Date.parse(best.checked_at)>=Date.parse(current.checked_at)))current=best;
  if(current){
   const age=Date.now()-Date.parse(current.checked_at);
   status.textContent=(age>120*60*1000?'OLDER VERIFIED FEED · ':'')+
    current.articles.filter(validStory).length+' attributed articles · last checked '+
    new Date(current.checked_at).toLocaleString()+
    ' · actual publication and media remain with original publishers';
   render();
  }else{
   list.replaceChildren(element('p','ws-news-empty','Verified World Series RSS not available. Open MLB source reporting; no articles or images are invented.'));
   status.textContent='RSS read unavailable · no fresh stories confirmed';
  }
  busy=false;
 }
 filter.addEventListener('change',render);
 refresh.addEventListener('click',()=>void sync());
 void sync();
 const interval=setInterval(()=>{if(!document.hidden)void sync()},5*60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync()});
 return {refresh:sync,stop:()=>clearInterval(interval)};
}
if(typeof document!=='undefined'){
 const start=()=>{for(const id of ['googleTrendMlb']){const root=document.getElementById(id);if(root&&!root.querySelector('.ws-news'))mountWorldSeriesNews(root)}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
}
