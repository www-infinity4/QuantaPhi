import {OWNER_SYSTEMS,ownerCtaUrl} from './owner-engineer-core.mjs';
const element=(tag,klass,value)=>{
 const n=document.createElement(tag);
 if(klass)n.className=klass;
 if(value!==undefined)n.textContent=value;
 return n;
};
export function buildOwnerDeveloperCard(){
 const card=element('section','owner-developer-card');
 card.setAttribute('aria-label','QuantaPhi creator and system engineering overview');
 card.append(element('p','owner-card-eyebrow','CREATOR PROFILE · OWNER-SUPPLIED INFORMATION'));
 card.append(element('h4','owner-card-heading','Kris Watson · QuantaPhi creator & engineering lead'));
 card.append(element('p','owner-card-summary','The QuantaPhi and Infinity project family explores AI-assisted creation, media, source-aware search, original Quick Cards, site-building and separate experimental token ledgers. These descriptions are project goals, not proof every integration is live.'));
 const list=element('div','owner-system-list');
 for(const system of OWNER_SYSTEMS){
  const item=element('section','owner-system');
  item.append(element('strong','',system.name),element('p','',system.summary));
  list.append(item);
 }
 card.append(list);
 const actions=element('div','owner-card-actions');
 const create=element('a','owner-gpt-create','Create with GPT');
 create.href=ownerCtaUrl();
 const inSite=element('a','owner-gpt-internal','Explore the QuantaPhi GPT tool');
 inSite.href='/gpt/';
 actions.append(create,inSite);
 card.append(actions);
 card.append(element('p','owner-card-fineprint','Create with GPT opens the QuantaPhi source-and-HTML instruction handoff; it can copy your project brief before opening official ChatGPT. No private accounts or tools are transferred. Tokens are internal project concepts, not confirmed cash balances or guarantees.'));
 return card;
}
