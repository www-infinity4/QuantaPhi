// Public source grounding for engineering questions about registered QuantaPhi cards.
// This does not authorize editing, create a ticket, or fetch a private repository.
import {cards} from '../../bubbles-card-catalog.mjs';
const WORK=/(?:\b(?:audit|inspect|diagnos\w*|repair|fix|upgrade|migrat\w*|refactor|rebuild|integrat\w*|plan|architecture|rework|improv\w*|correct|build out|redesign)\b)/i;
const untrusted=/^(?:do not|don't|never|ignore this|pretend|quote|example only)\b/i;
const escape=s=>s.replace(/[.*+?^$()|[\]{}]/g,'\\$&');
export function cardSourcePlanFor(text){
 const request=String(text||'').slice(0,3000);
 if(!WORK.test(request)||untrusted.test(request.trim()))return null;
 const matches=cards.filter(card=>{
  if(!/^www-infinity4\/[a-z0-9_.-]+$/i.test(card.repository)||card.repository==='www-infinity4/QuantaPhi')return false;
  // Match the complete displayed card title or explicit id, never an alias
  // such as "radio" that may be a generic electronics question.
  return [card.title,card.id].some(name=>new RegExp('(?:^|[^a-z0-9])'+escape(name).replace(/[ -]+/g,'[\\s-]+')+'(?=$|[^a-z0-9])','i').test(request));
 });
 if(matches.length!==1)return null;
 const card=matches[0];
 return {repository:card.repository,path:'README.md',card:card.id,liveRoute:card.url};
}
