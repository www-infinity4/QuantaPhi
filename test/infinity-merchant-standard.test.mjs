import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateMerchantCardIntake as check,QUANT_MERCHANT_UNIT_PROPOSAL as units,INFINITY_MERCHANT_STANDARD} from '../infinity-merchant-standard.mjs';
const good={tenantId:'shop-001',merchantId:'brand-001',merchantVerified:true,sourceUrl:'https://example.org/shop',licenseReceipt:'contract-verified',
 assetUseApproved:true,images:[{src:'https://example.org/sku1.jpg',alt:'Blue denim jeans front view',source:'merchant-asset-1'}],
 catalog:{merchantSupplied:true,version:'v1',uri:'https://example.org/catalog.json'},
 actions:[{name:'View merchant product',destination:'https://example.org/sku1',providerApproved:true}],ownerPreviewApproved:true};
test('merchant card requires verifiable own media, owner price source and review',()=>{
 assert.equal(check({}).stage,'needs_evidence');
 assert.equal(check(good).stage,'ready_for_independent_backend_verification');
 assert.equal(check(good).executed,false);assert.equal(check(good).checkoutEnabled,false);
 assert.ok(INFINITY_MERCHANT_STANDARD.editorial.includes('alt_text'));
});
test('no partner can use another tenant GitHub/Cloudflare grant or deploy without approval',()=>{
 const site={...good,websiteWriteRequested:true,siteDeployRequested:true,websiteChangeApproved:true,
 github:{tenantId:'other',selectedRepo:'wrong/repo',verified:true},cloudflare:{tenantId:'other',selectedProject:'wrong-site',verified:true}};
 assert.ok(check(site).missing.includes('tenant_scoped_verified_git_grant'));
 assert.ok(check(site).missing.includes('tenant_scoped_verified_deploy_grant'));
 const v=check({...site,github:{...site.github,tenantId:good.tenantId},cloudflare:{...site.cloudflare,tenantId:good.tenantId}});
 assert.equal(v.stage,'ready_for_independent_backend_verification');assert.equal(v.websiteModified,false);
});
test('sponsor, private analytics and pricing units are never silently enabled',()=>{
 assert.ok(check({...good,sponsored:true}).missing.includes('sponsor_contract_and_rights'));
 assert.ok(check({...good,analytics:{enabled:true}}).missing.includes('analytics_consent_and_retention'));
 assert.ok(check({...good,quantDollarCheckout:true}).missing.includes('payment_legal_and_processor_acceptance_not_implemented'));
 assert.equal(units.status,'proposed_not_live');assert.equal(units.merchantSettlementEnabled,false);assert.equal(units.redeemableForCash,false);
});
test('unsafe source, product actions and unlicensed images fail closed',()=>{
 assert.ok(check({...good,sourceUrl:'http://example.org'}).missing.includes('official_source_url'));
 assert.ok(check({...good,images:[{src:'https://example.org/x',alt:'',source:'merchant'}]}).missing.includes('licensed_image_with_alt_and_source'));
 assert.ok(check({...good,actions:[{name:'Buy now',destination:'javascript:doIt()',providerApproved:true}]}).missing.includes('approved_card_actions'));
});
