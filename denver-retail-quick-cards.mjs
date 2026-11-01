import {DENVER_RETAIL_CARDS,validDenverRetailCard} from './denver-retail-catalog.mjs';
import {mountCardActions} from './quanta-card-actions.mjs?v=20261031-heritage-signin1';

/* Retail destinations: not paid ads, live store inventory or checkout widgets.
 * Original product photos only where source-verified; otherwise use real product
 * categories rather than fabricated images. Every shop action is an actual link.
 */
const el=(tag,cls,value)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(value!==undefined)node.textContent=value;
 return node;
};
const link=(label,href,cls='')=>{
 const a=el('a',cls,label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';
 return a;
};
const directions=address=>{
 const u=new URL('https://www.google.com/maps/search/?api=1');
 u.searchParams.set('query',address);
 return u.href;
};
export function createDenverRetailCard(card){
 if(!validDenverRetailCard(card))throw Error('invalid_denver_retail_card');
 const article=el('article','iqc-card denver-retail-card');
 article.dataset.sourceId=card.id;
 article.dataset.sourceName=card.name;
 article.dataset.sourceReady='true';
 article.dataset.official=card.official;
 article.dataset.sourceCategory=card.category;
 article.dataset.sourceQuery=card.products.join(' ');
 article.dataset.verifiedDate=card.checked;
 const visual=link('',''+(card.shopUrl||card.official),'denver-retail-visual');
 visual.setAttribute('aria-label','Explore '+card.name+' at the original source');
 if(card.photo){
  const photo=el('img','denver-retail-photo');
  photo.src=card.photo;photo.alt=card.photoCredit+' · source photograph';
  photo.loading='lazy';photo.decoding='async';photo.referrerPolicy='no-referrer';
  photo.addEventListener('error',()=>{
   photo.remove();visual.classList.add('denver-retail-no-photo');
   visual.prepend(el('strong','denver-retail-feature',card.products[0]));
  },{once:true});
  visual.append(photo,el('span','denver-retail-photo-credit',card.photoCredit));
 }else{
  visual.classList.add('denver-retail-no-photo');
  visual.append(el('span','denver-retail-visual-label','IN-STORE SPECIALTIES'),
    el('strong','denver-retail-feature',card.products[0]),
    el('span','denver-retail-product-preview',card.products.slice(1).join(' · ')));
 }
 const info=el('div','denver-retail-info');
 info.append(el('p','denver-retail-kicker',card.group+' · DENVER AREA'),
  el('h2','denver-retail-name',card.name),
  el('p','denver-retail-description',card.description));
 const categories=el('div','denver-retail-products');
 categories.setAttribute('aria-label','Product categories');
 for(const name of card.products)categories.append(el('span','denver-retail-product',name));
 info.append(categories,el('p','denver-retail-address',card.address));
 if(card.hours)info.append(el('p','denver-retail-hours',card.hours));
 const actionsNav=el('nav','denver-retail-links');
 actionsNav.setAttribute('aria-label',card.name+' shopping and visiting links');
 actionsNav.append(link(card.sourceType?'View verified listing':'Original store website',card.official,'denver-retail-action'));
 if(card.shopUrl&&card.shopUrl!==card.official)actionsNav.append(link('Browse products',card.shopUrl,'denver-retail-action'));
 actionsNav.append(link('Directions',directions(card.address),'denver-retail-action'));
 if(card.tourUrl)actionsNav.append(link('Tour reservation details',card.tourUrl,'denver-retail-action'));
 info.append(actionsNav,
  el('p','denver-retail-note','Independent Infinity destination card · not a paid advertisement. Product photos, prices, stock and opening hours are set by the original store. No purchase or reservation occurs in this card.'));
 const actions=el('div','denver-retail-shared-actions');
 mountCardActions(actions,{id:card.id,name:card.name,category:card.category,
  featureUrl:card.shopUrl||card.official,official:card.official,
  route:'/?card='+encodeURIComponent(card.id)});
 info.append(actions);
 article.append(visual,info);
 return article;
}
function mount(){
 const bank=document.getElementById('premiumSourceCards');
 if(!bank)return;
 let added=0;
 for(const card of DENVER_RETAIL_CARDS){
  if(!validDenverRetailCard(card)||bank.querySelector('[data-source-id="'+card.id+'"]'))continue;
  bank.append(createDenverRetailCard(card));added++;
 }
 if(added)window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 window.addEventListener('quantaphi:source-cards-ready',mount);
}
