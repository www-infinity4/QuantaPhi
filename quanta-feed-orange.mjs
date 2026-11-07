/* On-demand Orange / Quant-AI card selection.
 * Only triggered from the visitor-selected "For You" view.
 * The established QuantaCloudConnection sends the signed-in token to the
 * same-origin server; no device token, wallet ID or raw query is stored here.
 */
const ROUTE='/api/quant-orange/decision';
const restricted=/\b(?:adult|cannabis|marijuana|nicotine|gambling|weapons|firearm)\b|\b(?:18|21)\+/i;
const goodId=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9-]{1,99}$/.test(x);
function candidateRows(cards){
 const byCategory=new Map(),out=[],seen=new Set();
 for(const c of Array.isArray(cards)?cards:[]){
  if(out.length>=40)break;
  if(!goodId(c?.id)||seen.has(c.id))continue;
  const category=String(c.category||'Discovery').slice(0,100);
  const title=String(c.name||c.title||'').slice(0,150);
  if(!title||restricted.test(category+' '+title))continue;
  const n=byCategory.get(category)||0;if(n>=8)continue;
  byCategory.set(category,n+1);seen.add(c.id);
  out.push({id:c.id,title,category,artist:String(c.artist||'').slice(0,100),
   tags:[c.category,c.feature,c.artist].filter(x=>typeof x==='string').map(x=>x.slice(0,80)).slice(0,8)});
 }
 return out;
}
export async function loadOwnOrangeScores(bridge,cards,context={},seenIds=[]){
 if(typeof bridge?.authenticatedFetch!=='function')return {connected:false,scores:{}};
 const candidates=candidateRows(cards);
 if(!candidates.length)return {connected:false,scores:{}};
 try{
  const response=await bridge.authenticatedFetch(ROUTE,{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({consent:true,candidates,context:{title:String(context?.title||'').slice(0,160)},
    seen_ids:(Array.isArray(seenIds)?seenIds:[]).filter(goodId).slice(0,100)}),
   cache:'no-store',signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)return {connected:false,scores:{}};
  const data=await response.json();
  if(data.ok!==true||!Array.isArray(data.ranked)||data.placement_authorized!==false)return {connected:false,scores:{}};
  const allowed=new Set(candidates.map(c=>c.id)),scores={};
  for(const row of data.ranked.slice(0,40)){
   if(!allowed.has(row?.id)||!Number.isFinite(Number(row?.score)))continue;
   scores[row.id]=Math.max(0,Math.min(70,Math.floor(Number(row.score))));
  }
  return {connected:true,scores};
 }catch{return {connected:false,scores:{}}}
}
