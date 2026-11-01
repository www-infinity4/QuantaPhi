/* Oracle top viewer: MOVE original live card, never clone its event handlers.
 * Every interactive widget stays in the DOM at its original anchor.
 * No wallet, remote script, recording or conversation is fabricated. */
(function(){
'use strict';
const host=document.getElementById('oracleCardDeck'),stage=document.getElementById('oracleCardStage');
if(!host||!stage)return;
const TV_FRONT_BOOTSTRAP=(()=>{try{const api=window.QuantaTVFrontPriority;return !!api?.shouldPin(null,Date.now(),api.readFinal(localStorage))}catch{return false}})();
const now=document.getElementById('oracleCardNow'),status=document.getElementById('oracleCardStatus'),
 next=document.getElementById('oracleCardNext'),prev=document.getElementById('oracleCardPrevious'),scroll=document.getElementById('oracleCardScroll');
const choices=[
 ['coliseumZeusCard','ZEUS 6.2 · Coliseum Group Builder'],
 ['walmartShoppingCard','Walmart · Pizza and grocery picks'],
 ['cardoneCapitalOffer','10X Westshore · Cardone Capital'],
 ['quantaDirectoryCards','Find a name, website or StarMaker song'],
 ['bubblesIdentitySettingsCard','Bubbles · Identity & Documents'],
 ['disabilityHousingCard','Home Access · Housing with disability income'],
 ['pixieStoryCard','Pixie Stories · Read and explore'],
 ['googleTrendNba','NBA · Trending matchups'],
 ['googleTrendMlb','MLB · World Series'],
 ['churchOfIAmCard','Church of I AM · Gary Cardone'],
 ['googleTrendCulture','Media · Trending searches'],
 ['infiniteBook','Read an original story'],
 ['infinityAffiliates','Infinity Affiliates · Match approved brands'],
 ['infinityReaderMystery','Tales of Mystery & Suspense · Read'],
 ['infinityReaderTwilight','Twilight Zone · Original Fiction'],
 ['infinityReaderTech','Tech History · Discover'],
 ['infinityReaderFame','Touts of Fame · Biographies'],
 ['infinityReaderSports','Sports Almanac · Records'],
 ['infinityReaderCosmic','Beyond the Signal · Read'],
 ['phiChannelCards','KYOU · Infinity live TV'],
 ['liveFoxGameCard','KYOU · FOX 15.1 · Iowa'],
 ['liveFoxNewsCard','LiveNOW from FOX · Live news'],
 ['phiStoryWriter','Write a story'],
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
 ['businessDirectoryCard','National Business Directory · Explore'],
 ['shopAdPhi','Discover products'],
 ['infinityAdultContentCard','21+ content preferences'],
 ['cannabisDirectoryCard','21+ · National dispensary source directory'],
 ['dispensary-livwell-colorado','21+ · LivWell · Colorado Boulevard'],
 ['dispensary-livwell-central','21+ · LivWell · Central Park'],
 ['dispensary-native-roots-speer','21+ · Native Roots · Speer Boulevard'],
 ['dispensary-native-roots-highlands','21+ · Native Roots · Highlands'],
 ['dispensary-fired-sixth','21+ · Fired Cannabis · 6th Avenue'],
 ['dispensary-fired-alameda','21+ · Fired Cannabis · Alameda'],
 ['dispensary-fired-cherry','21+ · Fired Cannabis · Cherry Creek'],
 ['dispensary-lightshade-evans','21+ · Lightshade · Evans'],
 ['dispensary-lightshade-dayton','21+ · Lightshade · Dayton'],
 ['dispensary-star-buds-lakeside','21+ · Star Buds · Lakeside'],
 ['dispensary-green-solution-wewatta','21+ · The Green Solution · Wewatta'],
 ['dispensary-maikoh-broadway','21+ · Maikoh Holistics · North Broadway'],
 ['phiChannelCards','KYOU · Infinity live TV'],
 ['publicCardTrends','Explore what is trending']
];

/* These are the ORIGINAL live widgets, not duplicated external link previews.
 * Shared IDs connect the Oracle viewer to Public / For You / Following. */
const CARD_DIRECTIONS={
 liveFoxGameCard:['fox-live-game','Television','Visit KYOU’s official Iowa station, schedule and live newscasts with verified MLB game status'],
 liveFoxNewsCard:['fox-live-news','Television','Watch the official LiveNOW from FOX news player'],
 coliseumZeusCard:['coliseum-zeus','Collaboration','Pitch, vote, branch and build in the Zeus arena'],
 walmartShoppingCard:['walmart-shopping','Shopping','Shop Walmart pizza, groceries and related products'],
 cardoneCapitalOffer:['cardone-capital','Real estate','Study cashflow, fees and property risk'],
 quantaDirectoryCards:['public-directory','Directory','Search verified names, businesses and websites'],
 bubblesIdentitySettingsCard:['bubbles-identity-settings','Account settings','Open private identity planning, SSI letters and document checklist'],
 disabilityHousingCard:['disability-housing','Housing','Prepare a housing intake with disability benefit income'],
 scienceQuickCards:['nasa-science','Science','Study current science and research'],
 pixieStoryCard:['pixie-stories','Stories','Read an original Pixie story'],
 googleTrendNba:['trending-nba','Sports','Explore an NBA match and related research'],
 googleTrendMlb:['trending-mlb','Sports','Explore World Series matchups'],
 churchOfIAmCard:['church-of-i-am','Sunday conversations','Find Gary Cardone’s official Sunday I AM gathering'],
 googleTrendCulture:['trending-media','Media','Investigate popular media and events'],
 infiniteBook:['reads-realms','Stories','Read and research an original story'],
 infinityAffiliates:['infinity-affiliates','Shopping','Match Infinity Approved brands and request product affiliation'],
 infinityReaderMystery:['reader-mystery','Stories','Read original mysteries and public-domain detective fiction'],
 infinityReaderTwilight:['reader-twilight','Stories','Read independent, original speculative stories'],
 infinityReaderTech:['reader-tech','History','Read technology inventions and early computing histories'],
 infinityReaderFame:['reader-fame','Biographies','Discover pathways to fame and overlooked innovators'],
 infinityReaderSports:['reader-sports','Sports','Read historical games, milestones and athletic records'],
 infinityReaderCosmic:['reader-cosmic','Stories','Read original cosmic fiction and public-domain space adventures'],
 phiChannelCards:['channels','Television','Watch a channel'],
 phiStoryWriter:['story-writer','Stories','Write or continue a story'],
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
 businessDirectoryCard:['business-directory','Directory','Search source-backed businesses across states and territories'],
 shopAdPhi:['deck-shop','Shopping','Explore interactive product and advertising tools'],
 infinityAdultContentCard:['adult-content-preferences','Preferences','Manage optional 21+ ad viewing; no restricted creative without server verification'],
 ['dispensary-livwell-colorado']:['adult-store-livwell-colorado','21+ Directory','Independent source-verified dispensary listing with original store website'],
 ['dispensary-livwell-central']:['adult-store-livwell-central','21+ Directory','Independent source-verified dispensary listing with original store website'],
 ['dispensary-native-roots-speer']:['adult-store-native-roots-speer','21+ Directory','Independent source-verified dispensary listing with original store website'],
 ['dispensary-native-roots-highlands']:['adult-store-native-roots-highlands','21+ Directory','Independent source-verified dispensary listing with original store website'],
 ['dispensary-fired-sixth']:['adult-store-fired-sixth','21+ Directory','Independent source-verified dispensary listing with original store website'],
 ['dispensary-fired-alameda']:['adult-store-fired-alameda','21+ Directory','Independent source-verified dispensary listing with original store website'],
 ['dispensary-fired-cherry']:['adult-store-fired-cherry','21+ Directory','Independent source-verified dispensary listing with original store website'],
 ['dispensary-lightshade-evans']:['adult-store-lightshade-evans','21+ Directory','Independent source-verified dispensary listing with original store website'],
 ['dispensary-lightshade-dayton']:['adult-store-lightshade-dayton','21+ Directory','Independent source-verified dispensary listing with original store website'],
 ['dispensary-star-buds-lakeside']:['adult-store-star-buds-lakeside','21+ Directory','Independent source-verified dispensary listing with original store website'],
 ['dispensary-green-solution-wewatta']:['adult-store-green-solution-wewatta','21+ Directory','Independent source-verified dispensary listing with original store website'],
 ['dispensary-maikoh-broadway']:['adult-store-maikoh-broadway','21+ Directory','Independent source-verified dispensary listing with original store website'],
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
 const names={zeus:'coliseumZeusCard',coliseum:'coliseumZeusCard',walmart:'walmartShoppingCard',google:'source-google','kyou':'liveFoxGameCard','kyou-live':'liveFoxGameCard','kyou-fox':'liveFoxGameCard','fox-live-game':'liveFoxGameCard','fox-live-news':'liveFoxNewsCard','fox-one':'source-fox-one',foxone:'source-fox-one','fox-one-live-news':'source-fox-one-live-news',foxnewslive:'source-fox-one-live-news',cardone:'cardoneCapitalOffer',pixie:'pixieStoryCard',nba:'googleTrendNba',mlb:'googleTrendMlb',media:'googleTrendCulture',iam:'churchOfIAmCard','church-of-i-am':'churchOfIAmCard'};
 names.housing='disabilityHousingCard';names['disability-housing']='disabilityHousingCard';names['home-access']='disabilityHousingCard';
 const requested=url.searchParams.get('card');
 return names[requested]||(requested&&/^[a-zA-Z0-9-]+$/.test(requested)?requested:null)||(url.hash==='#cardoneCapitalOffer'?'cardoneCapitalOffer':null);
}catch{return null}})();
let counts={};try{counts=JSON.parse(localStorage.getItem(STORE)||'{}')||{}}catch{}
entries.forEach(x=>x.count=Math.max(0,Math.min(1000,Number(counts[x.id])||0)));
let active=null,expanded=false;
// Must be ready before early registerSourceCards() invokes start().
let openingCursor=null;
const tabButtons=[...host.querySelectorAll('[data-oracle-feed]')];
const follow=document.getElementById('oracleCardFollow'),reason=document.getElementById('oracleCardReason');
let selectedTab='public',directionApi=null,quantApi=null,familyApi=null,quantWeights={},quantConnected=false;
const cardFamily=e=>e?.node?.matches('.iac-card')?'accepted':e?.id?.startsWith('source-')?'website':'original';
let feedState=null,proposed=null,followingPublisherFeed=null;
const visited=[];
const seenByTab={'public':new Set(),'for-you':new Set(),'following':new Set()};
let viewerTouched=false,selectionVersion=0;
const ORIGINAL_COVERS={
 phiStoryWriter:['Story Writer','Write it. Illustrate it. Make it yours.','/assets/phi-scholastic-reader.webp'],
 phiMediaBuilder:['Image & Video Studio','Create something worth sharing.','/assets/phi-data-analyst.webp'],
 infinityConcepts:['Infinity Concepts','Physics, experiments and connected ideas.','/assets/julius-balloon-001.jpg'],
 groupStoryBuild:['Group Stories','Build the next chapter together.','/assets/phi-scholastic-reader.webp'],
 mediaStarCreator:['Media Star','Make your own playable media card.','/apps/icons/media-star-512.png'],
 phiProjectActions:['Code Phi · Create Phi','Take an idea into a working project.','/assets/phi-data-analyst.webp'],
 radioClubhouse:['Radio Clubhouse','History, restoration and the next discovery.','/apps/icons/infinity-radio-512.png']
};
function registerSourceCards(){
 // Each real homepage widget gets its own direction and Follow state.
 // Move the ORIGINAL article, preserving its search field, player and listeners.
 let added=false;
 for(const node of document.querySelectorAll('#siteQuickCards .iqc-card[data-source-id], #premiumSourceCards .iqc-card[data-source-id], #brandProductCards .iqc-card[data-source-id], #verifiedBrandSportsCards .iqc-card[data-source-id], #infinityAcceptedCards .iqc-card[data-source-id]')){
  if(node.dataset.sourceReady!=='true')continue;
  const id=node.dataset.sourceId;
  if(!/^[a-z0-9-]+$/.test(id||'')||entries.some(e=>e.feedId===id))continue;
  const label=node.dataset.sourceName||node.querySelector('h3')?.textContent?.trim()||id;
  const category=node.querySelector('.iqc-kind')?.textContent?.trim()||'Website';
  const entry={id:'source-'+id,title:label+' · Interactive',feedId:id,
   category,feature:'Use the real '+label+' card controls',study:'Original source card with direct controls',
   official:node.dataset.official||'',
   node,marker:null,count:Math.max(0,Math.min(1000,Number(counts['source-'+id])||0))};
  entries.push(entry);added=true;
 }
 if(added){
  updateTabs();predict();
  // Honor deep links and visitor interaction. Before interaction, newly loaded
  // accepted brands receive their requested priority over ordinary brands.
  const requested=entries.find(e=>e.id===spotlightRequested||e.feedId===spotlightRequested);
  if(!expanded&&!viewerTouched&&requested&&available(requested))show(requested,false);
  else if(!active&&!expanded)start();
  // A newly loaded brand must not steal focus from an active website card.
 }
}
window.addEventListener('quantaphi:source-cards-ready',registerSourceCards);
// Discover widgets mounted after the deferred deck script, including roots that
// did not exist at its first scan. Reparenting is ignored once registered.
function registerLateWidgets(){
 let added=false;
 for(const [id,title] of unique){
  if(entries.some(e=>e.id===id))continue;
  const node=document.getElementById(id);if(!node)continue;
  const [feedId,category,feature]=CARD_DIRECTIONS[id]||['deck-'+id.toLowerCase(),'Discovery',title];
  entries.push({id,title,feedId,category,feature,study:title,node,marker:null,count:Number(counts[id])||0});
  observe.observe(node,{childList:true});added=true;
 }
 registerSourceCards();
 if(added){updateTabs();predict();if(!active)start();}
}

