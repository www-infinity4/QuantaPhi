import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePartnerProducts,partnerApproved,readPublishedProducts,refreshFromApprovedFeed,default as worker} from '../workers/shoplc-ad-feed/worker.mjs';
const now=Date.UTC(2026,10,8,1,0);
const ring=(code='8620442')=>({itemId:'product:'+code,productCode:code,title:'10K Yellow Gold Usambara Garnet Ring '+code,href:'https://www.shoplc.com/products/official-garnet-ring?variant='+code,image:'https://cdn.shopify.com/s/files/1/shoplc/'+code+'.jpg',price:'1649.99',currency:'USD',category:'ring',available:true,expiresAt:now+720000});
const goodEnv={SHOPLC_PARTNER_APPROVED:'yes',SHOPLC_PRODUCT_FEED_APPROVED:'yes',SHOPLC_MEDIA_LICENSE_APPROVED:'yes',SHOPLC_APPROVAL_REFERENCE:'SHOPLC-approved-contract-ref'};
test('no image or feed rights means no public products, even with a populated database',async()=>{
 assert.equal(partnerApproved({...goodEnv,SHOPLC_MEDIA_LICENSE_APPROVED:''}),false);
 const result=await readPublishedProducts({...goodEnv,SHOPLC_PARTNER_APPROVED:'no',DB:{}},now);
 assert.equal(result.status,503);assert.deepEqual((await result.json()).items,[]);
 const response=await worker.fetch(new Request('https://quantaphi.org/api/shoplc/authorized-sale-feed'),{...goodEnv,SHOPLC_PRODUCT_FEED_APPROVED:'',DB:{}});
 assert.equal(response.status,503);
});
test('rejects spoofed merchant URLs, bad images, stale expiry and unknown product identities',()=>{
 const payload=[ring(),ring('8620443'),{...ring('8620444'),href:'https://shoplc.evil.example/products/x'}, {...ring('8620445'),image:'https://tracking.example/asset.jpg'}, {...ring('8620446'),expiresAt:now-1}, {...ring('8620447'),itemId:'bad'}];
 const items=normalizePartnerProducts(payload,now);
 assert.equal(items.length,2);assert.deepEqual(items.map(x=>x.id),['product:8620442','product:8620443']);
 assert.equal(items[0].price,1649.99);assert.ok(items[0].expiresAt<=now+900000);
});
test('scheduled refresh does not fetch or store without merchant approval',async()=>{
 let requests=0;
 const result=await refreshFromApprovedFeed({...goodEnv,SHOPLC_PARTNER_APPROVED:'',DB:{}},now,async()=>{requests++;throw Error('should not fetch')});
 assert.equal(result.ok,false);assert.equal(requests,0);
});
test('approved feed refresh rejects untrusted redirects and bad host before D1 writes',async()=>{
 let writes=0;
 const db={prepare(){writes++;throw Error('should not write')}};
 const r=await refreshFromApprovedFeed({...goodEnv,SHOPLC_PARTNER_FEED_URL:'https://malicious.example/feed',SHOPLC_PARTNER_FEED_HOST:'api.partnerize.com',DB:db},now);
 assert.equal(r.ok,false);assert.equal(writes,0);
});
test('approved valid feed stores deterministic, current, deduplicated records in a D1 batch',async()=>{
 const statements=[];
 const db={prepare(sql){return {bind(...args){return {sql,args}}}},async batch(rows){statements.push(...rows);return rows.map(()=>({success:true}))}};
 const env={...goodEnv,SHOPLC_PARTNER_FEED_URL:'https://api.partnerize.com/approved-shoplc-feed',SHOPLC_PARTNER_FEED_HOST:'api.partnerize.com',SHOPLC_PARTNER_FEED_TOKEN:'test-token-not-for-browser',DB:db};
 let options;
 const result=await refreshFromApprovedFeed(env,now,async(url,opts)=>{options=opts;return {ok:true,status:200,headers:new Headers(),text:async()=>JSON.stringify({items:[ring(),ring(),ring('8620443')]})}});
 assert.equal(result.ok,true);assert.equal(result.count,2);
 assert.equal(options.redirect,'manual');
 assert.equal(options.headers.Authorization,'Bearer test-token-not-for-browser');
 assert.ok(statements.some(x=>/INSERT INTO shoplc_ads/.test(x.sql)));
 assert.ok(statements.some(x=>/DELETE FROM shoplc_ads/.test(x.sql)));
 assert.equal(JSON.stringify(statements).includes('test-token-not-for-browser'),false);
});
test('fresh DB records are served only with a recent successful sync, no purchase or user identity',async()=>{
 const db={prepare(sql){return {bind(...args){return {async first(){return {synced_at:now}},async all(){return {results:[{...ring(),id:'product:8620442',checked_at:now,expires_at:now+720000}]}}}}}}};
 const r=await readPublishedProducts({...goodEnv,DB:db},now);
 assert.equal(r.status,200);const data=await r.json();
 assert.equal(data.rights.productImagesApproved,true);
 assert.equal(data.items[0].itemId,'product:8620442');
 assert.equal(data.items[0].purchaseVerified,false);
 assert.equal(JSON.stringify(data).includes('PARTNER_FEED_TOKEN'),false);
});
