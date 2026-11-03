/* Public coupon discovery contract — no financial balances, fabricated codes or checkout.
 * Brand watch lists and reviewed PUBLIC offers only. Device-only until auth/D1 is verified.
 */
export const COUPON_WALLET_KEY='quantaphi:coupon-wallet:device:v1';
export const COUPON_FEED='/data/verified-coupon-offers.json';
export const COUPON_BRANDS=Object.freeze([
 Object.freeze({
  id:'pepsi',name:'Pepsi',issuer:'PepsiCo',category:'Beverages',tagline:'Cola classics & the deal radar',
  official:'https://www.pepsi.com/products/pepsi',
  promo:'https://contact.pepsico.com/pepsi/article/where-can-i-find-information-on-the-latest-promotions-do-you-off',
  shop:'https://www.walmart.com/search?q=pepsi',
  image:'https://i5.walmartimages.com/asr/d873d3ed-21bc-4db1-a83e-cbdc4fb5960c.f8d4a7ecd39238308a7057358186cc95.jpeg',
  imageSource:'https://www.walmart.com/ip/Pepsi-Soda-16-Fl-Oz-Can-Case-of-12/456242368',
  imageAlt:'Pepsi blue soda can photographed for its retailer listing'
 }),
 Object.freeze({
  id:'mello-yello',name:'Mello Yello',issuer:'The Coca-Cola Company',category:'Beverages',tagline:'Citrus refreshment & rewards explorer',
  official:'https://www.coca-cola.com/us/en/brands/melloyello',
  promo:'https://www.coca-cola.com/us/en/offerings',
  shop:'https://www.walmart.com/search?q=mello%20yello',
  image:'https://americancandyuk.co.uk/cdn/shop/files/VSZj3pw2PLPbsrf--A3hdnWzbtxa0gq0dpU52sHpNrDHCQiFqN6fwJ7oPhNLr1p7OTUhk2tF-Gs9LbmR3ZB15c_DSj8gh1w1um7xCdIzE6BYcc-PIug0f3HlVHhs0Enq0aqwZXjPYwqzklXcEm_5F3PAPQGIGHR8EdtFWpY01pA.webp?v=1761044380&width=750',
  imageSource:'https://americancandyuk.co.uk/products/mello-yello-citrus-soda-355ml',
  imageAlt:'Mello Yello yellow citrus soda can photographed by a retailer'
 })
]);
const issuers={
 pepsi:['pepsi.com','contact.pepsico.com'],
 'mello-yello':['coca-cola.com']
};
const redemptionModes=new Set(['paper-manufacturer','merchant-app','online-code','loyalty-activation','rebate']);
const iso=raw=>typeof raw==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(raw)&&Number.isFinite(Date.parse(raw))?Date.parse(raw):NaN;
function officialSource(raw,brandId){
 if(typeof raw!=='string')return '';
 try{
  const u=new URL(raw),allowed=issuers[brandId]||[];
  if(u.protocol!=='https:'||u.username||u.password||u.port)return '';
  if(!allowed.some(d=>u.hostname===d||u.hostname.endsWith('.'+d)))return '';
  return u.href;
 }catch{return ''}
}
export function filterVerifiedOffers(rows,at=new Date().toISOString()){
 const now=iso(at);
 if(!Number.isFinite(now)||!Array.isArray(rows))return [];
 const valid=[],seen=new Set();
 for(const raw of rows.slice(0,1000)){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
  const id=raw.id,brandId=raw.brandId,title=raw.title,sourceUrl=officialSource(raw.sourceUrl,brandId);
  const verified=iso(raw.verifiedAt),expires=iso(raw.expiresAt);
  if(typeof id!=='string'||!/^[a-z0-9-]{3,100}$/.test(id)||seen.has(id))continue;
  if(!COUPON_BRANDS.some(b=>b.id===brandId)||!sourceUrl)continue;
  if(typeof title!=='string'||title.trim().length<6||title.length>150)continue;
  if(!['editorial-reviewed','authorized-feed'].includes(raw.reviewStatus))continue;
  if(!redemptionModes.has(raw.redemption)||!Number.isFinite(verified)||!Number.isFinite(expires))continue;
  if(verified>now||now-verified>48*60*60*1000||expires<=now||expires<=verified)continue;
  // A discoverable public source is not a coupon barcode, activated perk, or payment asset.
  valid.push(Object.freeze({
   id,brandId,title:title.trim(),sourceUrl,verifiedAt:raw.verifiedAt,expiresAt:raw.expiresAt,
   reviewStatus:raw.reviewStatus,redemption:raw.redemption,
   store:typeof raw.store==='string'?raw.store.slice(0,70):'Check terms at issuer',
   details:typeof raw.details==='string'?raw.details.slice(0,300):'Verify exact eligible items at the source'
  }));
  seen.add(id);
 }
 return valid;
}
export function collectFollowedOffers(saved,verified,following,at=new Date().toISOString()){
 const current=filterVerifiedOffers(verified,at);
 const followed=new Set(Array.isArray(following)?following:[]);
 const old=new Set(Array.isArray(saved)?saved.map(x=>x?.id):[]);
 const list=current.filter(o=>followed.has(o.brandId)||old.has(o.id));
 return Object.freeze(list);
}
export function checkoutAdvice(offer,merchant){
 const safe=offer&&redemptionModes.has(offer.redemption);
 if(!safe)return {canAutoApply:false,message:'No currently verified coupon; nothing can be applied.'};
 if(merchant==='walmart-in-store'){
  return {canAutoApply:false,message:offer.redemption==='paper-manufacturer'?
   'Walmart in-store requires a valid paper manufacturer coupon with a scannable barcode. Phone-screen coupons are not accepted. Print from the authorized issuer if permitted.':
   'Walmart in-store does not accept digital manufacturer coupons shown on a phone. Check official Walmart Cash activation or the issuer terms.'};
 }
 if(merchant==='walmart-online'){
  return {canAutoApply:false,message:'Walmart.com promo and seller eligibility differ from in-store paper coupons. Verify at official checkout; no automatic code entry is connected.'};
 }
 if(merchant==='mcdonalds'){
  return {canAutoApply:false,message:'McDonald’s app deals are account/location-specific and generally limited to one deal per person, per visit. Open the official app; no automatic stacking.'};
 }
 return {canAutoApply:false,message:'Use the original issuer redemption instructions. No verified automatic tender integration exists.'};
}
