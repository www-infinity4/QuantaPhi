import {searchQuickCards} from './quick-card-search-core.mjs?v=20261029-housing1';
import {createCardArtwork} from './quanta-card-experience.mjs?v=20261027-karaoke1';
import {mountCardActions} from './quanta-card-actions.mjs';
import {openQuickCardPreview} from './quick-card-preview.mjs';
const el=(tag,cls,label)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(label!==undefined)n.textContent=label;return n};
export function showQuickCardMatches(query){
 const host=document.getElementById('quickCardSearchResults');if(!host)return [];
 const cards=searchQuickCards(query);host.replaceChildren();host.hidden=!cards.length;
 if(!cards.length)return cards;
 host.append(el('h2','','Matching Quick Cards'),el('p','qsr-query','For “'+String(query).slice(0,160)+'”'));
 const grid=el('div','qsr-grid');host.append(grid);
 for(const card of cards){
  const article=el('article','qsr-card');article.dataset.quickCardMatch=card.id;
  if(card.internal&&card.shareImage){const image=el('img','qsr-housing-image');image.src=card.shareImage;image.alt='Home Access · Disability Housing';image.style.cssText='width:100%;height:auto;border-radius:12px;display:block';article.append(image);}
  else article.append(createCardArtwork(card,true));
  const body=el('div','qsr-body'),heading=el('h3'),title=el('a','qsr-title',card.name);
  title.href=card.route;
  title.addEventListener('click',event=>{if(openQuickCardPreview({url:card.route,title:card.name,description:card.description,official:card.official}))event.preventDefault()});
  heading.append(title);body.append(heading,el('p','qsr-domain',new URL(card.official).hostname));
  const visit=el('a','qsr-visit',card.id==='disability-housing'?'Start housing intake →':card.internal?'Open '+card.name+' →':'Visit '+card.name+' ↗');visit.href=card.internal?card.route:card.official;visit.target=card.internal?'_self':'_blank';visit.rel='noopener';visit.referrerPolicy='strict-origin-when-cross-origin';body.append(visit);
  const actions=el('div','qsr-actions');mountCardActions(actions,card,card.internal?{websiteReader:false,showOriginal:false}:{});body.append(actions);article.append(body);grid.append(article);
 }
 return cards;
}
if(typeof document!=='undefined'){
 window.addEventListener('quantaphi:query-start',event=>showQuickCardMatches(event.detail?.query||''));
 const ready=()=>{
  document.getElementById('qNewSearch')?.addEventListener('click',()=>{const root=document.getElementById('quickCardSearchResults');if(root){root.replaceChildren();root.hidden=true}});
  const q=new URLSearchParams(location.search).get('q');if(q)showQuickCardMatches(q);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
}
