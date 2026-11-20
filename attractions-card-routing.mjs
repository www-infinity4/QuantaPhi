/* Directory records are not necessarily mounted Oracle Quick Cards.
 * Only route to a real, registered catalog card; otherwise show the
 * existing copyable destination brief. No phantom card navigation. */
import {REQUESTED_PUBLIC_CARDS} from './verified-brand-sports-catalog.mjs';
const catalogIds=new Set(REQUESTED_PUBLIC_CARDS.map(card=>card.id));
export function attractionQuickCardRoute(sourceId){
 if(typeof sourceId!=='string'||!/^curated:colorado-[a-z0-9-]+$/.test(sourceId))return null;
 const cardId=sourceId.slice('curated:'.length);
 return catalogIds.has(cardId)?'/?card='+encodeURIComponent(cardId):null;
}
