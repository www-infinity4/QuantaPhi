/* Shop LC contextual mini-cards. Reuse the existing live-item source only;
 * never infer a confirmed sale, purchase, current price, or merchant sponsorship.
 * Preferences stay on this browser; no wallet, person or private Quant data. */
// Only a future, reviewed same-origin adapter backed by an approved merchant feed.
// This endpoint is intentionally absent until Shop LC media/feed rights are verified.
// Do not reuse the legacy HTML-scraping /v1/shoplc/current-item endpoint.
const SOURCE='/api/shoplc/authorized-sale-feed';
const PREF_KEY='quantaphi:shoplc:hide-ads:v1';
const REFRESH_MS=300000;

export function safeShopLcUrl(raw){
 try{
  const url=new URL(String(raw||''));
  return url.protocol==='https:'&&!url.username&&!url.password&&
   ['www.shoplc.com','shoplc.com'].includes(url.hostname.toLowerCase())&&
   url.pathname.startsWith('/products/');
 }catch{return false}
}
function safeImage(raw){
 try{
  const u=new URL(String(raw||''));
  const h=u.hostname.toLowerCase();
  return u.protocol==='https:'&&!u.username&&!u.password&&
   (h==='cdn.shopify.com'||h==='shoplc.com'||h.endsWith('.shoplc.com'))?u.href:'';
 }catch{return ''}
}
const cleaned=(s,max=180)=>typeof s==='string'?s.replace(/\s+/g,' ').trim().slice(0,max):'';
export function normalizeShopLcItem(raw,at=Date.now()){
 if(!raw||raw.ok===false||!Number.isFinite(at))return null;
 const item=raw.item&&typeof raw.item==='object'?raw.item:raw;
 const code=cleaned(item.productCode,12);
 const id=cleaned(item.itemId,35);
 const title=cleaned(item.title);
 if(!/^[0-9]{6,9}$/.test(code)||id!=='product:'+code||
  title.length<15||/^shop\s*lc\s*item\s*[0-9]/i.test(title)||
  !safeShopLcUrl(item.href))return null;
 const image=safeImage(item.image||item.imageUrl);
 if(!image)return null;
 const n=Number(item.price);
 const price=Number.isFinite(n)&&n>0&&n<1000000?n:null;
 const text=[item.category,item.gemstone,item.metal,title].map(x=>cleaned(x,120)).join(' ').toLowerCase();
 const category=/ring|garnet|diamond|gemstone|jewel|necklace|pendant|bracelet|earrings?|10k|14k|18k/.test(text)?'jewelry':
  /home|furniture|kitchen|cookware|bedding/.test(text)?'home':
  /fashion|shirt|dress|shoe|apparel/.test(text)?'fashion':'other';
 return Object.freeze({
  id,title,href:new URL(item.href).href,image,price,currency:'USD',category,
  source:'Shop LC current-item lookup',checkedAt:at,purchaseVerified:false
 });
}
export function chooseShopLcPlacement(items,context={},prefs={}){
 if(prefs.hideShopLc||prefs.hideAllCommercials||!Array.isArray(items))return null;
 const source=String(context.sourceId||'').toLowerCase();
 const words=[context.title,context.name,context.category].map(x=>cleaned(x,160)).join(' ').toLowerCase();
 const merchant=source==='shoplc-premium'||source==='source-shoplc-premium';
 for(const item of items){
  if(!item||!safeShopLcUrl(item.href))continue;
  if(merchant)return item;
  if(item.category==='jewelry'&&/\b(jewel(?:ry|lery)|rings?|garnet|diamond|gemstone|necklaces?|pendants?|bracelets?|earrings?)\b/.test(words))return item;
  if(item.category==='home'&&/\b(home\s*goods|furniture|kitchenware|cookware|bedding)\b/.test(words))return item;
  if(item.category==='fashion'&&/\b(fashion|apparel|clothing|dresses|shoes)\b/.test(words))return item;
 }
 return null;
}

