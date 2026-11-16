/* Walmart source-backed product card. Prices are dated observations, not a live stock API. */
import {cleanFeedState,nextFeedDirection,markOpened,markViewed} from './quanta-feed-rank.mjs';
import {loadOwnQuantScores} from './quanta-feed-quants.mjs';
export const WALMART_CHECKED_AT='2026-10-24';
export const WALMART_PRODUCTS=Object.freeze([
 {id:'walmart-mediterranean',itemId:'19668500198',name:'bettergoods Woodfired Crust Mediterranean Pizza',size:'Single serve · 5.7 oz · Frozen',price:3.87,
 description:'A single-serve Mediterranean pizza with a woodfired crust. Keep frozen and follow the package cooking instructions.',
 category:'Shopping',feature:'Mediterranean woodfired frozen pizza',study:'Walmart grocery single serve Mediterranean pizza',
 url:'https://www.walmart.com/ip/bettergoods-Woodfired-Crust-Mediterranean-Pizza-5-7oz-Single-Serve-Frozen/19668500198',
 image:'https://i5.walmartimages.com/seo/bettergoods-Woodfired-Crust-Mediterranean-Pizza-5-7oz-Single-Serve-Frozen_318c1481-cc5b-40f8-989e-e2fc0be1099d.8963c93f9e485ce82e3b87c5ce4b5507.jpeg?odnHeight=573&odnWidth=573&odnBg=FFFFFF'},
 {id:'walmart-margherita',itemId:'5463970979',name:'bettergoods Italian Wood-Fired Margherita Pizza',size:'14.6 oz · Frozen',price:6.92,
 description:'An Italian wood-fired Margherita pizza. Compare the package size and ingredients at Walmart before choosing.',
 category:'Shopping',feature:'Margherita Italian wood fired pizza',study:'Walmart grocery Italian Margherita pizza',
 url:'https://www.walmart.com/ip/Bettergoods-Italian-Wood-Fired-Margherita-Pizza-14-6-oz-Frozen/5463970979',
 image:'https://i5.walmartimages.com/asr/2f0e851f-b2cd-4377-b47d-64e6094d45c2.6d8754ef82aa1545c9ea550ff6cbf879.jpeg?odnHeight=576&odnWidth=576&odnBg=FFFFFF'},
 {id:'walmart-cheese',itemId:'45209432',name:"Tony’s Cheese Pizzeria Style Crust Pizza",size:'18.9 oz · Frozen',price:2.96,
 description:'A cheese pizza with pizzeria-style crust. A lower-priced choice in this selection, with final pricing set by your Walmart store.',
 category:'Shopping',feature:'Cheese pizza value budget family',study:'Walmart grocery cheese pizza budget value',
 url:'https://www.walmart.com/ip/Tony-s-Cheese-Pizzeria-Style-Crust-Frozen-Pizza-18-9-oz/45209432',
 image:'https://i5.walmartimages.com/asr/5c24f338-6eb8-40d4-bed4-46c17037fffe.a3f45dba01a4e78ae301169092021310.jpeg?odnHeight=576&odnWidth=576&odnBg=FFFFFF'},
 {id:'walmart-cauliflower',itemId:'17389669530',name:'bettergoods Cauliflower Thin Crust Chicken Sausage Pizza',size:'13.2 oz · Frozen',price:6.57,
 description:'A chicken sausage pizza on a cauliflower thin crust, listed as gluten-free by Walmart. Check the current package ingredients and allergens before buying.',
 category:'Shopping',feature:'Gluten-free cauliflower thin crust chicken sausage pizza',study:'Walmart grocery gluten free cauliflower chicken sausage pizza',
 url:'https://www.walmart.com/ip/Bettergoods-cauliflower-thin-crust-chicken-Sausage-pizza/17389669530',
 image:'https://i5.walmartimages.com/asr/6dc45b2d-7f0f-4105-a51a-49984d1cbd4b.ad0ebd682dc23d8f3f2311ccb2873bac.jpeg?odnHeight=576&odnWidth=576&odnBg=FFFFFF'}
].map(p=>Object.freeze(p)));
export function validWalmartProduct(p){
 try{const u=new URL(p.url),i=new URL(p.image);return u.origin==='https://www.walmart.com'&&u.pathname.endsWith('/'+p.itemId)&&/^\d+$/.test(p.itemId)&&i.origin==='https://i5.walmartimages.com'&&Number.isFinite(p.price)&&p.price>0;}catch{return false}
}
export function nextWalmartProduct(currentId,state,quantScores={}){
 const ranked=nextFeedDirection(WALMART_PRODUCTS,'for-you',{...cleanFeedState(state),catalog:WALMART_PRODUCTS,quantScores},currentId);
 return WALMART_PRODUCTS.find(p=>p.id===ranked.card?.id)||WALMART_PRODUCTS.find(p=>p.id!==currentId)||WALMART_PRODUCTS[0];
}
const KEY='quanta:walmart-products:v1';
function mount(){
 const card=document.getElementById('walmartShoppingCard');if(!card)return;
 const $=name=>card.querySelector('[data-walmart-'+name+']');
 let current=WALMART_PRODUCTS[0],state=cleanFeedState({}),scores={};
 try{state=cleanFeedState(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
 function render(p){
  if(!validWalmartProduct(p))return;
  current=p;card.dataset.walmartItem=p.itemId;
  $('title').textContent=p.name;$('size').textContent=p.size;$('description').textContent=p.description;
  const img=$('image');img.hidden=false;img.src=p.image;img.alt=p.name+' — product photo from Walmart';
  $('image-error').hidden=true;
  $('buy').href=p.url;$('buy').setAttribute('aria-label','Buy it now at Walmart: '+p.name);
  $('price').textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(p.price);
  $('position').textContent=(WALMART_PRODUCTS.indexOf(p)+1)+' of '+WALMART_PRODUCTS.length+' Walmart picks';
  state=markViewed(state,p.id);save();
 }
 $('image').addEventListener('error',()=>{$('image').hidden=true;$('image-error').hidden=false;});
 $('next').addEventListener('click',()=>render(nextWalmartProduct(current.id,state,scores)));
 $('buy').addEventListener('click',()=>{state=markOpened(state,current.id);save();});
 // Normal top-level HTTPS navigation: an installed Infinity native browser
 // retains its WebView; web browsers open the actual Walmart page. No fake
 // iframe checkout, popup, proxy, payment capture or blocked-APK detour.
 render(current);
 void loadOwnQuantScores(window.QuantaCloudConnection,WALMART_PRODUCTS).then(r=>{scores=r.scores;});
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
}
