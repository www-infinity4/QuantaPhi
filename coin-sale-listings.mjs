// Real certified coin sale discovery, kept separate from VAM grading references.
// Search-engine snippets establish candidate URLs, not copyright rights, price,
// availability, independent grading, or an advertising contract.
export const COIN_MARKETS=Object.freeze([
 Object.freeze({id:'greatcollections',name:'GreatCollections',host:'greatcollections.com',home:'https://www.greatcollections.com/vams',photoRights:'permission-required'}),
 Object.freeze({id:'icollector',name:'iCollector',host:'icollector.com',home:'https://www.icollector.com/',photoRights:'permission-required'}),
 Object.freeze({id:'heritage',name:'Heritage Auctions',host:'ha.com',home:'https://coins.ha.com/',photoRights:'permission-required'})
]);
const COIN_CARDS=new Set(['vamworld','pcgs','ngc','heritage']);
export const isCoinResearchCard=id=>COIN_CARDS.has(id);
export function safeSaleURL(value,domain){
 try{
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.port||!domain)return null;
  if(u.hostname!==domain&&!u.hostname.endsWith('.'+domain))return null;
  return u.href;
 }catch{return null}
}
function isSellerLot(url,market){
 const u=new URL(url),path=u.pathname;
 if(market.id==='icollector')return /_i\d{5,}(?:\/)?$/i.test(path);
 if(market.id==='greatcollections')return /^\/Coin\/\d{4,}\/[\w%-]+/i.test(path);
 if(market.id==='heritage')return /^\/itm\/[\w\/-]+\/a\/\d+-\d+\.s$/i.test(path);
 return false;
}
const certified=/\b(?:PCGS|NGC|ANACS|CACG)\b/i,attributed=/\bVAM[-\s]?(?:\d+[A-Z0-9]*)\b/i;
export function normalizeCoinSaleResults(data,market){
 if(!COIN_MARKETS.some(x=>x.id===market?.id&&x.host===market.host))return [];
 const input=Array.isArray(data?.results)?data.results:[];
 const seen=new Set(),rows=[];
 for(const x of input){
  const url=safeSaleURL(x?.url,market.host),title=String(x?.title||'').trim().slice(0,200);
  // Seller identity, lot path, certified holder and VAM attribution must ALL
  // match. Do not use random Morgan dollars or ads with fake PCGS text.
  if(!url||!isSellerLot(url,market)||!certified.test(title)||!attributed.test(title))continue;
  const cleanUrl=new URL(url);cleanUrl.hash='';
  for(const key of [...cleanUrl.searchParams.keys()])if(/^(?:utm_.*|gclid|fbclid)$/i.test(key))cleanUrl.searchParams.delete(key);
  const canonical=cleanUrl.href;if(seen.has(canonical))continue;seen.add(canonical);
  const state=String(x.auctionStatus||x.sale_status||x.status||'').toLowerCase().trim();
  const saleStatus=['sold','closed','not_sold','ended','withdrawn'].includes(state)?'sold':'unverified';
  // No claimed live price or available bid without a privileged seller feed.
  // Public search images are candidate media only. The seller must approve
  // reuse before a photo may appear in a commercial QuantaPhi card.
  rows.push({url:canonical,title,seller:market.name,saleStatus,forSale:false,
   image:null,imageRights:market.photoRights,price:null,
   description:String(x.content||x.description||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,260)});
  if(rows.length>=8)break;
 }
 return rows;
}
const REFERENCE=Object.freeze({
 source:'https://commons.wikimedia.org/wiki/File:Coin_slabs.jpg',
 image:'https://commons.wikimedia.org/wiki/Special:FilePath/Coin_slabs.jpg?width=960',
 credit:'Bruxton · Wikimedia Commons · CC0 1.0',
 license:'CC0-1.0',label:'Reference: actual graded coin holders — not a seller listing',
 isListingPhoto:false
});
export function referenceCoinImage(cardId){
 return isCoinResearchCard(cardId)?REFERENCE:null;
}
export function sourceCoinSearch(market,term='Morgan dollar'){
 if(!COIN_MARKETS.some(x=>x.id===market?.id&&x.host===market.host))return null;
 const query=String(term).replace(/[^\w\s.-]/g,' ').trim().slice(0,90);
 const url=new URL('https://orange-brook-a2ac.marvaseater.workers.dev/search');
 url.search=new URLSearchParams({q:'site:'+market.host+' '+(query||'Morgan dollar')+' PCGS VAM',format:'json',categories:'general',safesearch:'1'});
 return url.href;
}

const isoDay=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'));
/**
 * Authored first-party approval manifest ONLY, not a browser/search seller flag.
 * Grant review belongs to site maintainers and must record the seller's
 * written media permission for the specific listing before publication.
 * No unknown image hosts or implied seller permissions.
 */
export function attachLicensedCoinImages(rows,market,manifest,asOf=new Date().toISOString().slice(0,10)){
 if(!Array.isArray(rows)||!COIN_MARKETS.some(x=>x.id===market?.id&&x.host===market.host))return [];
 const grants=manifest?.schema_version===1&&Array.isArray(manifest.grants)?manifest.grants:[];
 const allowed=new Map();
 for(const g of grants.slice(0,100)){
  if(g?.market!==market.id||g?.license!=='seller-permitted'||g?.approved_by!=='reviewed-commercial-media'||
    !isoDay(g.approved_at)||!isoDay(g.expires_at)||!isoDay(asOf)||
    g.approved_at>asOf||g.expires_at<asOf||g.approved_at>g.expires_at)continue;
  const lot=safeSaleURL(g.lot_url,market.host),image=safeSaleURL(g.image_url,market.host);
  const proof=typeof g.proof_url==='string'&&g.proof_url.trim()?safeSaleURL(g.proof_url,market.host):null;
  if(!lot||!isSellerLot(lot,market)||!image||!proof||typeof g.image_credit!=='string'||
    g.image_credit.trim().length<10||g.image_credit.length>160)continue;
  const key=new URL(lot);key.hash='';
  if(!allowed.has(key.href))allowed.set(key.href,{image,imageCredit:g.image_credit.trim(),imageSource:key.href,imageRights:'seller-permitted'});
 }
 return rows.map(row=>{
  const url=safeSaleURL(row?.url,market.host);
  if(!url)return row;
  const key=new URL(url);key.hash='';
  const grant=allowed.get(key.href);
  return grant?{...row,...grant}:row;
 });
}
