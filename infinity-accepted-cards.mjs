import {INFINITY_ACCEPTED_BRANDS,acceptedBrand,isInfinityAccepted,hasAcceptedSource} from './infinity-accepted-catalog.mjs';
import {mountCardActions} from './quanta-card-actions.mjs';
import {mountQuickCardTinyfishTools} from './quick-card-tinyfish-actions.mjs';
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
export function createAcceptedCard(card){
 if(!isInfinityAccepted(card))throw Error('accepted_card_unavailable');
 const article=node('article',undefined,'iqc-card iac-card');
 article.dataset.sourceId=card.id;article.dataset.sourceName=card.name;article.dataset.sourceReady='true';
 article.dataset.infinityAccepted='true';article.dataset.official=card.official;
 article.dataset.sourceStatus=card.sourceStatus;
 const fit=()=>{
  const stage=article.closest('#oracleCardStage');if(!stage||window.innerWidth>650)return;
  const remaining=window.innerHeight-Math.max(0,stage.getBoundingClientRect().top+window.scrollY)-20;
  article.style.setProperty('--iac-available-height',Math.max(240,remaining)+'px');
 };
 article.addEventListener('oracle:activate',()=>requestAnimationFrame(fit));
 const heading=node('header',undefined,'iac-heading');
 heading.append(node('span','∞ Infinity accepted','iac-badge'),node('small',card.category,'iqc-kind'));
 const media=node('div',undefined,'iac-media');
 if(card.image){const img=node('img');img.src=card.image;img.alt=card.name+' — image from the original website';
  img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  img.addEventListener('error',()=>{img.remove();media.append(node('span','See original website for product photos.'))},{once:true});media.append(img);
 }else media.append(node('span','Original product photos are available at the brand website.'));
 const content=node('div',undefined,'iac-content');
 content.append(node('h2',card.name),node('p','Explore the products. Keep the parts, care and repair information close.','iac-intro'));
 const browser=node('div');mountQuickCardTinyfishTools(browser,card);content.append(browser);
 const official=node('a','Visit official website ↗','iac-official');official.href=card.official;official.target='_blank';official.rel='noopener noreferrer';
 const source=node('p',(hasAcceptedSource(card)?'Website checked '+String(card.sourceCheckedAt||'').slice(0,10)+'. ':
  'Website action links are awaiting verification. ')+card.acceptanceNote,'iac-provenance');
 content.append(official,source);
 const tools=node('div');mountCardActions(tools,{...card,route:'/?card='+card.id},{showSearch:false});content.append(tools);
 article.append(heading,media,content);return article;
}
function mount(){
 const bank=document.getElementById('infinityAcceptedCards');
 if(bank&&!bank.dataset.mounted){
  // Owner acceptance controls placement; source checks control available actions.
  bank.replaceChildren(...INFINITY_ACCEPTED_BRANDS.map(createAcceptedCard));
  bank.dataset.mounted='true';window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
 }
 const detail=document.getElementById('infinityAcceptedDetail');
 if(detail){const card=acceptedBrand(new URLSearchParams(location.search).get('card'));
  if(card){detail.replaceChildren(createAcceptedCard(card));document.title=card.name+' · Infinity accepted'}
  else detail.textContent='Choose an Infinity accepted brand from the QuantaPhi carousel.';
 }
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 window.addEventListener('resize',()=>{
  const active=document.querySelector('#oracleCardStage > .iac-card');if(active)active.dispatchEvent(new Event('oracle:activate'));
 });
}
