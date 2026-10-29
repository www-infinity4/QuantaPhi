import {
 FOX_WATCH_URL,FOX_LIVE_URL,FOX_NEWS_URL,FOX_SPORTS_URL,TEAMS,
 scoreText,fetchWorldSeries,REFRESH_MS
} from './world-series-score.mjs?v=20261028-game5c';

const make=(tag,klass,content)=>{
 const el=document.createElement(tag);if(klass)el.className=klass;
 if(content!==undefined)el.textContent=content;return el;
};
const link=(label,url,klass='')=>{
 const a=make('a',klass,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
};
export const FOX_CHANNELS=Object.freeze([
 {key:'world-series',title:'FOX · World Series',kind:'MLB · GAME 5',url:FOX_WATCH_URL,copy:'Brewers at Rays · tonight at 7 PM Central on FOX / FOX One.'},
 {key:'fox-one',title:'FOX One · Live TV',kind:'LIVE TV · FOX',url:FOX_LIVE_URL,copy:'Sports, news and programming with FOX One or eligible provider sign-in.'},
 {key:'fox-sports',title:'FOX Sports',kind:'SPORTS · MLB',url:FOX_SPORTS_URL,copy:'FOX Sports game coverage, updates and highlights.'},
 {key:'fox-news',title:'FOX News',kind:'NEWS · LIVE CHANNEL',url:FOX_NEWS_URL,copy:'FOX News live TV on FOX One, subject to provider access.'}
]);
function createMatch(){
 const wrap=make('div','fit-match');
 const teams=make('div','fit-scoreline');
 const col=(side)=>{
  const t=TEAMS[side],part=make('div','fit-side');
  const logo=make('img','fit-logo');logo.src=t.logo;logo.alt=t.name+' official team logo';logo.width=56;logo.height=56;logo.loading='lazy';
  const name=make('span','fit-team',t.abbr);part.append(logo,name);return part;
 };
 const away=col('away'),home=col('home');
 const score=make('strong','fit-score','— – —');
 score.setAttribute('aria-label','Score not yet verified');
 teams.append(away,score,home);
 const status=make('span','fit-status','Reading MLB game feed…');
 const stamp=make('small','fit-stamp','Scores supplied by MLB; refreshing every 5 minutes while viewing.');
 wrap.append(teams,status,stamp);
 return {wrap,score,status,stamp};
}
function applyMatch(view,game){
 if(!game){view.score.textContent='— – —';view.status.textContent='MLB data unavailable';view.stamp.textContent='Cannot confirm a current score. Open MLB Game Center.';return;}
 view.score.textContent=scoreText(game);
 view.score.setAttribute('aria-label','Milwaukee Brewers '+(game.away??'unavailable')+', Tampa Bay Rays '+(game.home??'unavailable'));
 const live=game.status==='live',final=game.status==='final';
 view.status.textContent=live?'● LIVE'+(game.inning?' · '+game.inning:''):final?'FINAL':game.status==='pregame'?'PREGAME · 7:00 PM CENTRAL':'MLB status: '+game.detail;
 view.status.dataset.state=game.status;
 view.stamp.textContent=(game.stale?'Last verified':'Verified')+' MLB score · '+(game.fetchedAt?new Date(game.fetchedAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'pending');
}
export function mountFoxViewer(root,{compact=false,channel='world-series'}={}){
 if(!root)return null;
 const initial=FOX_CHANNELS.find(c=>c.key===channel)||FOX_CHANNELS[0];
 const frameContainer=make('div','fit-frame-container');frameContainer.hidden=true;
 const header=make('header','fit-header');
 header.append(make('span','fit-kicker','INFINITY TV · FOX CHANNELS · INDEPENDENT VIEWER'),
  make('h1','',initial.title),
  make('p','fit-copy','2026 World Series Game 5 · tonight at 7 PM Central. Live game scores from MLB. The FOX broadcast requires FOX One or a participating TV provider.'));
 const match=createMatch();
 const actions=make('div','fit-actions');
 const watch=link('▶ Open '+initial.title+' at FOX',initial.url,'fit-btn fit-primary');
 const source=link('MLB official game center','https://www.mlb.com/gameday/849799','fit-btn fit-secondary');
 const frameToggle=make('button','fit-btn fit-secondary','Try FOX in Infinity Viewer');
 frameToggle.type='button';frameToggle.setAttribute('aria-expanded','false');
 actions.append(watch,frameToggle,source);
 const help=make('p','fit-hint','The player belongs to FOX. When an official FOX video cannot be embedded here, choose Watch live on FOX One to sign in and play it at FOX.');
 help.setAttribute('role','status');
 const nav=make('nav','fit-channel-nav');
 nav.setAttribute('aria-label','FOX channel selections');
 let selection=initial;
 const tabs=[];
 for(const c of FOX_CHANNELS){
  const button=make('button','fit-channel-tab',c.title);
  button.type='button';button.setAttribute('aria-pressed',String(c===selection));
  button.addEventListener('click',()=>{
   selection=c;watch.href=c.url;watch.textContent='▶ Open '+c.title+' at FOX';
   header.querySelector('h1').textContent=c.title;
   header.querySelector('.fit-copy').textContent=c.copy;
   for(const t of tabs)t.button.setAttribute('aria-pressed',String(t.c===c));
   if(frameContainer.hidden===false)closeFrame();
  });
  nav.append(button);tabs.push({c,button});
 }
 function closeFrame(){
  frameContainer.replaceChildren();frameContainer.hidden=true;
  frameToggle.textContent='Try FOX in Infinity Viewer';
  frameToggle.setAttribute('aria-expanded','false');
 }
 frameToggle.addEventListener('click',()=>{
  if(!frameContainer.hidden){closeFrame();return;}
  const frame=make('iframe','fit-fox-frame');
  frame.title='Official '+selection.title+' website (embedding subject to FOX policy)';
  frame.src=selection.url;frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.allow='encrypted-media; autoplay; fullscreen';frame.allowFullscreen=true;
  frameContainer.replaceChildren(frame);frameContainer.hidden=false;
  frameToggle.textContent='Close FOX frame';frameToggle.setAttribute('aria-expanded','true');
  help.textContent='Requested official FOX website in Infinity Viewer. If the frame is blocked or shows sign-in trouble, open FOX One using the link above. A frame load does not prove video access.';
 });
 const footer=make('p','fit-footer','Independent Infinity 2026® guide · FOX and MLB retain their broadcast, marks, and content rights. No copied feeds or credential interception.');
 root.classList.add('fit-viewer');if(compact)root.classList.add('fit-compact');
 root.append(header,match.wrap,actions,frameContainer,help,nav,footer);
 const update=async()=>{
  if(document.hidden&&!compact)return;
  applyMatch(match,await fetchWorldSeries());
 };
 void update();
 const timer=setInterval(update,REFRESH_MS);
 const clear=()=>{clearInterval(timer);closeFrame()};
 window.addEventListener('pagehide',clear,{once:true});
 document.addEventListener('oracle:card-deactivated',e=>{
  if(e.detail?.id==='phiChannelCards')closeFrame();
 });
 return {update,stop:clear,root,match};
}
function mountFoxTvWall(){
 const grid=document.querySelector('#phiChannelCards .channelphi-grid');
 if(!grid||grid.querySelector('.channelphi-fox-one'))return;
 for(const channel of FOX_CHANNELS){
  const card=make('article','channelphi-card channelphi-fox-one');
  card.dataset.foxChannel=channel.key;
  card.append(make('span','fit-kicker',channel.kind),make('h3','fit-card-title',channel.title),
   make('p','fit-description',channel.copy));
  if(channel.key==='world-series'){
   const match=createMatch();card.append(match.wrap);
   const refresh=async()=>{if(!document.hidden)applyMatch(match,await fetchWorldSeries())};
   void refresh();setInterval(refresh,REFRESH_MS);
  }
  const actions=make('div','fit-card-actions');
  const viewer=link('Open Infinity Viewer','/infinity-tv/fox.html?channel='+encodeURIComponent(channel.key),'fit-btn fit-primary');
  viewer.target='_self';
  const official=link('Watch at FOX',channel.url,'fit-btn fit-secondary');
  actions.append(viewer,official);card.append(actions);
  grid.append(card);
 }
}
if(typeof document!=='undefined'){
 const ready=()=>{
  mountFoxTvWall();
  const root=document.getElementById('foxInfinityViewer');
  if(root)mountFoxViewer(root,{channel:new URLSearchParams(location.search).get('channel')||'world-series'});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
 else ready();
}
