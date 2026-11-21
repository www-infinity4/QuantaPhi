/* QuantaPhi For You: derive only bounded card weights from the existing
 * wallet-authenticated committed search ledger. No raw query saved in browser. */
const ENDPOINT='https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/interests';
const STOP=new Set(['https','about','this','that','from','with','what','your','their','would','could','into','there','have','will','when','just','show','search','some','next','latest','please','research','website','cards','card']);
export function quantScores(topics,cards){
 const scores={};
 if(!Array.isArray(topics))return scores;
 for(const row of topics.slice(0,500)){
  if(typeof row?.query!=='string'||row.query.length>500)continue;
  const words=[...new Set((row.query.toLowerCase().match(/[a-z0-9]{4,}/g)||[]).filter(w=>!STOP.has(w)).slice(0,18))];
  if(!words.length)continue;
  const hits=Math.max(1,Math.min(30,Math.floor(Number(row.hits)||1)));
  for(const c of cards){
   const haystack=[c.name,c.category,c.feature,c.study].join(' ').toLowerCase();
   const matched=words.filter(w=>haystack.includes(w)).length;
   if(matched>0)scores[c.id]=Math.min(70,(scores[c.id]||0)+Math.min(10,hits)*matched*2);
  }
 }
 return scores;
}
export async function loadOwnQuantScores(bridge,cards){
 if(typeof bridge?.authenticatedFetch!=='function')return {connected:false,scores:{}};
 try{
  const resp=await bridge.authenticatedFetch(ENDPOINT,{cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!resp.ok)return {connected:false,scores:{}};
  const data=await resp.json();
  if(data.ok!==true||!Array.isArray(data.topics))return {connected:false,scores:{}};
  return {connected:true,scores:quantScores(data.topics,cards),
    committedSearches:Math.max(0,Number(data.total_searches)||0)};
 }catch{return{connected:false,scores:{}}}
}
