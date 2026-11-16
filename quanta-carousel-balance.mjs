/* Fair, no-repeat carousel families. Pure card routing; no provider claims.
 * Categories do not change review/readiness or permission status. */
export const CAROUSEL_FAMILIES=Object.freeze(['accepted','website','original']);
export function selectNextFamilyPool(unseen,currentFamily='accepted'){
 if(!Array.isArray(unseen)||!unseen.length)return [];
 const start=CAROUSEL_FAMILIES.indexOf(currentFamily);
 // After a brand, show a website; after a website, show an original; after
 // an original, show a brand. Exhaust every ready card in the round first.
 for(let offset=1;offset<=CAROUSEL_FAMILIES.length;offset++){
  const family=CAROUSEL_FAMILIES[((start<0?CAROUSEL_FAMILIES.length-1:start)+offset)%CAROUSEL_FAMILIES.length];
  const pool=unseen.filter(c=>c.family===family);
  if(pool.length)return pool;
 }
 // Backward compatible if older clients do not yet provide family metadata.
 return unseen;
}
export function openingFamilyPool(cards,cursor=0){
 if(!Array.isArray(cards)||!cards.length)return [];
 for(let offset=0;offset<CAROUSEL_FAMILIES.length;offset++){
  const family=CAROUSEL_FAMILIES[(Math.max(0,Math.floor(Number(cursor)||0))+offset)%CAROUSEL_FAMILIES.length];
  const pool=cards.filter(c=>c.family===family);
  if(pool.length)return pool;
 }
 return cards;
}
