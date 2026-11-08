/* Local collectible set draft logic. Never scan private albums or charge wallet here. */
const SHA=/^sha256:[0-9a-f]{64}$/;
const ID=/^[a-z0-9][a-z0-9_-]{0,127}$/;
const clean=(v,n=120)=>String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
export function eligibleCreatorSuggestion({consent=false,imageCount=0,scope='',consentVerified=false,source=''}={}){
 if(consent!==true||!Number.isInteger(imageCount)||imageCount<2)return false;
 // Never read arbitrary saved galleries. A future first-party collection summary
 // requires a separately verified, purpose-scoped consent receipt.
 return scope==='selected-files'||(scope==='authorized-saved-manifest'&&
  consentVerified===true&&source==='first-party-collection');
}
export function creatorSetEconomy({pieceCount=0,unitCost=1,freePreview=true}={}){
 const count=Number.isInteger(pieceCount)&&pieceCount>0&&pieceCount<=100?pieceCount:0;
 const coins=Number.isInteger(unitCost)&&unitCost===1?unitCost:0;
 return Object.freeze({paidPieces:count,unitCost:coins,totalStarCoins:count*coins,
  freePreview:freePreview===true,previewIsCollectible:false,paymentStatus:'proposal_only'});
}
export function evaluateSetDraft({title='',creatorId='',items=[],freeCover,consent=false}={}){
 const errors=[];
 if(consent!==true)errors.push('explicit_consent_required');
 if(clean(title,100).length<3)errors.push('set_title_required');
 if(!ID.test(creatorId))errors.push('creator_reference_required');
 if(!Array.isArray(items)||items.length<2||items.length>100)errors.push('need_2_to_100_items');
 const digests=new Set();
 if(Array.isArray(items))for(const item of items){
  if(!ID.test(item?.id||'')||!SHA.test(item?.digest||'')||item.imageReady!==true||
   !['original','licensed'].includes(item.rights))errors.push('item_not_review_ready');
  if(digests.has(item?.digest))errors.push('duplicate_image_content');
  digests.add(item?.digest);
 }
 if(!freeCover||!ID.test(freeCover.id||'')||!SHA.test(freeCover.digest||''))errors.push('free_preview_cover_required');
 if(freeCover&&digests.has(freeCover.digest))errors.push('preview_must_be_extra');
 return Object.freeze({complete:errors.length===0,errors:[...new Set(errors)],
  publication:'needs_server_review',canCollectPayment:false,canMint:false});
}
export function claimEntitlement(receipt,identity){
 // Audit-only metadata match, NOT a security verification of the receipt signature.
 if(!receipt||receipt.verified!==true||!identity)return false;
 for(const key of ['creatorId','setId','itemId','recipientAccount']){
  if(!ID.test(identity[key]||'')||receipt[key]!==identity[key])return false;
 }
 return true;
}
export function canShowLockedAsset({isFreeCover=false}={}){
 // Only an authenticated server can deliver protected paid bytes after
 // cryptographic entitlement verification; browser flags grant nothing.
 return isFreeCover===true;
}
export function createSetBrief({title='',pieces=0,category='artwork'}={}){
 const t=clean(title,100)||'My collectible image set';
 const subject=clean(category,80)||'artwork';
 const count=Number.isInteger(pieces)&&pieces>0&&pieces<=100?pieces:10;
 return `Create a QuantaPhi / Media Star collectible Quick Card set named "${t}" featuring ${count} ${subject} cards. Show one separate free cover preview, then offer each of the ${count} collectible cards for a proposed 1 Star Coin each (up to ${count} Star Coins total). Creator must own or have permission to publish each image; check rights and original attribution. Do not copy the protected Fred ledger, claim a partner endorsement, or touch any wallet now: draft only, no payments are active. Hash/provenance records and server-side duplicate matching may discourage resale by other publishers, but cannot guarantee exclusivity or prevent screenshots and altered copies. Only a verified creator-specific server ledger may issue idempotent unlocks and signed buyer entitlements after approval.`;
}
