import {mountRotatingSpotlights} from './quick-card-spotlights.mjs?v=20261030-rotate2';
import {mountCardActions} from './quanta-card-actions.mjs?v=20261030-live-share1';

/* Independently curated product spotlights: original merchandise, publisher-hosted
 * photos and exact product links verified 2026-10-24. NOT paid retailer ads.
 * Never invent a sale or imply a checkout was performed on QuantaPhi.
 * Keep model/colour/image matched; refuse unsafe or mismatched sources. */
const product=(id,brand,title,price,region,description,url,image,shop,accent,extra={})=>Object.freeze({
 id,brand,title,price,region,description,url,image,shop,accent,
 checked:'2026-10-24',category:'Denim & fashion',...extra
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
  'https://www.levi.com/US/en_US/','#a32928'),
 // New October 31 source-linked entries: actual exact manufacturer pages/photos.
 // These are discovery cards, not stock assertions or provider payment APIs.
 product('carhartt-dearborn-black','Carhartt','Dearborn Relaxed · Heavyweight Pocket Tee · Black',
  '', 'US','Heavyweight cotton pocket tee. Choose your size and confirm stock at Carhartt.',
  'https://www.carhartt.com/product/103296-001XSREG',
  'https://imgcdn.carhartt.com/is/image/Carhartt/103296_001',
  'https://www.carhartt.com/','#5b4a34',{checked:'2026-10-31',category:'Workwear'}),
 product('levis-501-womens-light','Levi’s','Women’s 501® Original Fit · Light Wash',
  '', 'US','Original straight-leg 501® jeans in a light wash, with a button fly. Select your size at Levi’s.',
  'https://www.levi.com/US/en_US/clothing/women/jeans/straight/501-original-fit-womens-jeans/p/125010373',
  'https://lsco.scene7.com/is/image/lsco/125010373-dynamic1-pdp?fit=crop%2C0&fmt=jpeg&hei=968&op_usm=0.6%2C0.6%2C8&qlt=70&resMode=bisharp&wid=880',
  'https://www.levi.com/US/en_US/','#a32928',{checked:'2026-10-31'}),
 product('levis-501-womens-medium','Levi’s','Women’s 501® Original Fit · Medium Wash',
  '', 'US','Classic medium-wash 501® fit with original five-pocket styling and button fly.',
  'https://www.levi.com/US/en_US/clothing/women/jeans/straight/501-original-fit-womens-jeans/p/125010667',
  'https://lscoglobal.scene7.com/is/image/lscoglobal/WB_12501-0667_GLO_CL_FV?fit=crop%2C1&fmt=jpeg&hei=2500&op_usm=0.6%2C0.6%2C8&qlt=70&resMode=sharp2&wid=2000',
  'https://www.levi.com/US/en_US/','#a32928',{checked:'2026-10-31'}),
 product('oakley-holbrook-black','Oakley','Holbrook™ · Matte Black · Prizm Black Polarized',
  '', 'US','Original Holbrook sunglasses, high-bridge fit. Check current availability and lens options at Oakley.',
  'https://www.oakley.com/en-us/product/888392260109',
  'https://assets.oakley.com/is/image/OakleyEYE/888392260109_holbrook_matte-black-prizm-black-polarized_main_001.png?impolicy=SEO_1x1',
  'https://www.oakley.com/en-us/','#272c31',{checked:'2026-10-31',category:'Eyewear & accessories'})
]);
// Exact product and photograph codes must agree for new merchant entries.
const EXACT_MEDIA_CODES=Object.freeze({
 'carhartt-dearborn-black':['103296-001','103296_001'],
 'levis-501-womens-light':['125010373','125010373'],
 'levis-501-womens-medium':['125010667','12501-0667'],
 'oakley-holbrook-black':['888392260109','888392260109']
});
export function validBrandProduct(card){
 if(!card||!/^[a-z0-9-]{3,70}$/.test(card.id||'')||!card.title||!card.brand)return false;
 try{
  const main=new URL(card.url),photo=new URL(card.image),shop=new URL(card.shop);
  if([main,photo,shop].some(u=>u.protocol!=='https:'||u.username||u.password))return false;
  const retailer=main.hostname.toLowerCase();
  const owned=retailer.endsWith('pepejeans.com')||retailer.endsWith('pepejeans.in')||
   retailer==='www.guess.com'||retailer==='www.levi.com'||
   retailer==='www.carhartt.com'||retailer==='www.oakley.com';
  const allowedImages=['images.pepejeans.com','d1pdzcnm6xgxlz.cloudfront.net',
   'img.guess.com','guess.com.au','lsco.scene7.com',
   'lscoglobal.scene7.com','imgcdn.carhartt.com','assets.oakley.com'];
  const codes=EXACT_MEDIA_CODES[card.id];
  return owned&&allowedImages.includes(photo.hostname)&&shop.hostname===retailer&&
   (!codes||(main.pathname.includes(codes[0])&&photo.pathname.includes(codes[1])));
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
  id:card.id,name:card.brand+' · '+card.title,category:'Shopping · '+card.category,
  featureUrl:card.url,official:card.url,route:'/?card='+encodeURIComponent(card.id)
 });
 const associate=outlet('Request Infinity affiliate review ↗',
  '/infinity-affiliates.html?product='+encodeURIComponent(card.url)+'&name='+encodeURIComponent(card.title)+'&newBrand='+encodeURIComponent(card.brand),
  'qbp-request-affiliate');
 associate.removeAttribute('target');
 info.append(title,description,price,links,associate,detail,activity);
 article.append(kicker,imageLink,info);
 mountRotatingSpotlights(article,{id:card.id,name:card.brand,category:card.category,official:card.shop,query:card.title});
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
