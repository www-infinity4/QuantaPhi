/* Public eBay listing-card data contract. No credentials, wallet identifiers,
 * private search history, or unverified price data are stored here. */
export const EBAY_TOPICS=Object.freeze([
 {id:'coins',label:'Coins & currency',query:'Morgan silver dollar',category:'Collectibles',feature:'Rare coin varieties silver Morgan dollars'},
 {id:'radio',label:'Vintage radios',query:'vintage tube radio',category:'Electronics',feature:'Radio restoration tubes Philco Zenith antique'},
 {id:'cards',label:'Trading cards',query:'graded sports cards',category:'Collectibles',feature:'Baseball sports trading card graded PSA'},
 {id:'toys',label:'Vintage toys',query:'vintage toys',category:'Collectibles',feature:'Classic toys Hot Wheels LEGO collectibles'},
 {id:'denim',label:'Denim & clothing',query:'Levis 517 jeans',category:'Apparel',feature:'Levis vintage denim jeans'},
 {id:'watches',label:'Watches',query:'vintage wristwatch',category:'Collectibles',feature:'Mechanical watches repair watch'},
 {id:'tools',label:'Repair supplies',query:'vacuum tube tester',category:'Tools',feature:'Electronic repair test equipment radio tools'},
 {id:'electronics',label:'Electronics',query:'refurbished laptop',category:'Electronics',feature:'Computer laptops electronics deals'}
]);
export const EBAY_REPORTED_TRENDS=Object.freeze([
 {label:"Levi's 517",query:"Levis 517",source:'2026 eBay Watchlist Trend Report'},
 {label:'Wales Bonner Samba',query:'Wales Bonner Samba',source:'2026 eBay Watchlist Trend Report'},
 {label:'Quarter-zip',query:'quarter zip',source:'2026 eBay Watchlist Trend Report'},
 {label:'Chanel Executive tote',query:'Chanel Executive tote',source:'2026 eBay Watchlist Trend Report'}
]);
export const EBAY_TREND_SOURCE='https://pages.ebay.com/ebay-watchlist-trend-report/';
export const ebayQuantCards=()=>EBAY_TOPICS.map(t=>({
 id:'ebay-topic-'+t.id,name:t.label,category:t.category,
 feature:t.feature,study:t.query+' shopping auction'
}));
export function preferredEbayTopics(quantScores={},limit=3){
 const weights=EBAY_TOPICS.map((t,i)=>({
  ...t,score:Math.min(70,Math.max(0,Number(quantScores['ebay-topic-'+t.id])||0)),index:i
 }));
 weights.sort((a,b)=>b.score-a.score||a.index-b.index);
 const count=Math.max(1,Math.min(EBAY_TOPICS.length,Math.floor(limit)||3));
 return weights.slice(0,count);
}
export function ebaySearchUrl(query,mode='auction'){
 const url=new URL('https://www.ebay.com/sch/i.html');
 url.searchParams.set('_nkw',String(query||'').trim().slice(0,85));
 if(mode==='auction')url.searchParams.set('LH_Auction','1');
 if(mode==='buy')url.searchParams.set('LH_BIN','1');
 return url.href;
}
export function safeEbayListingUrl(value){
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port)return '';
  if(url.hostname!=='ebay.com'&&!url.hostname.endsWith('.ebay.com'))return '';
  if(!url.pathname.startsWith('/itm/'))return '';
  url.hash='';return url.href;
 }catch{return ''}
}
export function safeEbayImageUrl(value){
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port)return '';
  if(url.hostname!=='i.ebayimg.com'&&!/^i[0-9]+\.ebayimg\.com$/.test(url.hostname))return '';
  return url.href;
 }catch{return ''}
}
const clean=(value,max=150)=>String(value||'').replace(/\s+/g,' ').trim().slice(0,max);
export function normalizeEbayItem(raw,mode){
 if(!raw||typeof raw!=='object')return null;
 const url=safeEbayListingUrl(raw.itemWebUrl),title=clean(raw.title,160);
 const buy=Array.isArray(raw.buyingOptions)?raw.buyingOptions:[];
 if(!url||!title||!(mode==='auction'?buy.includes('AUCTION'):buy.includes('FIXED_PRICE')))return null;
 const value=mode==='auction'?(raw.currentBidPrice||raw.price):raw.price;
 const n=Number(value?.value);
 const price=Number.isFinite(n)&&n>=0&&/^[A-Z]{3}$/.test(value?.currency||'')?
  new Intl.NumberFormat('en-US',{style:'currency',currency:value.currency}).format(n):'Price unavailable';
 const seller=clean(raw.seller?.username,65);
 const shippingCost=raw.shippingOptions?.find?.(x=>x.shippingCost?.value!==undefined)?.shippingCost;
 const amount=Number(shippingCost?.value);
 const shipping=Number.isFinite(amount)&&amount>=0&&/^[A-Z]{3}$/.test(shippingCost?.currency||'')?
  amount===0?'Free shipping':new Intl.NumberFormat('en-US',{style:'currency',currency:shippingCost.currency}).format(amount)+' shipping':'Shipping: check eBay';
 const bidCount=Number.isSafeInteger(raw.bidCount)&&raw.bidCount>=0?raw.bidCount:null;
 const ends=raw.itemEndDate&&Number.isFinite(Date.parse(raw.itemEndDate))?raw.itemEndDate:'';
 return {
  id:clean(raw.itemId||url,180),url,title,
  image:safeEbayImageUrl(raw.image?.imageUrl||''),
  price,seller,shipping,bidCount,ends,
  mode,condition:clean(raw.condition,70),
  sellerFeedback:Number.isFinite(Number(raw.seller?.feedbackPercentage))&&raw.seller?.feedbackPercentage!==undefined?Number(raw.seller.feedbackPercentage):null,
  topRated:raw.topRatedBuyingExperience===true,
  // No paid-ad claim from a search result alone.
  sponsored:raw.priorityListing===true
 };
}
export function normalizeEbayFeed(data,mode){
 const items=[],seen=new Set();
 for(const raw of Array.isArray(data?.itemSummaries)?data.itemSummaries:[]){
  const item=normalizeEbayItem(raw,mode);
  if(!item||seen.has(item.url))continue;
  seen.add(item.url);items.push(item);
 }
 return items;
}
