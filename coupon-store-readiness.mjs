/* Store redemption readiness is advisory, not a point-of-sale integration.
 * A reviewed public offer is NOT a clipped merchant deal or a paid receipt.
 * Never generate coupons, barcodes, savings totals, or payment side effects here.
 */
import {filterVerifiedOffers} from './coupon-wallet-core.mjs';

const response=(status,message)=>Object.freeze({
 status,message,canAutoApply:false,isConfirmedSavings:false
});

export function assessCouponStoreRoute(offer,route,now=new Date().toISOString()){
 if(!offer || filterVerifiedOffers([offer],now).length!==1){
  return response('unavailable','No verified current coupon is saved for this checkout. No discount can be claimed or applied.');
 }
 if(!['walmart-in-store','walmart-online','mcdonalds','other'].includes(route)){
  return response('unsupported_route','This checkout route has no approved coupon integration. Check the original issuer terms.');
 }
 if(offer.redemption==='rebate'){
  return response('post_purchase_only','This is a potential rebate, not a discount at the register. Check the issuer rules and wait for issuer confirmation before counting savings.');
 }
 if(route==='walmart-in-store'){
  if(offer.redemption==='paper-manufacturer'){
   return response('requires_paper','Walmart in-store requires the issuer’s valid, original paper manufacturer coupon with a scannable GS1 barcode. Exact item, quantity and retailer policy must be checked at the register; a phone screen is not accepted. Savings are unconfirmed.');
  }
  if(offer.redemption==='loyalty-activation'){
   return response('requires_activation','Check whether this offer can be activated in the official Walmart account or issuer program. Activation and item eligibility are unverified; this wallet does not apply a register discount.');
  }
  return response('unsupported_at_register','This digital/app/online offer is not accepted automatically at the Walmart register. Use the issuer’s official redemption route; do not present a phone image as a paper manufacturer coupon.');
 }
 if(route==='walmart-online'){
  if(offer.redemption==='online-code'){
   return response('requires_merchant_confirmation','Walmart.com seller, exact items, quantity, code eligibility and checkout rules must all be confirmed at the merchant checkout. No code entry or payment integration is connected.');
  }
  return response('unsupported_at_merchant','This is not a verified Walmart.com online checkout code. Follow the original issuer redemption terms; no automatic discount is connected.');
 }
 if(route==='mcdonalds'){
  // Only Pepsi and Mello Yello issuer feeds are registered in this pilot.
  // A manufacturer promotion does not grant a McDonald’s account deal.
  return response('unsupported_at_merchant','This issuer offer is not a verified McDonald’s app deal. McDonald’s deals must be redeemed through the official app, are account/location dependent and limited to one deal per person per visit.');
 }
 return response('requires_merchant_confirmation','The selected issuer offer has not been verified for this store, exact items or checkout. Ask the retailer and use only the original issuer instructions; no savings are confirmed.');
}
