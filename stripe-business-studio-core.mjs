/** Stripe Business Studio — local drafting only.
 * The only supported connection is future server-verified Stripe Connect.
 * One actual connected seller may have many authorized cards/Shop Phi items.
 * This module accepts no bank fields or provider credential identifiers.
 */
export const MAX_STRIPE_SELLER_CARDS=500;
const allowedBusinessTypes=new Set(['coins','services','products']);
const validSlug=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9_-]{1,69}$/.test(x);
const validCard=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,69}$/.test(x);
export function parseStripeSellerCards(raw){
 if(!(typeof raw==='string'||Array.isArray(raw)))throw Error('invalid_card_list');
 if(typeof raw==='string'&&raw.length>45000)throw Error('over_card_limit');
 const list=(typeof raw==='string'?raw.split(/[\n\r,]+/):raw).map(x=>typeof x==='string'?x.trim():x).filter(x=>x!==''&&x!==null&&x!==undefined);
 if(!list.length)throw Error('missing_card');
 if(list.length>MAX_STRIPE_SELLER_CARDS)throw Error('over_card_limit');
 const seen=new Set();
 for(const id of list){
  if(!validCard(id))throw Error('invalid_card');
  if(seen.has(id))throw Error('duplicate_card');
  seen.add(id);
 }
 return list;
}
export function parseStripeUsdCents(input){
 if(typeof input!=='string'||!/^(?:0|[1-9][0-9]{0,4})(?:\.[0-9]{1,2})?$/.test(input))return null;
 const [d,c='']=input.split('.');
 const total=Number(d)*100+Number(c.padEnd(2,'0')||'0');
 return Number.isSafeInteger(total)&&total>=1&&total<=9999999?total:null;
}
export function buildStripeSellerDraft(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('invalid_draft');
 const whitelist=new Set(['sellerSlug','displayName','businessType','cardIds','priceUsd','notes']);
 if(Object.keys(input).some(k=>!whitelist.has(k)))throw Error('unsupported_field');
 if(!validSlug(input.sellerSlug))throw Error('invalid_seller_slug');
 if(typeof input.displayName!=='string'||input.displayName.trim().length<2||input.displayName.length>80)throw Error('invalid_display_name');
 if(!allowedBusinessTypes.has(input.businessType))throw Error('invalid_business_type');
 const cards=parseStripeSellerCards(input.cardIds);
 const amount=parseStripeUsdCents(input.priceUsd);
 if(amount===null)throw Error('invalid_price');
 if(typeof input.notes!=='string'||input.notes.length>800)throw Error('invalid_notes');
 const notes=input.notes.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();
 return Object.freeze({
  schemaVersion:1,provider:'stripe_connect',kind:'quanta_seller_template',
  sellerSlug:input.sellerSlug,displayName:input.displayName.trim(),
  businessType:input.businessType,notes,
  mode:'sandbox_draft',accountStatus:'not_connected',payoutsVerified:false,
  accountOwnerVerified:false,checkoutEnabled:false,currency:'USD',
  cardCount:cards.length,shopPhiLinking:'not_connected',cashWalletLinking:'not_connected',
  cards:Object.freeze(cards.map(cardId=>Object.freeze({
   sellerSlug:input.sellerSlug,cardId,priceCents:amount,
   sellerAuthorized:false,rightsVerified:false,checkoutEnabled:false,
   connectionStatus:'not_connected',publicationStatus:'draft_only'
  }))),
  warnings:Object.freeze([
   'Nothing is published, charged, settled, transferred or linked to a bank.',
   'Business verification and tax/bank data must be completed directly through secure Stripe-hosted onboarding.',
   'A general GPT conversation is not a financial vault or a custody account.',
   'No guaranteed cash returns. Bubbles cannot invest or move customer money from this template.'
  ])
 });
}
export function reviewStripeSellerEligibility(draft,untrusted={}){
 // This consumer/source-side function is NOT authority. The server must obtain
 // authenticated user, Connect merchant status, supported products, verified
 // rights, charges_enabled, payouts_enabled, and user consent directly.
 return Object.freeze({
  status:'awaiting_trusted_backend',canCreateCharge:false,
  canAccessCustomerFunds:false,canBindShopPhi:false,
  note:'Seller signup and browser flags are not Stripe verification. Only authenticated server-side provider readback and approved settlement permit monetization.'
 });
}
