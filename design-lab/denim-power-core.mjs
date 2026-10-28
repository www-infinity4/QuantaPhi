/* Category Power: one intentional user action follows existing QuantaPhi cards.
 * No third-party accounts, browser jobs, background clicks, or wallet writes.
 * Same anonymous local discovery state as the live Oracle Following tab.
 */
import {BRAND_PRODUCT_CARDS} from '../brand-product-cards.mjs';
import {FEED_STORAGE_KEY,cleanFeedState} from '../quanta-feed-rank.mjs';
export {FEED_STORAGE_KEY,cleanFeedState};

export const DENIM_CARDS=Object.freeze(BRAND_PRODUCT_CARDS.map(({id,brand,title,url,image,category})=>Object.freeze({
 id,brand,title,url,image,category
})));
const allowedIds=new Set(DENIM_CARDS.map(c=>c.id));

/** Preserve all other followed cards and anonymous ranking state.
 * For 'follow-all', explicitly select every current verified denim product card.
 * 'unfollow-all' only removes denim IDs, not the user's other interests.
 * 'follow'/'unfollow' accept exactly one trusted catalog ID.
 */
export function applyDenimPower(raw,action,id){
 const state=cleanFeedState(raw);
 if(!['follow-all','unfollow-all','follow','unfollow'].includes(action))throw Error('Unsupported category action');
 if((action==='follow'||action==='unfollow')&&!allowedIds.has(id))throw Error('Card is not in the verified denim catalog');
 const next=new Set(state.following);
 if(action==='follow-all')for(const card of DENIM_CARDS)next.add(card.id);
 if(action==='unfollow-all')for(const card of DENIM_CARDS)next.delete(card.id);
 if(action==='follow')next.add(id);
 if(action==='unfollow')next.delete(id);
 if(next.size>800)throw Error('Following list has reached its safe capacity');
 return cleanFeedState({...state,following:[...next]});
}

export function denimTotals(raw){
 const set=new Set(cleanFeedState(raw).following);
 return Object.freeze({total:DENIM_CARDS.length,followed:DENIM_CARDS.filter(card=>set.has(card.id)).length,
  brands:new Set(DENIM_CARDS.map(card=>card.brand)).size});
}
