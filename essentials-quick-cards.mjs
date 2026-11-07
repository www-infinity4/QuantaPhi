/* Source-backed, on-card essentials discovery. No paid endorsements, invented
 * price/stock, medical targeting, automatic checkout, or feed scraping. */
import {ESSENTIALS_SEED,prepareEssentialsBatch} from './essentials-card-batch.mjs?v=20261107-otc-eight1';
import {mountCardActions} from './quanta-card-actions.mjs';
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node};
const href=(label,url,cls)=>{const node=el('a',cls,label);node.href=url;node.target='_blank';node.rel='noopener noreferrer';return node};
export function createEssentialQuickCard(card){
 const article=el('article','iqc-card qec-card');
 article.dataset.sourceId=card.id;article.dataset.sourceName=card.brand+' · '+card.name;
 article.dataset.sourceReady='true';article.dataset.sourceCategory=card.category;
 article.dataset.sourceQuery=card.brand+' '+card.name;article.dataset.official=card.productUrl;
 article.dataset.personalization='disabled';
 article.append(el('p','qec-kicker','INFINITY® · HARD-TO-FIND ESSENTIALS'));
 const picture=href('',card.productUrl,'qec-photo-link');picture.setAttribute('aria-label','View '+card.brand+' '+card.name+' at '+card.sourceName);
 const img=el('img','qec-photo');img.src=card.imageUrl;img.alt=card.brand+' '+card.name+' · '+card.size;
 img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
 img.addEventListener('error',()=>{
  // Keep the real product card selectable when a third-party photo is blocked.
  img.replaceWith(el('span','qec-image-unavailable','Product photograph unavailable here. View the original item to see its package.'));
 },{once:true});picture.append(img);article.append(picture);
 const info=el('div','qec-info');
 info.append(el('p','qec-kind','Original retail listing · '+card.size),el('h2','qec-title',card.brand+' · '+card.name),
  el('p','qec-description',card.description));
 if(card.drugFacts)info.append(el('p','qec-facts',card.drugFacts));
 if(card.factsUrl)info.append(href('Official product facts and directions',card.factsUrl,'qec-facts-source'));
 info.append(href('View exact item at '+card.sourceName,card.productUrl,'qec-shop'));
 info.append(el('p','qec-note','Independent editorial card, not a sponsored advertisement. No live stock or price guarantee. Read the original Drug Facts label before use.'));
 const actions=el('div','qec-actions');mountCardActions(actions,{
  id:card.id,name:card.brand+' · '+card.name,category:card.category,
  featureUrl:card.productUrl,official:card.productUrl,
  image:card.imageUrl,route:'/?card='+encodeURIComponent(card.id)
 });info.append(actions);article.append(info);
 return article;
}
async function reviewedCatalog(){
 try{
  const response=await fetch('/data/essentials-reviewed.json',{cache:'no-store',credentials:'same-origin'});
  if(response.ok){const items=await response.json();if(Array.isArray(items)&&items.length)return items;}
 }catch{} // Use the source-reviewed seeds when no separately validated import is published.
 return ESSENTIALS_SEED;
}
export async function mountEssentialsQuickCards(){
 const host=document.getElementById('essentialsQuickCards');if(!host||host.dataset.mounted==='true')return;
 const {cards,held}=prepareEssentialsBatch(await reviewedCatalog());
 const header=el('div','qec-heading');
 header.append(el('h2','','Hard-to-find medicine cabinet essentials'),
  el('p','','Individual original product cards with real source images and retailer links. Use + Follow to add a chosen item to Following. No health-interest profiling or invented stock.'));
 const grid=el('div','qec-grid');for(const item of cards)grid.append(createEssentialQuickCard(item));
 host.replaceChildren(header,grid);
 if(held.length)host.append(el('p','qec-review',held.length+' products held for review or a refreshed listing.'));
 host.dataset.mounted='true';
 window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountEssentialsQuickCards,{once:true});
 else mountEssentialsQuickCards();
}