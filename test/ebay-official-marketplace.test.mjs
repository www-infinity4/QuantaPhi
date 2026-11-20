import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchMarketplaceListings} from '../quanta-marketplace-carousel.mjs';
import {ebayQuickCardsAPI} from '../workers/quantaphi-site/ebay-api.mjs';

const officialItem={
 itemId:'v1|111111111|0',
 itemWebUrl:'https://www.ebay.com/itm/111111111',
 title:'Test vintage radio',
 buyingOptions:['FIXED_PRICE'],
 price:{value:'38.50',currency:'USD'},
 image:{imageUrl:'https://i.ebayimg.com/images/g/test/s-l1600.jpg'},
 seller:{username:'verified_seller'},
 shippingOptions:[{shippingCost:{value:'0',currency:'USD'}}],
 condition:'Used'
};
const originalSearchResponse={results:[
 {title:'Indexed eBay item',url:'https://www.ebay.com/itm/1234'},
 {title:'Phishing item',url:'https://www.ebay.com.phish.example/itm/999'}
]};
function fakeShopFetch({browseConfigured=true}={}){
 return async url=>{
  const u=new URL(url);
  if(u.pathname==='/api/ebay/quick-cards'){
   if(!browseConfigured)return {ok:false,status:503,json:async()=>({ok:false,error:'ebay_browse_not_configured'})};
   return {ok:true,status:200,json:async()=>({ok:true,provider:'eBay Browse API',mode:'buy',fetchedAt:'2026-11-19T12:00:00Z',itemSummaries:[
    officialItem,
    {...officialItem,itemWebUrl:'https://eBay.com.phish.example/itm/2'},
    {...officialItem,itemId:'another',itemWebUrl:'https://www.ebay.com/itm/22',image:{imageUrl:'https://bad.example/item.png'}}
   ]})};
  }
  if(u.searchParams.get('q')?.includes('site:ebay.com/itm'))return {ok:true,json:async()=>originalSearchResponse};
  return {ok:true,json:async()=>({results:[]})};
 };
}
test('official eBay Browse records retain provenance and seller price/photo in the existing mixed marketplace carousel',async()=>{
 const data=await searchMarketplaceListings('vintage radio',{fetcher:fakeShopFetch()});
 const item=data.items.find(x=>x.providerId==='ebay'&&x.url==='https://www.ebay.com/itm/111111111');
 assert.ok(item,'official eBay item should be present');
 assert.equal(item.price,'$38.50');
 assert.equal(item.image,'https://i.ebayimg.com/images/g/test/s-l1600.jpg');
 assert.equal(item.seller,'verified_seller');
 assert.equal(item.shipping,'Free shipping');
 assert.equal(item.verifiedBy,'eBay Browse API');
 assert.equal(item.checkoutConnected,false);
 assert.ok(!data.items.some(x=>/phish.example/.test(x.url)));
 assert.ok(!data.items.some(x=>x.image?.includes('bad.example')));
 assert.equal(data.checkoutConnected,false);
});
test('missing eBay developer credentials fall back to indexed official links without invented prices or photos',async()=>{
 const data=await searchMarketplaceListings('vintage radio',{fetcher:fakeShopFetch({browseConfigured:false})});
 const item=data.items.find(x=>x.providerId==='ebay');
 assert.ok(item);
 assert.equal(item.url,'https://www.ebay.com/itm/1234');
 assert.equal(item.price,undefined);
 assert.equal(item.image,undefined);
 assert.equal(data.checkoutConnected,false);
});
test('server eBay Browse route uses only app OAuth and returns no private account, payment or token state',async()=>{
 const calls=[];
 const fetcher=async (url,opts)=>{
  calls.push({url:String(url),opts});
  if(String(url).includes('/oauth2/token'))return {ok:true,json:async()=>({access_token:'PRIVATE_TEST_TOKEN',expires_in:3600})};
  return {ok:true,json:async()=>({itemSummaries:[officialItem],total:1})};
 };
 const env={EBAY_CLIENT_ID:'TEST_CLIENT_ID',EBAY_CLIENT_SECRET:'TEST_SECRET'};
 const result=await ebayQuickCardsAPI(new Request('https://quantaphi.org/api/ebay/quick-cards?mode=buy&q=vintage+radio'),env,{fetcher});
 assert.equal(result.status,200);
 const body=await result.json();
 assert.equal(body.provider,'eBay Browse API');
 assert.equal(body.itemSummaries.length,1);
 assert.ok(calls.some(x=>x.url.includes('/identity/v1/oauth2/token')));
 assert.ok(calls.some(x=>x.url.includes('/buy/browse/v1/item_summary/search')));
 assert.equal(JSON.stringify(body).includes('PRIVATE_TEST_TOKEN'),false);
 assert.equal(JSON.stringify(body).includes('TEST_SECRET'),false);
 const invalid=await ebayQuickCardsAPI(new Request('https://quantaphi.org/api/ebay/quick-cards?mode=buy&q=%00'),env,{fetcher});
 assert.equal(invalid.status,400);
 const unconfigured=await ebayQuickCardsAPI(new Request('https://quantaphi.org/api/ebay/quick-cards?mode=buy&q=radio'),{},{fetcher});
 assert.equal(unconfigured.status,503);
});
test('original eBay card, not a duplicate top-level deck, renders real seller evidence and honest checkout handoff',()=>{
 const app=readFileSync(new URL('../quanta-marketplace-carousel.mjs',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../workers/quantaphi-site/worker.js',import.meta.url),'utf8');
 assert.match(app,/Verified eBay|eBay Browse API|verifiedBy/);
 assert.match(app,/price/);
 assert.match(app,/image/);
 assert.match(app,/Buy on eBay|Open on eBay/);
 assert.match(worker,/\/api\/ebay\/quick-cards/);
 assert.doesNotMatch(app,/place_order|placeOrder\(|checkout_session/);
});
