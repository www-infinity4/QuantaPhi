import {QUICK_CARD_SOURCES} from './source-quick-cards.mjs';
import {SCIENCE_CARDS} from './science-quick-cards.mjs';
import {DISCOVERY_CARDS,findDiscovery} from './quanta-feed-catalog.mjs';
import {mountSpaceSource} from './quanta-feed-spaces.mjs';
import {loadOwnQuantScores} from './quanta-feed-quants.mjs';
import {FEED_STORAGE_KEY,FEED_TABS,cleanFeedState,feedCandidates,nextFeedCard,markViewed,markOpened,toggleFollowing} from './quanta-feed-rank.mjs';

const fromSources=QUICK_CARD_SOURCES.map(c=>({
 id:c.id,name:c.name,category:c.kind,feature:c.feature,study:c.details,
 url:c.featureUrl,route:'/source-quick-card.html?card='+encodeURIComponent(c.id),origin:'source'
}));
const fromScience=SCIENCE_CARDS.map(c=>({
 id:c.id,name:c.name,category:c.category,feature:c.feature,study:c.description,
 url:c.url,route:'/science-quick-card.html?card='+encodeURIComponent(c.id),origin:'science'
}));
const fromDiscovery=DISCOVERY_CARDS.map(c=>({
 ...c,route:'/quanta-feed-card.html?card='+encodeURIComponent(c.id),origin:'discovery'
}));
export const ALL_FEED_CARDS=Object.freeze([...fromSources,...fromScience,...fromDiscovery].map(c=>Object.freeze(c)));
export const feedCard=id=>ALL_FEED_CARDS.find(c=>c.id===id)||null;
const iconFor=c=>/radio/i.test(c.category)?'📻':/coin|silver|gold|metal/i.test(c.category)?'🪙':/finance|invest/i.test(c.category)?'📈':/knowledge|science|space/i.test(c.category)?'🔬':/live/i.test(c.category)?'🎙️':/collectible|market/i.test(c.category)?'🧸':/AI/i.test(c.category)?'🤖':'✦';
const create=(tag,cl,text)=>{const node=document.createElement(tag);if(cl)node.className=cl;if(text!==undefined)node.textContent=text;return node;};
const safeRead=()=>{try{return cleanFeedState(JSON.parse(localStorage.getItem(FEED_STORAGE_KEY)||'{}'));}catch{return cleanFeedState({});}};
let state=safeRead(),tab='public',current='',query='',showCount=16;
// Quant signals are derived in memory from the authenticated user’s existing ledger.
// They are NEVER written to anonymous localStorage.
let quantScores={},quantConnected=false,quantAttempted=false;
const ranking=()=>({...state,catalog:ALL_FEED_CARDS,quantScores});
const persist=()=>{try{localStorage.setItem(FEED_STORAGE_KEY,JSON.stringify(state));}catch{/* Anonymous state can still work for this page. */}};
function choose(card){
 if(!card)return;
 if(current&&current!==card.id)state=markViewed(state,current);
 current=card.id;persist();
}
function open(card){
 state=markOpened(state,card.id);persist();
 const target=card.route;
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
  state=toggleFollowing(state,card.id);persist();refresh();
 });return b;
}
function makeTile(card,refresh){
 const tile=create('article','qf-tile');tile.dataset.cardId=card.id;
 const art=create('div','qf-art',iconFor(card));art.setAttribute('aria-hidden','true');
 const topic=create('p','qf-topic',card.category);
 const title=create('h3','',card.name);
 const desc=create('p','qf-description',card.feature);
 const buttons=create('div','qf-actions');
 const openBtn=create('button','qf-button','Open card');openBtn.type='button';openBtn.addEventListener('click',()=>open(card));
 buttons.append(openBtn,followButton(card,refresh));
 tile.append(art,topic,title,desc,buttons);return tile;
}
function renderHome(){
 const host=document.getElementById('quantaDiscoveryFeed');if(!host)return;
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
  b.addEventListener('click',()=>{tab=name;current='';showCount=16;renderHome();});tabs.append(b);
 }host.append(tabs);
 const status=create('p','qf-muted');status.id='quantaFeedStatus';status.setAttribute('role','status');host.append(status);
 const feature=create('div','qf-feature');feature.id='quantaFeedFeature';host.append(feature);
 const controls=create('div','qf-controls');
 const next=create('button','qf-button','Next unseen card →');next.type='button';
 next.addEventListener('click',()=>{
  if(current)state=markViewed(state,current);
  current='';state.advance++;persist();renderResults(true);
 });
 controls.append(next);host.append(controls);
 const grid=create('div','qf-grid');grid.id='quantaFeedGrid';host.append(grid);
 const more=create('button','qf-more','Show more cards');more.type='button';
 more.addEventListener('click',()=>{showCount+=16;renderResults(false);});host.append(more);
 const privacy=create('p','qf-muted qf-note','For You uses signed-in Quant search interests when available and otherwise this browser’s card interactions. Following is saved on this device for now; cross-device wallet sync is not yet enabled. No banking or brokerage credentials are read or saved by this feed.');
 host.append(privacy);
 function renderResults(nextCard){
  const ranked=feedCandidates(ALL_FEED_CARDS,tab,ranking(),query);
  if(!ranked.length){feature.replaceChildren(create('p','qf-empty',tab==='following'?'No followed cards yet. Open Public and tap + Follow.':'No matches. Try another search.'));grid.replaceChildren();more.hidden=true;next.disabled=true;status.textContent='No matching cards';return;}
  if(!current||!ranked.some(c=>c.id===current)){
   const pick=nextFeedCard(ALL_FEED_CARDS,tab,ranking(),nextCard?'':current,query);
   current=pick?.id||ranked[0].id;
  }
  const selected=ranked.find(c=>c.id===current)||ranked[0];
  const visual=create('div','qf-big-art',iconFor(selected));visual.setAttribute('aria-hidden','true');
  const info=create('div','qf-feature-copy');
  info.append(create('p','qf-topic',selected.category),create('h3','',selected.name),
    create('p','',selected.feature),create('p','qf-muted',selected.study));
  const buttons=create('div','qf-actions');const openBtn=create('button','qf-button','Open interactive card');openBtn.type='button';
  openBtn.addEventListener('click',()=>open(selected));
  const original=create('a','qf-link','Original source ↗');original.href=selected.url;original.target='_blank';original.rel='noopener noreferrer';
  buttons.append(openBtn,followButton(selected,refresh),original);info.append(buttons);
  feature.replaceChildren(visual,info);
  grid.replaceChildren();
  for(const c of ranked.slice(0,showCount))grid.append(makeTile(c,refresh));
  status.textContent=tab==='following'?ranked.length+' followed cards':tab==='for-you'?
    ranked.length+' suggested cards · '+(quantConnected?'your signed-in Quant interests + card activity':'your card interactions on this device'):
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
 create('div','qf-big-art',iconFor(card)),create('h1','',card.name),
 create('h2','',card.feature),create('p','qf-muted',card.study));
 const actions=create('div','qf-actions');
 actions.append(followButton(card,renderDetailAgain));
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
 if(card.id==='x-live-spaces'){
  const list=create('section','qf-study');mountSpaceSource(list);host.append(list);
 }
 const embed=document.createElement('script');embed.src='/bubbles-embed.js';embed.dataset.bubbleId='feed-'+card.id;
 embed.dataset.bubbleRole='specialist';embed.dataset.bubbleName=(card.name+' Bubbles').slice(0,38);
 embed.dataset.bubbleInstructions=('Independent research specialist for '+card.name+'. '+card.study+
 ' Original source: '+card.url+'. No account-data permission, payments, prices or session access unless verified by a separate account connector. Never invent source dates or results.').slice(0,800);
 document.body.append(embed);
 function renderDetailAgain(){const b=host.querySelector('.qf-follow');if(!b)return;const yes=state.following.includes(card.id);b.textContent=yes?'✓ Following':'+ Follow';b.classList.toggle('qf-saved',yes);b.setAttribute('aria-pressed',String(yes));}
}
if(typeof document!=='undefined'){
 const mount=()=>{renderHome();renderDetail();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
}
