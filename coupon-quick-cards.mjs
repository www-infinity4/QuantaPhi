import {mountCardActions} from './quanta-card-actions.mjs';
import {FEED_STORAGE_KEY,cleanFeedState,toggleFollowing} from './quanta-feed-rank.mjs';
import {
 COUPON_BRANDS,COUPON_WALLET_KEY,COUPON_FEED,
 filterVerifiedOffers,collectFollowedOffers,sanitizeDeviceCouponWallet,checkoutAdvice
} from './coupon-wallet-core.mjs';

/* Original QuantaPhi coupon experiences: 3 distinct moving Quick Cards.
 * The wallet here is a device-only PUBLIC offer organizer, never a token wallet,
 * cloud wallet, coupon-code generator or merchant checkout connection. */
const node=(tag,cls,text)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=text;
 return el;
};
const link=(label,url,cls='qcw-link')=>{
 const a=node('a',cls,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
};
const safeRead=(key,fallback)=>{
 try{const value=JSON.parse(localStorage.getItem(key)||'null');return value===null?fallback:value;}
 catch{return fallback;}
};
const save=(key,value)=>{
 try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}
};
function localWallet(){
 return sanitizeDeviceCouponWallet(safeRead(COUPON_WALLET_KEY,{}),new Date().toISOString());
}
const followed=()=>cleanFeedState(safeRead(FEED_STORAGE_KEY,{})).following;
const cards=new Map();
let walletHost=null,loading=false,latestOffers=[];
function setNotice(message){
 for(const brand of COUPON_BRANDS){
  const el=cards.get(brand.id)?.querySelector('[data-coupon-status]');
  if(el)el.textContent=message;
 }
}
function saveWallet(next){
 const ok=save(COUPON_WALLET_KEY,next);
 if(!ok)setNotice('Device storage is unavailable; changes were not saved.');
 return ok;
}
function updateBrandStatuses(){
 const wallet=localWallet(),list=followed();
 for(const brand of COUPON_BRANDS){
  const card=cards.get(brand.id);if(!card)continue;
  const status=card.querySelector('[data-coupon-status]');
  const button=card.querySelector('[data-coupon-watch]');
  const n=wallet.saved.filter(o=>o.brandId===brand.id).length;
  status.textContent=n? n+' verified public offer'+(n===1?'':'s')+' in this device wallet':
   wallet.checkedAt?'No verified current coupon found in this feed.':'Offer discovery is ready; no current coupon claimed.';
  button.textContent=list.includes(brand.id)?
   (wallet.autoSave?'✓ Following · coupon auto-save on':'✓ Following · turn on auto-save'):'Follow + save new coupons';
  button.setAttribute('aria-pressed',String(list.includes(brand.id)&&wallet.autoSave));
 }
}
function offerRow(offer){
 const item=node('li','qcw-offer');
 const title=node('strong','',offer.title);
 const meta=node('span','qcw-secondary',COUPON_BRANDS.find(b=>b.id===offer.brandId)?.name+' · expires '+new Date(offer.expiresAt).toLocaleDateString()+' · '+offer.store);
 const instructions=node('p','',offer.details);
 const verify=link('Read original offer and terms ↗',offer.sourceUrl);
 item.append(title,meta,instructions,verify);
 return item;
}
function renderWallet(){
 if(!walletHost)return;
 const settings=localWallet(),followIds=followed();
 walletHost.replaceChildren();
 const heading=node('div','qcw-wallet-heading');
 const tally=node('div','qcw-tally',settings.saved.length+' verified');
 tally.setAttribute('aria-label',settings.saved.length+' verified offers saved on this device');
 heading.append(node('h3','','Coupon Wallet'),tally);
 const desc=node('p','qcw-secondary','Find, verify and organize publicly offered discounts. This wallet is on this device only; it is separate from Quants, Star Coins and payment accounts.');
 walletHost.append(heading,desc);
 const auto=node('label','qcw-switch');
 const check=node('input');check.type='checkbox';check.checked=settings.autoSave;
 const switchText=node('span','','Auto-save verified offers from Followed Quick Cards');
 auto.append(check,switchText);
 check.addEventListener('change',()=>{
  const next={...localWallet(),autoSave:check.checked};
  if(!saveWallet(next)){check.checked=!check.checked;return;}
  updateBrandStatuses();
  if(check.checked)void syncOffers();
 });
 walletHost.append(auto);
 const followText=node('p','qcw-secondary',followIds.length+' cards followed on this device · '+followIds.filter(id=>COUPON_BRANDS.some(b=>b.id===id)).length+' in this coupon pilot');
 const buttons=node('div','qcw-controls');
 const refresh=node('button','qcw-btn','Check verified offers');refresh.type='button';refresh.disabled=loading;
 refresh.addEventListener('click',()=>void syncOffers());
 const official=link('Coupon source rules ↗','https://corporate.walmart.com/policies');
 buttons.append(refresh,official);
 const status=node('p','qcw-status',
  loading?'Checking the reviewed offer feed…':settings.error||
  (settings.checkedAt?'Checked '+new Date(settings.checkedAt).toLocaleString()+' · Public offers only.':'Not checked yet. Tap Check verified offers.'));
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const list=node('ul','qcw-offer-list');
 if(settings.saved.length){
  // Never display untrusted persisted text until it matches a currently reviewed feed.
  const valid=filterVerifiedOffers(settings.saved,new Date().toISOString());
  for(const offer of valid)list.append(offerRow(offer));
  if(!valid.length)list.append(node('li','qcw-empty','Saved offers have expired or need fresh verification.'));
 }else list.append(node('li','qcw-empty','No current coupons verified. Following a brand starts watching for legitimate new offers, not creating a coupon code.'));
 walletHost.append(followText,buttons,status,list);
 const checkout=node('section','qcw-checkout');
 checkout.append(node('h4','','Bubbles checkout preparation'),node('p','qcw-secondary','Pick a checkout route to check compatibility. No payment, code entry or automatic tender occurs.'));
 const selector=node('select','qcw-select');
 selector.setAttribute('aria-label','Merchant checkout route');
 for(const [value,label] of [['walmart-in-store','Walmart · at the register'],['walmart-online','Walmart.com · online'],['mcdonalds','McDonald’s · app'],['other','Other retailer']]){
  const option=node('option','',label);option.value=value;selector.append(option);
 }
 const recommendation=node('p','qcw-advice');
 const update=()=>{
  const example=settings.saved[0]||{redemption:selector.value==='walmart-in-store'?'paper-manufacturer':'merchant-app'};
  recommendation.textContent=checkoutAdvice(example,selector.value).message;
 };
 selector.addEventListener('change',update);
 update();
 const handoff=node('div','qcw-controls');
 const copy=node('button','qcw-btn qcw-secondary-btn','Prepare Bubbles shopping request');copy.type='button';
 const prompt=node('textarea','qcw-copy-output');prompt.rows=3;prompt.readOnly=true;prompt.hidden=true;prompt.setAttribute('aria-label','Bubbles coupon research request');
 copy.addEventListener('click',()=>{
  const name=selector.options[selector.selectedIndex].text;
  prompt.value='Bubbles: check real current public coupons for '+(followIds.filter(id=>COUPON_BRANDS.some(b=>b.id===id)).map(id=>COUPON_BRANDS.find(b=>b.id===id).name).join(', ')||'my followed brands')+' at '+name+'. Verify issuer terms, matching items, expiry, and the merchant redemption rules. Do not claim a discount was applied or place an order without my approval.';
  prompt.hidden=false;prompt.focus();prompt.select();
  if(navigator.clipboard?.writeText)void navigator.clipboard.writeText(prompt.value).catch(()=>{});
 });
 handoff.append(copy,link('Open Bubbles ↗','/bubbles.html','qcw-link'));
 checkout.append(selector,recommendation,handoff,prompt);
 walletHost.append(checkout);
}
async function syncOffers(){
 if(loading)return;
 loading=true;
 renderWallet();
 try{
  const res=await fetch(COUPON_FEED,{cache:'no-store',credentials:'omit'});
  if(!res.ok)throw new Error('feed_http_'+res.status);
  const data=await res.json();
  if(data?.version!==1||!Array.isArray(data.offers))throw new Error('feed_invalid');
  const now=new Date().toISOString();
  latestOffers=filterVerifiedOffers(data.offers,now);
  const previous=localWallet();
  const saved=collectFollowedOffers(previous.saved,latestOffers,
   previous.autoSave?followed():[],now);
  saveWallet({...previous,saved,checkedAt:now,error:''});
 }catch{
  // Fail closed: no fake "verified" claims when the source cannot refresh.
  const previous=localWallet();
  saveWallet({...previous,saved:[],error:'Offer source could not be verified. No active coupons are being claimed.'});
 }finally{
  loading=false;renderWallet();updateBrandStatuses();
 }
}
function productArt(brand){
 const picture=link('',brand.imageSource,'qcw-product-image');
 picture.setAttribute('aria-label','See original photo source for '+brand.name);
 const img=node('img','',undefined);img.src=brand.image;img.alt=brand.imageAlt;
 img.loading='eager';img.decoding='async';img.referrerPolicy='no-referrer';
 img.addEventListener('error',()=>{
  img.hidden=true;picture.append(node('span','qcw-image-fallback','Original product image unavailable · View at retailer ↗'));
 },{once:true});
 picture.append(img);
 return picture;
}
function watchBrand(brand){
 let states=cleanFeedState(safeRead(FEED_STORAGE_KEY,{}));
 if(!states.following.includes(brand.id)){
  states=toggleFollowing(states,brand.id);
  if(!save(FEED_STORAGE_KEY,states)){setNotice('Could not save Follow on this device.');return;}
 }
 const wallet={...localWallet(),autoSave:true};
 if(!saveWallet(wallet))return;
 window.dispatchEvent(new CustomEvent('quantaphi:feed-updated',{detail:{origin:'coupon-quick-card',id:brand.id}}));
 void syncOffers();
}
function createBrandCard(brand){
 const card=node('article','iqc-card qcw-card qcw-'+brand.id);
 card.dataset.sourceId=brand.id;card.dataset.sourceName=brand.name+' · Coupon discovery';
 card.dataset.sourceReady='true';card.dataset.official=brand.official;
 card.dataset.sourceCategory='Shopping · coupons';
 const intro=node('header','qcw-intro');
 intro.append(node('span','qcw-eyebrow',brand.id==='pepsi'?'DEAL RADAR · COLA':'CITRUS EXPLORER · REWARDS'),
  node('h2','',brand.name),node('p','qcw-secondary',brand.tagline));
 const showcase=node('div','qcw-showcase');
 if(brand.id==='pepsi'){
  const words=node('div','qcw-feature');
  words.append(node('strong','qcw-display','THE REAL DEAL'),node('p','','Your Pepsi watchlist checks trusted promotion sources without guessing coupons.'));
  showcase.append(words,productArt(brand));
 }else{
  showcase.append(productArt(brand));
  const words=node('div','qcw-feature');
  words.append(node('strong','qcw-display','CITRUS. DISCOVER. SAVE.'),node('p','','Follow citrus releases and verify rewards from Coca-Cola’s original sources.'));
  showcase.append(words);
 }
 const actions=node('div','qcw-controls');
 actions.append(link('Shop product listings ↗',brand.shop),link('Check official promotions ↗',brand.promo));
 const watch=node('button','qcw-btn','Follow + save new coupons');watch.type='button';
 watch.dataset.couponWatch='true';watch.addEventListener('click',()=>watchBrand(brand));
 const info=node('p','qcw-status');info.dataset.couponStatus='true';info.setAttribute('role','status');info.setAttribute('aria-live','polite');
 const source=node('p','qcw-disclaimer','Product photo from a retailer listing. Independent shopping discovery; not a PepsiCo or Coca-Cola ad or partnership. Coupons require actual official issuer terms.');
 const shared=node('div','qcw-shared');
 mountCardActions(shared,{
  id:brand.id,name:brand.name,category:brand.category,
  official:brand.official,featureUrl:brand.official,route:'/?card='+encodeURIComponent(brand.id)
 },{showSearch:false,websiteReader:false,showOriginal:false});
 card.append(intro,showcase,actions,watch,info,source,shared);
 cards.set(brand.id,card);
 return card;
}
function createWalletCard(){
 const card=node('article','iqc-card qcw-card qcw-wallet-card');
 card.dataset.sourceId='coupon-wallet';card.dataset.sourceName='Coupon Wallet · Bubbles savings switchboard';
 card.dataset.sourceReady='true';card.dataset.sourceCategory='Wallet · coupons';card.dataset.official='https://quantaphi.org/';
 const hero=node('header','qcw-wallet-hero');
 hero.append(node('span','qcw-eyebrow','QUANTAPHI · SAVINGS SWITCHBOARD'),
 node('h2','','Your Coupon Wallet'));
 const art=node('div','qcw-wallet-art');
 for(const brand of COUPON_BRANDS){
  const photo=node('img');photo.src=brand.image;photo.alt=brand.name+' real product package';
  photo.loading='eager';photo.decoding='async';art.append(photo);
 }
 hero.append(art);
 walletHost=node('div','qcw-wallet-body');
 const actions=node('div','qcw-shared');
 mountCardActions(actions,{id:'coupon-wallet',name:'QuantaPhi Coupon Wallet',
  category:'Coupon organizer',route:'/?card=coupon-wallet',featureUrl:'https://quantaphi.org/'},
  {showSearch:false,websiteReader:false,showOriginal:false});
 card.append(hero,walletHost,actions);
 return card;
}
function mount(){
 const bank=document.getElementById('couponDiscoveryCards');
 if(!bank||bank.dataset.mounted==='true')return;
 bank.replaceChildren(...COUPON_BRANDS.map(createBrandCard),createWalletCard());
 bank.dataset.mounted='true';renderWallet();updateBrandStatuses();
 window.addEventListener('quantaphi:feed-updated',e=>{
  if(e.detail?.origin==='coupon-render')return;
  updateBrandStatuses();renderWallet();
  if(localWallet().autoSave&&!loading)void syncOffers();
 });
 window.addEventListener('storage',e=>{
  if([FEED_STORAGE_KEY,COUPON_WALLET_KEY].includes(e.key)){updateBrandStatuses();renderWallet();}
 });
 window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
}
