import {INFINITY_ACCEPTED_BRANDS,acceptedBrand,isInfinityAccepted,hasAcceptedSource} from './infinity-accepted-catalog.mjs';
import {mountCardActions} from './quanta-card-actions.mjs';
import {readCardWebsite,renderWebsiteResults} from './tinyfish-card-reader.mjs';
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
export function cardImageCandidates(card){
 return [...new Set([...(card.images||[]),card.image,card.logo].filter(value=>{
  if(typeof value!=='string'||!value.trim())return false;
  try{const u=new URL(value,typeof location==='undefined'?'https://quantaphi.org':location.origin);
   return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!/\.(gif|apng)(?:[?#]|$)/i.test(u.href);
  }catch{return false}
 }))];
}
export function mountAcceptedWebsiteActions(host,card,{reader=readCardWebsite}={}){
 const trusted=acceptedBrand(card?.id);if(!host||!trusted||trusted.official!==card.official)return null;
 const box=node('section',undefined,'iac-browser');box.setAttribute('aria-label',card.name+' website actions');
 const actions=node('div',undefined,'iac-website-actions');
 const status=node('p','','iac-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const result=node('div',undefined,'iac-results');result.hidden=true;
 const close=node('button','Close results','iac-close');close.type='button';close.hidden=true;
 const buttons=[],cache=new Map();let busy=false,selected=null;
 const more=node('details',undefined,'iac-extra-actions');more.append(node('summary','More website actions'));
 const extra=node('div',undefined,'iac-website-actions');more.append(extra);
 const show=(data)=>{
  result.hidden=false;close.hidden=false;renderWebsiteResults(result,data,{compact:true});
  status.textContent='Results from '+card.name+' · here in Infinity';
 };
 for(const [index,action] of (hasAcceptedSource(trusted)?trusted.actions:[]).entries()){
  const button=node('button',action.label,'iac-web-action');button.type='button';
  button.dataset.websiteAction=action.id;button.dataset.websiteDestination=action.url;
  button.setAttribute('aria-label',action.label+' on '+card.name);button.setAttribute('aria-expanded','false');
  button.addEventListener('click',async()=>{
   if(busy)return;selected=button;
   buttons.forEach(b=>b.setAttribute('aria-expanded',String(b===button)));
   if(cache.has(action.id)){show(cache.get(action.id));return}
   busy=true;buttons.forEach(b=>b.disabled=true);box.setAttribute('aria-busy','true');
   status.textContent='Getting '+action.label.toLowerCase()+' from '+card.name+'…';
   result.hidden=true;close.hidden=true;
   try{const data=await reader(card.id,action.id);cache.set(action.id,data);show(data)}
   catch(error){
    status.textContent=String(error.message||'This website could not be read. Please try again.');
    result.replaceChildren();result.hidden=false;close.hidden=false;
    const original=node('a','Open this page on '+card.name+' ↗','iac-official');
    original.href=action.url;original.target='_blank';original.rel='noopener noreferrer';result.append(original);
   }finally{busy=false;buttons.forEach(b=>b.disabled=false);box.removeAttribute('aria-busy')}
  });
  buttons.push(button);(index<3?actions:extra).append(button);
 }
 close.addEventListener('click',()=>{
  result.hidden=true;close.hidden=true;status.textContent='';
  buttons.forEach(b=>b.setAttribute('aria-expanded','false'));selected?.focus();
 });
 actions.style.setProperty('--iac-action-count',Math.min(3,buttons.length)||1);
 if(!buttons.length){
  // A real, explicit manufacturer link is more useful than an empty panel.
  // Do not imply that a particular product or price has been verified.
  const original=node('a','Browse official products ↗','iac-web-action iac-direct');
  original.href=trusted.official;original.target='_blank';original.rel='noopener noreferrer';
  original.setAttribute('aria-label','Browse '+trusted.name+' official website');
  actions.append(original);
  status.textContent='Specific product listings have not been verified for this card.';
 }
 box.append(actions);if(buttons.length>3)box.append(more);box.append(status,close,result);host.append(box);
 return {box,buttons,result};
}
export function createAcceptedCard(card){
 if(!isInfinityAccepted(card))throw Error('accepted_card_unavailable');
 const article=node('article',undefined,'iqc-card iac-card');
 article.dataset.sourceId=card.id;article.dataset.sourceName=card.name;article.dataset.sourceReady='true';
 article.dataset.infinityAccepted='true';article.dataset.official=card.official;article.dataset.sourceStatus=card.sourceStatus;
 const heading=node('header',undefined,'iac-heading');
 heading.append(node('span','∞ Infinity accepted','iac-badge'),node('small',card.category,'iqc-kind'));
 const title=node('div',undefined,'iac-title');title.append(node('h2',card.name),node('p',card.feature,'iac-intro'));
 const media=node('div',undefined,'iac-media'),images=cardImageCandidates(card);let imageIndex=0;
 if(images.length){
  const img=node('img');img.alt=card.name+' — image from the original website';
  img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  img.addEventListener('error',()=>{
   if(++imageIndex<images.length){img.src=images[imageIndex];return}
   // Collapse exhausted media instead of leaving a large empty moving viewer.
   img.remove();media.hidden=true;
  });img.src=images[0];media.append(img);
 }else media.hidden=true;
 const content=node('div',undefined,'iac-content');mountAcceptedWebsiteActions(content,card);
 const tools=node('div');mountCardActions(tools,{...card,route:'/?card='+card.id},
  {showSearch:false,websiteReader:false,showPreview:false,showOriginal:false});content.append(tools);
 const more=node('details',undefined,'iac-more');more.append(node('summary','Website & product information'));
 const official=node('a','Visit official website ↗','iac-official');official.href=card.official;official.target='_blank';official.rel='noopener noreferrer';
 const source=node('p',(hasAcceptedSource(card)?'Website checked '+String(card.sourceCheckedAt||'').slice(0,10)+'. ':
  'Website action links are awaiting verification. ')+card.acceptanceNote,'iac-provenance');
 const affiliate=node('a','Request affiliate product ↗','iac-official iac-affiliate-link');
 affiliate.href='/infinity-affiliates.html?brand='+encodeURIComponent(card.id);
 affiliate.setAttribute('aria-label','Request affiliation for '+card.name+' products');more.append(official,affiliate,source);content.append(more);
 article.append(heading,title,media,content);return article;
}
function mount(){
 const bank=document.getElementById('infinityAcceptedCards');
 if(bank&&!bank.dataset.mounted){
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
}
