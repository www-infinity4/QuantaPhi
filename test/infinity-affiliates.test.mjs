import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {INFINITY_ACCEPTED_BRANDS,acceptedBrand} from '../infinity-accepted-catalog.mjs';
import {safePublicUrl,acceptedBrandById,productMatchesBrand,findAcceptedBrandForProduct,
 validateAffiliateRequest,affiliateIssueUrl,groupApprovedBrands} from '../infinity-affiliates-core.mjs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const brand=acceptedBrand('durable-framework-computers');
const example={
 kind:'product-affiliation',brandId:brand.id,productTitle:'Framework modular laptop components',
 productUrl:'https://frame.work/marketplace/parts',relation:'publisher',publisherUrl:'https://example.com/',
 rationale:'I propose to publish useful original repair guides and manufacturer links.',
 consent:true
};
test('brand matching uses the existing curated catalog and never approves arbitrary product URLs',()=>{
 assert.ok(INFINITY_ACCEPTED_BRANDS.length>=100);
 assert.equal(acceptedBrandById(brand.id).id,brand.id);
 assert.equal(findAcceptedBrandForProduct('https://frame.work/marketplace/parts')?.id,brand.id);
 assert.equal(findAcceptedBrandForProduct('https://www.frame.work/products/a')?.id,brand.id);
 assert.equal(findAcceptedBrandForProduct('https://evil.example/parts'),null);
 assert.ok(productMatchesBrand('https://shop.frame.work/parts',brand));
 assert.ok(!productMatchesBrand('https://frame.work.evil.example/shop',brand));
 assert.ok(!productMatchesBrand('https://fakeframe.work/parts',brand));
 assert.ok(!productMatchesBrand('https://not-frame.work/parts',brand));
 assert.ok(!safePublicUrl('javascript:alert(1)'));
 assert.ok(!safePublicUrl('http://frame.work/model'));
 assert.ok(!safePublicUrl('https://user:password@frame.work/'));
 assert.ok(!safePublicUrl('https://localhost/'));
 assert.ok(!safePublicUrl('https://frame.work:8443/'));
});
test('validated affiliation request produces truthful pending issue, never an approved affiliate',()=>{
 const valid=validateAffiliateRequest(example);assert.ok(valid.ok,valid.error);
 assert.equal(valid.request.brandAccepted,true);
 const u=new URL(affiliateIssueUrl(valid.request)),body=u.searchParams.get('body');
 assert.equal(u.hostname,'github.com');
 assert.equal(u.pathname,'/www-infinity4/QuantaPhi/issues/new');
 assert.match(body,/Infinity Accepted brand · PRODUCT NOT REVIEWED/);
 assert.match(body,/affiliate-program approval verified/);
 assert.match(body,/Original product URL|Official product URL/);
 assert.match(body,/Do not post passwords/);
 assert.match(u.searchParams.get('title'),/Infinity Affiliates/);
});
test('unapproved manufacturers require a separate nomination, not automatic Infinity approval',()=>{
 let req={...example,brandId:'',newBrandName:'Levi\'s',productUrl:'https://www.levi.com/US/en_US/p/501'};
 assert.equal(validateAffiliateRequest(req).ok,false);
 const proposed=validateAffiliateRequest({...req,kind:'brand-nomination'});
 assert.ok(proposed.ok,proposed.error);
 assert.equal(proposed.request.brandAccepted,false);
 assert.match(affiliateIssueUrl(proposed.request),/new\+brand\+nomination|brand-nomination/);
 assert.match(new URL(affiliateIssueUrl(proposed.request)).searchParams.get('body'),/NOT YET ACCEPTED/);
});
test('validation blocks wrong domains, missing consent, invalid rationale, and unapproved roles',()=>{
 for(const change of [
 {productUrl:'https://frame.work.evil.example/parts'},
 {productUrl:'https://frame.work@evil.example/parts'},
 {consent:false},{rationale:'too short'},{productTitle:'A'},
 {relation:'admin'},{kind:'promote-and-pay-me'},{publisherUrl:'http://example.org'}
 ]){const v=validateAffiliateRequest({...example,...change});assert.equal(v.ok,false,JSON.stringify(change));}
});
test('only approved catalog terms appear in matching, and filtering is stable',()=>{
 const arr=groupApprovedBrands('Framework',30);assert.ok(arr.some(x=>x.id===brand.id));
 assert.ok(groupApprovedBrands('',30).length>0);
});
test('original Oracle and Bubbles cards expose real review action without pretending commissions',()=>{
 const html=src('index.html'),deck=src('oracle-card-deck.js'),cat=src('bubbles-card-catalog.mjs');
 const cards=src('infinity-accepted-cards.mjs'),products=src('brand-product-cards.mjs'),ui=src('infinity-affiliates-card.mjs');
 assert.match(html,/id="infinityAffiliates"/);
 assert.match(html,/infinity-affiliates-card\.mjs/);
 assert.match(deck,/infinityAffiliates:\['infinity-affiliates'/);
 assert.match(cat,/app\('infinity-affiliates'/);
 assert.match(cards,/Request affiliate product/);
 assert.match(products,/Request Infinity affiliate review/);
 assert.match(ui,/Public GitHub review request|public GitHub review request/);
 assert.match(ui,/Save private draft/);
 assert.match(ui,/Continue to GitHub and submit/);
 assert.doesNotMatch(ui,/\bfetch\(['"]https?:\/\/.*api\/affiliate/);
});
