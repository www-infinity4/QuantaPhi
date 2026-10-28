/* The in-chat registry covers Bubbles-native cards. Source, discovery and
 * science Quick Cards already have real, first-party detail pages: reuse those
 * routes rather than displaying an empty card or inventing provider sessions.
 * This registry accepts ONLY fixed IDs from audited local card catalogs.
 */
import {QUICK_CARD_SOURCES} from './source-quick-cards.mjs';
import {SCIENCE_CARDS,scienceCardValid} from './science-quick-cards.mjs';
import {DISCOVERY_CARDS,safeDiscovery} from './quanta-feed-catalog.mjs';

const safeId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,90}$/.test(id);
const route=(id,name,path,surface)=>Object.freeze({
 id,title:name,repository:'www-infinity4/QuantaPhi',
 url:path+'?card='+encodeURIComponent(id),surface
});
const catalog=new Map();
for(const c of QUICK_CARD_SOURCES){
 if(safeId(c.id)&&!catalog.has(c.id))
  catalog.set(c.id,route(c.id,c.name,'/source-quick-card.html','#sourceQuickCardDetail'));
}
for(const c of SCIENCE_CARDS){
 if(safeId(c.id)&&scienceCardValid(c)&&!catalog.has(c.id))
  catalog.set(c.id,route(c.id,c.name,'/science-quick-card.html','#scienceQuickDetail'));
}
for(const c of DISCOVERY_CARDS){
 if(safeId(c.id)&&safeDiscovery(c)&&!catalog.has(c.id))
  catalog.set(c.id,route(c.id,c.name,'/quanta-feed-card.html','#quantaFeedCardDetail'));
}
export function resolveQuickCard(id){
 return safeId(id)?catalog.get(id)||null:null;
}
export const registeredDetailCardCount=catalog.size;