if(typeof document!=='undefined'&&typeof window!=='undefined'){
 let hiddenForSession=false;
 let product=null,lastFetch=0,loading=null;
 const currentPrefs=()=>{try{return {hideShopLc:localStorage.getItem(PREF_KEY)==='1'}}catch{return {hideShopLc:hiddenForSession}}};
 const setHidden=value=>{
  hiddenForSession=value;
  try{localStorage.setItem(PREF_KEY,value?'1':'0')}catch{}
  render();
 };
 const el=(tag,cls,txt)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(txt!==undefined)e.textContent=txt;
  return e;
 };
 const candidateCards=()=>Array.from(document.querySelectorAll('.iqc-card[data-source-id]')).filter(card=>{
  if(!card.isConnected)return false;
  return card.dataset.sourceId==='shoplc-premium'||
   /\b(jewel(?:ry|lery)|rings?|garnet|diamond|gemstone|necklaces?|pendants?|bracelets?|earrings?|furniture|cookware)\b/i.test(
    [card.dataset.sourceName,card.dataset.sourceCategory].join(' '));
 });
 function render(){
  const prefs=currentPrefs();
  for(const card of candidateCards()){
   const existing=card.querySelector(':scope > .shoplc-sale-mini');
   if(existing)existing.remove();
   const context={sourceId:card.dataset.sourceId,title:card.dataset.sourceName,category:card.dataset.sourceCategory};
   const match=chooseShopLcPlacement(product?[product]:[],context,prefs);
   if(!match&&!(prefs.hideShopLc&&card.dataset.sourceId==='shoplc-premium'))continue;
   const box=el('aside','shoplc-sale-mini');
   box.setAttribute('aria-label','Shop LC contextual product listing');
   if(prefs.hideShopLc){
    box.append(el('p','shoplc-sale-small','Shop LC listings hidden on this device.'));
    const restore=el('button','shoplc-sale-restore','Restore Shop LC listings');
    restore.type='button';restore.addEventListener('click',()=>setHidden(false));
    box.append(restore);card.insertBefore(box,card.children[1]||null);continue;
   }
   box.append(el('small','shoplc-sale-kicker','SHOP LC LISTING · INDEPENDENT PRODUCT DISCOVERY'));
   const body=el('div','shoplc-sale-body');
   const img=el('img','shoplc-sale-image');img.src=match.image;img.alt=match.title+' · Shop LC source image';
   img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
   img.addEventListener('error',()=>box.remove(),{once:true});
   const text=el('div','shoplc-sale-copy');
   text.append(el('strong','shoplc-sale-title',match.title),
    el('span','shoplc-sale-small','Item '+match.id.slice(8)+' · Source checked '+new Date(match.checkedAt).toLocaleTimeString()),
    el('span','shoplc-sale-small','Check the current price, image, size and availability at Shop LC.'));
   body.append(img,text);
   const actions=el('div','shoplc-sale-actions');
   const open=el('a','shoplc-sale-link','See exact listing');
   open.href=match.href;open.target='_blank';open.rel='noopener noreferrer';
   const hide=el('button','shoplc-sale-hide','Not for me');
   hide.type='button';hide.addEventListener('click',()=>setHidden(true));
   actions.append(open,hide);
   box.append(body,actions);
   card.insertBefore(box,card.children[1]||null);
  }
 }
 async function refresh(){
  if(currentPrefs().hideShopLc){render();return}
  const active=document.querySelector('#oracleCardStage .iqc-card[data-source-id]');
  if(!active)return;
  const relevant=candidateCards().includes(active);
  if(!relevant)return;
  if(Date.now()-lastFetch<REFRESH_MS){render();return}
  if(loading)return loading;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),9000);
  loading=(async()=>{
   try{
    const response=await fetch(SOURCE,{cache:'no-store',credentials:'omit',signal:controller.signal});
    if(!response.ok)throw Error('Shop LC item lookup unavailable');
    const data=await response.json();
    // A valid source alone is insufficient; the merchant must authorize
    // product-feed access AND public promotional media reuse.
    if(data?.rights?.provider!=='Shop LC'||
       data?.rights?.productFeedApproved!==true||
       data?.rights?.productImagesApproved!==true)throw Error('merchant_rights_not_confirmed');
    const latest=Array.isArray(data.items)?data.items[0]:data.item;
    const checkedAt=Number(data.checkedAt);
    if(!Number.isFinite(checkedAt)||checkedAt>Date.now()||
       Date.now()-checkedAt>15*60000)throw Error('stale_merchant_offer');
    product=normalizeShopLcItem(latest,checkedAt);
   }catch{product=null}
   finally{clearTimeout(timeout);lastFetch=Date.now();loading=null;render()}
  })();
  return loading;
 }
 window.addEventListener('quantaphi:switchboard-change',()=>{void refresh()});
 window.addEventListener('quantaphi:source-cards-ready',()=>{void refresh()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh()});
 setInterval(()=>{if(!document.hidden)void refresh()},REFRESH_MS);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void refresh()},{once:true});
 else void refresh();
}
