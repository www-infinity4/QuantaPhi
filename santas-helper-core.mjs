/* Santa's Helper discovery contract: no API calls, identity profiling, fake offers or checkout. */
export const GIFT_LANES=Object.freeze([
 {id:'fragrance',name:'Fragrance discovery',subtitle:'A discovery set is kinder than guessing a signature scent.',
  interests:['fragrance'],links:[
   {name:'Sephora · fragrance gifts',url:'https://www.sephora.com/shop/fragrance-gift-sets'},
   {name:'Ulta Beauty · fragrance',url:'https://www.ulta.com/shop/fragrance'},
   {name:'Macy’s · fragrance gifts',url:'https://www.macys.com/shop/beauty/gift-sets/fragrance?id=214356'},
   {name:'Nordstrom · beauty and fragrance',url:'https://www.nordstrom.com/browse/beauty/fragrance'}]},
 {id:'fashion',name:'Style and accessories',subtitle:'Start with their own favorite colors, sizes and style.',
  interests:['fashion'],links:[
   {name:'Levi’s · apparel',url:'https://www.levi.com/US/en_US/'},
   {name:'Macy’s · gifts',url:'https://www.macys.com/'},
   {name:'Nordstrom · gifts',url:'https://www.nordstrom.com/'}]},
 {id:'hobbies',name:'Books, music and hobbies',subtitle:'A gift related to something they already love can be the best surprise.',
  interests:['books','music','garden'],links:[
   {name:'Barnes & Noble · books',url:'https://www.barnesandnoble.com/'},
   {name:'Guitar Center · instruments',url:'https://www.guitarcenter.com/'},
   {name:'The Home Depot · garden',url:'https://www.homedepot.com/'}]},
 {id:'keepsakes',name:'Meaningful keepsakes',subtitle:'Personal stories, favorite memories and handmade ideas.',
  interests:['keepsakes'],links:[
   {name:'Etsy · handmade gifts',url:'https://www.etsy.com/'},
   {name:'Shutterfly · photo gifts',url:'https://www.shutterfly.com/'},
   {name:'Walmart · gifting',url:'https://www.walmart.com/'}]}
].map(lane=>Object.freeze({...lane,interests:Object.freeze(lane.interests),links:Object.freeze(lane.links.map(x=>Object.freeze(x)))})));
const INTERESTS=Object.freeze([
 ['books',/\b(?:book|books|reading|novel|library)\b/i],
 ['garden',/\b(?:garden|gardening|plants?|flowers?|outdoors)\b/i],
 ['music',/\b(?:music|guitar|singing|songs?|instruments?|radio|vinyl)\b/i],
 ['fashion',/\b(?:fashion|clothes|clothing|style|sweaters?|shoes?|accessor(?:y|ies))\b/i],
 ['fragrance',/\b(?:perfume|cologne|fragrance|scent|aftershave)\b/i],
 ['keepsakes',/\b(?:photos?|memories|handmade|sentimental|keepsakes?|custom)\b/i]
]);
const RECIPIENTS=Object.freeze([
 ['mother',/\b(?:mother|mom|mum|mama)\b/i],
 ['father',/\b(?:father|dad|daddy|papa)\b/i],
 ['partner',/\b(?:wife|husband|spouse|partner|boyfriend|girlfriend)\b/i],
 ['friend',/\b(?:friend|buddy|bestie)\b/i],
 ['child',/\b(?:daughter|son|child|kid)\b/i]
]);
export function interpretGiftRequest(value){
 const raw=String(value??'').replace(/[\u0000-\u001f]/g,' ').slice(0,600).trim();
 const recipient=RECIPIENTS.find(([,pattern])=>pattern.test(raw))?.[0]||'someone';
 const match=raw.match(/\$\s*([\d,]{1,12})(?:\.(\d{1,2}))?/);
 let budgetCents=null;
 if(match){const dollars=Number(match[1].replaceAll(',',''));const cents=Number((match[2]||'').padEnd(2,'0'));
  if(Number.isSafeInteger(dollars)&&dollars>=1&&dollars<=10000&&cents>=0&&cents<100)budgetCents=dollars*100+cents;
 }
 const interests=INTERESTS.filter(([,pattern])=>pattern.test(raw)).map(([id])=>id);
 return Object.freeze({raw,recipient,budgetCents,interests});
}
export function recommendGiftLanes(value){
 const query=typeof value==='string'?interpretGiftRequest(value):value;
 const wanted=query?.interests||[];
 // Never infer fragrance, clothing, gender, age or health from a relation or a photo.
 return [...GIFT_LANES].sort((a,b)=>
  Number(b.interests.some(id=>wanted.includes(id)))-Number(a.interests.some(id=>wanted.includes(id))));
}
const MERCHANTS=new Set(['www.sephora.com','www.ulta.com','www.macys.com','www.nordstrom.com',
 'www.levi.com','www.barnesandnoble.com','www.guitarcenter.com','www.homedepot.com',
 'www.etsy.com','www.shutterfly.com','www.walmart.com']);
export function validMerchantLink(href){
 try{const url=new URL(href);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&MERCHANTS.has(url.hostname)}
 catch{return false}
}
