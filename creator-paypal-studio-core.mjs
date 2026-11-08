/* QuantaPhi creator PayPal template (zero money movement).
 * One account-level merchant connection per creator, many individually reviewed
 * cards. All outputs are UNVERIFIED DRAFTS. A browser cannot authorize a sale,
 * create an account, receive a payout or establish copyright ownership.
 *
 * Never store PayPal credentials, identity files, bank account details, billing
 * tokens, platform API secrets or financial balances in this module.
 */
export const MAX_CREATOR_CARDS=500;
const slug=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9_-]{1,69}$/.test(value);
const cardId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,69}$/.test(value);

export function parseCreatorCardIds(input){
 if(!(typeof input==='string'||Array.isArray(input)))throw Error('invalid_card_ids');
 if(typeof input==='string'&&input.length>45000)throw Error('too_many_cards');
 const raw=Array.isArray(input)?input:input.split(/[\n\r,]+/);
 const ids=raw.map(x=>typeof x==='string'?x.trim():x).filter(x=>x!==''&&x!==null&&x!==undefined);
 if(!ids.length)throw Error('empty_card_ids');
 if(ids.length>MAX_CREATOR_CARDS)throw Error('too_many_cards');
 const seen=new Set();
 for(const id of ids){
  if(!cardId(id))throw Error('invalid_card_id');
  if(seen.has(id))throw Error('duplicate_card_id');
  seen.add(id);
 }
 return ids;
}
export function parseUsdPrice(input){
 if(typeof input!=='string'||!/^(?:0|[1-9][0-9]{0,4})(?:\.[0-9]{1,2})?$/.test(input))return null;
 const parts=input.split('.');
 const cents=Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0')||'0');
 return Number.isSafeInteger(cents)&&cents>=1&&cents<=9_999_999?cents:null;
}
export function prepareCreatorPayPalManifest(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('invalid_template');
 const allowed=['creatorSlug','cardIds','usdPrice'];
 if(Object.keys(input).some(key=>!allowed.includes(key)))throw Error('invalid_template_field');
 if(!slug(input.creatorSlug))throw Error('invalid_creator_slug');
 const cardIds=parseCreatorCardIds(input.cardIds);
 const priceCents=parseUsdPrice(input.usdPrice);
 if(priceCents===null)throw Error('invalid_price');
 return Object.freeze({
  schemaVersion:1,product:'QuantaPhi Quick Card creator monetization draft',
  creatorSlug:input.creatorSlug,
  status:'draft_only',
  currency:'USD',
  merchantConnection:Object.freeze({provider:'paypal',status:'not_connected',linked:false}),
  publiclySellable:false,canStartCheckout:false,
  cardCount:cardIds.length,
  cards:Object.freeze(cardIds.map(id=>Object.freeze({
   creatorSlug:input.creatorSlug,cardId:id,priceCents,
   billingMode:'paypal_usd',rightsReviewStatus:'unverified',
   creatorApprovalStatus:'not_recorded',paymentLink:null,
   canCharge:false,publiclySellable:false
  }))),
  note:'Draft only. Attach to a server-verified creator and one authorized PayPal merchant after partner approval, rights review and checkout testing. No actual payment link or publisher activation.'
 });
}
// Eligibility guidance only; never an API permission or server charge authorization.
export function assessCreatorActivation(manifest,details={}){
 const checks=[
  ['verified_creator_session',details?.verifiedSession===true&&details?.creatorSlug===manifest?.creatorSlug],
  ['paypal_platform_partner_approved',details?.paypalPartnerApproved===true],
  ['merchant_onboarding_and_scopes_verified',details?.merchantConnected===true],
  ['rights_and_content_reviewed',details?.cardRightsReviewed===true],
  ['checkout_approved_and_tested',details?.checkoutApproved===true]
 ];
 return Object.freeze({
  state:'server_activation_required',canCharge:false,canPublishPaidCard:false,
  missing:checks.filter(([,ok])=>!ok).map(([name])=>name),
  reason:'Only a server-authorized PayPal partner flow, authenticated customer approval, actual PayPal payment receipts and approved card rights can activate sales.'
 });
}
