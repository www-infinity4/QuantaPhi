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
 make(host,'p','gt-snapshot',volume==='automatic'?'Latest observed trends are refreshed through a scheduled Google RSS import; the timestamp below shows actual freshness.':volume+' Google searches in the U.S. snapshot · '+snapshot+' · source: Google Trends');
 return {eyebrow,h};
}
function button(row,title,cb){
 const b=make(row,'button','gt-control',title);b.type='button';b.addEventListener('click',cb);return b;
}
function actions(host,urls){
 const line=make(host,'div','gt-actions');for(const [text,url] of urls)line.append(link(text,url));return line;
}
function scoreboardShell(host,title,short,volume,sourceUrl){
 heading(host,title,'GOOGLE TRENDING · '+short,volume);
 const toolbar=make(host,'div','gt-toolbar');
 const day=make(host,'strong','gt-date','');
 const status=make(host,'p','gt-status','Loading source…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const list=make(host,'div','gt-games');list.setAttribute('aria-label',title+' current game data');
 const footer=make(host,'p','gt-fine','Provider data may be delayed or unavailable. QuantaPhi does not control the upstream feed. Google search counts are a dated snapshot, not a count of game viewers.');
 const row=make(host,'div','gt-actions');
 row.append(link('Open source scoreboard ↗',sourceUrl),link('Google search trend ↗',SOURCES.trends));
 return {toolbar,day,status,list,footer};
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
function nbaCard(host){
 const ui=scoreboardShell(host,'NBA Matchup Center','BASKETBALL','200K+ Knicks–Celtics / 200K+ Bulls–Bucks',SOURCES.nba);
 let date=localDate(),choice='featured',controller;
 const tabs=make(host,'div','gt-tabs');
 const definitions=[['featured','Trending matchups'],['all','All NBA games']];
 const buttons=definitions.map(([id,label])=>button(tabs,label,()=>{choice=id;select();void refresh()}));
 function select(){buttons.forEach((b,i)=>{const selected=definitions[i][0]===choice;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('selected',selected)})}
 async function refresh(){
  controller?.abort();controller=new AbortController();
  ui.day.textContent=dateLabel(date);
  ui.status.textContent='Checking ESPN NBA games for '+date+'…';
  try{
   const data=await readJson('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates='+compactDay(date),controller);
   const games=Array.isArray(data.events)?data.events:[];
   const shown=choice==='featured'?games.filter(e=>{
    const teams=(e.competitions?.[0]?.competitors||[]).map(x=>String(x.team?.abbreviation||'').toUpperCase());
    return (teams.includes('BOS')&&teams.includes('NY'))||(teams.includes('CHI')&&teams.includes('MIL'));
   }):games;
   ui.list.replaceChildren();
   if(!shown.length)empty(ui.list,choice==='featured'?'No Knicks–Celtics or Bulls–Bucks games were found for this date. Use All NBA games or change the day.':'No games were returned for this date.');
   for(const e of shown.slice(0,25)){
    const pair=(e.competitions?.[0]?.competitors||[]).map(c=>({name:String(c.team?.displayName||c.team?.name||'Unknown'),score:c.score==null?null:c.score}));
    const state=safeStatus(e.status?.type?.description||e.status?.type?.name);
    const clock=e.status?.displayClock&&!/final|scheduled|postponed/i.test(state)?' · '+String(e.status.displayClock):'';
    const period=e.status?.period?' · period '+e.status.period:'';
    const source=e.links?.map(l=>validUrl(l.href,'espn.com')).find(Boolean)||SOURCES.nba;
    gameRow(ui.list,pair.length?pair:[{name:e.name||'NBA matchup'}],state+period+clock,source);
   }
   ui.status.textContent=shown.length+' of '+games.length+' NBA games shown · source checked '+fetchedAt()+' · ESPN data';
  }catch(error){if(error.name==='AbortError')return;empty(ui.list,'Scores unavailable right now. Use the source scoreboard link.');ui.status.textContent='NBA refresh failed · '+safeStatus(error.message)}
 }
 const setDate=day=>{date=day;void refresh()};
 dayControls(ui,refresh,setDate,()=>date);select();void refresh();
}
function mlbCard(host){
 const ui=scoreboardShell(host,'World Series Game Tracker','BASEBALL','200K+ Rays–Brewers',SOURCES.mlb);
 let date=localDate(),controller,mode='world-series';
 const tabs=make(host,'div','gt-tabs');
 const defs=[['world-series','World Series'],['all','All MLB games']];
 const buttons=defs.map(([id,label])=>button(tabs,label,()=>{mode=id;select();void refresh()}));
 function select(){buttons.forEach((b,i)=>{const selected=defs[i][0]===mode;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))})}
 async function refresh(){
  controller?.abort();controller=new AbortController();
  ui.day.textContent=dateLabel(date);ui.status.textContent='Checking MLB schedule for '+date+'…';
  try{
   const data=await readJson('https://statsapi.mlb.com/api/v1/schedule?sportId=1&date='+date+'&hydrate=linescore',controller);
   const games=(data.dates||[]).flatMap(d=>d.games||[]);
   const shown=mode==='world-series'?games.filter(g=>/world series/i.test(String(g.seriesDescription||''))):games;
   ui.list.replaceChildren();
   if(!shown.length)empty(ui.list,mode==='world-series'?'No World Series game appears on this date. Switch days or choose All MLB games.':'No MLB games appear on this date.');
   for(const g of shown.slice(0,30)){
    const state=safeStatus(g.status?.detailedState||g.status?.abstractGameState);
    const inning=g.linescore?.currentInningOrdinal?' · '+String(g.linescore.currentInningOrdinal):'';
    const desc=g.seriesDescription?String(g.seriesDescription).slice(0,45)+' · ':'';
    const source=Number.isInteger(g.gamePk)&&g.gamePk>0?'https://www.mlb.com/gameday/'+g.gamePk:SOURCES.mlb;
    gameRow(ui.list,[{name:g.teams?.away?.team?.name,score:g.teams?.away?.score},{name:g.teams?.home?.team?.name,score:g.teams?.home?.score}],desc+state+inning,source);
   }
   ui.status.textContent=shown.length+' of '+games.length+' MLB games shown · source checked '+fetchedAt()+' · MLB schedule';
  }catch(error){if(error.name==='AbortError')return;empty(ui.list,'The MLB schedule is unavailable right now. Open the official scores link.');ui.status.textContent='MLB refresh failed · '+safeStatus(error.message)}
 }
 const setDate=day=>{date=day;void refresh()};
 dayControls(ui,refresh,setDate,()=>date);select();void refresh();
}
const mediaTopics=[
 {id:'ethan',title:'Ethan Klein',volume:'200K+',question:'Why is Ethan Klein trending?',options:['Latest reporting','Videos and interviews','Search timeline'],query:'Ethan Klein'},
 {id:'avengers',title:'Avengers: Doomsday',volume:'20K+',question:'What is new about Avengers: Doomsday?',options:['Movie news','Trailers and interviews','Cast and release details'],query:'Avengers Doomsday'},
 {id:'gladiator',title:'Gladiator II on Netflix',volume:'20K+',question:'Where can I confirm streaming availability?',options:['Availability reporting','Trailer clips','Official title search'],query:'Gladiator II Netflix'}
];
function cultureCard(host){
 heading(host,'Google Trending Now Explorer','SEARCH & MEDIA','automatic');
 mountLatestTrends(host);
 make(host,'h4','gt-topic','October 23, 2026 archived media spotlights');
 const nav=make(host,'div','gt-tabs');
 const details=make(host,'div','gt-media-detail');
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
 let controller;
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
   list.replaceChildren();
   for(const item of valid){
    const card=make(list,'article','gt-game');
    make(card,'h4','gt-topic',item.query.slice(0,160));
    make(card,'p','gt-fine','Google estimate: '+item.approx_searches.slice(0,30)+' searches · observed '+new Date(item.published_at).toLocaleString());
    const row=make(card,'div','gt-actions');
    row.append(link('Publisher coverage ↗',SOURCES.news+encodeURIComponent(item.query)),link('Explore search ↗','https://www.google.com/search?q='+encodeURIComponent(item.query)));
   }
   status.textContent=(stale?'STALE SOURCE — last verified topics shown, not current trends':'Source verified')+' · last checked '+new Date(checked).toLocaleString()+' · '+valid.length+' topics · Google Trends approximate buckets, not QuantaPhi visits';
  }catch(error){
   if(error.name==='AbortError')return;
   list.replaceChildren();make(list,'p','gt-empty','A current trend snapshot is unavailable. Use the original Google Trends link; archived examples are below.');
   status.textContent='Trend refresh unavailable · '+safeStatus(error.message);
  }
 }
 button(controls,'↻ Refresh trends',()=>void refresh());
 const timer=setInterval(()=>{if(!document.hidden)void refresh()},5*60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh()});
 void refresh();
 return timer;
}

const containers=[['googleTrendNba',nbaCard],['googleTrendMlb',mlbCard],['googleTrendCulture',cultureCard]];
for(const [id,init] of containers){const el=root.getElementById(id);if(!el)continue;el.classList.add('gt-card');if(el.dataset.trendingMounted==='1')continue;el.dataset.trendingMounted='1';init(el)}
})();