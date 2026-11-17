// Public Media Star discovery contracts. No wallet actions or unreviewed cards.
const ID=/^media-star:[A-Za-z0-9_-]{3,90}:[A-Za-z0-9_-]{6,80}$/;
function safeHostname(h){
 const host=h.toLowerCase();
 if(host==='localhost'||host==='127.0.0.1'||host==='::1'||host.endsWith('.localhost')||
  host.endsWith('.local')||host.endsWith('.internal')||host==='quantaphi.org'||
  host.endsWith('.quantaphi.org')||host.endsWith('.marvaseater.workers.dev'))return false;
 if(/^(?:10\.|127\.|192\.168\.|169\.254\.|0\.)/.test(host))return false;
 const ip=host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
 if(ip){const n=ip.slice(1).map(Number);if(n.some(v=>v>255)||n[0]===172&&n[1]>=16&&n[1]<=31)return false;}
 return true;
}
export function safePublicMediaUrl(raw){
 try{
  const u=new URL(String(raw||''));
  if(u.protocol!=='https:'||u.username||u.password||!safeHostname(u.hostname))return null;
  return u.href;
 }catch{return null;}
}
export function normalizeMediaStarPublicCatalog(response){
 if(response?.ok!==true||response?.publisherApproval!=='moderated_only'||!Array.isArray(response.cards))return [];
 const cards=[],seen=new Set();
 for(const row of response.cards.slice(0,80)){
  if(!row||!ID.test(String(row.contentId||''))||seen.has(row.contentId))continue;
  if(!Array.isArray(row.episodes)||!row.episodes.length)continue;
  const name=String(row.title||'').trim().slice(0,150);
  if(name.length<3)continue;
  const episodes=[],unique=new Set();
  for(const e of row.episodes.slice(0,30)){
   if(!e||!Number.isInteger(e.position)||e.position<0||e.position>29||unique.has(e.position))continue;
   unique.add(e.position);
   const free=e.free===true&&e.requiresUnlock!==true;
   const title=String(e.title||'').trim().slice(0,150);
   if(title.length<2)continue;
   episodes.push({episodeId:String(e.episodeId||'').slice(0,180),position:e.position,title,free,
    sourceUrl:free?safePublicMediaUrl(e.sourceUrl):null,requiresUnlock:!free});
  }
  if(!episodes.length)continue;
  seen.add(row.contentId);
  episodes.sort((a,b)=>a.position-b.position);
  const paid=episodes.some(e=>e.requiresUnlock);
  cards.push({contentId:row.contentId,title:name,episodes,
   curatedPriceStarCoins:paid?1:0,paymentState:String(row.paymentState||'disabled_pending_verification'),
   freeEpisodeCount:episodes.filter(e=>e.free).length});
  if(cards.length>=40)break;
 }
 return cards;
}