// Module evaluation ordering can differ across mobile WebViews; recover both.
registerSourceCards();
const readDirections=()=>{try{return directionApi.cleanFeedState(JSON.parse(localStorage.getItem(directionApi.FEED_STORAGE_KEY)||'{}'))}catch{return directionApi.cleanFeedState({})}};
function storeDirections(){if(!directionApi||!feedState)return;try{localStorage.setItem(directionApi.FEED_STORAGE_KEY,JSON.stringify(feedState))}catch{}}
function liveCatalog(){return entries.filter(available).map(e=>({id:e.feedId,name:e.title,category:e.category,feature:e.feature,study:e.study,official:e.official||'',family:cardFamily(e)}));}
function livePriority(e){
 if(e?.id!=='phiChannelCards')return 0;
 const priority=document.getElementById('liveFoxGameCard')?.dataset.tvFrontPriority;
 return (priority===undefined?TV_FRONT_BOOTSTRAP:priority==='1')?1:0;
}
function eligible(){const cards=entries.filter(available).sort((a,b)=>livePriority(b)-livePriority(a));return selectedTab==='following'&&feedState?
 cards.filter(e=>feedState.following.includes(e.feedId)):cards;}
function updateTabs(){
 updateInventory();
 const live=eligible().find(livePriority),liveButton=document.getElementById('oracleCardLive');
 if(liveButton)liveButton.hidden=!live;
 for(const button of host.querySelectorAll('[data-oracle-family]')){
  const count=eligible().filter(e=>cardFamily(e)===button.dataset.oracleFamily).length;
  button.disabled=count===0;
  const total=button.querySelector('[data-family-count]');if(total)total.textContent=String(count);
 }
 tabButtons.forEach(b=>{const on=b.dataset.oracleFeed===selectedTab;b.setAttribute('aria-selected',String(on));b.classList.toggle('oracle-current',on);});
 followingPublisherFeed?.sync({tab:selectedTab});
 if(follow){
  const saved=Boolean(active&&feedState?.following.includes(active.feedId));
  follow.hidden=!active;
  follow.textContent=saved?'✓ Following':'+ Follow';
  follow.setAttribute('aria-pressed',String(saved));
 }
}
function updateInventory(){
 const chooser=document.getElementById('oracleCardChooser'),inventory=document.getElementById('oracleCardInventory');
 if(!chooser)return;
 const cards=eligible();
 const signature=cards.map(e=>e.id+':'+livePriority(e)).join('|');
 if(chooser.dataset.inventory!==signature){
  chooser.replaceChildren();
  const hint=document.createElement('option');hint.value='';hint.textContent='Choose a card…';chooser.append(hint);
  for(const [label,list] of [
   ['Live game · pinned first',cards.filter(livePriority)],
   ['Infinity accepted',cards.filter(e=>e.node.matches('.iac-card'))],
   ['QuantaPhi originals',cards.filter(e=>!e.id.startsWith('source-')&&!livePriority(e))],
   ['Source experiences',cards.filter(e=>e.id.startsWith('source-')&&!e.node.matches('.iac-card'))]]){
   if(!list.length)continue;const group=document.createElement('optgroup');group.label=label;
   for(const e of list){const option=document.createElement('option');option.value=e.id;option.textContent=e.title;group.append(option)}chooser.append(group);
  }
  chooser.dataset.inventory=signature;
 }
 chooser.value=active?.id||'';
 if(inventory)inventory.textContent='Choose a card · '+cards.length+' available';
}
document.getElementById('oracleCardChooser')?.addEventListener('change',event=>{
 const entry=eligible().find(e=>e.id===event.target.value);
 if(!entry){status.textContent='That card is no longer available in this viewer. Choose another verified source.';return;}
 viewerTouched=true;
 if(expanded){expanded=false;document.body.classList.remove('oracle-shelf-open');scroll.setAttribute('aria-expanded','false');scroll.textContent='↓ Scroll interactive cards / widgets'}
 try{show(entry)}catch(error){console.error('ORACLE_SELECT_ERROR',error);status.textContent='Could not open the selected card.'}
 host.scrollIntoView?.({block:'start',behavior:'smooth'});
});
function presentOriginal(entry){
 const cover=ORIGINAL_COVERS[entry.id];if(!cover||entry.node.querySelector(':scope > .oracle-original-cover'))return;
 const header=document.createElement('header');header.className='oracle-original-cover';
 const image=document.createElement('img');image.alt='';image.loading='lazy';image.addEventListener('error',()=>{image.remove();header.classList.add('oracle-cover-no-art')},{once:true});image.src=cover[2];
 const text=document.createElement('div'),brand=document.createElement('small'),title=document.createElement('h2'),copy=document.createElement('p');
 brand.textContent='QUANTAPHI ORIGINAL · INFINITY 2026®';title.textContent=cover[0];copy.textContent=cover[1];
 text.append(brand,title,copy);header.append(image,text);entry.node.prepend(header);
}
function predict(){
 updateInventory();
 proposed=null;
 if(expanded)return;
 const possible=eligible();
 if(!possible.length){next.disabled=true;reason.textContent='Your Following view is empty. Return to Public and add a card with + Follow.';return;}
 if(directionApi&&feedState){
  const present=liveCatalog();
  const context={...feedState,catalog:present,quantScores:quantWeights};
  const eligibleIds=new Set(possible.map(e=>e.feedId));
  const tour=directionApi.nextDeckCycle(
   present.filter(c=>eligibleIds.has(c.id)),active?.feedId||'',seenByTab[selectedTab]);
  seenByTab[selectedTab]=tour.seen;
  const balanced=familyApi?.selectNextFamilyPool(tour.cards,cardFamily(active))||tour.cards;
  const pick=directionApi.nextFeedDirection(balanced,selectedTab,context,active?.feedId||'');
  proposed=possible.find(e=>e.feedId===pick.card?.id)||null;
  reason.textContent=proposed?(proposed.title+' · '+pick.reason+
   ' · '+tour.remaining+' other cards in this round'):
   'Use a card to help choose the next useful action.';
 }else{
  const rest=possible.filter(x=>x!==active);
  const groups=['accepted','website','original'],pos=groups.indexOf(cardFamily(active));
  const nextFamily=groups[(pos+1)%groups.length];
  proposed=rest.filter(e=>cardFamily(e)===nextFamily).sort((a,b)=>a.count-b.count)[0]||
   rest.sort((a,b)=>a.count-b.count)[0]||possible[0];
  reason.textContent=proposed?'Next: '+proposed.title:'';
 }
 next.disabled=possible.length<2;
}
async function connectQuant({select=false,revision=selectionVersion}={}){
 if(selectedTab!=='for-you'||!quantApi||!directionApi)return;
 const result=await quantApi.loadOwnQuantScores(window.QuantaCloudConnection,liveCatalog());
 if(selectedTab!=='for-you'||revision!==selectionVersion)return;
 quantWeights=result.scores||{};quantConnected=result.connected===true;
 if(select&&!expanded){
  const catalog=liveCatalog(),ranked=directionApi.feedCandidates(catalog,'for-you',
   {...readDirections(),catalog,quantScores:quantWeights});
  const best=eligible().find(e=>e.feedId===ranked[0]?.id);
  if(best&&best!==active)show(best,false);
 }
 predict();
}
tabButtons.forEach(b=>b.addEventListener('click',()=>{
 viewerTouched=true;
 const revision=++selectionVersion;
 selectedTab=b.dataset.oracleFeed;visited.length=0;
 if(active){
  stage.dataset.switchboardTab=selectedTab;
  window.dispatchEvent(new CustomEvent('quantaphi:switchboard-change',{detail:{
   id:stage.dataset.switchboardId,title:stage.dataset.switchboardTitle,
   category:stage.dataset.switchboardCategory,tab:selectedTab
  }}));
 }
 if(active)seenByTab[selectedTab].add(active.feedId);
 feedState=directionApi?readDirections():feedState;
 updateTabs();
 if(selectedTab==='following'&&!eligible().some(e=>e===active)){
  returnActive();const first=eligible()[0];if(first)show(first,false);else{
   now.textContent='No followed interactive cards';status.textContent='Use Public and tap + Follow on any live card.';
  }
 }
 if(selectedTab==='for-you')void connectQuant({select:true,revision});
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
void import('/following-publisher-feed.mjs?v=20261031-following1').then(({mountFollowingPublisherFeed})=>{
 const target=document.getElementById('oracleFollowingFeed');
 followingPublisherFeed=mountFollowingPublisherFeed(target,{
  getFollowing:()=>directionApi?readDirections().following:[],
  getProfiles:()=>entries.filter(e=>e.id.startsWith('source-')&&e.node?.dataset?.official).map(e=>({
   id:e.feedId,name:e.node.dataset.sourceName||e.title,official:e.node.dataset.official,
   category:e.node.dataset.sourceCategory||e.category,query:e.node.dataset.sourceQuery||e.title
  }))
 });
 followingPublisherFeed?.sync({tab:selectedTab});
}).catch(()=>{const target=document.getElementById('oracleFollowingFeed');if(target)target.hidden=true;});
Promise.all([import('/quanta-feed-rank.mjs?v=20261027-infinity-accepted2'),
 import('/quanta-feed-quants.mjs?v=20261024-directions1'),
 import('/quanta-carousel-balance.mjs?v=20261027-all-families1')]).then(([r,q,f])=>{
 directionApi=r;quantApi=q;familyApi=f;feedState=readDirections();updateTabs();
 if(selectedTab==='for-you')void connectQuant();
 predict();
}).catch(()=>{reason.textContent='Card directions are not available; original interactive cards are still usable.'});
function available(entry){
 if(!entry?.node?.isConnected)return false;
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
 document.dispatchEvent(new CustomEvent('oracle:card-deactivated',{detail:{id:active.id}}));
 // Story generation may reparent Asteroid into the research card while a
 // search begins. Never pull it back out of that authoritative context.
 if(node.parentNode===stage&&marker?.parentNode)marker.parentNode.insertBefore(node,marker);
 marker?.remove();
 active.marker=null;active=null;
 stage.replaceChildren();
 delete stage.dataset.switchboardId;delete stage.dataset.switchboardTitle;
 delete stage.dataset.switchboardCategory;delete stage.dataset.switchboardTab;
 window.dispatchEvent(new CustomEvent('quantaphi:switchboard-change',{detail:null}));
}
function show(entry,remember=true){
 if(!entry||expanded||entry===active)return;
 if(remember&&active)visited.push(active.id);
 if(visited.length>45)visited.shift();
 returnActive();
 // Preserve exactly one original node and every listener, media control and data store.
 const marker=document.createComment('Oracle card original location: '+entry.id);
 entry.node.parentNode.insertBefore(marker,entry.node);entry.marker=marker;
 presentOriginal(entry);stage.append(entry.node);active=entry;
 stage.dataset.switchboardId=entry.feedId;
 stage.dataset.switchboardTitle=entry.title;
 stage.dataset.switchboardCategory=entry.category;
 stage.dataset.switchboardTab=selectedTab;
 window.dispatchEvent(new CustomEvent('quantaphi:switchboard-change',{detail:{
  id:entry.feedId,title:entry.title,category:entry.category,tab:selectedTab
 }}));
 entry.node.dispatchEvent(new Event('oracle:activate'));
 void import('/bubbles-project-discovery.mjs?v=20261024-evidence1').then(m=>m.recordProjectView({title:entry.title,cardId:entry.feedId,url:location.href})).catch(()=>{});
 // Every original Oracle widget receives the same five real actions.
 // Source cards already own the toolbar inside mountCardTools.
 if(!entry.id.startsWith('source-')&&entry.id!=='coliseumZeusCard'){
  const displayed=entry;
  import('/quanta-card-actions.mjs').then(({mountCardActions})=>{
   if(active!==displayed||!stage.contains(displayed.node)||displayed.node.querySelector('.qca-toolbar'))return;
   const container=document.createElement('div');container.className='oracle-card-actions';
   // Capture the real photo/artwork from the displayed original card, not
   // the generic QuantaPhi site preview used by unrelated URLs.
   const mediaSrc=displayed.node.querySelector('[data-walmart-image],.qbp-photo,.sap-feature img,.iqc-media img,.qcx-art img,.premium-selected img,.oracle-original-cover img,img[src]')?.getAttribute('src')||'';
   mountCardActions(container,{id:displayed.feedId||displayed.id,name:displayed.title,
    category:displayed.category,official:displayed.official,route:'/?card='+encodeURIComponent(displayed.id),mediaSrc});
   stage.append(container);
  }).catch(()=>{status.textContent='Card actions unavailable; existing card remains usable.';});
 }
 entry.count=Math.min(1000,entry.count+1);counts[entry.id]=entry.count;
 try{localStorage.setItem(STORE,JSON.stringify(counts))}catch{}
 if(directionApi&&feedState){feedState=directionApi.markViewed(readDirections(),entry.feedId);storeDirections()}
 seenByTab[selectedTab].add(entry.feedId);
 now.textContent=entry.title;updateTabs();predict();
 status.textContent='Live interactive card · '+entry.title+
  '. '+(selectedTab==='for-you'?(quantConnected?'Signed-in Quant interests and selected cards inform directions.':'Your card interactions inform directions.'):
    selectedTab==='following'?'Only your followed cards appear here.':'Public includes every available original widget.')+
  ' · '+eligible().length+' ready cards in this direction.';
}
function advance(direction){
 viewerTouched=true;selectionVersion++;
 const list=eligible();
 if(!list.length){status.textContent=selectedTab==='following'?'Follow a card in Public first.':'The original interactive cards are still initializing.';return}
 if(direction<0){
  while(visited.length){
   const previousId=visited.pop();
   const last=entries.find(x=>x.id===previousId);
   if(last&&list.includes(last)){show(last,false);return}
  }
  status.textContent='This is the first card in your current direction.';return;
 }
 if(proposed&&list.includes(proposed)&&proposed!==active){show(proposed);return;}
 const i=active?list.indexOf(active):-1;
 show(list[(i+1+list.length)%list.length]);
}
cardoneButton?.addEventListener('click',()=>{
 viewerTouched=true;
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
  viewerTouched=true;
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
// Direct group shortcuts make all ready website pages reachable in one tap.
for(const button of host.querySelectorAll('[data-oracle-family]')){
 button.addEventListener('click',()=>{
  const family=button.dataset.oracleFamily;
  const matches=eligible().filter(e=>cardFamily(e)===family&&e!==active);
  if(!matches.length){status.textContent='No other ready cards in this group. Try Public or choose a card.';return}
  const unseen=matches.filter(e=>!seenByTab[selectedTab].has(e.feedId));
  const pool=unseen.length?unseen:matches;
  const chosen=[...pool].sort((a,b)=>(feedState?.viewed?.[a.feedId]||0)-
   (feedState?.viewed?.[b.feedId]||0)||entries.indexOf(a)-entries.indexOf(b))[0];
  viewerTouched=true;selectionVersion++;
  if(expanded){
   expanded=false;document.body.classList.remove('oracle-shelf-open');
   scroll.setAttribute('aria-expanded','false');
   scroll.textContent='↓ Scroll interactive cards / widgets';
  }
  show(chosen);host.scrollIntoView?.({block:'start',behavior:'smooth'});
 });
}
// A deliberate short downward gesture from the restored Android header should
// settle on the deck, even when Chromium's proximity snap threshold is too
// small for the gap above the carousel. Do not intercept, preventDefault, or
// modify scrolling when the user is already browsing below the top.
let topGestureTimer=0;
function settleTopGesture(deltaY,startedAtTop){
 if(!startedAtTop||deltaY<85||expanded||
    !window.matchMedia?.('(max-width: 650px) and (pointer: coarse)')?.matches)return;
 const distance=host.getBoundingClientRect().top;
 if(distance<100||distance>1200)return;
 clearTimeout(topGestureTimer);
 topGestureTimer=setTimeout(()=>{
  if(expanded||window.scrollY<20||window.scrollY>1200)return;
  const top=host.getBoundingClientRect().top;
  if(top>45&&top<700)host.scrollIntoView?.({block:'start',behavior:'smooth'});
 },160);
}
window.addEventListener('wheel',e=>settleTopGesture(e.deltaY,window.scrollY<35),{passive:true});
let touchStartY=0,touchStartedAtTop=false;
window.addEventListener('touchstart',e=>{
 touchStartedAtTop=window.scrollY<35;
 touchStartY=e.touches?.[0]?.clientY??0;
},{passive:true});
window.addEventListener('touchend',e=>{
 const endY=e.changedTouches?.[0]?.clientY??touchStartY;
 settleTopGesture(touchStartY-endY,touchStartedAtTop);
 touchStartedAtTop=false;
},{passive:true});
// Move the viewport only after a user changes cards, not when the deck
// rotates automatically. Scroll to the deck (with arrows visible), not into
// a tall card that could hide navigation above the phone viewport.
function settleCardViewport(){
 if(!window.matchMedia?.('(max-width: 650px) and (pointer: coarse)')?.matches)return;
 const cardId=active?.id;
 requestAnimationFrame(()=>{
  if(active?.id!==cardId||expanded)return;
  host.querySelector('.oracle-card-deck-nav')?.scrollIntoView?.({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth'});
 });
}
function moveAndSettle(direction){
 const before=active;
 advance(direction);
 if(active&&active!==before)settleCardViewport();
}
next.addEventListener('click',()=>moveAndSettle(1));
prev.addEventListener('click',()=>moveAndSettle(-1));
document.getElementById('oracleCardLive')?.addEventListener('click',()=>{
 const live=eligible().find(livePriority);if(!live)return;
 viewerTouched=true;selectionVersion++;
 if(expanded){expanded=false;document.body.classList.remove('oracle-shelf-open');scroll.setAttribute('aria-expanded','false');scroll.textContent='↓ Scroll interactive cards / widgets'}
 show(live);host.scrollIntoView?.({block:'start',behavior:'smooth'});
});
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
host.addEventListener('pointerdown',()=>{viewerTouched=true},{capture:true,passive:true});
host.addEventListener('keydown',()=>{viewerTouched=true},true);
host.addEventListener('click',e=>{
 if(!active||!stage.contains(e.target)||!e.target.closest?.('button,a,[role="button"],input[type="submit"]'))return;
 viewerTouched=true;
 counts[active.id]=Math.min(1000,(counts[active.id]||0)+1);
 if(directionApi&&feedState){
  feedState=directionApi.markOpened(readDirections(),active.feedId);
  storeDirections();predict();
  window.dispatchEvent(new CustomEvent('quantaphi:feed-updated',{detail:{origin:'oracle-viewer'}}));
 }
},true);
document.body.classList.add('oracle-card-deck-active');
// Every ready card competes for first placement. The source/museum/product
// categories and both Cardone cards have no privileged opening positions.
function chooseOpening(){
 const ready=eligible();if(!ready.length)return null;
 const live=ready.find(livePriority);if(live)return live;
 // Each visit starts with another family; 116 accepted brands no longer monopolize
 // the starting slot. Preserve direct-link spotlight selection in start().
 if(openingCursor===null){
  try{
   const saved=Number(localStorage.getItem('oracle:opening-rotation:v2'));
   openingCursor=Number.isSafeInteger(saved)&&saved>=0?saved:0;
   localStorage.setItem('oracle:opening-rotation:v2',String((openingCursor+1)%1000000));
  }catch{openingCursor=0}
 }
 const cards=ready.map(e=>({...e,family:cardFamily(e)}));
 const opening=familyApi?.openingFamilyPool(cards,openingCursor)||
  cards.filter(c=>c.family===['accepted','website','original'][openingCursor%3]);
 const pool=opening.length?opening:cards;
 if(directionApi&&feedState){
  const catalog=liveCatalog(),ids=new Set(pool.map(c=>c.feedId));
  const context={...feedState,catalog,quantScores:quantWeights};
  const selected=directionApi.nextFeedDirection(catalog.filter(c=>ids.has(c.id)),
   selectedTab,context,'').card;
  const ranked=ready.find(e=>e.feedId===selected?.id);
  if(ranked)return ranked;
 }
 return pool[openingCursor%pool.length]||ready[0];
}
function start(){if(!active&&!expanded){
 const request=entries.find(x=>x.id===spotlightRequested||x.feedId===spotlightRequested);
 const tv=entries.find(livePriority);
 if(!spotlightRequested&&tv&&!available(tv)){now.textContent='Infinity TV · Loading channels…';status.textContent='Loading the game-night TV viewer…';return;}
 // Keep an explicitly requested original card in front of generic rotation.
 // Some tools hydrate asynchronously after DOMContentLoaded.
 if(request&&!available(request)){status.textContent='Loading requested interactive card…';return;}
 const first=request&&available(request)?request:chooseOpening();
 if(first)show(first,false);else status.textContent='Loading original interactive cards…';
}}
start();
window.addEventListener('quantaphi:live-tv-update',()=>{
 updateTabs();predict();
 const live=eligible().find(livePriority);
 if(live&&!viewerTouched&&!expanded&&!spotlightRequested&&selectedTab==='public')show(live,false);
 if(!active)start();
});
const observe=new MutationObserver(()=>{
 predict();
 if(!viewerTouched&&!expanded&&spotlightRequested){
  const requested=entries.find(e=>e.id===spotlightRequested||e.feedId===spotlightRequested);
  if(available(requested)&&requested!==active)show(requested,false);
 }
 if(!active)start();
});
for(const entry of entries)observe.observe(entry.node,{childList:true,subtree:false,attributes:entry.id==='result',attributeFilter:entry.id==='result'?['hidden']:undefined});
new MutationObserver(registerLateWidgets).observe(document.querySelector('main.app')||document.body,{childList:true,subtree:true});
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
 viewerTouched=true;
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
window.addEventListener('quantaphi:query-start',()=>{viewerTouched=true;selectionVersion++});
})();
