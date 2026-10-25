import {REQUESTED_PUBLIC_CARDS,QUEUED_REQUESTS,validBrandSportsCard} from './verified-brand-sports-catalog.mjs';
import {mountCardActions} from './quanta-card-actions.mjs';

/* An original, working quick-card body with a source identity, 3 relevant
 * on-card actions, and the shared collection toolbar. No synthetic brand art.
 * A card is only rotation-ready AFTER its actual source icon/image loads.
 */
export const VERIFIED_CARD_COUNT=REQUESTED_PUBLIC_CARDS.filter(validBrandSportsCard).length;
export function isSafeCardUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}
}
const el=(tag,cls,txt)=>{
 const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;
};
function link(label,href,cls){
 if(!isSafeCardUrl(href))throw Error('unsafe_card_destination');
 const a=el('a',cls,label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';
 return a;
}
const isEvent=c=>c.event==='NFL'||c.event==='MLB';
function createVisual(card,article){
 const visual=el('div','vbs-art vbs-'+card.kind);
 const primary=el('img','vbs-identity');
 primary.alt=card.name+' — source identity';
 primary.loading='lazy';primary.decoding='async';
 primary.referrerPolicy='no-referrer';
 primary.src=card.visual;
 let failed=false;
 const unavailable=()=>{
  if(failed)return;failed=true;article.dataset.sourceReady='false';
  article.remove();window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
 };
 const sourceReady=()=>{
  if(failed)return;
  if(!primary.naturalWidth||!primary.naturalHeight)return unavailable();
  article.dataset.sourceReady='true';
  window.dispatchEvent(new CustomEvent('quantaphi:source-cards-ready',{
   detail:{source:'verified-brand-sports',id:card.id}
  }));
 };
 primary.addEventListener('load',sourceReady,{once:true});
 primary.addEventListener('error',unavailable,{once:true});
 visual.append(primary);
 if(card.secondaryVisual){
  const divider=el('span','vbs-vs','VS');
  const second=el('img','vbs-identity vbs-secondary');
  second.alt='Opponent/team logo from original sports media';
  second.src=card.secondaryVisual;second.decoding='async';second.loading='lazy';
  second.addEventListener('error',unavailable,{once:true});
  visual.append(divider,second);
 }
 return visual;
}
function distinctLead(card){
 switch(card.kind){
  case 'game': return 'MATCH CENTER';
  case 'schedule': return 'NEXT UP';
  case 'matchup': return 'PITCHER DUEL';
  case 'lineup': return 'BATTING ORDER';
  case 'highlights': return 'OFFICIAL VIDEO';
  case 'recap': return 'GAME RECAP';
  case 'tracker': return 'PLAY-BY-PLAY WATCH';
  case 'broadcast': return 'WATCH ON ORIGINAL SERVICE';
  case 'coupon': return 'OFFICIAL DEALS';
  case 'vehicle': return 'CONFIGURE & COMPARE';
  case 'wearable': return 'ACTUAL PRODUCT RESEARCH';
  case 'civic': return 'NONPARTISAN PUBLIC OFFICE';
  case 'health': return 'EVIDENCE-BASED HEALTH EDUCATION';
  case 'announcer': return 'ORIGINAL GAME VOICE · EXPERIMENTAL';
  default:return 'ORIGINAL SOURCE';
 }
}
const sampleAnnouncerFacts=Object.freeze([
 'Today’s NFL matchup is Green Bay at Detroit. The original FOX broadcast and official game center are one tap away.',
 'In baseball, Milwaukee won World Series Game 2 by five runs to four on October twenty-fourth. Tampa Bay and Milwaukee meet again for Game 3.',
 'This is original QuantaPhi commentary from dated public facts, not a live broadcast. Check the official game center for the latest plays.'
]);
export function createVerifiedCard(card){
 if(!validBrandSportsCard(card))throw Error('unverified_card_source');
 const node=el('article','iqc-card vbs-card vbs-kind-'+card.kind+' vbs-category-'+(card.event||'original').toLowerCase());
 node.dataset.sourceId=card.id;
 node.dataset.sourceName=card.name;
 node.dataset.sourceReady='false';
 node.dataset.kind=card.kind;
 node.dataset.category=card.category;
 node.dataset.checked=card.checked;
 if(card.nonTargeted)node.dataset.personalization='disabled';
 node.append(createVisual(card,node));
 const info=el('div','vbs-info');
 info.append(el('p','vbs-kicker',distinctLead(card)),el('h3','vbs-title',card.name));
 if(isEvent(card)){
  const p=el('p','vbs-broadcaster','SOURCE: '+(card.event==='NFL'?'NFL / OFFICIAL TEAM':'MLB / OFFICIAL TEAM')+
   (card.network?' · '+card.network:''));
  info.append(p);
 }
 info.append(el('p','vbs-description',card.description));
 if(card.kind==='coupon'){
  info.append(el('p','vbs-terms','Offer codes, dates, eligibility and redemption must be checked with the original retailer. No fabricated coupons.'));
 }
 if(card.kind==='health'){
  info.append(el('p','vbs-health-note','General information, not personal medical advice or a diagnosis. Ask a clinician about appropriate screening and follow-up.'));
 }
 if(card.kind==='civic'){
  info.append(el('p','vbs-neutral','Independent civic directory. Not an endorsement or an official government application.'));
 }
 if(isEvent(card)){
  const live=el('p','vbs-updates','Scores and highlights can change. Open the official game center for current play-by-play; no live game feed is claimed here.');
  info.append(live);
 }
 const controls=el('nav','vbs-topics');controls.setAttribute('aria-label',card.name+' actions');
 for(const action of card.actions){
  controls.append(link(action.label,action.url,'vbs-source-action'));
 }
 info.append(controls);
 if(isEvent(card))appendSportsCoverage(card,info,node);
 if(card.kind==='announcer')appendAnnouncer(info);
 const notes=el('p','vbs-attribution','Verified source links · Checked '+card.checked+' · Independent QuantaPhi card, not an official endorsement or paid advertisement.');
 info.append(notes);
 const shared=el('div','vbs-shared-actions');
 mountCardActions(shared,{
  id:card.id,name:card.name,category:card.category,featureUrl:card.official,
  official:card.official,route:'/?card='+encodeURIComponent(card.id)
 },{showSearch:false});
 info.append(shared);
 node.append(info);
 return node;
}
const sportsQueries=Object.freeze({
 'packers-lions-2026':['packers.com','Packers Lions October 25 2026 play-by-play highlights'],
 'fox-nfl-watch':['foxsports.com','Packers Lions NFL October 25 2026 highlights'],
 'lions-interception-watch':['detroitlions.com','Packers Lions 2026 interceptions takeaways highlight'],
 'packers-next-schedule':['packers.com','Packers next game 2026 schedule'],
 'lions-next-schedule':['detroitlions.com','Lions next game 2026 schedule'],
 'world-series-game3-2026':['mlb.com','World Series Brewers Rays Game 3 October 26 2026'],
 'world-series-pitchers-2026':['mlb.com','Brewers Rays Game 3 pitcher Robert Gasser Freddy Peralta'],
 'world-series-lineups-2026':['mlb.com','2026 World Series Game 3 lineups Brewers Rays'],
 'world-series-game2-highlights':['mlb.com','Brewers Rays Game 2 2026 World Series highlights'],
 'world-series-game1-recap':['mlb.com','Brewers Rays World Series Game 1 2026 highlights'],
 'world-series-future-games':['mlb.com','2026 World Series upcoming games schedule'],
 'tucker-kraft-plays':['packers.com','Tucker Kraft 2026 Packers Lions highlights']
});
export function safeSportsArticle(url,domain){
 if(!isSafeCardUrl(url)||!domain)return false;
 const host=new URL(url).hostname.toLowerCase();
 return host===domain||host.endsWith('.'+domain);
}
function appendSportsCoverage(card,info,node){
 const record=sportsQueries[card.id];
 if(!record)return;
 const [domain,query]=record;
 const panel=el('section','vbs-news-panel');
 const title=el('h4','vbs-news-title','Recent official-source coverage');
 const status=el('p','vbs-news-status','Source headlines load only when this card opens.');
 const results=el('div','vbs-news-results');
 const refresh=el('button','vbs-news-refresh','Refresh source headlines');refresh.type='button';
 panel.append(title,status,results,refresh);
 info.append(panel);
 let active=false,last=0,seq=0;
 async function load(){
  if(active||Date.now()-last<60*1000)return;
  active=true;last=Date.now();const thisRequest=++seq;
  status.textContent='Checking attributed source headlines…';refresh.disabled=true;
  try{
   const url=new URL('https://orange-brook-a2ac.marvaseater.workers.dev/search');
   url.search=new URLSearchParams({q:'site:'+domain+' '+query,format:'json',categories:'general',safesearch:'1'});
   const r=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(14000)});
   if(!r.ok)throw Error('unavailable');
   const data=await r.json();
   if(thisRequest!==seq)return;
   const list=(Array.isArray(data?.results)?data.results:[])
     .filter(x=>x&&safeSportsArticle(x.url,domain)&&String(x.title||'').length>9)
     .slice(0,4);
   results.replaceChildren();
   for(const item of list){
    const row=el('article','vbs-news-item');
    row.append(link(String(item.title).slice(0,160),item.url,'vbs-news-link'));
    if(item.publishedDate){
     const d=new Date(item.publishedDate);
     if(Number.isFinite(d.getTime()))row.append(el('small','vbs-news-date','Published '+d.toLocaleDateString()));
    }
    row.append(el('p','vbs-news-preview',String(item.content||item.description||'').replace(/<[^>]*>/g,'').slice(0,150)));
    results.append(row);
   }
   status.textContent=list.length?list.length+' attributed results · indexed source headlines, NOT a live score':
    'No matching recent source headlines found. Use official game and video links above.';
  }catch{
   status.textContent='Source headlines are unavailable. Official broadcast and game-center links remain available.';
  }finally{active=false;refresh.disabled=false;}
 }
 refresh.addEventListener('click',()=>{last=0;void load()});
 node.addEventListener('oracle:activate',()=>{void load()});
}

