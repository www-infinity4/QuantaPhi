import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCouponStoreRoute} from '../coupon-store-readiness.mjs';

const NOW='2026-11-06T19:00:00.000Z';
const pepsi=(extra={})=>({
 id:'issuer-pepsi-123',brandId:'pepsi',title:'Pepsi participating offer',
 sourceUrl:'https://www.pepsi.com/products/pepsi',
 verifiedAt:'2026-11-06T18:00:00.000Z',expiresAt:'2026-11-14T00:00:00.000Z',
 reviewStatus:'editorial-reviewed',redemption:'paper-manufacturer',
 store:'Participating stores',details:'Exact product and merchant conditions apply',...extra
});
const melloApp=()=>pepsi({id:'issuer-coca-123',brandId:'mello-yello',
 sourceUrl:'https://www.coca-cola.com/us/en/offerings',redemption:'merchant-app'});

test('empty wallet never invents a coupon or register-ready instructions',()=>{
 for(const merchant of ['walmart-in-store','walmart-online','mcdonalds','other']){
  const result=assessCouponStoreRoute(null,merchant,NOW);
  assert.equal(result.status,'unavailable');
  assert.equal(result.canAutoApply,false);
  assert.equal(result.isConfirmedSavings,false);
  assert.match(result.message,/no verified current coupon/i);
 }
});

test('a current paper coupon at Walmart requires real paper and register verification',()=>{
 const result=assessCouponStoreRoute(pepsi(),'walmart-in-store',NOW);
 assert.equal(result.status,'requires_paper');
 assert.equal(result.canAutoApply,false);
 assert.equal(result.isConfirmedSavings,false);
 assert.match(result.message,/paper/i);
 assert.match(result.message,/register/i);
});

test('a phone-only app offer cannot masquerade as an accepted Walmart paper coupon',()=>{
 const result=assessCouponStoreRoute(melloApp(),'walmart-in-store',NOW);
 assert.equal(result.status,'unsupported_at_register');
 assert.match(result.message,/not accepted|not automatically/i);
});

test('a Walmart online code remains subject to an authorized seller/checkout check',()=>{
 const result=assessCouponStoreRoute(pepsi({redemption:'online-code'}),'walmart-online',NOW);
 assert.equal(result.status,'requires_merchant_confirmation');
 assert.equal(result.canAutoApply,false);
 assert.match(result.message,/seller|checkout/i);
});

test('a Coke brand offer must not be represented as a McDonald’s app deal',()=>{
 const result=assessCouponStoreRoute(melloApp(),'mcdonalds',NOW);
 assert.equal(result.status,'unsupported_at_merchant');
 assert.match(result.message,/McDonald/i);
});

test('expired, stale and unreviewed offers cannot be used as current store coupons',()=>{
 for(const invalid of [
  pepsi({expiresAt:'2026-11-05T00:00:00.000Z'}),
  pepsi({verifiedAt:'2026-10-01T00:00:00.000Z'}),
  pepsi({reviewStatus:'unreviewed'})
 ]){
  assert.equal(assessCouponStoreRoute(invalid,'walmart-in-store',NOW).status,'unavailable');
 }
});

test('a rebate is not a checkout discount or redeemed savings',()=>{
 const result=assessCouponStoreRoute(pepsi({redemption:'rebate'}),'walmart-in-store',NOW);
 assert.equal(result.status,'post_purchase_only');
 assert.equal(result.isConfirmedSavings,false);
 assert.equal(result.canAutoApply,false);
});

test('unrecognized checkout routes fail closed',()=>{
 const result=assessCouponStoreRoute(pepsi(),'made-up-register',NOW);
 assert.equal(result.status,'unsupported_route');
 assert.equal(result.canAutoApply,false);
});
