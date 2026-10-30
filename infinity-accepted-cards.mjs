import {INFINITY_ACCEPTED_BRANDS,acceptedBrand,isInfinityAccepted,hasAcceptedSource} from './infinity-accepted-catalog.mjs';
import {mountCardActions} from './quanta-card-actions.mjs';
import {readCardWebsite,renderWebsiteResults} from './tinyfish-card-reader.mjs';
// Dated manufacturer product spotlights; independent editorial placement,
// not an ad sale or an integrated retailer checkout. Product and media origins
// are explicitly identified. Verify stock and prices with retailer on every visit.
export const ACCEPTED_FEATURED_PRODUCTS=Object.freeze({
 'durable-goruck':Object.freeze({
  title:'GR1® USA · 21L · Black',
  productUrl:'https://www.goruck.com/products/gr1-usa',
  imageUrl:'https://www.northernfitness.ca/cdn/shop/products/gr1-21L-black_1800x1800_2d083eeb-e40c-43e2-923d-e4b8031eb774.jpg?v=1762441060&width=1080',
  imageCredit:'Product photo: Northern Fitness · same GR1 21L Black model',
  price:'$395.00 USD',availability:'Official GORUCK listing showed in stock when checked',
  checked:'2026-10-30'
 }),
 'durable-filson':Object.freeze({
  title:'Dryden Briefcase · Whiskey · SKU F2020295179-1',
  productUrl:'https://www.filson.com/products/dryden-briefcase-whiskey-1',
  imageUrl:'https://www.filson.com/cdn/shop/files/c73c47e9c54355a60fc4a09784daea763ce8aeddd4bba3e45f85b9cc31098b89.png?v=1770941465&width=1946',
  imageCredit:'Product photo: Filson official website',
  price:'Price at Filson',availability:'Select color and check stock on Filson',
  checked:'2026-10-30'
 }),
 'durable-thule':Object.freeze({
  title:'Motion 3 XL · Black Glossy · Model 639850',
  productUrl:'https://www.thule.com/en-us/cargo-carrier/car-top-carrier/thule-motion-3-xl-_-639850',
  imageUrl:'https://content.abt.com/image.php/be5d55bc44932d57c92e2203704987f1?canvas=&ck=2&height=1100&image=%2Fimages%2Fproducts%2FBDP_Images%2Fthule-cargo-carrier-black-639850-car-rear-angled.jpg&width=1500',
  imageCredit:'Product photo: Abt Electronics · exact Thule 639850 model',
  price:'$1,149.95 USD',availability:'Thule displayed a back-in-stock notification · availability unconfirmed',
  checked:'2026-10-30'
 })
});
export function acceptedFeaturedProduct(card){
 const item=ACCEPTED_FEATURED_PRODUCTS[card?.id],trusted=acceptedBrand(card?.id);
 if(!item||!trusted||card?.official!==trusted.official)return null;
 const store=new URL(trusted.official).hostname.replace(/^www\\./,'');
 try{
  const url=new URL(item.productUrl),photo=new URL(item.imageUrl);
  if(url.protocol!=='https:'||photo.protocol!=='https:'||url.username||url.password||
     photo.username||photo.password||!(url.hostname===store||url.hostname.endsWith('.'+store)))return null;
  return item;
 }catch{return null}
}
function featuredProductCard(card){
 const data=acceptedFeaturedProduct(card);if(!data)return null;
 const box=node('section',undefined,'iac-product-feature');
 box.setAttribute('aria-label',card.name+' featured real product');
 const imageLink=node('a',undefined,'iac-product-image-link');
 imageLink.href=data.productUrl;imageLink.target='_blank';imageLink.rel='noopener noreferrer';
 imageLink.setAttribute('aria-label','View '+data.title+' at '+card.name);
 const photo=node('img');photo.src=data.imageUrl;photo.alt=data.title+' — real product photograph';
 photo.loading='eager';photo.decoding='async';photo.referrerPolicy='no-referrer';
 photo.addEventListener('error',()=>{
  photo.remove();imageLink.append(node('span','Product photo unavailable · Open official product','iac-product-fallback'));
 },{once:true});
 imageLink.append(photo);box.append(imageLink);
 const detail=node('div',undefined,'iac-product-detail');
 detail.append(node('span','FEATURED SOURCE PRODUCT · INFINITY 2026®','iac-product-eyebrow'),
  node('h3',data.title),node('strong',data.price,'iac-product-price'),
  node('p',data.availability+'. Confirm details with retailer.','iac-product-availability'));
 const shop=node('a','View item at '+card.name+' ↗','iac-product-buy');
 shop.href=data.productUrl;shop.target='_blank';shop.rel='noopener noreferrer';
 const source=node('small',data.imageCredit+' · Price/item checked '+data.checked+'. Independent card, not a paid brand endorsement.','iac-product-source');
 detail.append(shop,source);box.append(detail);
 return box;
}
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
 if(!buttons.length)status.textContent='Website actions are awaiting verification.';
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
 const featured=featuredProductCard(card);
 if(featured)article.append(heading,title,featured,content);
 else article.append(heading,title,media,content);
 return article;
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