function appendAnnouncer(info){
 const panel=el('section','vbs-announcer');
 const facts=el('p','vbs-announcer-copy',sampleAnnouncerFacts.join(' '));
 const play=el('button','vbs-announcer-play','▶ Narrate these verified facts');
 const stop=el('button','vbs-announcer-stop','■ Stop narration');
 const status=el('p','vbs-announcer-status','Sample commentary; no live game feed or voice impersonation.');
 function stopSpeaking(){
  try{speechSynthesis.cancel()}catch{}
  status.textContent='Narration stopped.';
 }
 play.type=stop.type='button';
 play.addEventListener('click',()=>{
  if(typeof speechSynthesis==='undefined'||typeof SpeechSynthesisUtterance==='undefined'){
   status.textContent='Speech playback is not available in this browser. Read the facts above.';return;
  }
  speechSynthesis.cancel();
  const utter=new SpeechSynthesisUtterance(sampleAnnouncerFacts.join(' '));
  utter.rate=1.03;utter.pitch=1;
  utter.onend=()=>{status.textContent='Sample narration finished. For current plays, open official game center.'};
  utter.onerror=()=>{status.textContent='Narration unavailable. Text remains visible.'};
  speechSynthesis.speak(utter);
  status.textContent='Narrating the dated, public facts displayed on the card.';
 });
 stop.addEventListener('click',stopSpeaking);
 document.addEventListener('oracle:card-deactivated',stopSpeaking);
 panel.append(facts,play,stop,status);info.append(panel);
}
export function mountVerifiedCards(){
 const bank=document.getElementById('verifiedBrandSportsCards');
 if(!bank||bank.dataset.mounted==='true')return;
 bank.dataset.mounted='true';
 const valid=REQUESTED_PUBLIC_CARDS.filter(validBrandSportsCard);
 // Keep source widgets in their original hidden bank. The Oracle top viewer
 // moves the same DOM node into the spotlight and preserves all click handlers.
 bank.append(...valid.map(createVerifiedCard));
 window.dispatchEvent(new CustomEvent('quantaphi:source-cards-ready',{
  detail:{source:'verified-brand-sports',attempted:valid.length,queued:QUEUED_REQUESTS.length}
 }));
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountVerifiedCards,{once:true});
 else mountVerifiedCards();
}
