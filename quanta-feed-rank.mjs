/* Shared QuantaPhi directions: user-directed usage and signed-in, bounded
 * Quant interest scores. No bank data, sensitive identities or raw searches. */
import {isInfinityAccepted} from './infinity-accepted-catalog.mjs';
export const FEED_STORAGE_KEY='quanta:discovery:anonymous:v1';
export const FEED_TABS=Object.freeze(['public','for-you','following']);
const validId=id=>typeof id==='string'&&/^[a-z0-9-]{1,70}$/.test(id);
const bounded=n=>Number.isFinite(n)&&n>0?Math.min(5000,Math.floor(n)):0;
export const cleanFeedState=raw=>{
 const r=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const following=[...new Set((Array.isArray(r.following)?r.following:[]).filter(validId).slice(0,800))];
 const counts={},viewed={},transitions={};
 for(const [key,val] of Object.entries(r.counts||{}).slice(0,900))if(validId(key)&&bounded(val))counts[key]=bounded(val);
 for(const [key,val] of Object.entries(r.viewed||{}).slice(0,900))if(validId(key)&&bounded(val))viewed[key]=bounded(val);
 // Anonymous aggregate transition counts only: never save private search text.
 for(const [from,row] of Object.entries(r.transitions||{}).slice(0,350)){
  if(!validId(from)||!row||typeof row!=='object'||Array.isArray(row))continue;
  const edges={};
  for(const [to,n] of Object.entries(row).slice(0,80))if(validId(to)&&to!==from&&bounded(n))edges[to]=bounded(n);
  if(Object.keys(edges).length)transitions[from]=edges;
 }
 return {version:2,following,counts,viewed,transitions,
  lastUsed:validId(r.lastUsed)?r.lastUsed:'',
  advance:Math.max(0,Math.min(100000,Number(r.advance)||0))};
};
const ignored=new Set(['card','cards','quanta','quantaphi','original','source','from','with','about','learn','more','your','have','this','that','website','interactive','visit','open','page','research','find','explore','view','new','latest','right']);
const words=card=>[...new Set([card.name,card.category,card.feature,card.study,card.title]
 .filter(x=>typeof x==='string').join(' ').toLowerCase().match(/[a-z0-9]{4,}/g)||[])]
 .filter(w=>!ignored.has(w)).slice(0,55);
