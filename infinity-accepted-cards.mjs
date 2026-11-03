import {mountRotatingSpotlights} from './quick-card-spotlights.mjs?v=20261103-photo-reuse1';
import {INFINITY_ACCEPTED_BRANDS,acceptedBrand,isInfinityAccepted,hasAcceptedSource} from './infinity-accepted-catalog.mjs?v=20261103-photos1';
import {mountCardActions} from './quanta-card-actions.mjs?v=20261030-live-share1';
import {readCardWebsite,renderWebsiteResults} from './tinyfish-card-reader.mjs';
import {websiteFaviconUrl} from './card-source-images.mjs';
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const isBrandIdentityImage=url=>/logo|favicon|brandmark|og[-_]?image|ogimage|opengraph|social[-_]?share|social[-_]?image/i.test(new URL(url).pathname);
export function cardImageCandidates(card){
 const images=[...new Set([...(card.images||[]),card.image,card.logo].filter(value=>{
  if(typeof value!=='string'||!value.trim())return false;
  try{const u=new URL(value,typeof location==='undefined'?'https://quantaphi.org':location.origin);
   return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!/\.(gif|apng)(?:[?#]|$)/i.test(u.href);
  }catch{return false}
 }))];
 // Actual source products and lifestyle photos should lead, not social OG art.
 return [...images.filter(x=>!isBrandIdentityImage(x)),...images.filter(isBrandIdentityImage)];
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
 let productPhotoLoaded=false,sourceRecoveryAttempted=false;
 if(images.length&&images.every(isBrandIdentityImage))media.classList.add('iac-logo-only');
 if(images.length){
  const img=node('img');img.alt=card.photoCaption||card.name+' — image from the original website';
  const credit=card.photoSource?node('a','Photo source · '+new URL(card.photoSource).hostname,'iac-image-credit'):null;
  if(credit){credit.href=card.photoSource;credit.target='_blank';credit.rel='noopener noreferrer';credit.hidden=true;
   credit.setAttribute('aria-label','Open original photo source for '+card.name);}
  img.addEventListener('load',()=>{
   if(credit)credit.hidden=!(imageIndex===0&&images[0]===card.image);
   if(img.naturalWidth>=180&&img.naturalHeight>=120&&!isBrandIdentityImage(images[imageIndex]))productPhotoLoaded=true;
  },{once:false});
  img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  const fallback=()=>{
   img.remove();media.classList.add('iac-logo-only');
   const sourceIcon=websiteFaviconUrl(card);
   const mark=node('img');mark.alt=card.name+' official website icon';
   const label=node('span','Source photograph unavailable · open the original site','iac-source-icon-note');
   if(!sourceIcon){media.replaceChildren(label);return}
   mark.addEventListener('error',()=>{mark.remove();label.textContent='Website image unavailable · open original source'},{once:true});
   mark.src=sourceIcon;media.replaceChildren(mark,label);
  };
  img.addEventListener('error',()=>{
   if(credit)credit.hidden=true;
   if(++imageIndex<images.length){img.src=images[imageIndex];return}
   fallback();
  });img.src=images[0];media.append(img);if(credit)media.append(credit);
 }else{
  // The website icon is a real source asset, never a fabricated product image.
  const sourceIcon=websiteFaviconUrl(card),mark=node('img');mark.alt=card.name+' official website icon';
  media.classList.add('iac-logo-only');
  if(sourceIcon){mark.src=sourceIcon;mark.addEventListener('error',()=>mark.remove(),{once:true});media.append(mark)}
  media.append(node('span','Source product photo not yet available','iac-source-icon-note'));
 }
 // The catalog image bank can contain only logos or blocked source images.
 // Retry authentic source listings ONLY when this card becomes active.
 const recoverSourcePhoto=async(entries)=>{
  if(sourceRecoveryAttempted||productPhotoLoaded||!article.isConnected||!Array.isArray(entries)||!entries.length)return;
  sourceRecoveryAttempted=true;
  try{
   entries=entries.slice(0,3);
   const probe=row=>new Promise((resolve,reject)=>{
    const image=new Image();image.alt=row.title+' · photograph from '+row.source;
    image.decoding='async';image.referrerPolicy='no-referrer';image.loading='eager';
    let complete=false;const settle=ok=>{
     if(complete)return;complete=true;clearTimeout(timeout);
     if(ok)resolve({image,row});else reject(Error('source_preview_unavailable'));
    };
    const timeout=setTimeout(()=>settle(false),2800);
    image.onload=()=>settle(image.naturalWidth>=180&&image.naturalHeight>=120);
    image.onerror=()=>settle(false);
    image.src=row.image;
   });
   const found=await Promise.any(entries.map(probe)).catch(()=>null);
   if(!found||!article.isConnected||productPhotoLoaded)return;
   const link=node('a','Source photo · '+new URL(found.row.url).hostname,'iac-image-credit');
   link.href=found.row.url;link.target='_blank';link.rel='noopener noreferrer';
   link.setAttribute('aria-label','Open original source photograph for '+card.name);
   media.replaceChildren(found.image,link);
   media.classList.remove('iac-logo-only');media.classList.add('iac-source-discovered');
   article.dataset.sourcePhotoRecovered='true';
   productPhotoLoaded=true;
  }catch{/* no verified public product photo: preserve original brand identity */}
 };
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
 article.append(heading,title,media,content);
 mountRotatingSpotlights(article,card,{onItems:entries=>{
  if(!productPhotoLoaded)void recoverSourcePhoto(entries);
 }});return article;
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
