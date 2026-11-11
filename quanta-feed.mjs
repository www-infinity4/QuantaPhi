import {QUICK_CARD_SOURCES} from './source-quick-cards.mjs';
import {INFINITY_ACCEPTED_BRANDS} from './infinity-accepted-catalog.mjs';
import {createCardArtwork,mountCardTools} from './quanta-card-experience.mjs?v=20261102-cardimages1';
import {SCIENCE_CARDS} from './science-quick-cards.mjs';
import {DISCOVERY_CARDS,findDiscovery} from './quanta-feed-catalog.mjs';
import {mountSpaceSource} from './quanta-feed-spaces.mjs';
import {cards as BUBBLES_CARDS} from './bubbles-card-catalog.mjs';
import {loadOwnQuantScores} from './quanta-feed-quants.mjs';
import {openQuickCardPreview,safeLocalCardUrl} from './quick-card-preview.mjs';
import {FEED_STORAGE_KEY,FEED_TABS,cleanFeedState,feedCandidates,nextFeedCard,nextFeedDirection,markViewed,markOpened,saveNavigationProgress,commitFeedPreference} from './quanta-feed-rank.mjs';
import {INTEREST_DEPARTMENTS} from './quanta-context-placement.mjs';
import {registerVisibleCard} from './quanta-feed-exposure.mjs';

const fromSources=QUICK_CARD_SOURCES.map(c=>({
 id:c.id,name:c.name,category:c.kind,feature:c.feature,study:c.details,
 official:c.official,url:c.featureUrl,image:c.image||'',images:c.images||[],logo:c.logo||'',route:'/source-quick-card.html?card='+encodeURIComponent(c.id),origin:'source'
}));
const fromScience=SCIENCE_CARDS.map(c=>({
 id:c.id,name:c.name,category:c.category,feature:c.feature,study:c.description,
 url:c.url,route:'/science-quick-card.html?card='+encodeURIComponent(c.id),origin:'science'
}));
const fromDiscovery=DISCOVERY_CARDS.map(c=>({
 ...c,route:'/quanta-feed-card.html?card='+encodeURIComponent(c.id),origin:'discovery'
}));
// The public feed really includes the kitchen sink: existing QuantaPhi tools,
// games and media alongside independently researched external sources.
const fromBubbles=BUBBLES_CARDS.filter(c=>typeof c.url==='string'&&/^\/(?!\/)/.test(c.url))
 .map(c=>({id:c.id,name:c.title,category:'QuantaPhi apps',feature:'Open interactive QuantaPhi app',
  study:'Existing QuantaPhi application or media card with its original controls. Some actions require a verified wallet, source access or the usual owner approval.',
  url:c.url,route:c.url,origin:'quanta-app'}));
const fromAccepted=INFINITY_ACCEPTED_BRANDS.map(card=>({...card,
 url:card.official,route:'/?card='+card.id,origin:'infinity-accepted'}));
export const ALL_FEED_CARDS=Object.freeze([...new Map([...fromAccepted,...fromSources,...fromScience,...fromDiscovery,...fromBubbles]
 .map(c=>[c.id,Object.freeze(c)])).values()]);
