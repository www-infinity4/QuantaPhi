/* QuantaPhi Infinity Merchant Standard: a PURE readiness evaluator, not an API adapter.
 * No checkout, OAuth, website modification or wallet action is performed here.
 * Assertions supplied by browsers/users are NOT trusted authorization; authenticated
 * connectors must independently verify every claimed permission before execution.
 */
export const INFINITY_MERCHANT_STANDARD=Object.freeze({
  version:1,
  required:Object.freeze(['merchant_verified','catalog_source','asset_rights','action_provenance','owner_review']),
  optional:Object.freeze(['github_repo','cloudflare_project','analytics_consent','sponsor_contract','loyalty_unit_review']),
  editorial:Object.freeze(['mobile_navigation','image_quality','alt_text','real_price','honest_availability','accessible_controls','approved_offers'])
});
const named=s=>typeof s==='string'&&s.length>0&&s.length<=180;
const url=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
export function evaluateMerchantCardIntake(value){
 const v=value&&typeof value==='object'?value:{},missing=[],notes=[];
 if(!named(v.tenantId)||!named(v.merchantId)||v.tenantId===v.merchantId)missing.push('independent_tenant_and_merchant_identity');
 if(v.merchantVerified!==true)missing.push('verified_merchant_authority');
 if(!named(v.sourceUrl)||!url(v.sourceUrl))missing.push('official_source_url');
 if(!named(v.licenseReceipt)||v.assetUseApproved!==true)missing.push('approved_asset_license_and_receipt');
 if(!Array.isArray(v.images)||v.images.length<1||v.images.some(x=>!x||!url(x.src)||!named(x.alt)||!named(x.source)))missing.push('licensed_image_with_alt_and_source');
 if(v.catalog?.merchantSupplied!==true||!named(v.catalog.version)||!url(v.catalog.uri))missing.push('merchant_supplied_catalog');
 if(!Array.isArray(v.actions)||!v.actions.length||v.actions.some(a=>!a||!named(a.name)||!url(a.destination)||a.providerApproved!==true))missing.push('approved_card_actions');
 if(v.ownerPreviewApproved!==true)missing.push('merchant_approved_preview');
 if(v.analytics?.enabled===true&&(v.analytics.consentVerified!==true||!named(v.analytics.retentionPolicy)))missing.push('analytics_consent_and_retention');
 if(v.websiteWriteRequested===true){
   if(v.github?.tenantId!==v.tenantId||v.github?.verified!==true||!named(v.github?.selectedRepo))missing.push('tenant_scoped_verified_git_grant');
   if(v.siteDeployRequested===true&&(v.cloudflare?.tenantId!==v.tenantId||v.cloudflare?.verified!==true||!named(v.cloudflare?.selectedProject)))missing.push('tenant_scoped_verified_deploy_grant');
   if(v.websiteChangeApproved!==true)missing.push('explicit_merchant_website_change_approval');
 }
 if(v.sponsored===true&&!named(v.sponsorContractReceipt))missing.push('sponsor_contract_and_rights');
 if(v.quantDollarCheckout===true||v.starCoinDollarCheckout===true)missing.push('payment_legal_and_processor_acceptance_not_implemented');
 if(!v.websiteWriteRequested)notes.push('Card intake does not authorize changing the merchant website.');
 if(!v.analytics?.enabled)notes.push('No customer interaction analytics are collected by this evaluator.');
 return Object.freeze({stage:missing.length?'needs_evidence':'ready_for_independent_backend_verification',missing:Object.freeze([...new Set(missing)]),notes:Object.freeze(notes),executed:false,published:false,websiteModified:false,checkoutEnabled:false});
}
export const QUANT_MERCHANT_UNIT_PROPOSAL=Object.freeze({
 status:'proposed_not_live',quantPriceExample:'1 Quant per US $1 of merchant-approved prices, illustrative only',
 starCoinPriceExample:'Optional merchant-selected 1 Star Coin per US $1 illustration, not enabled',
 quantRecord:'Search context and collected-card history under privacy/consent controls',
 starCoinRecord:'Collected card reference; no full search history implied',
 redeemableForCash:false,merchantSettlementEnabled:false,livePaymentAcceptance:false
});
