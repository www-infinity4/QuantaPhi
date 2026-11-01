import test from 'node:test';import assert from 'node:assert/strict';
import {planShoppingIntent,compareFulfillmentQuotes} from '../design-lab/cooperative-power-chain.mjs';
const offers=Array.from({length:10},(_,i)=>({merchantId:'store-'+Math.floor(i/3),sku:'sku-'+i,quantity:1,unitCents:7500,sourceUrl:'https://merchant.example/items/'+i,priceQuoteRef:'price-'+i,merchantVerified:true}));
const stores=[...new Set(offers.map(x=>x.merchantId))];
const directShipments=stores.map(id=>({merchantId:id,shippingCents:1200,taxCents:500,quoteRef:'direct-'+id,verified:true}));
const co={hubAvailable:true,hubAgreementVerified:true,hubAgreementRef:'verified-hub-agreement',approvedMerchantIds:stores,
 inbound:stores.map(id=>({merchantId:id,freightCents:650,quoteRef:'inbound-'+id,verified:true})),
 outboundCents:1400,handlingCents:600,packingCents:250,storageCents:200,taxCents:2000,outboundQuoteRef:'outbound-quote'};
test('gift intent retains only explicit voluntary interests and never buys',()=>{
 const p=planShoppingIntent({purpose:'gift',budget:'1000.00',itemCount:10,maxMerchants:4,recipientInterests:['painting','nature','painting']});
 assert.equal(p.budgetCents,100000);assert.equal(p.itemCount,10);assert.deepEqual(p.recipientPreferences,['painting','nature']);
 assert.equal(p.ordersPlaced,0);assert.equal(p.recipientDataStored,false);assert.equal(p.hubAssigned,false);
 assert.equal(p.phases.length,4);
});
test('monthly supplies plan supports $10k, up to 100 merchants without claiming consolidated freight',()=>{
 const p=planShoppingIntent({purpose:'monthly-supplies',budget:'10000.00',itemCount:100,maxMerchants:100});
 assert.equal(p.budgetCents,1000000);assert.equal(p.maxMerchants,100);assert.equal(p.purchaseAuthorized,false);
 assert.throws(()=>planShoppingIntent({purpose:'gift',budget:'-5',itemCount:10,maxMerchants:4}),RangeError);
 assert.throws(()=>planShoppingIntent({purpose:'gift',budget:'100',itemCount:2,maxMerchants:4}),RangeError);
});
test('illustrative verified quotes reconcile actual goods/direct/warehouse landed costs',()=>{
 const r=compareFulfillmentQuotes({lines:offers,directShipments,consolidation:co,budgetCents:100000});
 assert.equal(r.itemCount,10);assert.equal(r.merchantCount,4);
 assert.equal(r.goodsCents,75000);
 assert.equal(r.direct.totalCents,81800);
 assert.equal(r.cooperative.totalCents,82050);
 assert.equal(r.comparison.deltaCents,250);
 assert.equal(r.comparison.lessExpensive,'direct');
 assert.equal(r.budget.directWithinBudget,true);
 assert.equal(r.ordersPlaced,0);assert.equal(r.shippingEnvironmentalStatus,'not_measured');
});
test('a warehouse without contracts for every store is NEVER displayed as ready',()=>{
 const r=compareFulfillmentQuotes({lines:offers,directShipments,consolidation:{...co,approvedMerchantIds:stores.slice(1)}});
 assert.equal(r.cooperative,null);assert.equal(r.direct.shipmentCount,4);
 assert.ok(r.missing.includes('signed_hub_and_complete_inbound_outbound_quotes_required'));
});
test('missing or unverified direct quotes do not become fake delivery prices',()=>{
 const bad=directShipments.map((x,i)=>i?x:{...x,verified:false});
 const r=compareFulfillmentQuotes({lines:offers,directShipments:bad,consolidation:null,budgetCents:100000});
 assert.equal(r.direct,null);assert.equal(r.comparison,null);assert.equal(r.budget.directWithinBudget,null);
});
test('unsafe offers, duplicate SKU, bad prices and arbitrary host claims are rejected',()=>{
 assert.throws(()=>compareFulfillmentQuotes({lines:[{...offers[0],sourceUrl:'javascript:alert(1)'}]}),/Missing verified/);
 assert.throws(()=>compareFulfillmentQuotes({lines:[offers[0],offers[0]]}),/duplicated/);
 assert.throws(()=>compareFulfillmentQuotes({lines:[{...offers[0],unitCents:-1}]}),/Missing verified/);
});
test('source modules have no network/payment or wallet operations',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../design-lab/cooperative-power-chain.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/fetch\(|localStorage|sessionStorage|document\.cookie|wallet|sendBeacon|chargePayment|placeOrder/);
 const html=readFileSync(new URL('../design-lab/index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../design-lab/cooperative-ui.mjs',import.meta.url),'utf8');
 assert.match(html,/id="cooperativeIntentForm"/);
 assert.match(html,/cooperative-ui\.mjs/);
 assert.match(ui,/planShoppingIntent/);
 assert.match(ui,/autoWire/);
});
