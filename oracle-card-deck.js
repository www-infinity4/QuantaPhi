/* Oracle top viewer: MOVE original live card, never clone its event handlers.
 * Every interactive widget stays in the DOM at its original anchor.
 * No wallet, remote script, recording or conversation is fabricated. */
(function(){
'use strict';
const host=document.getElementById('oracleCardDeck'),stage=document.getElementById('oracleCardStage');
if(!host||!stage)return;
const now=document.getElementById('oracleCardNow'),status=document.getElementById('oracleCardStatus'),
 next=document.getElementById('oracleCardNext'),prev=document.getElementById('oracleCardPrevious'),scroll=document.getElementById('oracleCardScroll');
const choices=[
 ['cardoneCapitalOffer','10X Westshore · Cardone Capital'],
 ['siteQuickCards','Source quick cards · Google, YouTube, Fox, CNN, StarMaker and more'],
 ['quantaDirectoryCards','Find a name, website or StarMaker song'],
 ['scienceQuickCards','Muse AI, NASA Webb, science and technology'],
 ['pixieStoryCard','Pixie Stories · Read and explore'],
 ['googleTrendNba','NBA · Trending matchups'],
 ['googleTrendMlb','MLB · World Series'],
 ['googleTrendCulture','Media · Trending searches'],
 ['infiniteBook','Read an original story'],
 ['phiChannelCards','Watch a channel'],
 ['phiStoryWriter','Write a story'],
 ['bubblesAICard','Talk to Bubbles'],
 ['phiMediaBuilder','Create images and video'],
 ['result','Explore research and Asteroid'],
 ['fredSpacesRadio','Listen to Media Star'],
 ['followingSpacesRadio','Explore radio shows'],
 ['magooSpacesRadio','Hear featured episodes'],
 ['mediaStarCreator','Build your media card'],
 ['infinityConcepts','Explore ideas'],
 ['groupStoryBuild','Build a group story'],
 ['radioClubhouse','Listen and research'],
 ['halloweenPhi','Watch a cinema'],
 ['phiProjectActions','Build a website'],
 ['shopAdPhi','Discover products'],
 ['phiChannelCards','Watch live television'],
 ['publicCardTrends','Explore what is trending']
];

/* These are the ORIGINAL live widgets, not duplicated external link previews.
 * Shared IDs connect the Oracle viewer to Public / For You / Following. */
const CARD_DIRECTIONS={
 cardoneCapitalOffer:['cardone-capital','Real estate','Study cashflow, fees and property risk'],
 siteQuickCards:['quanta-feed','Discovery','Use the focused search, media and website cards'],
 quantaDirectoryCards:['public-directory','Directory','Search verified names, businesses and websites'],
 scienceQuickCards:['nasa-science','Science','Study current science and research'],
 pixieStoryCard:['pixie-stories','Stories','Read an original Pixie story'],
 googleTrendNba:['trending-nba','Sports','Explore an NBA match and related research'],
 googleTrendMlb:['trending-mlb','Sports','Explore World Series matchups'],
 googleTrendCulture:['trending-media','Media','Investigate popular media and events'],
 infiniteBook:['reads-realms','Stories','Read and research an original story'],
 phiChannelCards:['channels','Television','Watch a channel'],
 phiStoryWriter:['story-writer','Stories','Write or continue a story'],
 bubblesAICard:['deck-bubbles','Research','Ask Bubbles to research and connect ideas'],
 phiMediaBuilder:['image-builder','Media','Create images and video'],
 result:['deck-research','Research','Explore sources and a current AI overview'],
 fredSpacesRadio:['fred-spaces','Music','Listen to an indexed Media Star conversation'],
 followingSpacesRadio:['following-spaces','Music','Choose a followed host and show'],
 magooSpacesRadio:['magoo-spaces','Music','Listen to a featured Space'],
 mediaStarCreator:['media-star-creator','Media','Produce your own playable media card'],
 infinityConcepts:['concepts','Science','Explore physics, invention and ideas'],
 groupStoryBuild:['group-story','Stories','Build a group story'],
 radioClubhouse:['radio-clubhouse','Vintage radios','Read antique radio discussions and investigate repairs'],
 halloweenPhi:['deck-halloween','Television','Watch an original cinema card'],
 phiProjectActions:['deck-projects','Creation','Build or improve a real website project'],
 shopAdPhi:['deck-shop','Shopping','Explore interactive product and advertising tools'],
 publicCardTrends:['trending-now','Research','Investigate verified trends and search interests']
};

const unique=[...new Map(choices.map(([id,title])=>[id,title])).entries()];
const entries=unique.map(([id,title])=>{
 const [feedId,category,feature]=CARD_DIRECTIONS[id]||['deck-'+id.toLowerCase(),'Discovery',title];
 return {id,title,feedId,category,feature,study:title,node:document.getElementById(id),marker:null,count:0};
}).filter(x=>x.node);
const STORE='oracle:card-activity:v1';
const cardoneButton=document.getElementById('oracleCardCardone');
const CARDONE_ID='cardoneCapitalOffer';
const spotlightRequested=(()=>{try{
 const url=new URL(location.href);
 const names={cardone:'cardoneCapitalOffer',pixie:'pixieStoryCard',nba:'googleTrendNba',mlb:'googleTrendMlb',media:'googleTrendCulture'};
 return names[url.searchParams.get('card')]||(url.hash==='#cardoneCapitalOffer'?'cardoneCapitalOffer':null);
}catch{return null}})();
let counts={};try{counts=JSON.parse(localStorage.getItem(STORE)||'{}')||{}}catch{}
entries.forEach(x=>x.count=Math.max(0,Math.min(1000,Number(counts[x.id])||0)));
let active=null,expanded=false;
const tabButtons=[...host.querySelectorAll('[data-oracle-feed]')];
const follow=document.getElementById('oracleCardFollow'),reason=document.getElementById('oracleCardReason');
let selectedTab='public',directionApi=null,quantApi=null,quantWeights={},quantConnected=false;
let feedState=null,proposed=null;
const visited=[];
const readDirections=()=>{try{return directionApi.cleanFeedState(JSON.parse(localStorage.getItem(directionApi.FEED_STORAGE_KEY)||'{}'))}catch{return directionApi.cleanFeedState({})}};
function storeDirections(){if(!directionApi||!feedState)return;try{localStorage.setItem(directionApi.FEED_STORAGE_KEY,JSON.stringify(feedState))}catch{}}
function liveCatalog(){return entries.filter(available).map(e=>({id:e.feedId,name:e.title,category:e.category,feature:e.feature,study:e.study}));}
function eligible(){const cards=entries.filter(available);return selectedTab==='following'&&feedState?
 cards.filter(e=>feedState.following.includes(e.feedId)):cards;}
function updateTabs(){
 tabButtons.forEach(b=>{const on=b.dataset.oracleFeed===selectedTab;b.setAttribute('aria-selected',String(on));b.classList.toggle('oracle-current',on);});
 if(follow){
  const saved=Boolean(active&&feedState?.following.includes(active.feedId));
  follow.hidden=!active;
  follow.textContent=saved?'✓ Following':'+ Follow';
  follow.setAttribute('aria-pressed',String(saved));
 }
}
function predict(){
 proposed=null;
 if(expanded)return;
 const possible=eligible();
 if(!possible.length){next.disabled=true;reason.textContent='Your Following view is empty. Return to Public and add a card with + Follow.';return;}
 if(directionApi&&feedState){
  const present=liveCatalog();
  const context={...feedState,catalog:present,quantScores:quantWeights};
  const pick=directionApi.nextFeedDirection(
   present.filter(c=>possible.some(e=>e.feedId===c.id)),selectedTab,context,active?.feedId||'');
  proposed=possible.find(e=>e.feedId===pick.card?.id)||null;
  reason.textContent=proposed?(proposed.title+' · '+pick.reason):
   'Use a card to help choose the next useful action.';
 }else{
  proposed=possible.find(x=>x!==active)||possible[0];
  reason.textContent=proposed?'Next: '+proposed.title:'';
 }
 next.disabled=possible.length<2;
}
async function connectQuant(){
 if(selectedTab!=='for-you'||!quantApi)return;
 const result=await quantApi.loadOwnQuantScores(window.QuantaCloudConnection,liveCatalog());
 quantWeights=result.scores||{};quantConnected=result.connected===true;
 if(selectedTab==='for-you')predict();
}
tabButtons.forEach(b=>b.addEventListener('click',()=>{
 selectedTab=b.dataset.oracleFeed;visited.length=0;
 feedState=directionApi?readDirections():feedState;
 updateTabs();
 if(selectedTab==='following'&&!eligible().some(e=>e===active)){
  returnActive();const first=eligible()[0];if(first)show(first,false);else{
   now.textContent='No followed interactive cards';status.textContent='Use Public and tap + Follow on any live card.';
  }
 }
 if(selectedTab==='for-you')void connectQuant();
 predict();
}));
follow?.addEventListener('click',()=>{
 if(!directionApi||!active)return;
 feedState=directionApi.toggleFollowing(readDirections(),active.feedId);storeDirections();
 if(selectedTab==='following'&&!feedState.following.includes(active.feedId)){
  returnActive();const first=eligible()[0];if(first)show(first,false);
  else {now.textContent='No followed interactive cards';status.textContent='Choose Public and follow a card to fill this view.';}
 }
 updateTabs();predict();
 window.dispatchEvent(new CustomEvent('quantaphi:feed-updated',{detail:{origin:'oracle-viewer'}}));
});
window.addEventListener('quantaphi:feed-updated',e=>{
 if(e.detail?.origin==='oracle-viewer'||!directionApi)return;
 feedState=readDirections();
 updateTabs();predict();
});
Promise.all([import('/quanta-feed-rank.mjs?v=20261024-directions1'),
 import('/quanta-feed-quants.mjs?v=20261024-directions1')]).then(([r,q])=>{
 directionApi=r;quantApi=q;feedState=readDirections();updateTabs();
 if(selectedTab==='for-you')void connectQuant();
 predict();
}).catch(()=>{reason.textContent='Card directions are not available; original interactive cards are still usable.'});
function available(entry){
 if(!entry?.node)return false;
 if(entry.node.hidden)return false;
 if(entry.id==='infiniteBook'&&entry.node.querySelector('.ib-story')===null)return false;
 // Root components can be empty until their asynchronous scripts finish.
 return entry.node.children.length>0;
}
function order(){return entries.filter(available).sort((a,b)=>b.count-a.count||entries.indexOf(a)-entries.indexOf(b))}
function returnActive(){
 if(!active)return;
 const {node,marker}=active;
 // Playing TV must stop immediately before the viewer switches away.
 if(active.id==='phiChannelCards')document.dispatchEvent(new CustomEvent('oracle:card-deactivated',{detail:{id:active.id}}));
 // Story generation may reparent Asteroid into the research card while a
 // search begins. Never pull it back out of that authoritative context.
 if(node.parentNode===stage&&marker?.parentNode)marker.parentNode.insertBefore(node,marker);
 marker?.remove();
 active.marker=null;active=null;
 stage.replaceChildren();
}
function show(entry,remember=true){
 if(!entry||expanded||entry===active)return;
 if(remember&&active)visited.push(active.id);
 if(visited.length>45)visited.shift();
 returnActive();
 // Preserve exactly one original node and every listener, media control and data store.
 const marker=document.createComment('Oracle card original location: '+entry.id);
 entry.node.parentNode.insertBefore(marker,entry.node);entry.marker=marker;
 stage.append(entry.node);active=entry;
 entry.count=Math.min(1000,entry.count+1);counts[entry.id]=entry.count;
 try{localStorage.setItem(STORE,JSON.stringify(counts))}catch{}
 if(directionApi&&feedState){feedState=directionApi.markViewed(readDirections(),entry.feedId);storeDirections()}
 now.textContent=entry.title;updateTabs();predict();
 status.textContent='Live interactive card · '+entry.title+
  '. '+(selectedTab==='for-you'?(quantConnected?'Signed-in Quant interests and selected cards inform directions.':'Your card interactions inform directions.'):
    selectedTab==='following'?'Only your followed cards appear here.':'Public includes every available original widget.');
}
function advance(direction){
 const list=eligible();
 if(!list.length){status.textContent=selectedTab==='following'?'Follow a card in Public first.':'The original interactive cards are still initializing.';return}
 if(direction<0){
  while(visited.length){
   const last=entries.find(x=>x.id===visited.pop());
   if(last&&list.includes(last)){show(last,false);return}
  }
  status.textContent='This is the first card in your current direction.';return;
 }
 if(proposed&&list.includes(proposed)&&proposed!==active){show(proposed);return;}
 const i=active?list.indexOf(active):-1;
 show(list[(i+1+list.length)%list.length]);
}
cardoneButton?.addEventListener('click',()=>{
 const entry=entries.find(x=>x.id===CARDONE_ID);
 if(!available(entry)){status.textContent='The Cardone card is not available in this page version yet.';return;}
 if(expanded){
  expanded=false;document.body.classList.remove('oracle-shelf-open');
  scroll.setAttribute('aria-expanded','false');
  scroll.textContent='↓ Scroll interactive cards / widgets';
 }
 show(entry);
 host.scrollIntoView?.({block:'start',behavior:'smooth'});
});
for(const shortcut of document.querySelectorAll('[data-oracle-spotlight]')){
 shortcut.addEventListener('click',()=>{
  const id=shortcut.getAttribute('data-oracle-spotlight');
  const entry=entries.find(x=>x.id===id);
  if(!available(entry)){status.textContent='Trending card is not available yet.';return}
  if(expanded){
   expanded=false;document.body.classList.remove('oracle-shelf-open');
   scroll.setAttribute('aria-expanded','false');
   scroll.textContent='↓ Scroll interactive cards / widgets';
  }
  show(entry);host.scrollIntoView?.({block:'start',behavior:'smooth'});
 });
}
next.addEventListener('click',()=>advance(1));
prev.addEventListener('click',()=>advance(-1));
scroll.addEventListener('click',()=>{
 expanded=!expanded;
 document.body.classList.toggle('oracle-shelf-open',expanded);
 scroll.setAttribute('aria-expanded',String(expanded));
 if(expanded){
   returnActive();
   scroll.textContent='↑ Return to top interactive viewer';
   now.textContent='All interactive cards below';
   status.textContent='All cards are open for scrolling. The original controls and state are preserved.';
   document.getElementById('phiChannelCards')?.scrollIntoView?.({block:'start',behavior:'smooth'});
 }else{
   scroll.textContent='↓ Scroll interactive cards / widgets';
   const first=eligible()[0];if(first)show(first,false);
   host.scrollIntoView?.({block:'start',behavior:'smooth'});
 }
});
// Only a deliberate interaction INSIDE the active working card is a use.
host.addEventListener('click',e=>{
 if(!active||!stage.contains(e.target)||!e.target.closest?.('button,a,[role="button"],input[type="submit"]'))return;
 counts[active.id]=Math.min(1000,(counts[active.id]||0)+1);
 if(directionApi&&feedState){
  feedState=directionApi.markOpened(readDirections(),active.feedId);
  storeDirections();predict();
  window.dispatchEvent(new CustomEvent('quantaphi:feed-updated',{detail:{origin:'oracle-viewer'}}));
 }
},true);
document.body.classList.add('oracle-card-deck-active');
function start(){if(!active&&!expanded){const request=entries.find(x=>x.id===spotlightRequested);
 const first=request&&available(request)?request:eligible()[0]||order()[0];
 if(first)show(first,false);else status.textContent='Loading original interactive cards…';
}}
start();
const observe=new MutationObserver(()=>{if(!active)start();});
for(const entry of entries)observe.observe(entry.node,{childList:true,subtree:false,attributes:entry.id==='result',attributeFilter:entry.id==='result'?['hidden']:undefined});
// Reads & Realms can relocate itself on an async home/search cycle. Keep
// exactly one live DOM node and never fight the search-mode owner.
new MutationObserver(()=>{
 if(!active||stage.contains(active.node))return;
 const moved=active,oldMarker=moved.marker;
 if(moved.id==='infiniteBook'&&moved.node.dataset.context==='search'){
   oldMarker?.remove();active=null;stage.replaceChildren();
   if(!expanded){const result=entries.find(x=>x.id==='result');if(available(result))show(result);else start();}
   return;
 }
 if(moved.node.parentNode){
   const marker=document.createComment('Oracle card returned home: '+moved.id);
   moved.node.parentNode.insertBefore(marker,moved.node);
   oldMarker?.remove();moved.marker=marker;stage.append(moved.node);
 }
}).observe(stage,{childList:true});
document.addEventListener('visibilitychange',()=>{
 // Explicit content/recording is never restarted automatically on resume.
 if(!document.hidden)start();
});
window.addEventListener('quantaphi:search-start',()=>{
 // Search owns the current Asteroid story. When the new overview arrives,
 // spotlight the ORIGINAL live result card without needing a long scroll.
 if(active?.id==='infiniteBook')returnActive();
 const entry=entries.find(x=>x.id==='result');
 if(!entry||expanded)return;
 const watcher=new MutationObserver(()=>{
  if(expanded)return watcher.disconnect();
  if(available(entry)){watcher.disconnect();show(entry)}
 });
 watcher.observe(entry.node,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:false});
 if(available(entry)){watcher.disconnect();show(entry)}
 setTimeout(()=>watcher.disconnect(),60000);
});
})();
