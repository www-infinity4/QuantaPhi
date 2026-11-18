/* Browser-local featured-card exposure bookkeeping. No raw searches, health
 * interest profiles, network uploads, payment credits or automatic follows. */
import {markViewed} from './quanta-feed-rank.mjs';
const safeId=x=>typeof x==='string'&&/^[a-z0-9-]{1,70}$/.test(x);
const SENSITIVE=/\b(health|medical|medicine|drug|ointment|skin condition|first aid|symptom|treatment|therapy|cannabis|dispensary)\b|neosporin|blue[\s-]?star/i;

/** Count a displayed feature once, not each rerender, button focus or search keystroke. */
export function registerVisibleCard(state,card,{lastId='',visible=true}={}){
 const id=card?.id;
 if(!visible||!safeId(id)||id===lastId)return {state,lastId,recorded:false};
 // Shortcuts for self-directed OTC help remain selectable without health-ad targeting.
 if(SENSITIVE.test([card.name,card.category,card.feature].filter(Boolean).join(' ')))
  return {state,lastId:id,recorded:false};
 return {state:markViewed(state,id),lastId:id,recorded:true};
}