const INTENT_PATTERNS=Object.freeze({
 read:/\b(read|story|article|book|news|study|history|learn|museum)\b/i,
 write:/\b(write|writer|compose|script|create story|draft)\b/i,
 watch:/\b(watch|video|tv|television|channel|movie|cinema|stream)\b/i,
 create:/\b(create|creator|make|build|produce|image|media|edit|record|studio)\b/i,
 listen:/\b(listen|music|radio|audio|podcast|spaces|song|sound)\b/i,
 repair:/\b(repair|restore|restoration|schematic|kit|components|circuit|tube)\b/i,
 compare:/\b(compare|value|guide|price|chart|collect|evaluate|investigat)\b/i
});
const related={read:['write'],listen:['create'],watch:['create'],repair:['compare','create'],compare:['read','repair']};
function intents(card){const text=[card.name,card.feature,card.study].join(' ');return Object.keys(INTENT_PATTERNS).filter(k=>INTENT_PATTERNS[k].test(text));}
export function directionScore(from,to,state){
 if(!from||!to||from.id===to.id)return {score:0,reason:''};
 const a=words(from),b=new Set(words(to)),common=a.filter(w=>b.has(w));
 const sameCategory=from.category&&to.category&&from.category===to.category;
 const explicit=(state.transitions?.[from.id]?.[to.id]||0);
 const former=intents(from),latter=intents(to);
 const nextAction=former.find(k=>(related[k]||[]).some(v=>latter.includes(v)));
 const score=Math.min(65,explicit*15)+Math.min(4,common.length)*6+
  (sameCategory?13:0)+(nextAction?8:0);
 const reason=explicit?'Your previous card choices connect these tools':
  sameCategory&&common.length?'Continue exploring '+from.category:
  common.length?'Related to '+common.slice(0,2).join(' and '):
  nextAction?'A useful next step after '+from.name:'';
 return {score,reason};
}
export function feedScore(card,state){
 const clicks=state.counts?.[card.id]||0;
 const category=Object.entries(state.counts||{}).reduce((n,[id,v])=>n+
  (card.category===state.catalog?.find(x=>x.id===id)?.category?v:0),0);
 const saved=(state.following||[]).includes(card.id);
 const seen=state.viewed?.[card.id]||0;
 return clicks*8+category*2+(saved?12:0)+
  Math.min(70,Math.max(0,Number(state.quantScores?.[card.id])||0))-
  Math.min(40,seen*2);
}
export function feedCandidates(cards,tab,state,query=''){
 const q=String(query).trim().toLowerCase().slice(0,120);
 const filtered=cards.filter(c=>(tab==='following'?(state.following||[]).includes(c.id):!(state.following||[]).includes(c.id))&&
  (!q||[c.name,c.category,c.feature,c.study].join(' ').toLowerCase().includes(q)));
 const priority=(a,b)=>Number(isInfinityAccepted(b))-Number(isInfinityAccepted(a));
 if(tab==='following')return filtered.sort((a,b)=>priority(a,b)||(state.counts?.[b.id]||0)-(state.counts?.[a.id]||0)||a.name.localeCompare(b.name));
 if(tab==='for-you')return filtered.sort((a,b)=>priority(a,b)||feedScore(b,state)-feedScore(a,state)||a.id.localeCompare(b.id));
 // Public is a discovery-only catalog: followed cards stay in Following until unfollowed.
 return filtered.sort(priority);
}
export function nextFeedDirection(cards,tab,state,currentId='',query=''){
 const filtered=feedCandidates(cards,tab,state,query);
 if(!filtered.length)return {card:null,reason:tab==='following'?'Follow cards using + Follow to build your own feed.':'No matching cards'};
 const current=cards.find(c=>c.id===currentId);
 const other=filtered.filter(c=>c.id!==currentId);
 if(!other.length)return {card:filtered[0],reason:'Only one card matches this view'};
 // New content takes precedence in Public but is context-aware within the unseen set.
 const leastSeen=Math.min(...other.map(c=>state.viewed?.[c.id]||0));
 // Rank usefulness within the least-exposed group in every tab. A favorite
 // cannot starve the remaining catalog, even after the first complete round.
 const leastExposed=other.filter(c=>(state.viewed?.[c.id]||0)===leastSeen);
 const accepted=leastExposed.filter(isInfinityAccepted);
 const pool=accepted.length?accepted:leastExposed;
 if(!current&&tab==='public')return {card:pool[(state.advance||0)%pool.length],reason:accepted.length?'Infinity accepted · priority discovery':'Discover another interactive card'};
 const scored=pool.map(card=>{
  const relation=directionScore(current,card,state);
  const personal=tab==='public'?0:Math.min(95,feedScore(card,state));
  const interest=tab==='for-you'?Math.min(70,Math.max(0,Number(state.quantScores?.[card.id])||0)):0;
  // The candidate must be useful after the current card, not simply the
  // repeatedly opened favorite. Penalize exposure to avoid endless loops.
  return {card,relation,value:relation.score+personal+interest+
   (tab==='for-you'&&!(state.viewed?.[card.id]||0)?14:0)-
   Math.min(28,(state.viewed?.[card.id]||0)*3)};
 });
 scored.sort((a,b)=>b.value-a.value||(state.viewed?.[a.card.id]||0)-(state.viewed?.[b.card.id]||0)||a.card.id.localeCompare(b.card.id));
 const found=scored[0];
 const explanation=(accepted.length?'Infinity accepted · ':'')+(found.relation.reason||
  (tab==='for-you'&&state.quantScores?.[found.card.id]?'Matched to your signed-in Quant search interests':
   tab==='following'?'From your followed cards':tab==='public'?'Discover another interactive card':'Based on the cards you use'));
 return {card:found.card,reason:explanation};
}
/* Round-robin eligibility within each Oracle direction. Personal ranking chooses
 * between cards NOT shown in this round, so two high-Quant favorites cannot trap
 * Public or For You in a two-card loop. This changes neither saved follows nor
 * the underlying ranking/engagement ledger. */
export function nextDeckCycle(cards,currentId,seenIds=[]){
 const seen=new Set([...seenIds].filter(validId));
 if(validId(currentId))seen.add(currentId);
 let pending=cards.filter(c=>c&&validId(c.id)&&c.id!==currentId&&!seen.has(c.id));
 let restarted=false;
 if(!pending.length&&cards.some(c=>c&&validId(c.id)&&c.id!==currentId)){
  seen.clear();if(validId(currentId))seen.add(currentId);
  pending=cards.filter(c=>c&&validId(c.id)&&c.id!==currentId);
  restarted=true;
 }
 const ids=new Set(pending.map(c=>c.id));
 return {cards:cards.filter(c=>c&&((c.id===currentId)||ids.has(c.id))),
  seen,restarted,remaining:pending.length};
}
export function nextFeedCard(cards,tab,state,currentId='',query=''){
 return nextFeedDirection(cards,tab,state,currentId,query).card;
}
export const markViewed=(state,id)=>({...state,viewed:{...state.viewed,[id]:Math.min(5000,(state.viewed?.[id]||0)+1)},advance:(state.advance||0)+1});
export const markOpened=(state,id,fromId=state.lastUsed)=>({
 ...state,counts:{...state.counts,[id]:Math.min(5000,(state.counts?.[id]||0)+1)},
 lastUsed:id,
 transitions:fromId&&fromId!==id&&validId(fromId)&&validId(id)?{
  ...state.transitions,[fromId]:{...(state.transitions?.[fromId]||{}),
   [id]:Math.min(5000,(state.transitions?.[fromId]?.[id]||0)+1)}}:state.transitions||{}
});
export const toggleFollowing=(state,id)=>({...state,following:(state.following||[]).includes(id)?
 state.following.filter(x=>x!==id):[...state.following,id]});
