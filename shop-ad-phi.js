/* Shop Phi × Ad Phi. Reuses Shop-Phi marketplace lanes and WidgetPhi item contract. */
(() => {
'use strict';
const host=document.getElementById('shopAdPhi');if(!host)return;
const KEY='quantaphi:shop-ad-phi:drafts:v1';
// Deployment supplies a same-origin authenticated WidgetPhi route, never a browser token.
const config=window.ShopAdPhiConfig||{};
const id=v=>/^[A-Za-z0-9_-]{1,80}$/.test(String(v||''));
const connected=id(config.siteId)&&id(config.instanceId)&&typeof config.apiBase==='string'&&/^\/[A-Za-z0-9/_-]*$/.test(config.apiBase)&&!config.apiBase.startsWith('//');
const base=connected?config.apiBase.replace(/\/$/,''):'';
const ownerPath=()=>base+'/api/sites/'+config.siteId+'/cards/'+config.instanceId;
async function request(path,body){const r=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Shop service request failed');return d}

const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const read=(key)=>{try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
const save=(key,v)=>{localStorage.setItem(key,JSON.stringify(v))};
const safe=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return''}};
const shell=node('section',undefined,'sap-shell');host.append(shell);
shell.append(node('small','ORACLE OCTAVES · INFINITY 2026® · SHOP + AD PHI'),node('h2','Shop Phi · Your shop window'),node('p','Show your item, an eBay listing, or a sponsored offer in one card.'));
const actions=node('div',undefined,'sap-actions'),feature=node('article',undefined,'sap-feature'),status=node('p','', 'sap-status');status.setAttribute('role','status');
shell.append(actions,feature,status);
const button=(parent,text,fn)=>{const b=node('button',text);b.type='button';b.addEventListener('click',fn);parent.append(b);return b};
let current=null,sellerStudio=null,query=new URL(location.href).searchParams.get('q')||'antique radio';
const link=(parent,text,url,viewer=false)=>{if(!safe(url))return;const a=node('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer'+(current?.sponsored?' sponsored':'');if(viewer){a.dataset.siteUrl=url;a.dataset.siteTitle=current?.title||text;a.addEventListener('click',e=>{if(window.QuantaOpenSite){e.preventDefault();window.QuantaOpenSite(a)}})}parent.append(a)};
function show(item,draft=false){
 current=item;feature.replaceChildren();
 feature.append(node('small',draft?'YOUR SAVED DRAFT · NOT PUBLIC':item.sponsored?'ADVERTISEMENT · '+item.sponsor:'SHOPPING SOURCE · '+item.merchant));
 if(safe(item.imageUrl)){const img=node('img');img.src=item.imageUrl;img.alt=item.title;img.loading='lazy';feature.append(img)}
 if(draft&&item.mediaIds?.length)void sellerStudio?.previewIn(item,feature);
 feature.append(node('h3',item.title),node('p',item.description||''));if(item.priceLabel)feature.append(node('strong',item.priceLabel));
 const row=node('div',undefined,'sap-actions');feature.append(row);
 if(draft&&item.mediaIds?.length){const blocked=button(row,'Publish after verification',()=>{status.textContent='Photo listings need a verified robot review, durable cloud media and server moderation before publishing. The current draft stays private.'});blocked.disabled=true;}
 if(draft&&connected&&!item.mediaIds?.length)button(row,'Publish listing',async()=>{
  status.textContent='Publishing through your Shop Phi owner session…';
  try{
   if(item.description.length>650)throw Error('Public Shop Phi descriptions currently support 650 characters. Your full draft remains saved.');
   await request(ownerPath()+'/shop/config',{});
   await request(ownerPath()+'/shop/items',{...item,ownerOrder:0});
   await request(ownerPath()+'/shop/items/'+item.itemId+'/publish',{});
   status.textContent='Item published in your Shop Phi catalog. The site and card must also be public for visitors to see it.';
  }catch(e){status.textContent=e.message||'Publishing failed. Your draft remains saved.'}
 });

 link(row,'View item',item.url,true);link(row,'Shop / contact seller ↗',item.url);
 button(row,'☆ Star',()=>{try{const k='quantaphi:shop-ad-phi:stars:v1';const ref=item.url||item.itemId;save(k,[ref,...read(k).filter(x=>x!==ref)]);status.textContent='Item starred.'}catch{status.textContent='Could not save on this device.'}});
 button(row,'Collect',()=>{try{const k='quantaPhiCollected',data={key:'shop:'+(item.url||item.itemId),type:'Shop Phi',title:item.title,sourceUrl:item.url,media:item.imageUrl||'',story:item.description||'',collectedAt:new Date().toISOString()};save(k,[data,...read(k).filter(x=>x.key!==data.key)]);window.QuantaStarCredit?.('collect',data.key,data);status.textContent='Item collected. Rewards depend on StarQuest confirmation.'}catch{status.textContent='Collection could not be saved.'}});
 if(item.url)button(row,'Share',async()=>{try{if(navigator.share)await navigator.share({title:item.title,url:item.url});else await navigator.clipboard.writeText(item.url);status.textContent='Seller link shared.'}catch(e){status.textContent=e.name==='AbortError'?'Share canceled.':'Sharing unavailable.'}});
 if(item.affiliate)feature.append(node('small','Affiliate link; the curator may earn a commission.'));
}
function browse(){const url='https://www.ebay.com/sch/i.html?'+new URLSearchParams({_nkw:query,LH_BIN:'1'});show({title:'Shop '+query,description:'Browse buy-it-now listings on eBay. Seller pages provide the current price and availability.',url,merchant:'eBay marketplace'});}
button(actions,'List an item',()=>{form.hidden=!form.hidden;if(!form.hidden)fields.title.focus()});
button(actions,'My listings',()=>{const items=read(KEY);if(!items.length){status.textContent='No saved listings yet. Choose List an item.';return}list.hidden=!list.hidden;list.replaceChildren();items.forEach(item=>button(list,item.title,()=>show(item,true)))});
button(actions,'Browse eBay',browse);
if(connected)button(actions,'Published shop',async()=>{try{const d=await request(base+'/public/sites/'+config.siteId+'/cards/'+config.instanceId+'/shop');const item=d.items?.[0];if(!item){status.textContent='No published items in this shop yet.';return}show({title:item.title,description:item.description,url:item.source_url,imageUrl:item.image_url,priceLabel:item.price_label,merchant:item.merchant,sponsored:item.sponsored,sponsor:item.sponsor,affiliate:item.affiliate});status.textContent='Published Shop Phi item loaded.'}catch{status.textContent='Published shop could not be loaded.'}});

button(actions,'Ad Phi offer',async()=>{status.textContent='Looking for an available Ad Phi offer…';try{const ad=await window.ControlPhi?.requestSponsoredCard(query,'shop-ad-phi');if(!ad||!safe(ad.destinationUrl)){status.textContent='No Ad Phi offer available for this topic. Shopping links remain available.';return}show({title:ad.title,description:ad.body,url:ad.destinationUrl,sponsored:true,sponsor:ad.advertiser||'Ad Phi advertiser',merchant:ad.advertiser,imageUrl:ad.imageUrl});status.textContent='Ad Phi advertisement loaded.'}catch{status.textContent='Ad Phi is unavailable right now.'}});
const list=node('div',undefined,'sap-list');list.hidden=true;shell.append(list);
const form=node('form',undefined,'sap-form');form.hidden=true;const fields={};
for(const [name,label,type,required,max] of [['title','Item name','text',true,130],['description','Description','textarea',false,20000],['url','Optional eBay / checkout link (https); photos can start a draft','url',false,2000],['imageUrl','External photo URL (optional; use Camera below instead)','url',false,2000],['priceLabel','Asking price (or wait for verified comparable-sales research)','text',false,55],['merchant','Seller name','text',true,100],['sponsor','Advertiser name (only for sponsored ads)','text',false,100]]){const l=node('label',label),input=node(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.name=name;input.required=required;input.maxLength=max;fields[name]=input;l.append(input);form.append(l)}
sellerStudio=window.ShopPhiSeller?.mount(form,fields,status,config)||null;
const submit=node('button','Save listing draft');submit.type='submit';form.append(submit,node('small','Saved on this device. Export your draft to your Shop Phi owner workspace to publish. Purchases happen with the seller.'));
button(form,'Export saved listings',()=>{const blob=new Blob([JSON.stringify({schema:'phi.shop-curation/drafts-v1',items:read(KEY)},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='shop-phi-listings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
form.addEventListener('submit',e=>{
 e.preventDefault();
 const item=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value.trim()]));
 item.mediaIds=sellerStudio?.ids()||[];
 if((!item.url&&!item.mediaIds.length)||(item.url&&!safe(item.url))||(item.imageUrl&&!safe(item.imageUrl))){
  status.textContent='Add item photos or a valid HTTPS source link. External images must also use HTTPS.';return
 }
 if(item.sponsor&&item.mediaIds.length){status.textContent='Paid sponsored placements require a separately reviewed ad campaign. Save this as an ordinary seller listing instead.';return}
 item.itemId=crypto.randomUUID();
 item.kind=item.sponsor?'advertisement':'product';item.sponsored=!!item.sponsor;
 item.verificationStatus=item.mediaIds.length?'not-reviewed':'external-source-unverified';
 try{
  save(KEY,[item,...read(KEY)].slice(0,100));
  show(item,true);
  status.textContent=item.mediaIds.length?'Private seller draft saved with '+item.mediaIds.length+' local media files. Not verified, published or priced by a robot.':'External-link curation draft saved on this device.';
  sellerStudio?.clear();form.hidden=true;
 }catch{status.textContent='Storage is full or unavailable. Draft was not saved.'}
});
shell.append(form,node('footer','External sellers control stock, checkout and price. Sponsored offers are labeled Advertisement.'));
window.addEventListener('quantaphi:search-start',e=>{query=String(e.detail?.query||'antique radio').slice(0,140);browse()});browse();
})();
