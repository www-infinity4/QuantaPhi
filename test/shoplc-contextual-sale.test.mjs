import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeShopLcItem,chooseShopLcPlacement,eligibleShopLcPlacements,safeShopLcUrl} from '../shoplc-contextual-sale.mjs';

const ring={ok:true,itemId:'product:8620442',productCode:'8620442',
 title:'10K Yellow Gold AAA Usambara Color Change Garnet Ring',
 href:'https://www.shoplc.com/products/usambara-garnet-ring?variant=123',
 image:'https://cdn.shopify.com/s/files/1/0000/ring.jpg',price:'1649.99',
 currency:'USD',category:'ring'};
const at=Date.UTC(2026,10,7,23,0,0);

test('accept a freshly fetched official product, preserving actual SKU, amount and origin',()=>{
 const item=normalizeShopLcItem(ring,at);
 assert.equal(item.id,'product:8620442');
 assert.equal(item.price,1649.99);
 assert.equal(item.checkedAt,at);
 assert.match(item.href,/shoplc\.com\/products\//);
 assert.equal(item.purchaseVerified,false);
});

test('reject missing or mismatched identities, unsafe destinations and misleading generic current listings',()=>{
 assert.equal(normalizeShopLcItem({...ring,itemId:'product:other'},at),null);
 assert.equal(normalizeShopLcItem({...ring,href:'https://bad-shoplc.example/products/ring'},at),null);
 assert.equal(normalizeShopLcItem({...ring,href:'https://www.shoplc.com/search?q=8620442'},at),null);
 assert.equal(normalizeShopLcItem({...ring,image:'https://tracking.example/ring.jpg'},at),null);
 assert.equal(normalizeShopLcItem({...ring,title:'Shop LC item 8620442'},at),null);
 assert.equal(normalizeShopLcItem({...ring,ok:false},at),null);
 assert.equal(safeShopLcUrl('javascript:alert(1)'),false);
});

test('jewelry matching needs actual jewelry intent; generic shopping and entertainment never get a ring ad',()=>{
 const item=normalizeShopLcItem(ring,at);
 assert.equal(chooseShopLcPlacement([item],{category:'Jewelry',title:'Diamond rings'},{}).id,item.id);
 assert.equal(chooseShopLcPlacement([item],{category:'Shopping',title:'Shop Phi'},{}),null);
 assert.equal(chooseShopLcPlacement([item],{category:'Television',title:'Infinity Radio'},{}),null);
 assert.equal(chooseShopLcPlacement([item],{sourceId:'shoplc-premium',category:'Shopping'},{}).id,item.id);
});

test('Not for me and explicit no ads take precedence over contextual relevance',()=>{
 const item=normalizeShopLcItem(ring,at);
 const context={category:'Jewelry',title:'Garnet rings'};
 assert.equal(chooseShopLcPlacement([item],context,{hideShopLc:true}),null);
 assert.equal(chooseShopLcPlacement([item],context,{hideAllCommercials:true}),null);
 assert.equal(chooseShopLcPlacement([item],context,{hideShopLc:false})?.id,item.id);
});

test('selected contextual promotion has no wallet mutation, identity targeting, or scripted purchase',()=>{
 const script=readFileSync(new URL('../shoplc-contextual-sale.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(script,/\/v1\/shoplc\/rewards|localShareCredit|starquest_users|document\.cookie/);
 assert.match(script,/quantaphi:shoplc:hide-ads:v1/);
 assert.match(script,/Not for me/);
 assert.match(script,/Shop LC listing/);
});

test('public runtime requires approved merchant feed and image rights; no unauthorized scraping',()=>{
 const script=readFileSync(new URL('../shoplc-contextual-sale.mjs',import.meta.url),'utf8');
 assert.ok(script.includes("const SOURCE='/api/shoplc/authorized-sale-feed'"));
 assert.ok(script.includes('productFeedApproved!==true'));
 assert.ok(script.includes('productImagesApproved!==true'));
 assert.ok(script.includes('Date.now()-checkedAt>15*60000'));
 assert.ok(!script.includes('https://starquest-ledger.marvaseater.workers.dev'));
});

test('several licensed current rings remain eligible without flooding unrelated cards',()=>{
 const at=Date.UTC(2026,10,8,1,0);
 const first=normalizeShopLcItem({...ring,expiresAt:at+600000},at);
 const second=normalizeShopLcItem({...ring,productCode:'8620443',itemId:'product:8620443',title:'14K White Gold Fancy Diamond Ring',expiresAt:at+600000},at);
 const old=normalizeShopLcItem({...ring,productCode:'8620444',itemId:'product:8620444',title:'Old expired gold garnet ring',expiresAt:at-1},at);
 const shopping={category:'Fine Jewelry',title:'Explore gemstone rings'};
 assert.deepEqual(eligibleShopLcPlacements([first,second,old],shopping,{},at).map(x=>x.id),[first.id,second.id]);
 assert.equal(eligibleShopLcPlacements([first,second],{category:'TV',title:'Watch Shop LC'}, {},at).length,0);
 assert.equal(eligibleShopLcPlacements([first,second],shopping,{hideShopLc:true},at).length,0);
});
test('site worker serves only an approved bound service; no fallback to live TV scraping',()=>{
 const site=readFileSync(new URL('../workers/quantaphi-site/worker.js',import.meta.url),'utf8');
 assert.match(site,/incoming\.pathname==='\/api\/shoplc\/authorized-sale-feed'/);
 assert.match(site,/env\.SHOPLC_ADS\.fetch\(request\)/);
 assert.match(site,/shoplc_ads_service_not_configured/);
});
