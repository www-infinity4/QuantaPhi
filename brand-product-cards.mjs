import {mountRotatingSpotlights} from './quick-card-spotlights.mjs?v=20261101-freshest1';
import {mountCardActions} from './quanta-card-actions.mjs?v=20261030-live-share1';

/* Independently curated product spotlights: original merchandise, publisher-hosted
 * photos and exact product links verified 2026-10-24. NOT paid retailer ads.
 * Never invent a sale or imply a checkout was performed on QuantaPhi.
 * Keep model/colour/image matched; refuse unsafe or mismatched sources. */
const product=(id,brand,title,price,region,description,url,image,shop,accent)=>Object.freeze({
 id,brand,title,price,region,description,url,image,shop,accent,
 checked:'2026-10-24',category:'Denim & fashion'
});
export const BRAND_PRODUCT_CARDS=Object.freeze([
 product('pepe-brooke','Pepe Jeans','Iconic Brooke · Low-Rise Slim Fit',
  '', 'UK','Classic low-rise slim denim with five-pocket stitching.',
  'https://www.pepejeans.com/uk/en_gb/pd/iconic-brooke---low-rise-slim-fit-jeans-PL20506284UA.html',
  'https://images.pepejeans.com/dw/image/v2/BCDD_PRD/on/demandware.static/-/Sites-pjg-master-catalog/default/dw6862b90e/images/hi-res/PL2050628_4UA_000_06_MO.jpg?q=90&sw=600',
  'https://www.pepejeans.com/uk/en_gb/women','#1a4266'),
 product('pepe-vapour','Pepe Jeans','Vapour · Dark Blue Tapered Jeans',
  '', 'India','Dark-wash low-rise tapered jeans. Browse this exact colour and available sizes at the original source.',
  'https://www.pepejeans.in/vapour-dark-blue-low-rise-tapered-jeans/PM207785J671.html',
  'https://d1pdzcnm6xgxlz.cloudfront.net/bottoms/8905875130871-15.jpg',
  'https://www.pepejeans.in/','#254366'),
 product('guess-g11-light','GUESS JEANS','G11 · River Light Vintage Wash',
  '$89.00','US','Medium-rise wide leg with classic five-pocket construction and a soft light-denim finish.',
  'https://www.guess.com/en-us/guess-jeans/denim/women/jeans/g11-wide-leg-jeans-blue/W4BA0YD5CCA-GJRV.html',
  'https://img.guess.com/image/upload/f_auto%2Cq_auto%2Cfl_strip_profile%2Cw_640%2Car_2%3A3%2Cc_fill/v1/NA/Style/ECOMM/W4BA0YD5CCA-GJRV',
  'https://www.guess.com/en-us/guess/women/jeans','#202020'),
 product('guess-g11-dark','GUESS JEANS','G11 · Heritage Dark Wash',
  '$89.00','US','A dark-wash medium-rise wide-leg option with the original denim hardware and seams.',
  'https://www.guess.com/en-us/guess-jeans/denim/women/jeans/g11-wide-leg-jeans-blue/W5RA0YD5M42-GJHR.html',
  'https://guess.com.au/cdn/shop/files/W5RA0YD5M42-GJHR-ALT3.jpg?v=1768983059',
  'https://www.guess.com/en-us/guess/women/jeans','#262021'),
 product('levis-501-dark','Levi’s','501® Original Fit · Dark Wash',
  '$69.98','US','Straight-fit 501® jeans with the characteristic button fly and five-pocket design.',
  'https://www.levi.com/US/en_US/clothing/men/jeans/straight/501-original-fit-mens-jeans/p/005013373',
  'https://lsco.scene7.com/is/image/lsco/005013373-front-gstk?fit=crop%2C0&fmt=jpeg&hei=1852&op_usm=0.6%2C0.6%2C8&qlt=70&resMode=bisharp&wid=2000',
  'https://www.levi.com/US/en_US/','#a32928'),
 product('levis-501-medium','Levi’s','501® Original Fit · Medium Wash',
  '$84.95','US','A medium-wash version of the original straight-leg 501® denim silhouette.',
  'https://www.levi.com/US/en_US/clothing/men/jeans/straight/501-original-fit-mens-jeans/p/005013306',
  'https://lsco.scene7.com/is/image/lsco/005013306-front-pdp?fit=crop%2C1&fmt=jpeg&hei=1840&op_usm=0.6%2C0.6%2C8&qlt=70&resMode=sharp2&wid=2000',
  'https://www.levi.com/US/en_US/','#a32928')
]);
export function validBrandProduct(card){
 if(!card||!/^[a-z0-9-]{3,70}$/.test(card.id||'')||!card.title||!card.brand)return false;
 try{
  const main=new URL(card.url),photo=new URL(card.image),shop=new URL(card.shop);
  if([main,photo,shop].some(u=>u.protocol!=='https:'||u.username||u.password))return false;
  const retailer=main.hostname.toLowerCase();
  const owned=retailer.endsWith('pepejeans.com')||retailer.endsWith('pepejeans.in')||
   retailer==='www.guess.com'||retailer==='www.levi.com';
  const allowedImages=['images.pepejeans.com','d1pdzcnm6xgxlz.cloudfront.net',
   'img.guess.com','guess.com.au','lsco.scene7.com'];
  return owned&&allowedImages.includes(photo.hostname)&&shop.hostname===retailer;
 }catch{return false}
}
const create=(tag,cls,content)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;return el};
function outlet(label,url,cls){
 const a=create('a',cls,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
export function createBrandProductCard(card){
 if(!validBrandProduct(card))throw Error('invalid_brand_product');
 const article=create('article','iqc-card qbp-product-card');
 article.dataset.sourceId=card.id;article.dataset.sourceName=card.brand+' · '+card.title;
 article.dataset.sourceReady='true';article.dataset.official=card.shop;article.dataset.sourceCategory=card.category;article.dataset.sourceQuery=card.title;
 article.style.setProperty('--qbp-accent',card.accent);
 article.dataset.region=card.region;article.dataset.verifiedDate=card.checked;
 const kicker=create('div','qbp-head');
 const wordmark=create('strong','qbp-brand',card.brand);
 const tag=create('span','qbp-kind','ORIGINAL PRODUCT · '+card.region);
 kicker.append(wordmark,tag);
 const imageLink=outlet('',card.url,'qbp-image-link');
 imageLink.setAttribute('aria-label','See '+card.title+' at '+card.brand);
 const img=create('img','qbp-photo');img.src=card.image;img.alt=card.brand+' '+card.title+' — original product photograph';
 img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
 img.addEventListener('error',()=>{
  imageLink.classList.add('qbp-image-unavailable');
  img.remove();
  imageLink.append(create('span','qbp-image-note','Product image unavailable · See original item'));
 },{once:true});
 imageLink.append(img);
 const info=create('div','qbp-info');
 const title=create('h2','qbp-title',card.title);
 const description=create('p','qbp-desc',card.description);
 const price=create('p','qbp-price',Date.now()-Date.parse(card.checked+'T00:00:00Z')<86400000&&card.price?card.price+' · observed '+card.checked:'Current price at original store');
 const detail=create('p','qbp-disclosure',
  'Independent product discovery. Price/size and availability are controlled by the seller; confirm before purchase. Not a paid brand partnership.');
 const links=create('div','qbp-links');
 links.append(outlet('Shop this exact item ↗',card.url,'qbp-buy'),
  outlet('Browse '+card.brand,card.shop,'qbp-more'));
 const activity=create('div','qbp-actions');
 mountCardActions(activity,{
  id:card.id,name:card.brand+' · '+card.title,category:'Shopping · denim',
  featureUrl:card.url,official:card.url,route:'/?card='+encodeURIComponent(card.id)
 });
 const associate=outlet('Request Infinity affiliate review ↗',
  '/infinity-affiliates.html?product='+encodeURIComponent(card.url)+'&name='+encodeURIComponent(card.title)+'&newBrand='+encodeURIComponent(card.brand),
  'qbp-request-affiliate');
 associate.removeAttribute('target');
 info.append(title,description,price,links,associate,detail,activity);
 article.append(kicker,imageLink,info);
 mountRotatingSpotlights(article,{id:card.id,name:card.brand,category:card.category,official:card.shop,query:'denim jeans new arrivals'});
 return article;
}
function mount(){
 const bank=document.getElementById('brandProductCards');
 if(!bank||bank.dataset.mounted==='true')return;
 const safe=BRAND_PRODUCT_CARDS.filter(validBrandProduct);
 bank.replaceChildren(...safe.map(createBrandProductCard));
 bank.dataset.mounted='true';
 window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
}
