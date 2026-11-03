import {createDiscoveredCard,rememberDiscoveredCard} from './search-card-discovery.mjs';
import {mountCardActions} from './quanta-card-actions.mjs';
const el=(tag,cls,label)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(label!==undefined)node.textContent=label;return node};
export function mountDiscoveredQuickCard(host,search=location.search){
 if(!host)return null;
 const params=new URLSearchParams(search);
 const card=createDiscoveredCard(params.get('site'),params.get('name'));
 host.replaceChildren();
 if(!card){host.append(el('h1','','Website unavailable'),el('p','','This Quick Card needs a valid public HTTPS website. Search again from the QuantaPhi home page.'));return null}
 document.title=card.name+' · Infinity Website Quick Card';
 host.dataset.sourceId=card.id;host.dataset.sourceName=card.name;host.dataset.official=card.official;
 const domain=new URL(card.official).hostname;
 const logo=el('img','dqc-logo');logo.src='https://www.google.com/s2/favicons?domain='+encodeURIComponent(domain)+'&sz=128';logo.alt='';logo.loading='lazy';
 const head=el('div','dqc-identity'),identity=el('div');
 identity.append(el('p','dqc-kicker','Independent website preview'),el('h1','',card.name),el('p','dqc-domain',domain));
 head.append(logo,identity);
 const intro=el('p','',card.description);
 const visit=el('a','dqc-visit','Visit '+card.name+' website ↗');
 visit.href=card.official;visit.target='_blank';visit.rel='noopener noreferrer';
 const form=el('form','dqc-search'),label=el('label','','Search this website');
 const input=el('input');input.type='search';input.name='query';input.maxLength=120;input.placeholder='What would you like to find?';input.id='dqcSiteSearch';label.htmlFor=input.id;
 const button=el('button','','Search original site results');button.type='submit';
 form.append(label,input,button);
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const term=input.value.trim();if(!term)return;
  const dest=new URL('https://www.google.com/search');
  dest.searchParams.set('q','site:'+domain+' '+term);
  window.open(dest.href,'_blank','noopener,noreferrer');
 });
 const actions=el('div','dqc-actions');
 mountCardActions(actions,card,{websiteReader:false,showPreview:false});
 const note=el('p','dqc-note','No merchant affiliation, verified product listing, price, checkout or cross-device Cloudflare publication is implied. Buy It Now requires a real merchant-authorized offer and purchase receipt.');
 host.append(head,intro,visit,form,actions,note);
 rememberDiscoveredCard(card);
 return card;
}
if(typeof document!=='undefined'){
 const card=mountDiscoveredQuickCard(document.getElementById('discoveredQuickCard'));
 if(card){
  const script=document.createElement('script');script.src='/bubbles-embed.js';
  script.dataset.bubbleId='discovered-'+card.id;
  script.dataset.bubbleRole='specialist';
  script.dataset.bubbleName=card.name+' Bubbles';
  script.dataset.bubbleInstructions=('Help explore the public '+card.name+' website at '+card.official+'. This is an independent source preview, not provider employment, login permission, approved commerce or source API access. Never claim a purchase succeeded without an authenticated merchant order receipt.').slice(0,800);
  document.body.append(script);
 }
}
