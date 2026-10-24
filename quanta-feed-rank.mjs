/* Browser-side recommendations are based only on chosen card interactions.
 * No financial records, account identity, location or third-party histories. */
export const FEED_STORAGE_KEY='quanta:discovery:anonymous:v1';
export const FEED_TABS=Object.freeze(['public','for-you','following']);
export const cleanFeedState=raw=>{
 const r=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const saved=[...new Set((Array.isArray(r.following)?r.following:[])
  .filter(x=>typeof x==='string'&&/^[a-z0-9-]{1,70}$/.test(x)).slice(0,800))];
 const counts={};for(const [key,val] of Object.entries(r.counts||{}).slice(0,900)){
  if(/^[a-z0-9-]{1,70}$/.test(key)&&Number.isFinite(val)&&val>0)
   counts[key]=Math.min(5000,Math.floor(val));
 }
 const viewed={};for(const [key,val] of Object.entries(r.viewed||{}).slice(0,900)){
  if(/^[a-z0-9-]{1,70}$/.test(key)&&Number.isFinite(val)&&val>0)
   viewed[key]=Math.min(5000,Math.floor(val));
 }
 return {version:1,following:saved,counts,viewed,advance:Math.max(0,Math.min(100000,Number(r.advance)||0))};
};
export function feedScore(card,state){
 const clicks=state.counts[card.id]||0;
 const category=Object.entries(state.counts).reduce((n,[id,v])=>n+(
  (card.category===state.catalog?.find(x=>x.id===id)?.category)?v:0),0);
 const saved=state.following.includes(card.id);
 const seen=state.viewed[card.id]||0;
 // The number reflects voluntary selections, not private behavioral profiling.
 return clicks*8+category*2+(saved?12:0)+Math.min(70,Math.max(0,Number(state.quantScores?.[card.id])||0))+((card.id.charCodeAt(0)%5)/20)-seen*2;
}
export function feedCandidates(cards,tab,state,query=''){
 const q=String(query).trim().toLowerCase().slice(0,120);
 const filtered=cards.filter(c=>(tab!=='following'||state.following.includes(c.id))&&
  (!q||[c.name,c.category,c.feature,c.study].join(' ').toLowerCase().includes(q)));
 if(tab==='following')return filtered.sort((a,b)=>(state.counts[b.id]||0)-(state.counts[a.id]||0)||a.name.localeCompare(b.name));
 if(tab==='for-you')return filtered.sort((a,b)=>feedScore(b,state)-feedScore(a,state)||a.id.localeCompare(b.id));
 // Public is intentionally broad; nextCard skips seen until all are exhausted.
 return filtered;
}
export function nextFeedCard(cards,tab,state,currentId='',query=''){
 const filtered=feedCandidates(cards,tab,state,query);
 if(!filtered.length)return null;
 const unseen=filtered.filter(c=>!(state.viewed[c.id]||0)&&c.id!==currentId);
 if(unseen.length){
  if(tab==='public')return unseen[(state.advance||0)%unseen.length];
  return unseen[0];
 }
 const other=filtered.filter(c=>c.id!==currentId);
 if(!other.length)return filtered[0];
 return [...other].sort((a,b)=>(state.viewed[a.id]||0)-(state.viewed[b.id]||0)||
  (tab==='for-you'?feedScore(b,state)-feedScore(a,state):0)||a.id.localeCompare(b.id))[0];
}
export const markViewed=(state,id)=>({...state,viewed:{...state.viewed,[id]:Math.min(5000,(state.viewed[id]||0)+1)},advance:state.advance+1});
export const markOpened=(state,id)=>({...state,counts:{...state.counts,[id]:Math.min(5000,(state.counts[id]||0)+1)}});
export const toggleFollowing=(state,id)=>({...state,following:state.following.includes(id)?
 state.following.filter(x=>x!==id):[...state.following,id]});
