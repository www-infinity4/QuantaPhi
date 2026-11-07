/* Infinity Quick Cards: independently checked OTC essentials pilot and reusable
 * 120-record importer. Listing evidence is NOT inventory, a current offer,
 * licensed paid advertising, a medical recommendation, or checkout permission.
 */
const make=(id,brand,name,size,productUrl,imageUrl,sourceName,description,drugFacts='')=>Object.freeze({
 id,brand,name,size,productUrl,imageUrl,sourceName,description,drugFacts,
 category:'Skin relief',kind:'otc',checkedAt:'2026-11-07',
 reviewState:'editorial-reviewed',sponsored:false,
 imageCredit:'Product photograph hosted by '+sourceName,
 imageRights:'not-confirmed-for-paid-ads'
});
export const ESSENTIALS_SEED=Object.freeze([
 make('blue-star-ointment','Blue Star','Anti-Itch Medicated Ointment','2 oz',
  'https://www.walmart.com/ip/10316529',
  'https://i5.walmartimages.com/seo/Blue-Star-Anti-Itch-Medicated-Ointment-Hydrocortisone-and-streroid-free-2-oz_b23f2324-8400-4266-8b4f-23a80ec5d9b9.021b7045a7dca1b526ece76446bd2d23.jpeg',
  'Walmart','Original steroid-free skin-itch ointment. Review label and precautions before use.',
  'DailyMed label: camphor 1.24%; topical analgesic for temporary relief of minor itching and skin irritation.'),
 make('campho-phenique-liquid','Campho-Phenique','Maximum Strength Antiseptic Liquid','0.75 fl oz',
  'https://www.walmart.com/ip/555883890',
  'https://i5.walmartimages.com/seo/Campho-Phenique-Maximum-Strength-Antiseptic-Liquid-Pain-Relief-Anti-Itch-Treatment-Provides-Instant-Bug-Bites-Minor-Cuts-Skin-Irritations-0-75-Oz_b16c61c8-143e-4f53-8354-391d2ba0788b.16f21fcafa47cb5d066c923a08513e1f.jpeg',
  'Walmart','Classic antiseptic liquid. Check the actual label for approved uses and warnings.'),
 make('aveeno-anti-itch','Aveeno','Anti-Itch Concentrated Lotion','4 fl oz',
  'https://fsastore.com/aveeno-anti-itch-concentrated-lotion-with-calamine-and-triple-oat-complex-4-fl-oz./6400.html',
  'https://fsastore.com/dw/image/v2/BFKW_PRD/on/demandware.static/-/Sites-hec-master/default/dwfbe18418/images/large/2025-NOVEMBER-ARRIVALS/6400-Aveeno-Anti-Itch-Concentrated-Lotion-with-Calamine-and-Triple-Oat-Complex-4-fl-oz_00135.jpg?sw=2700',
  'FSA Store','Calamine-based anti-itch lotion. Compare the label rather than assuming the formula matches Blue Star.'),
 make('sarna-original-lotion','Sarna','Original Anti-Itch Lotion','7.5 fl oz',
  'https://www.carewell.com/product/sarna-original-anti-itch-external-analgesic-lotion-0-5-strength-7-5-oz/',
  'https://cdn11.bigcommerce.com/s-hr7ra7xc8x/images/stencil/3840w/products/5331/32272/00316022975-front__46886.1673292826.png?compression=lossless',
  'Carewell','Classic external analgesic lotion. Verify current formula, instructions and availability at source.')
]);
function httpsPublic(value){
 try{const url=new URL(value);const hostname=url.hostname.toLowerCase();
  return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&
   /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(hostname)&&
   !hostname.endsWith('.local')&&!hostname.endsWith('.internal')&&
   !hostname.endsWith('.example')&&!url.hash;
 }catch{return false}
}
const simple=v=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=240;
export function validateEssentialCard(card,{today=new Date().toISOString().slice(0,10)}={}){
 if(!card||!/^[a-z0-9-]{3,70}$/.test(card.id||'')||
  ![card.brand,card.name,card.size,card.sourceName,card.description,card.imageCredit].every(simple)||
  card.category!=='Skin relief'||card.kind!=='otc'||
  card.reviewState!=='editorial-reviewed'||card.sponsored!==false||
  card.imageRights!=='not-confirmed-for-paid-ads')return false;
 if(!httpsPublic(card.productUrl)||!httpsPublic(card.imageUrl))return false;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(card.checkedAt||'')||!/^\d{4}-\d{2}-\d{2}$/.test(today))return false;
 const checked=Date.parse(card.checkedAt+'T00:00:00Z'),current=Date.parse(today+'T00:00:00Z');
 return Number.isFinite(checked)&&Number.isFinite(current)&&current>=checked&&current-checked<=90*86400000;
}
export function prepareEssentialsBatch(records,{limit=120,today=new Date().toISOString().slice(0,10)}={}){
 const cap=Number.isInteger(limit)?Math.max(1,Math.min(120,limit)):120;
 const cards=[],held=[],used=new Set();
 for(const row of Array.isArray(records)?records:[]){
  if(cards.length>=cap){held.push({id:row?.id||null,reason:'batch_limit'});continue}
  if(!validateEssentialCard(row,{today})){held.push({id:row?.id||null,reason:'review_required'});continue}
  if(used.has(row.id)){held.push({id:row.id,reason:'duplicate'});continue}
  used.add(row.id);cards.push(Object.freeze({...row}));
 }
 return Object.freeze({cards:Object.freeze(cards),held:Object.freeze(held)});
}