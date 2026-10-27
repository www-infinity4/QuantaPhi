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
async function request(path,body){const r=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok||d.ok===false)throw Error(d.error||'Shop service request failed');return d}

const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const read=(key)=>{try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
const save=(key,v)=>{localStorage.setItem(key,JSON.stringify(v))};
const safe=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return''}};
const sellerMode=host.dataset.sellerPage==='true'||new URL(location.href).searchParams.get('sell')==='1';
const shell=node('section',undefined,'sap-shell');host.append(shell);
shell.append(node('small','ORACLE OCTAVES · INFINITY 2026® · SHOP + AD PHI'),node('h2','Shop Phi'),node('p','Create a sourced, photo-led shopping post. A private draft is not a public post.'));
const actions=node('div',undefined,'sap-actions'),feature=node('article',undefined,'sap-feature'),status=node('p','', 'sap-status');status.setAttribute('role','status');
shell.append(actions,feature,status);
const button=(parent,text,fn)=>{const b=node('button',text);b.type='button';b.addEventListener('click',fn);parent.append(b);return b};
let current=null,sellerStudio=null,publishing=false,interactionRevision=0,query=new URL(location.href).searchParams.get('q')||'antique radio';
async function publish(item){
 if(publishing){status.textContent='A Shop Phi post is already being submitted.';return false}
 if(!connected){status.textContent='Post saved privately. Public posting is not connected to an authenticated Shop Phi owner session on this page.';return false}
 if(item.mediaIds?.length){status.textContent='Post saved privately. Device-only photos cannot be published until the verified seller-media upload and review service is connected.';return false}
 if(!safe(item.url)){status.textContent='Post saved privately. Public Shop Phi catalog posts require an original HTTPS seller/product link.';return false}
 if((item.description||'').length>650){status.textContent='Post saved privately. Shorten the public description to 650 characters; your full draft was preserved.';return false}
 publishing=true;status.textContent='Submitting to the authenticated Shop Phi catalog…';
 try{
  await request(ownerPath()+'/shop/config',{});
  const created=await request(ownerPath()+'/shop/items',{...item,ownerOrder:0});
  if(created.status!=='draft'||created.itemId!==item.itemId)throw Error('The catalog did not confirm saving this item.');
  const receipt=await request(ownerPath()+'/shop/items/'+encodeURIComponent(item.itemId)+'/publish',{});
  if(receipt.published!==true||receipt.itemId!==item.itemId)throw Error('The catalog did not confirm publication.');
  const verify=await request(ownerPath()+'/shop/items');
  if(!Array.isArray(verify.items)||!verify.items.some(x=>x.item_id===item.itemId&&x.state==='published'))throw Error('Publish returned a receipt, but the item was not confirmed by catalog readback.');
  item.publishState='catalog-published';
  try{save(KEY,[item,...read(KEY).filter(x=>x.itemId!==item.itemId)].slice(0,100))}catch{}
  let visible=false;
  try{
   const pub=await request(base+'/public/sites/'+config.siteId+'/cards/'+config.instanceId+'/shop');
   visible=Array.isArray(pub.items)&&pub.items.some(x=>x.item_id===item.itemId);
  }catch{} // Catalog publication and a publicly enabled site/card are separate states.
  if(visible){item.publishState='public';try{save(KEY,[item,...read(KEY).filter(x=>x.itemId!==item.itemId)].slice(0,100))}catch{}}
  show(item,true);
  status.textContent=visible?'Post published and confirmed in the public Shop Phi card.':'Post saved and published to your owner catalog, but it is NOT yet confirmed visible publicly. Publish/enable the parent site and Shop Phi card.';
  return visible;
 }catch(e){status.textContent='Post not verified as published: '+(e.message||'Shop Phi is unavailable.')+' Your local draft remains saved.';return false}
 finally{publishing=false}
}
const link=(parent,text,url,viewer=false)=>{if(!safe(url))return;const a=node('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer'+(current?.sponsored?' sponsored':'');if(viewer){a.dataset.siteUrl=url;a.dataset.siteTitle=current?.title||text;a.addEventListener('click',e=>{if(window.QuantaOpenSite){e.preventDefault();window.QuantaOpenSite(a)}})}parent.append(a)};
function show(item,draft=false){
 current=item;openAd.disabled=!safe(item.url);feature.replaceChildren();
 // ShopPhi is a living product card: refresh flanking connections when the
 // selected product changes, not only when the Oracle carousel arrow is tapped.
 const oracleStage=document.getElementById('oracleCardStage');
 if(typeof oracleStage?.contains==='function'&&oracleStage.contains(host)){
  oracleStage.dataset.switchboardId='deck-shop';
  oracleStage.dataset.switchboardTitle=item.title||'Shop Phi';
  oracleStage.dataset.switchboardCategory='Shopping';
  window.dispatchEvent(new CustomEvent('quantaphi:switchboard-change',{detail:{
   id:'deck-shop',title:item.title||'Shop Phi',
   category:'Shopping',tab:oracleStage.dataset.switchboardTab||'public'
  }}));
 }
 feature.append(node('small',draft?(item.publishState==='public'?'PUBLIC SHOP PHI POST · VERIFIED':item.publishState==='catalog-published'?'OWNER CATALOG · PUBLIC VISIBILITY NOT CONFIRMED':'PRIVATE POST DRAFT · NOT PUBLIC'):item.sponsored?'ADVERTISEMENT · '+(item.sponsor||'Advertiser'):'SHOPPING SOURCE · '+(item.merchant||'Original seller')));
 if(safe(item.imageUrl)){const img=node('img');img.src=item.imageUrl;img.alt=item.title;img.loading='lazy';feature.append(img)}
 if(draft&&item.mediaIds?.length)void sellerStudio?.previewIn(item,feature);
 if(!safe(item.imageUrl)&&!(draft&&item.mediaIds?.length))feature.append(node('p','Add a real product photo or original source image to give this post a visual. No stock image will be invented.','sap-media-missing'));
 feature.append(node('h3',item.title),node('p',item.description||'Original seller listing; item details have not been verified.'));
 const meta=node('div',undefined,'sap-item-meta');
 if(item.priceLabel)meta.append(node('strong',item.priceLabel));
 if(item.merchant)meta.append(node('span','Seller · '+item.merchant));
 if(safe(item.url))meta.append(node('span','Original source · '+new URL(item.url).hostname));
 feature.append(meta);
 const row=node('div',undefined,'sap-actions');feature.append(row);
 if(draft&&item.mediaIds?.length){const blocked=button(row,'Publish after verification',()=>{status.textContent='Photo listings need a verified robot review, durable cloud media and server moderation before publishing. The current draft stays private.'});blocked.disabled=true;}
 if(draft&&connected&&!item.mediaIds?.length){if(item.publishState!=='public')button(row,'Retry public posting',()=>publish(item));}


 button(row,'☆ Star',()=>{try{const k='quantaphi:shop-ad-phi:stars:v1';const ref=item.url||item.itemId;save(k,[ref,...read(k).filter(x=>x!==ref)]);status.textContent='Item starred.'}catch{status.textContent='Could not save on this device.'}});
 button(row,'+1 Build',()=>{
  const packageApi=window.PhiProjectPackage;
  if(!packageApi?.capture){status.textContent='Code Phi project collection is not loaded; this post has not been added to a build.';return}
  if(!safe(item.url)){status.textContent='Add a verified original source link before sending this draft to Code Phi.';return}
  if(!packageApi.active()&&!packageApi.newToken('Shop Phi product ideas')){status.textContent='Could not start a Code Phi project.';return}
  const result=packageApi.capture({kind:'product',id:'shop:'+item.itemId,title:item.title,description:item.description,sourceUrl:item.url,imageUrl:safe(item.imageUrl),originCard:'shop-phi'});
  status.textContent=result.ok?(result.duplicate?'Already in your Code Phi project.':'Added this exact product to your Code Phi project (+1).'):result.reason||'Could not add this post to the project.';
 });
 button(row,'Browse related listings',()=>{
  // No generic Google search: show related inventory within the QuantaPhi
  // original-site ecosystem, then let the visitor choose a merchant.
  const term=String(item.title||'').trim().slice(0,100);
  const route='/shopphi-sell.html?browse='+encodeURIComponent(term);
  if(sellerMode){window.location.href=route;return}
  window.open(route,'_blank','noopener,noreferrer');
 });
 button(row,'Collect',()=>{try{const k='quantaPhiCollected',data={key:'shop:'+(item.url||item.itemId),type:'Shop Phi',title:item.title,sourceUrl:item.url,media:item.imageUrl||'',story:item.description||'',collectedAt:new Date().toISOString()};save(k,[data,...read(k).filter(x=>x.key!==data.key)]);window.QuantaStarCredit?.('collect',data.key,data);status.textContent='Item collected. Rewards depend on StarQuest confirmation.'}catch{status.textContent='Collection could not be saved.'}});
 if(item.url)button(row,'Share',async()=>{try{if(navigator.share)await navigator.share({title:item.title,url:item.url});else await navigator.clipboard.writeText(item.url);status.textContent='Seller link shared.'}catch(e){status.textContent=e.name==='AbortError'?'Share canceled.':'Sharing unavailable.'}});
 if(item.affiliate)feature.append(node('small','Affiliate link; the curator may earn a commission.'));
}
const shopLinks=node('div',undefined,'sap-actions sap-search-links');shell.append(shopLinks);
function showSearchFallback(topic){
 shopLinks.replaceChildren();
 const term=String(topic||'').trim().slice(0,140);if(!term)return;
 const destination=new URL('https://www.ebay.com/sch/i.html');
 destination.searchParams.set('_nkw',term);
 const a=node('a','Shop '+term);a.href=destination.href;
 a.target='_blank';a.rel='noopener noreferrer';
 a.dataset.siteUrl=a.href;a.dataset.siteTitle='Shop '+term;
 a.addEventListener('click',e=>{if(window.QuantaOpenSite){e.preventDefault();window.QuantaOpenSite(a)}});
 shopLinks.append(a);
}
async function loadAd(){const revision=interactionRevision;status.textContent='Loading an available ad…';try{const ad=await window.ControlPhi?.requestSponsoredCard(query,'shop-ad-phi');if(revision!==interactionRevision)return;if(ad&&safe(ad.destinationUrl)){show({title:ad.title,description:ad.body,url:ad.destinationUrl,sponsored:true,sponsor:ad.advertiser||'Advertiser',merchant:ad.advertiser,imageUrl:ad.imageUrl});status.textContent='Advertisement ready.';return}}catch{}const draft=read(KEY)[0];if(draft){show(draft,true);status.textContent='Your most recent listing draft. Not published.';}else{current=null;feature.replaceChildren();feature.append(node('h3','Your ad goes here'),node('p','Open an available ad, or create a listing with an item description, price and optional link.'));openAd.disabled=true;status.textContent='No live advertisement is available from Ad Phi right now.';}}
const openAd=button(actions,'Open ad',()=>{if(!safe(current?.url)){status.textContent='This listing has no destination link yet.';return}if(window.QuantaOpenSite){const a=node('a');a.href=current.url;a.dataset.siteUrl=current.url;a.dataset.siteTitle=current.title;window.QuantaOpenSite(a)}else window.open(current.url,'_blank','noopener,noreferrer')});openAd.disabled=true;
button(actions,sellerMode?'Edit my listing':'Create listing',()=>{
 interactionRevision++;
 if(!sellerMode){window.location.href='/shopphi-sell.html';return}
 form.hidden=false;form.scrollIntoView({block:'start',behavior:'smooth'});
 fields.title.focus();
 if(window.QuantAIPersonal)void window.QuantAIPersonal.profile().then(p=>{fields.merchant.value=p.publicAlias}).catch(()=>{});
});
button(actions,'My listings',()=>{interactionRevision++;const items=read(KEY);if(!items.length){status.textContent='No saved posts yet. Choose Create post.';return}list.hidden=!list.hidden;list.replaceChildren();items.forEach(item=>button(list,item.title,()=>show(item,true)))});

if(connected)button(actions,'Published shop',async()=>{try{const d=await request(base+'/public/sites/'+config.siteId+'/cards/'+config.instanceId+'/shop');const item=d.items?.[0];if(!item){status.textContent='No published items in this shop yet.';return}show({title:item.title,description:item.description,url:item.source_url,imageUrl:item.image_url,priceLabel:item.price_label,merchant:item.merchant,sponsored:item.sponsored,sponsor:item.sponsor,affiliate:item.affiliate});status.textContent='Published Shop Phi item loaded.'}catch{status.textContent='Published shop could not be loaded.'}});

button(actions,'Ad Phi offer',async()=>{interactionRevision++;status.textContent='Looking for an available Ad Phi offer…';try{const ad=await window.ControlPhi?.requestSponsoredCard(query,'shop-ad-phi');if(!ad||!safe(ad.destinationUrl)){status.textContent='No ad is available for this topic. Create a listing to add your own item.';return}show({title:ad.title,description:ad.body,url:ad.destinationUrl,sponsored:true,sponsor:ad.advertiser||'Ad Phi advertiser',merchant:ad.advertiser,imageUrl:ad.imageUrl});status.textContent='Ad Phi advertisement loaded.'}catch{status.textContent='Ad Phi is unavailable right now.'}});
const list=node('div',undefined,'sap-list');list.hidden=true;shell.append(list);
const form=node('form',undefined,'sap-form');form.hidden=true;const fields={};
for(const [name,label,type,required,max] of [['title','Item name','text',true,130],['description','Description','textarea',false,20000],['url','Ad or checkout link (optional, https)','url',false,2000],['imageUrl','Image link (optional)','url',false,2000],['priceLabel','Price in USD (for example $45.00)','text',false,55],['merchant','Public shop alias (optional)','text',false,100],['sponsor','Advertiser name (only for sponsored ads)','text',false,100]]){const l=node('label',label),input=node(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.name=name;input.required=required;input.maxLength=max;fields[name]=input;l.append(input);if(['merchant','sponsor','imageUrl'].includes(name))l.hidden=true;form.append(l)}
// eBay-like item specifics appear directly in the listing, never silently
// replaced by AI guesses or hidden in account defaults.
const specifics=node('fieldset');specifics.className='sap-item-specifics';
const legend=node('legend','Item details');specifics.append(legend);
const extraInputs={};
for(const [key,label,choices] of [
 ['category','Category',['Select category','Coins & paper money','Collectibles','Clothing & shoes','Electronics','Home & garden','Music & media','Other']],
 ['condition','Condition',['Select condition','New','Open box','Used','For parts / not working']],
 ['shipping','Shipping',['Select shipping','Shipping offered','Local pickup','Digital delivery','Discuss with buyer']]
]){
 const wrap=node('label',label),input=node('select');input.name=key;input.setAttribute('aria-label',label);
 for(const opt of choices){const o=node('option',opt);o.value=opt.startsWith('Select')?'':opt;input.append(o)}
 extraInputs[key]=input;wrap.append(input);specifics.append(wrap);
}
const quantityLabel=node('label','Quantity available');
const quantity=node('input');quantity.type='number';quantity.min='1';quantity.max='9999';quantity.value='1';quantity.name='quantity';
extraInputs.quantity=quantity;quantityLabel.append(quantity);specifics.append(quantityLabel);
form.append(specifics);
const defaultFields={};const defaultsPanel=node('details'),defaultsTitle=node('summary','Optional private selling defaults');defaultsPanel.append(defaultsTitle);for(const [key,label,placeholder] of [['currency','Currency','USD'],['condition','Usual condition','Used'],['shippingPolicy','Shipping terms (no address)','Ship within 3 business days'],['returnPolicy','Return terms','Returns considered within 14 days']]){const l=node('label',label),i=node('input');i.type='text';i.maxLength=key==='currency'?3:400;i.placeholder=placeholder;defaultFields[key]=i;l.append(i);defaultsPanel.append(l)}form.append(defaultsPanel);button(defaultsPanel,'Save these defaults privately',async()=>{try{const values=Object.fromEntries(Object.entries(defaultFields).filter(([k,v])=>v.value.trim()).map(([k,v])=>[k,v.value.trim()]));await window.QuantAIPersonal.saveDefaults(values);personalStatus.textContent='Selling defaults saved privately to your wallet account. No name or delivery address was saved.';}catch(e){personalStatus.textContent=e.message}});
const personalStatus=node('p','No personal name is needed. Wallet-linked defaults stay private; listings use a public alias.','sap-small');form.append(personalStatus);
button(form,'Prefill from my private assistant',async()=>{try{const p=await window.QuantAIPersonal.profile();if(!fields.merchant.value)fields.merchant.value=p.publicAlias;for(const [k,v]of Object.entries(p.defaults||{}))if(defaultFields[k]&&!defaultFields[k].value)defaultFields[k].value=v;personalStatus.textContent='Private wallet recognized. Public alias: '+p.publicAlias+'. Seller status: '+p.verification.status+'.';}catch(e){personalStatus.textContent=e.message}});
button(form,'AI draft from my item description',async()=>{status.textContent='Drafting from your item facts without sending your identity…';try{const d=await window.QuantAIPersonal.assist({title:fields.title.value,description:fields.description.value,.../^https:\/\/(www\.)?ebay\.com\/itm\//.test(fields.url.value)?{sourceUrl:fields.url.value}:{}});fields.title.value=d.draft.title;fields.description.value=d.draft.description;if(!fields.merchant.value)fields.merchant.value=d.draft.merchant;personalStatus.textContent=d.evidence?.explanation||d.verification.explanation;status.textContent='Draft filled. Review the item facts before saving; no listing was published.';}catch(e){status.textContent=e.message}});
const mediaPanel=node('details'),mediaTitle=node('summary','Add photos or video (optional)');mediaPanel.append(mediaTitle);form.append(mediaPanel);sellerStudio=window.ShopPhiSeller?.mount(mediaPanel,fields,status,config)||null;
const submit=node('button',connected?'Save and request catalog publication':'Save listing draft + show preview');
submit.className='sap-submit-listing';submit.type='submit';
submit.setAttribute('aria-label','Save Shop Phi listing draft');form.append(submit,node('small',connected?'Submit to your connected Shop Phi owner catalog; a public readback will confirm visibility.':'Owner posting connection is not configured. Create post saves a PRIVATE local draft only; it will not appear in the public feed.'));
button(form,'Export saved listings',()=>{const blob=new Blob([JSON.stringify({schema:'phi.shop-curation/drafts-v1',items:read(KEY)},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='shop-phi-listings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
form.addEventListener('submit',async e=>{
 e.preventDefault();interactionRevision++;
 const item=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value.trim()]));
 for(const [k,v] of Object.entries(extraInputs))item[k]=v.value.trim();
 if(item.quantity&&!/^[1-9]\d{0,3}$/.test(item.quantity)){status.textContent='Quantity must be a whole number from 1 to 9999.';return}
 if(item.priceLabel&&!/^\$?\d+(?:\.\d{1,2})?$/.test(item.priceLabel)){status.textContent='Enter a numeric asking price such as 45 or $45.00.';return}
 if(item.priceLabel&&!item.priceLabel.startsWith('
 if(!item.merchant)item.merchant='Anonymous seller';
 item.mediaIds=sellerStudio?.ids()||[];
 if((!item.url&&!item.mediaIds.length)||(item.url&&!safe(item.url))||(item.imageUrl&&!safe(item.imageUrl))){
  status.textContent='Use an https source link, or attach actual item photos. External image links must use https.';return
 }
 if(item.sponsor&&item.mediaIds.length){status.textContent='Paid sponsored placements require a separately reviewed ad campaign. Save this as an ordinary seller listing instead.';return}
 const policy=window.ShopPhiPolicy?.evaluate(item)||{status:'needs_review'};
 if(policy.status==='blocked'){status.textContent='Shop Phi cannot accept this listing: '+policy.reason+' If this is a mistake, request a manual policy review once the seller service is connected.';return}
 item.policyStatus=policy.status;
 item.policyNote=policy.reason;
 item.itemId=crypto.randomUUID();
 item.kind=item.sponsor?'advertisement':'product';item.sponsored=!!item.sponsor;
 item.verificationStatus=item.mediaIds.length?'not-reviewed':'external-source-unverified';
 try{
  save(KEY,[item,...read(KEY)].slice(0,100));
  show(item,true);
  if(sellerMode)feature.scrollIntoView({behavior:'smooth',block:'start'});
  status.textContent=item.mediaIds.length?'Private draft saved with '+item.mediaIds.length+' device-only media files. Public image upload/review is unavailable.':'Post draft saved locally. Checking authorized publication…';
  sellerStudio?.clear();form.hidden=true;
  if(!item.mediaIds.length)await publish(item);
  else status.textContent='Private draft saved with local images/video. This is not a public post: verified server media upload and review are not connected.';
 }catch{status.textContent='Storage is full or unavailable. Draft was not saved.'}
});
shell.append(form,node('footer','External sellers control stock, checkout and price. Sponsored offers are labeled Advertisement.'));
if(sellerMode){
 form.hidden=false;
 shell.classList.add('sap-seller-fullscreen');
 // In a full-page listing editor, the form is the primary interface.
 shell.insertBefore(form,feature);
 if(!connected)status.textContent='Seller studio ready. Create an eBay-style listing draft with photos. Public publishing requires a connected, verified Shop Phi seller account.';
 const newest=read(KEY)[0];if(newest){show(newest,true)}
} 
window.addEventListener('quantaphi:search-start',e=>{query=String(e.detail?.query||'').slice(0,140);showSearchFallback(query);void loadAd()});showSearchFallback(query);void loadAd();
})();
))item.priceLabel='
 if(!item.merchant)item.merchant='Anonymous seller';
 item.mediaIds=sellerStudio?.ids()||[];
 if((!item.url&&!item.mediaIds.length)||(item.url&&!safe(item.url))||(item.imageUrl&&!safe(item.imageUrl))){
  status.textContent='Use an https source link, or attach actual item photos. External image links must use https.';return
 }
 if(item.sponsor&&item.mediaIds.length){status.textContent='Paid sponsored placements require a separately reviewed ad campaign. Save this as an ordinary seller listing instead.';return}
 const policy=window.ShopPhiPolicy?.evaluate(item)||{status:'needs_review'};
 if(policy.status==='blocked'){status.textContent='Shop Phi cannot accept this listing: '+policy.reason+' If this is a mistake, request a manual policy review once the seller service is connected.';return}
 item.policyStatus=policy.status;
 item.policyNote=policy.reason;
 item.itemId=crypto.randomUUID();
 item.kind=item.sponsor?'advertisement':'product';item.sponsored=!!item.sponsor;
 item.verificationStatus=item.mediaIds.length?'not-reviewed':'external-source-unverified';
 try{
  save(KEY,[item,...read(KEY)].slice(0,100));
  show(item,true);
  status.textContent=item.mediaIds.length?'Private draft saved with '+item.mediaIds.length+' device-only media files. Public image upload/review is unavailable.':'Post draft saved locally. Checking authorized publication…';
  sellerStudio?.clear();form.hidden=true;
  if(!item.mediaIds.length)await publish(item);
  else status.textContent='Private draft saved with local images/video. This is not a public post: verified server media upload and review are not connected.';
 }catch{status.textContent='Storage is full or unavailable. Draft was not saved.'}
});
shell.append(form,node('footer','External sellers control stock, checkout and price. Sponsored offers are labeled Advertisement.'));
window.addEventListener('quantaphi:search-start',e=>{query=String(e.detail?.query||'').slice(0,140);showSearchFallback(query);void loadAd()});showSearchFallback(query);void loadAd();
})();
+item.priceLabel;
 if(!item.merchant)item.merchant='Anonymous seller';
 item.mediaIds=sellerStudio?.ids()||[];
 if((!item.url&&!item.mediaIds.length)||(item.url&&!safe(item.url))||(item.imageUrl&&!safe(item.imageUrl))){
  status.textContent='Use an https source link, or attach actual item photos. External image links must use https.';return
 }
 if(item.sponsor&&item.mediaIds.length){status.textContent='Paid sponsored placements require a separately reviewed ad campaign. Save this as an ordinary seller listing instead.';return}
 const policy=window.ShopPhiPolicy?.evaluate(item)||{status:'needs_review'};
 if(policy.status==='blocked'){status.textContent='Shop Phi cannot accept this listing: '+policy.reason+' If this is a mistake, request a manual policy review once the seller service is connected.';return}
 item.policyStatus=policy.status;
 item.policyNote=policy.reason;
 item.itemId=crypto.randomUUID();
 item.kind=item.sponsor?'advertisement':'product';item.sponsored=!!item.sponsor;
 item.verificationStatus=item.mediaIds.length?'not-reviewed':'external-source-unverified';
 try{
  save(KEY,[item,...read(KEY)].slice(0,100));
  show(item,true);
  status.textContent=item.mediaIds.length?'Private draft saved with '+item.mediaIds.length+' device-only media files. Public image upload/review is unavailable.':'Post draft saved locally. Checking authorized publication…';
  sellerStudio?.clear();form.hidden=true;
  if(!item.mediaIds.length)await publish(item);
  else status.textContent='Private draft saved with local images/video. This is not a public post: verified server media upload and review are not connected.';
 }catch{status.textContent='Storage is full or unavailable. Draft was not saved.'}
});
shell.append(form,node('footer','External sellers control stock, checkout and price. Sponsored offers are labeled Advertisement.'));
window.addEventListener('quantaphi:search-start',e=>{query=String(e.detail?.query||'').slice(0,140);showSearchFallback(query);void loadAd()});showSearchFallback(query);void loadAd();
})();