export const feedCard=id=>ALL_FEED_CARDS.find(c=>c.id===id)||null;
const create=(tag,cl,text)=>{const node=document.createElement(tag);if(cl)node.className=cl;if(text!==undefined)node.textContent=text;return node;};
const safeRead=()=>{try{return cleanFeedState(JSON.parse(localStorage.getItem(FEED_STORAGE_KEY)||'{}'));}catch{return cleanFeedState({});}};
let state=safeRead(),tab='public',current='',query='',showCount=16,lastReason='',lastVisibleCardId='';
// Quant signals are derived in memory from the authenticated user’s existing ledger.
// They are NEVER written to anonymous localStorage.
let quantScores={},quantConnected=false,quantAttempted=false;
const ranking=()=>({...state,catalog:ALL_FEED_CARDS,quantScores});
const persist=()=>{const saved=saveNavigationProgress(localStorage,state);if(saved.ok)state=saved.state;return saved.ok;};
function saveChoice(kind,id=''){
 const saved=commitFeedPreference(localStorage,kind,id);
 if(!saved.ok){state=safeRead();document.getElementById('quantaFeedStatus')?.replaceChildren('Could not save this preference on this device.');return false}
 state=saved.state;return true;
}
const shareChange=()=>window.dispatchEvent(new CustomEvent('quantaphi:feed-updated',{detail:{origin:'public-feed'}}));
function choose(card){
 if(!card)return;
 if(current&&current!==card.id)state=markViewed(state,current);
 current=card.id;persist();
}
function open(card){
 state=markOpened(safeRead(),card.id);persist();shareChange();
 const target=card.route;
 // Show the full QuantaPhi interaction inside a mobile popup for allowed
 // public routes. Protected/private apps keep the existing safe handoff.
 if(!new URLSearchParams(location.search).has('preview')&&safeLocalCardUrl(target,location.origin+'/')){
  if(openQuickCardPreview({url:target,title:card.name,description:card.feature,
   image:card.shareImage||card.image||card.poster||'',official:card.official||'',previewMode:card.previewMode}))return;
 }
 if(typeof window.QuantaOpenSite==='function'){
  // Let the site's original in-page viewer own the selected source card.
  try{const link=document.createElement('a');link.href=target;link.dataset.siteUrl=target;link.dataset.siteTitle=card.name+' · QuantaPhi card';window.QuantaOpenSite(link);return;}catch{/* The local route is safe to open normally. */}
 }
 window.location.href=target;
}
function followButton(card,refresh){
 const followed=state.following.includes(card.id);
 const b=create('button','qf-follow'+(followed?' qf-saved':''),followed?'✓ Following':'+ Follow');
 b.type='button';b.setAttribute('aria-label',(followed?'Remove ':'Add ')+card.name+(followed?' from':' to')+' Following');
 b.setAttribute('aria-pressed',String(followed));b.addEventListener('click',()=>{
  if(!saveChoice('follow',card.id))return;refresh();shareChange();
 });return b;
}
function hideButton(card,refresh){
 const btn=create('button','qf-button qf-not-for-me','Not for me');btn.type='button';
 btn.setAttribute('aria-label','Hide '+card.name+' from my discovery feeds');
 btn.addEventListener('click',()=>{
  if(!saveChoice('hide',card.id))return;
  if(current===card.id)current='';
  refresh();shareChange();
 });
 return btn;
}
function makeTile(card,refresh){
 const tile=create('article','qf-tile');tile.dataset.cardId=card.id;
 const art=createCardArtwork(card,true);
 const topic=create('p','qf-topic',card.category);
 const title=create('h3','',card.name);
 const desc=create('p','qf-description',card.feature);
 const buttons=create('div','qf-actions');
 // The original provider widget is directly on its tile. No internal
 // Infinity Viewer or extra "Open card" link is needed to begin searching.
 if(card.origin!=='source'){
  const openBtn=create('button','qf-button','Open card');openBtn.type='button';openBtn.addEventListener('click',()=>open(card));buttons.append(openBtn);
 }
 if(card.origin!=='source')buttons.append(followButton(card,refresh));
 buttons.append(hideButton(card,refresh));
 tile.append(art,topic,title,desc);
 if(card.origin==='source'){
  const inline=create('div','qf-inline-tool');mountCardTools(inline,card);tile.append(inline);
 }
 tile.append(buttons);return tile;
}
function renderHome(){
 const host=document.getElementById('quantaDiscoveryFeed');if(!host)return;
 state=safeRead();
 const refresh=()=>renderHome();
 host.replaceChildren();
 const heading=create('div','qf-heading');
 heading.append(create('p','qf-eyebrow','QUANTAPHI · DISCOVER'),create('h2','','Explore cards made for interaction'),create('p','qf-muted','Browse every card, explore suggestions based on what you open, or keep your followed cards together.'));
 host.append(heading);
 const search=create('input','qf-search');search.type='search';search.placeholder='Search QuantaPhi cards, radios, coins, science…';
 search.autocomplete='off';search.value=query;search.setAttribute('aria-label','Search QuantaPhi cards');
 search.addEventListener('input',()=>{query=search.value.slice(0,120);showCount=16;current='';renderResults(false);});
 host.append(search);
 const tabs=create('div','qf-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','QuantaPhi feed');
 for(const name of FEED_TABS){
  const b=create('button','qf-tab'+(tab===name?' qf-active':''),name==='for-you'?'For You':name==='following'?'Following':'Public');
  b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(tab===name));
  b.addEventListener('click',()=>{tab=name;current='';lastReason='';showCount=16;renderHome();});tabs.append(b);
 }host.append(tabs);
 // For You begins with visitor-chosen departments and real Following, never
 // inferred gender, health conditions, or raw assistant/chat searches.
 if(tab==='for-you'){
  const chooser=create('section','qf-interest-chooser');
  chooser.setAttribute('aria-label','Choose your For You categories');
  chooser.append(create('h3','','Choose what For You should show'),
   create('p','qf-muted','Choose topics or Follow a card. Public stays wider and keeps discovering new, relevant sources.'));
  const chips=create('div','qf-interest-chips');chips.setAttribute('role','group');chips.setAttribute('aria-label','For You interests');
  for(const d of INTEREST_DEPARTMENTS){
   const selected=(state.interests||[]).includes(d.id);
   const chip=create('button','qf-interest-chip'+(selected?' qf-interest-active':''),(selected?'✓ ':'+ ')+d.label);
   chip.type='button';chip.setAttribute('aria-pressed',String(selected));
   chip.addEventListener('click',()=>{
    if(!saveChoice('interest',d.id))return;shareChange();renderHome();
   });
   chips.append(chip);
  }
  chooser.append(chips);
  if(state.hidden?.length){
   const reset=create('button','qf-interest-chip','Restore '+state.hidden.length+' hidden card(s)');
   reset.type='button';reset.addEventListener('click',()=>{
    if(!saveChoice('restore'))return;renderHome();shareChange();
   });chooser.append(reset);
  }
  host.append(chooser);
 }
 const status=create('p','qf-muted');status.id='quantaFeedStatus';status.setAttribute('role','status');host.append(status);
 const feature=create('div','qf-feature');feature.id='quantaFeedFeature';host.append(feature);
 const controls=create('div','qf-controls');
 const next=create('button','qf-button','Next unseen card →');next.type='button';
 next.addEventListener('click',()=>{
  const prior=current;
  const pick=nextFeedDirection(ALL_FEED_CARDS,tab,ranking(),prior,query);
  current=pick.card?.id||'';
  lastReason=pick.card?'Next card: '+pick.card.name:'';
  persist();renderResults(false);
 });
 controls.append(next);host.append(controls);
 const grid=create('div','qf-grid');grid.id='quantaFeedGrid';host.append(grid);
 const more=create('button','qf-more','Show more cards');more.type='button';
 more.addEventListener('click',()=>{showCount+=16;renderResults(false);});host.append(more);
 const privacy=create('p','qf-muted qf-note','For You displays only chosen departments and followed cards. Your first-party card interactions and optional authenticated Quant interests affect order within those choices. Following is saved on this device; cross-device wallet sync is not yet enabled. No private medical records, raw prompts, banking data or inferred gender are used for ad targeting.');
 host.append(privacy);
 function renderResults(nextCard){
  const ranked=feedCandidates(ALL_FEED_CARDS,tab,ranking(),query);
  if(!ranked.length){feature.replaceChildren(create('p','qf-empty',tab==='following'?'No followed cards yet. Open Public and tap + Follow.':tab==='for-you'?'Choose a For You category above or Follow some cards in Public.':'No matches. Try another search.'));grid.replaceChildren();more.hidden=true;next.disabled=true;status.textContent='No matching cards';return;}
  if(!current||!ranked.some(c=>c.id===current)){
   const pick=nextFeedCard(ALL_FEED_CARDS,tab,ranking(),current,query);
   current=pick?.id||ranked[0].id;
  }
  const selected=ranked.find(c=>c.id===current)||ranked[0];
  // Only count a genuinely visible new feature card once. The same DOM
  // render, new query keystroke, or hidden tab is not a new impression.
  const exposure=registerVisibleCard(safeRead(),selected,{lastId:lastVisibleCardId,visible:!document.hidden});
  lastVisibleCardId=exposure.lastId;
  if(exposure.recorded){state=exposure.state;persist();}
  const visual=createCardArtwork(selected);
  const info=create('div','qf-feature-copy');
  info.append(create('p','qf-topic',selected.category),create('h3','',selected.name),
    create('p','',selected.feature),create('p','qf-muted',selected.study));
  const tools=create('div','qf-inline-tool');mountCardTools(tools,selected);info.append(tools);
  const buttons=create('div','qf-actions');
  // Preserve route navigation only for original standalone QuantaPhi apps.
  if(selected.origin!=='source'){
   const openBtn=create('button','qf-button','Open interactive card');openBtn.type='button';
   openBtn.addEventListener('click',()=>open(selected));buttons.append(openBtn);
  }
  buttons.append(hideButton(selected,refresh));
  if(selected.origin!=='source'||!['google','bing'].includes(selected.id)){
   const original=create('a','qf-link','Original source ↗');original.href=selected.url;original.target='_blank';original.rel='noopener noreferrer';buttons.append(original);
  }
  info.append(buttons);
  const direction=create('p','qf-direction',lastReason||'Select a card, then choose Next to continue.');
  info.append(direction);
  feature.replaceChildren(visual,info);
  grid.replaceChildren();
  for(const c of ranked.slice(0,showCount))grid.append(makeTile(c,refresh));
  status.textContent=tab==='following'?ranked.length+' followed cards':tab==='for-you'?
    ranked.length+' selected cards · chosen topics + Following'+(quantConnected?' · Quant order within choices':''):
    ranked.length+' public cards · unseen first when using Next';
  more.hidden=ranked.length<=showCount;next.disabled=ranked.length===1;
 }
 renderResults(false);
 if(tab==='for-you'&&!quantAttempted){
  quantAttempted=true;
  // Reuse the SAME authenticated Quant search-history endpoint already used
  // in Infinity Radio. No chat prompt or provider token is logged or cached.
  void loadOwnQuantScores(window.QuantaCloudConnection,ALL_FEED_CARDS).then(result=>{
   quantConnected=result.connected===true;
   quantScores=result.scores||{};
   if(tab==='for-you')renderHome();
  });
 }
}
function renderDetail(){
 const host=document.getElementById('quantaFeedCardDetail');if(!host)return;
 const id=new URLSearchParams(location.search).get('card'),card=findDiscovery(id);
 if(!card){host.append(create('p','','Unknown card. Open the QuantaPhi public feed.'));return;}
 document.title=card.name+' · QuantaPhi';
 host.append(create('p','qf-eyebrow','INFINITY 2026® · ORIGINAL-SOURCE STUDY CARD'),
 createCardArtwork(card),create('h1','',card.name),
 create('h2','',card.feature),create('p','qf-muted',card.study));
 const actions=create('div','qf-actions');
 const source=create('a','qf-button','Open verified original source ↗');
 source.href=card.url;source.target='_blank';source.rel='noopener noreferrer';actions.append(source);
 if(card.random)actions.append(create('p','qf-muted','Every click on Wikipedia random can open a different original article.'));
 if(card.query){
  const form=create('form','qf-lookup');form.target='_blank';
  const label=create('label','', 'Search on '+card.name);const input=create('input','qf-search');
  input.type='search';input.name='lookup';input.required=true;input.maxLength=100;
  const b=create('button','qf-button','Search original site');b.type='submit';
  form.addEventListener('submit',e=>{e.preventDefault();if(input.value.trim())window.open(card.query+encodeURIComponent(input.value.trim()),'_blank','noopener,noreferrer');});
  form.append(label,input,b);actions.append(form);
 }
 host.append(actions);
 const guard=create('p','qf-muted',card.status||'This is an independent research card. Any third-party account connection requires separate verified consent.');
 host.append(guard);
 const study=create('section','qf-study');study.append(create('h3','','Investigate with Bubbles'),create('p','','Ask Bubbles to compare the original source with other references, explain the history, and check evidence. It does not have this provider’s private login or account data.'));
 host.append(study);
 const tools=create('div','qf-inline-tool');mountCardTools(tools,card);host.append(tools);
 if(card.id==='x-live-spaces'){
  const list=create('section','qf-study');mountSpaceSource(list);host.append(list);
 }
 const embed=document.createElement('script');embed.src='/bubbles-embed.js';embed.dataset.bubbleId='feed-'+card.id;
 embed.dataset.bubbleRole='specialist';embed.dataset.bubbleName=(card.name+' Bubbles').slice(0,38);
 embed.dataset.bubbleInstructions=('Independent research specialist for '+card.name+'. '+card.study+
 ' Original source: '+card.url+'. No account-data permission, payments, prices or session access unless verified by a separate account connector. Never invent source dates or results.').slice(0,800);
 document.body.append(embed);
}
if(typeof document!=='undefined'){
 window.addEventListener('quantaphi:feed-updated',event=>{
  if(event.detail?.origin==='public-feed')return;
  state=safeRead();
  if(document.getElementById('quantaDiscoveryFeed'))renderHome();
 });
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&document.getElementById('quantaDiscoveryFeed'))renderHome();
 });
 const mount=()=>{renderHome();renderDetail();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
}
