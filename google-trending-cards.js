/* Original QuantaPhi Google Trends cards: verified US search snapshot + live source feeds.
 * Search trends are a dated snapshot, never presented as real-time telemetry.
 * Scoreboards fetch publicly reachable source feeds; no fabricated game outcomes.
 * Source credits stay visible, and links go to the original publishers. */
(function(){
'use strict';
const root=document;
const TIME_ZONE='America/Chicago';
const SOURCES={
 trends:'https://trends.google.com/trending?geo=US&hours=24',
 nba:'https://www.espn.com/nba/scoreboard',
 mlb:'https://www.mlb.com/scores',
 news:'https://news.google.com/search?q=',
 youtube:'https://www.youtube.com/results?search_query='
};
const snapshot='October 23, 2026';
const node=(tag,className='',value='')=>{const x=root.createElement(tag);if(className)x.className=className;if(value)x.textContent=value;return x};
const link=(title,href)=>{const a=node('a','gt-link',title);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a};
const make=(parent,tag,cls='',text='')=>{const x=node(tag,cls,text);parent.append(x);return x};
const validUrl=(href,domain)=>{try{const u=new URL(String(href));return u.protocol==='https:'&&(u.hostname===domain||u.hostname.endsWith('.'+domain))?u.href:null}catch{return null}};
const localDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const isoDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value:localDate();
const shiftDay=(day,diff)=>{const d=new Date(isoDay(day)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+diff);return d.toISOString().slice(0,10)};
const compactDay=day=>isoDay(day).replace(/-/g,'');
const dateLabel=day=>new Date(isoDay(day)+'T12:00:00Z').toLocaleDateString(undefined,{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'});
const safeStatus=value=>String(value||'Scheduled').slice(0,90);
const fetchedAt=()=>new Date().toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
const readJson=async(url,controller)=>{
 const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('Provider returned '+response.status);
 return response.json();
};
function heading(host,title,label,volume){
 const eyebrow=make(host,'p','gt-eyebrow',label);
 const h=make(host,'h3','gt-title',title);
 make(host,'p','gt-snapshot',volume==='scores'?'Scores, team records and game details from current provider responses.':volume==='automatic'?'Latest observed trends are refreshed through a scheduled Google RSS import; the timestamp below shows actual freshness.':volume+' Google searches in the U.S. snapshot · '+snapshot+' · source: Google Trends');
 return {eyebrow,h};
}
function button(row,title,cb){
 const b=make(row,'button','gt-control',title);b.type='button';b.addEventListener('click',cb);return b;
}
function actions(host,urls){
 const line=make(host,'div','gt-actions');for(const [text,url] of urls)line.append(link(text,url));return line;
}
function scoreboardShell(host,title,short,volume,sourceUrl){
 heading(host,title,'∞ INFINITY · '+short,volume);
 const toolbar=make(host,'div','gt-toolbar');
 const day=make(host,'strong','gt-date','');
 const status=make(host,'p','gt-status','Loading source…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const list=make(host,'div','gt-games');list.setAttribute('aria-label',title+' current game data');
 const gameNav=make(host,'div','gt-toolbar gt-game-nav');
 let games=[],draw=null,selected=0;
 const previous=button(gameNav,'‹ Previous game',()=>{selected=(selected-1+games.length)%games.length;display()}),position=make(gameNav,'span','gt-date'),next=button(gameNav,'Next game ›',()=>{selected=(selected+1)%games.length;display()});
 function display(){list.replaceChildren();previous.disabled=next.disabled=games.length<2;position.textContent=games.length?(selected+1)+' / '+games.length:'0 games';if(games.length&&draw)list.append(draw(games[selected]))}
 function setGames(items,render){const id=games[selected]?.id;games=items;draw=render;selected=Math.max(0,games.findIndex(g=>g.id===id));display()}
 const footer=make(host,'p','gt-fine','Provider data may be delayed or unavailable. QuantaPhi does not control the upstream feed. Google search counts are a dated snapshot, not a count of game viewers.');
 const row=make(host,'div','gt-actions');
 row.append(link('Open source scoreboard ↗',sourceUrl),link('Google search trend ↗',SOURCES.trends));
 host.append(list,gameNav,toolbar,day,status,footer,row);display();
 return {toolbar,day,status,list,footer,setGames};
}
function dayControls(shell,refresh,setDate,getDate){
 button(shell.toolbar,'◀ Day',()=>setDate(shiftDay(getDate(),-1)));
 button(shell.toolbar,'Today',()=>setDate(localDate()));
 button(shell.toolbar,'Day ▶',()=>setDate(shiftDay(getDate(),1)));
 button(shell.toolbar,'↻ Refresh',refresh).setAttribute('aria-label','Refresh scores from provider');
}
function empty(list,msg){list.replaceChildren();make(list,'p','gt-empty',msg)}
function gameRow(list,teams,summary,url){
 const row=make(list,'article','gt-game');
 const names=make(row,'div','gt-match');
 for(const t of teams){const item=make(names,'div','gt-team');make(item,'strong','',t.name||'Unknown team');make(item,'span','gt-score',t.score==null?'—':String(t.score))}
 make(row,'p','gt-game-status',summary);
 if(url)row.append(link('Details and statistics ↗',url));
 return row;
}
// The module also powers the current FOX/NFL card. No stored game result is guessed.
const sports=()=>import('./sports-card-data.mjs?v=20261030-rich1');
function watchCard(host,refresh){
 let active=false;
 const visible=()=>!document.hidden&&host.getClientRects().length>0;
 host.addEventListener('oracle:activate',()=>{active=true;void refresh()});
 const observer=new IntersectionObserver(items=>{active=items.some(x=>x.isIntersecting);if(active)void refresh()});observer.observe(host);
 document.addEventListener('visibilitychange',()=>{if(active&&visible())void refresh()});
 setInterval(()=>{if(active&&visible())void refresh()},5*60*1000);
}
function nbaCard(host){
 const ui=scoreboardShell(host,'NBA Matchup Center','BASKETBALL','scores',SOURCES.nba);
 let date=localDate(),choice='all',controller;
 const tabs=make(host,'div','gt-tabs'),definitions=[['all','All NBA games'],['featured','Live & next']];
 const buttons=definitions.map(([id,label])=>button(tabs,label,()=>{choice=id;select();void refresh()}));
 function select(){buttons.forEach((b,i)=>{const yes=definitions[i][0]===choice;b.setAttribute('aria-pressed',String(yes));b.classList.toggle('selected',yes)})}
 async function refresh(){
  controller?.abort();const own=controller=new AbortController();
  ui.day.textContent=dateLabel(date);ui.status.textContent='Checking ESPN NBA games for '+date+'…';
  try{
   const api=await sports(),data=await api.fetchScoreboard('nba',date,{signal:AbortSignal.any([own.signal,AbortSignal.timeout(14000)])});
   if(own!==controller)return;
   const shown=choice==='featured'?data.games.filter(g=>!g.finished):data.games;
   ui.setGames(shown,api.renderSportsGame);
   if(!shown.length)empty(ui.list,'No games in this view. Change the day or choose All NBA games.');
   ui.status.textContent=shown.length+' of '+data.games.length+' NBA games shown · source checked '+new Date(data.checked).toLocaleTimeString()+' · ESPN data';
  }catch(error){if(own!==controller)return;ui.setGames([],null);empty(ui.list,'Scores unavailable right now. Use the source scoreboard link.');ui.status.textContent='NBA refresh failed · '+safeStatus(error.message)}
 }
 dayControls(ui,refresh,day=>{date=day;void refresh()},()=>date);select();watchCard(host,refresh);
}
function mlbCard(host){
 const ui=scoreboardShell(host,'MLB & World Series Match Center','BASEBALL','scores',SOURCES.mlb);
 let date=localDate(),controller,mode='all';
 const tabs=make(host,'div','gt-tabs'),defs=[['all','All MLB games'],['world-series','World Series']];
 const buttons=defs.map(([id,label])=>button(tabs,label,()=>{mode=id;select();void refresh()}));
 function select(){buttons.forEach((b,i)=>{const yes=defs[i][0]===mode;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes))})}
 async function refresh(){
  controller?.abort();const own=controller=new AbortController();ui.day.textContent=dateLabel(date);ui.status.textContent='Checking MLB schedule for '+date+'…';
  try{
   const api=await sports(),data=await api.fetchScoreboard('mlb',date,{signal:AbortSignal.any([own.signal,AbortSignal.timeout(14000)])});
   if(own!==controller)return;
   const shown=mode==='world-series'?data.games.filter(g=>/world series/i.test(g.series)):data.games;
   ui.setGames(shown,api.renderSportsGame);
   if(!shown.length)empty(ui.list,'No MLB games in this view. Switch days or choose All MLB games.');
   ui.status.textContent=shown.length+' of '+data.games.length+' MLB games shown · source checked '+new Date(data.checked).toLocaleTimeString()+' · MLB schedule';
  }catch(error){if(own!==controller)return;ui.setGames([],null);empty(ui.list,'MLB schedule unavailable. Use the official scores link.');ui.status.textContent='MLB refresh failed · '+safeStatus(error.message)}
 }
 dayControls(ui,refresh,day=>{date=day;void refresh()},()=>date);select();watchCard(host,refresh);
}
const mediaTopics=[
 {id:'ethan',title:'Ethan Klein',volume:'200K+',question:'Why is Ethan Klein trending?',options:['Latest reporting','Videos and interviews','Search timeline'],query:'Ethan Klein'},
 {id:'avengers',title:'Avengers: Doomsday',volume:'20K+',question:'What is new about Avengers: Doomsday?',options:['Movie news','Trailers and interviews','Cast and release details'],query:'Avengers Doomsday'},
 {id:'gladiator',title:'Gladiator II on Netflix',volume:'20K+',question:'Where can I confirm streaming availability?',options:['Availability reporting','Trailer clips','Official title search'],query:'Gladiator II Netflix'}
];
function cultureCard(host){
 heading(host,'Google Trending Now Explorer','SEARCH & MEDIA','automatic');
 mountLatestTrends(host);
 const archive=make(host,'details','gt-archive');make(archive,'summary','','October 23, 2026 archived media spotlights');
 const nav=make(archive,'div','gt-tabs');
 const details=make(archive,'div','gt-media-detail');
 let selected=mediaTopics[0].id;
 const buttons=mediaTopics.map(t=>button(nav,t.title,()=>{selected=t.id;render()}));
 function render(){
  details.replaceChildren();const t=mediaTopics.find(x=>x.id===selected)||mediaTopics[0];
  buttons.forEach((b,i)=>{const a=mediaTopics[i].id===selected;b.classList.toggle('selected',a);b.setAttribute('aria-pressed',String(a))});
  make(details,'p','gt-snapshot',t.volume+' searches in the '+snapshot+' Google Trends U.S. snapshot');
  make(details,'h4','gt-topic',t.question);
  make(details,'p','gt-fine','Choose a destination to see current publisher results. External sites own the headlines, videos, availability claims and rights; QuantaPhi does not invent or republish their material.');
  const picks=make(details,'div','gt-picks');
  const urls=[
   [t.options[0]+' ↗',SOURCES.news+encodeURIComponent(t.query)],
   [t.options[1]+' ↗',SOURCES.youtube+encodeURIComponent(t.query)],
   [t.options[2]+' ↗','https://www.google.com/search?q='+encodeURIComponent(t.query)]
  ];
  urls.forEach(([label,url])=>picks.append(link(label,url)));
 }
 render();actions(host,[['View current Google trends ↗',SOURCES.trends],['Explore related stories ↗','https://news.google.com/']]);
}

/* Google search demand is checked on the server, NOT guessed in the browser.
 * This source feed is distinct from QuantaPhi's own visitor analytics. */
function mountLatestTrends(host){
 const panel=make(host,'section','gt-latest-feed');
 make(panel,'h4','gt-topic','Latest U.S. Google search trends');
 const controls=make(panel,'div','gt-toolbar');
 const status=make(panel,'p','gt-status','Checking the latest attributed Google Trends feed…');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const list=make(panel,'div','gt-games');
 controls.append(link('Original Google Trends feed ↗',SOURCES.trends));
 let controller,topics=[],selected=0;
 const nav=make(panel,'div','gt-topic-nav');
 let paused=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const prev=button(nav,'‹ Previous',()=>show(-1)),pause=button(nav,paused?'Resume':'Pause',()=>{paused=!paused;pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(paused))}),next=button(nav,'Next trend ›',()=>show(1));
 pause.setAttribute('aria-pressed',String(paused));
 function safePublic(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.hostname.includes('.')&&!/^[\d.]+$/.test(u.hostname)&&!u.hostname.endsWith('.local')?u.href:null}catch{return null}}
 function show(direction=0){
  if(!topics.length)return;selected=(selected+direction+topics.length)%topics.length;list.replaceChildren();
  const item=topics[selected],card=make(list,'article','gt-game gt-trend-feature');
  if(safePublic(item.image_url)){const img=make(card,'img','gt-trend-photo');img.src=item.image_url;img.alt=item.query+' — Google Trends source preview';img.referrerPolicy='no-referrer';img.decoding='async';img.addEventListener('error',()=>img.remove(),{once:true})}
  make(card,'p','gt-eyebrow','∞ INFINITY · TREND '+(selected+1)+' OF '+topics.length);
  make(card,'h4','gt-topic',item.query.slice(0,160));
  make(card,'p','gt-demand',item.approx_searches.slice(0,30)+' approximate searches');
  make(card,'p','gt-fine','Observed '+new Date(item.published_at).toLocaleString()+(item.image_credit?' · Image: '+String(item.image_credit).slice(0,90):''));
  const stories=Array.isArray(item.news)?item.news.slice(0,3):[];
  for(const story of stories){if(!safePublic(story.url)||typeof story.title!=='string')continue;const row=make(card,'div','gt-trend-story');row.append(link(story.title.slice(0,180),story.url));if(story.publisher)make(row,'small','gt-publisher',String(story.publisher).slice(0,90));if(story.description)make(row,'p','gt-fine',String(story.description).slice(0,220))}
  const row=make(card,'div','gt-actions');row.append(link('Publisher coverage ↗',SOURCES.news+encodeURIComponent(item.query)),link('Explore search ↗','https://www.google.com/search?q='+encodeURIComponent(item.query)));
  prev.disabled=next.disabled=topics.length<2;
 }
 async function refresh(){
  controller?.abort();controller=new AbortController();
  status.textContent='Checking latest published trend observations…';
  try{
   // Protected main cannot accept bot data commits. Prefer the freshest checked
   // snapshot from the canonical site or the dedicated, public trend-data branch.
   const urls=[
    '/data/google-trends-latest.json?checked='+Date.now(),
    'https://raw.githubusercontent.com/www-infinity4/QuantaPhi/trends-rss-data/data/google-trends-latest.json?checked='+Date.now()
   ];
   let feed=null;
   for(const url of urls){
    try{
     const response=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
     if(!response.ok)continue;
     const candidate=await response.json();
     if(candidate.schema_version!==1||candidate.source_url!=='https://trends.google.com/trending/rss?geo=US'||!Array.isArray(candidate.topics)||!candidate.topics.length)continue;
     if(Number.isFinite(Date.parse(candidate.checked_at))&&(!feed||Date.parse(candidate.checked_at)>Date.parse(feed.checked_at)))feed=candidate;
    }catch(error){if(error.name==='AbortError')throw error;}
   }
   if(!feed)throw Error('No verified published trend data from either source');
   if(feed.schema_version!==1||feed.source_url!=='https://trends.google.com/trending/rss?geo=US'||!Array.isArray(feed.topics))throw Error('Invalid trend feed');
   const checked=Date.parse(feed.checked_at);
   const valid=feed.topics.filter(t=>t&&typeof t.query==='string'&&t.query.trim()&&typeof t.approx_searches==='string'&&Number.isFinite(Date.parse(t.published_at))&&Date.parse(t.published_at)<=Date.now()+300000).slice(0,25);
   if(!Number.isFinite(checked)||checked>Date.now()+300000||!valid.length)throw Error('No verified trends in response');
   const newest=Math.max(...valid.map(t=>Date.parse(t.published_at)));
   const stale=Date.now()-checked>2*60*60*1000||Date.now()-newest>36*60*60*1000;
   const current=topics[selected]?.query;topics=valid;selected=Math.max(0,topics.findIndex(t=>t.query===current));
   if(!panel.contains(document.activeElement))show();
   status.textContent=(stale?'STALE SOURCE — last verified topics shown, not current trends':'Source verified')+' · last checked '+new Date(checked).toLocaleString()+' · '+valid.length+' topics · Google Trends approximate buckets, not QuantaPhi visits';
  }catch(error){
   if(error.name==='AbortError')return;
   list.replaceChildren();make(list,'p','gt-empty','A current trend snapshot is unavailable. Use the original Google Trends link; archived examples are below.');
   status.textContent='Trend refresh unavailable · '+safeStatus(error.message);
  }
 }
 button(controls,'↻ Refresh trends',()=>void refresh());
 panel.append(list,nav,status,controls);
 const visible=()=>!document.hidden&&host.getClientRects().length>0;
 let hovered=false;panel.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')hovered=true});panel.addEventListener('pointerleave',()=>{hovered=false});
 const timer=setInterval(()=>{if(visible()&&!paused&&!hovered&&!panel.contains(document.activeElement))show(1)},20000);
 watchCard(host,refresh);
 return timer;
}

const containers=[['googleTrendNba',nbaCard],['googleTrendMlb',mlbCard],['googleTrendCulture',cultureCard]];
for(const [id,init] of containers){const el=root.getElementById(id);if(!el)continue;el.classList.add('gt-card');if(el.dataset.trendingMounted==='1')continue;el.dataset.trendingMounted='1';init(el)}
})();