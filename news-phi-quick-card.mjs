/* News Phi · one original Oracle Quick Card, with an independent story reader.
 * Reuses the existing News Phi Cloudflare feed; no duplicated backend or paid API.
 */
const API='https://news-phi-feed.marvaseater.workers.dev/v1/news/feed';
const MAX_AGE=48*60*60*1000;
export const NEWS_TOPICS=Object.freeze(['All','Science','Technology','World','U.S.','Business','Health','Sports','Entertainment']);
const TOPIC_MATCH=Object.freeze({
 Science:/\b(?:science|scientific|scientists?|research|nasa|astronomy|spacecraft|telescope|physics|biology|climate|geology|experiment|laboratory)\b/i,
 Technology:/\b(?:technology|technological|tech|software|computers?|artificial intelligence|\bAI\b|chips?|semiconductor|cybersecurity|robotics?|smartphone|internet|quantum computing)\b/i,
 World:/\b(?:world|international|global|united nations|europe|asia|africa|middle east|ukraine|china|russia|diplomacy)\b/i,
 'U.S.':/\b(?:united states|u\.s\.|american|congress|white house|washington|federal|state government)\b/i,
 Business:/\b(?:business|businesses|economy|economic|trade|markets?|stocks?|finance|companies|company|earnings|jobs|inflation)\b/i,
 Health:/\b(?:health|medical|medicine|hospital|disease|vaccine|doctors?|patients?|clinical|public health)\b/i,
 Sports:/\b(?:sports?|football|baseball|basketball|soccer|tennis|hockey|olympics|nfl|nba|mlb)\b/i,
 Entertainment:/\b(?:entertainment|movies?|films?|music|television|streaming|actors?|concert|theater|theatre|celebrity)\b/i
});
const clean=(value,n)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,n);
function publisherUrl(value){
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password)return null;
  const host=url.hostname.toLowerCase();
  if(host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||/^(?:127\.|10\.|192\.168\.|169\.254\.)/.test(host))return null;
  url.hash='';return url;
 }catch{return null;}
}
export function normalizeNewsArticles(rows,now=Date.now()){
 if(!Array.isArray(rows))return [];
 const seen=new Set(),out=[];
 for(const row of rows){
  if(!row||typeof row!=='object')continue;
  const url=publisherUrl(row.url),title=clean(row.title,220),extract=clean(row.extract,1000);
  const date=Date.parse(row.publishedAt||'');
  if(!url||title.length<8||extract.length<35||!Number.isFinite(date)||date>now+300000||now-date>MAX_AGE||seen.has(url.href))continue;
  seen.add(url.href);
  out.push({url:url.href,title,extract,source:url.hostname.replace(/^www\./,''),publishedAt:new Date(date).toISOString(),topic:clean(row.topic||row.searchQuery,100)});
 }
 return out.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,80);
}
export function matchingNewsArticles(articles,topic='All'){
 if(topic==='All')return [...articles];
 const pattern=TOPIC_MATCH[topic];if(!pattern)return [];
 return articles.filter(article=>pattern.test(article.topic+' '+article.title+' '+article.extract));
}
const node=(tag,className,caption)=>{
 const element=document.createElement(tag);if(className)element.className=className;
 if(caption!==undefined)element.textContent=caption;return element;
};
export function mountNewsPhiCarousel(){
 const bank=document.getElementById('siteQuickCards');if(!bank)return false;
 const grid=bank.querySelector('.iqc-grid')||bank;
 if(document.querySelector('[data-source-id="news-phi-live"]'))return true;
 const root=node('article','iqc-card newsphi-card');
 root.dataset.sourceId='news-phi-live';root.dataset.sourceName='News Phi';root.dataset.sourceReady='true';
 const kind=node('p','iqc-kind','News · Current reporting');
 const heading=node('h3','newsphi-title','📰 News Phi · Read the news');
 const description=node('p','newsphi-description','Real dated headlines from multiple publishers. Select a subject and read the original report.');
 const label=node('label','newsphi-filter-label','Choose news subject');label.htmlFor='newsPhiTopic';
 const select=node('select','newsphi-topic');select.id='newsPhiTopic';select.setAttribute('aria-label','Choose news category');
 for(const topic of NEWS_TOPICS){const option=node('option','',topic);option.value=topic;select.append(option);}
 const state=node('p','newsphi-status','Checking current reports…');state.setAttribute('role','status');
 const article=node('section','newsphi-story');article.id='newsPhiFeed';article.setAttribute('aria-live','polite');
 const controls=node('div','newsphi-controls');
 const previous=node('button','','← Previous story'),next=node('button','','Next story →'),refresh=node('button','','↻ Refresh');
 for(const button of [previous,next,refresh])button.type='button';
 previous.setAttribute('aria-label','Previous news story');next.setAttribute('aria-label','Next news story');
 const count=node('span','newsphi-count','0 stories');count.setAttribute('aria-live','off');
 controls.append(previous,next,count,refresh);
 const newsroom=node('a','newsphi-newsroom','Open News Phi newsroom');newsroom.href='/news-phi/';
 root.append(kind,heading,description,label,select,state,article,controls,newsroom);
 let articles=[],position=0,loading=false;
 function draw(){
  const current=matchingNewsArticles(articles,select.value);
  article.replaceChildren();
  previous.disabled=position<=0||!current.length;next.disabled=position>=current.length-1||!current.length;
  count.textContent=current.length?(position+1)+' / '+current.length:'0 stories';
  if(!current.length){
   article.append(node('p','newsphi-empty',articles.length?'No verified stories match this subject right now. Choose All or refresh.':'No verified stories available. Try Refresh or open the newsroom.'));return;
  }
  const story=current[position];
  article.append(node('h4','newsphi-headline',story.title),
   node('p','newsphi-byline',story.source+' · '+new Date(story.publishedAt).toLocaleString()),
   node('p','newsphi-extract',story.extract));
  const link=node('a','newsphi-read','Read original report');link.href=story.url;link.target='_blank';link.rel='noopener noreferrer';
  article.append(link);
 }
 previous.addEventListener('click',()=>{if(position>0){position--;draw();}});
 next.addEventListener('click',()=>{if(position+1<matchingNewsArticles(articles,select.value).length){position++;draw();}});
 select.addEventListener('change',()=>{position=0;draw();});
 async function load(){
  if(loading)return;
  loading=true;refresh.disabled=true;state.textContent='Checking News Phi Cloudflare headlines…';
  try{
   const response=await fetch(API,{cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const payload=await response.json();
   if(payload.cloud!==true||!Array.isArray(payload.articles))throw new Error('Feed not verified');
   articles=normalizeNewsArticles(payload.articles);position=0;
   state.textContent=articles.length?articles.length+' recent source-linked reports · within 48 hours':'No current dated reports were returned by News Phi.';
  }catch{
   articles=[];position=0;state.textContent='News Phi source is unavailable; no old headlines are being substituted.';
  }finally{loading=false;refresh.disabled=false;draw();}
 }
 refresh.addEventListener('click',load);
 grid.append(root);draw();
 window.dispatchEvent(new CustomEvent('quantaphi:source-cards-ready',{detail:{source:'news-phi',count:1}}));
 void load();return true;
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountNewsPhiCarousel,{once:true});
 else mountNewsPhiCarousel();
}
