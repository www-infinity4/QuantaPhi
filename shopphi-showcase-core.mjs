/* ShopPhi's source-backed editorial shopping chapters.
 * This module chooses among existing, verified public Quick Cards; it neither
 * manufactures an advertisement nor creates a merchant claim, impression or coin.
 */
const CHAPTERS=[
 ['cookout',/\b(oscar mayer|hot dogs?|barbecues?|bbq|grills?|charcoal|picnic|patio|lawn games?|outdoor dining|cookouts?)\b/i],
 ['movie-night',/\b(movie nights?|films?|movies?|dvd|blu[ -]?ray|popcorn|candy|sodas?|couches?|sofas?|televisions?|tv screens?|home theaters?|streaming entertainment)\b/i],
 ['kitchen',/\b(recipes?|kitchen|stoves?|cookware|ovens?|refrigerators?|appliances?|ranges?|dishwashers?|rent.a.center|rent.to.own)\b/i],
 ['tools',/\b(tools?|micrometers?|calipers?|wrenches?|socket sets?|precision measuring|workshop)\b/i],
 ['outdoors',/\b(camping|hiking|backpack|outdoor clothing|tents?|trail gear|fishing)\b/i],
 ['family',/\b(strollers?|baby gear|pushchairs?|car seats?|nursery)\b/i],
 ['collectibles',/\b(coins?|silver dollars?|baseball cards?|collectibles?|antiques?|numismatic)\b/i],
 ['fashion',/\b(denim|jeans?|shirts?|jackets?|clothing|apparel|boots?)\b/i]
];
export const SHOWCASE_CHAPTERS=Object.freeze(CHAPTERS.map(([name])=>name));
export function chapterFor(input){
 const value=String(input||'').slice(0,750);
 if(/\bcoolers?\b/i.test(value)&&/\b(picnic|camping|food|beverages?|drinks?|ice chest|grill|outdoor)\b/i.test(value))return 'cookout';
 return CHAPTERS.find(([,pattern])=>pattern.test(value))?.[0]||null;
}
export function pickNextShowcase(cards,currentId,seen=new Set()){
 if(!Array.isArray(cards)||!cards.length)return null;
 const current=cards.find(c=>c?.id===currentId);
 const chapter=chapterFor([current?.title,current?.category,current?.description].join(' '));
 if(!chapter)return null; // No category match: don't inject unrelated discovery.
 const position=SHOWCASE_CHAPTERS.indexOf(chapter);
 const eligible=cards.filter(c=>c?.id&&c?.id!==currentId&&c.photo===true&&!seen.has(c.id)&&
   /^https?:\/\//.test(c.url||'https://quantaphi.org/')&&
   chapterFor([c.title,c.category,c.description].join(' ')));
 for(let step=0;step<SHOWCASE_CHAPTERS.length;step++){
  const chapter=SHOWCASE_CHAPTERS[(position+step)%SHOWCASE_CHAPTERS.length];
  const next=eligible.find(c=>chapterFor([c.title,c.category,c.description].join(' '))===chapter);
  if(next)return next;
 }
 return null;
}
export function canShowcaseAdvance({
 visible=false,hidden=false,paused=false,reducedMotion=false,focused=false,
 playing=false,editing=false,recencyMs=0
}={}){
 return visible&&!hidden&&!paused&&!reducedMotion&&!focused&&!playing&&!editing&&
  Number.isFinite(recencyMs)&&recencyMs>=45000;
}
