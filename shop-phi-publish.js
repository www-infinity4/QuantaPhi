/* Authorized seller publishing: existing Unified Wallet -> Quant-AI D1 and private R2.
 * The public result is an UNLISTED seller card, not approved placement or checkout. */
(function(root){
'use strict';
const api=()=>root.QuantAIPersonal?.shopPhiRequest;
const path=id=>'/listings/'+encodeURIComponent(id);
const validId=x=>/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(x||'');
const hasMedia=x=>Array.isArray(x?.mediaIds)&&x.mediaIds.length>0;
function validOwnItem(item){
 if(!validId(item.itemId))throw Error('Invalid listing identifier; save the draft again.');
 if(!item.title||item.title.trim().length<3)throw Error('Add the name of the item you own.');
 if(!/^\$\d{1,7}(?:\.\d{1,2})?$/.test(item.priceLabel||''))throw Error('Enter an asking price in dollars before publishing.');
 if(item.sponsored||item.sponsor)throw Error('Own-goods listings cannot create sponsored advertising without separate campaign approval.');
}
async function publish(item,studio,status,onUpdate,saveDraft){
 validOwnItem(item);
 if(!api())throw Error('The secure seller service is not loaded; your local draft was preserved.');
 if(item.publishState==='public-edit-pending'&&(!item.ownItem||!item.publishConsent||item.confirmPublishedEdit!==true))
  throw Error('Confirm ownership and approve changes to this already-public listing.');
 const uploaded=Array.isArray(item.uploadedMediaIds)?item.uploadedMediaIds:(item.photoIds?.length?item.mediaIds||[]:[]);
 const pending=(item.mediaIds||[]).filter(id=>!uploaded.includes(id));
 if(pending.length){
  if((item.photoIds?.length||0)+pending.length>8)throw Error('ShopPhi allows up to eight photographs per listing.');
  status.textContent='Uploading newly selected photographs to your private wallet-owned ShopPhi storage…';
  const receipts=await studio.uploadPhotos(pending);
  item.photoIds=[...(item.photoIds||[]),...receipts];
  item.uploadedMediaIds=[...new Set([...uploaded,...pending])];
  saveDraft(item);
 }
 const body={
  itemId:item.itemId,title:item.title,description:item.description||'',
  category:item.category||'Other',condition:item.condition||'Used',
  shipping:item.shipping||'Discuss with buyer',quantity:item.quantity||1,
  priceLabel:item.priceLabel,url:item.url||'',imageUrl:item.imageUrl||'',photoIds:item.photoIds||[]
 };
 if(item.publishState==='public-edit-pending'){
  if(!item.ownItem||!item.publishConsent||item.confirmPublishedEdit!==true)
   throw Error('Confirm ownership and approve changes to this already-public listing.');
  status.textContent='Updating the original public listing through your verified wallet…';
  const edited=await api()(path(item.itemId)+'/edit',{...body,confirmPublishedEdit:true});
  if(edited.edited!==true||edited.published!==true||edited.visibility!=='unlisted'||
    edited.listing?.listingId!==item.itemId)throw Error('ShopPhi did not confirm updating the original public listing.');
  const verify=await fetch('/quant-ai/api/shopphi/public/'+encodeURIComponent(item.itemId),{
   method:'GET',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)});
  const current=await verify.json();
  if(!verify.ok||current.ok!==true||current.listing?.listingId!==item.itemId||
    current.listing.status!=='published'||current.listing.title!==item.title||
    current.listing.priceLabel!==edited.listing.priceLabel)
   throw Error('Updated public listing was not independently verified. Check My Listings before trying again.');
  item.publishState='public';
  item.publicUrl=edited.listing.link;
  item.imageUrl=edited.listing.imageUrl?new URL(edited.listing.imageUrl,location.origin).href:item.imageUrl;
  item.merchant=edited.listing.merchant||item.merchant;
  delete item.confirmPublishedEdit;
  saveDraft(item);onUpdate(item);
  status.textContent='Your existing ShopPhi listing was updated and verified at the same shareable URL. Public carousel review is separate.';
  return true;
 }
 status.textContent='Saving your item in your wallet-owned ShopPhi catalog…';
 const saved=await api()('/listings',body);
 if(saved.listing?.listingId!==item.itemId||saved.saved!=='private-draft')throw Error('Quant AI did not verify saving your item.');
 item.publishState='server-draft';item.merchant=saved.listing.merchant;
 saveDraft(item);onUpdate(item);
 if(!item.ownItem||!item.publishConsent){
  status.textContent='Item saved to your private cloud catalog. Select both ownership and shareable-publication confirmations to publish.';
  return false;
 }
 status.textContent='Publishing your unlisted seller card and checking its public URL…';
 const receipt=await api()(path(item.itemId)+'/publish',{ownItem:true,publishConsent:true});
 if(receipt.published!==true||receipt.listing?.listingId!==item.itemId||receipt.visibility!=='unlisted')
  throw Error('ShopPhi did not confirm item publication.');
 // Never infer visibility from the write receipt alone.
 const verification=await fetch('/quant-ai/api/shopphi/public/'+encodeURIComponent(item.itemId),{
  method:'GET',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)});
 const live=await verification.json();
 if(!verification.ok||live.ok!==true||live.listing?.listingId!==item.itemId||live.listing.status!=='published')
  throw Error('Public item readback is unavailable. Your cloud draft remains recoverable.');
 item.publishState='public';
 item.publicUrl=receipt.listing.link;
 item.imageUrl=receipt.listing.imageUrl?new URL(receipt.listing.imageUrl,location.origin).href:item.imageUrl;
 item.merchant=receipt.listing.merchant||item.merchant;
 saveDraft(item);onUpdate(item);
 status.textContent='Your item is published at a verified shareable URL. It is UNLISTED, not yet approved for the public carousel. Tap Share to send the listing.';
 return true;
}
async function listings(){
 if(!api())throw Error('Connect your Unified Wallet to load cloud listings.');
 const r=await api()('/listings');
 return Array.isArray(r.listings)?r.listings:[];
}
root.ShopPhiPublish=Object.freeze({publish,listings});
})(window);
