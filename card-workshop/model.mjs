export const PLACEMENT_PRICE = 1000;
export const TOOLS = 'https://bubbles-tools.marvaseater.workers.dev';
const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
export function httpsUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}}
export function normalizeCard(raw){
 if(!raw||typeof raw!=='object')throw Error('Card instructions required');
 const title=text(raw.title,120),query=text(raw.query,350);
 if(!title||!query)throw Error('A title and search topic are required');
 const kind=['news','research','sessions','scores','links'].includes(raw.kind)?raw.kind:'news';
 const sourceUrl=httpsUrl(raw.sourceUrl||'');
 if(raw.sourceUrl&&!sourceUrl)throw Error('Use an HTTPS source link');
 const teamId=Number(raw.teamId)||null;
 if(kind==='scores'&&(!Number.isInteger(teamId)||teamId<1||teamId>999))throw Error('Select an MLB team ID');
 return {schema:'quantaphi-intelligent-card/v1',title,query,kind,sourceUrl,teamId,
  description:text(raw.description,600),destinationUrl:httpsUrl(raw.destinationUrl||''),
  refreshMinutes:Math.max(5,Math.min(1440,Number(raw.refreshMinutes)||15))};
}
export function mergeStories(previous,incoming){
 const map=new Map();
 for(const item of [...previous,...incoming]){
  const url=httpsUrl(item?.url);if(!url||!text(item.title,220))continue;
  const canonical=new URL(url);canonical.hash='';for(const key of [...canonical.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$/i.test(key))canonical.searchParams.delete(key);
  map.set(canonical.href,{title:text(item.title,220),url:canonical.href,snippet:text(item.snippet,1200),
   publishedAt:Number.isFinite(Date.parse(item.publishedAt))?new Date(item.publishedAt).toISOString():null,
   relevance:Math.max(0,Math.min(1,Number(item.relevance)||0))});
 }
 return [...map.values()].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)||b.relevance-a.relevance||a.url.localeCompare(b.url)).slice(0,200);
}
export function nextStory(items,seen){return items.find(item=>!seen.includes(item.url))||null}
export function placementRequest(card,revision){
 return {schema:'quantaphi-ad-placement-request/v1',card:normalizeCard(card),revision,
  destination:'QuantaPhi homepage',currency:'STARCOIN',amount:PLACEMENT_PRICE,
  status:'awaiting_checkout',paid:false,published:false};
}
