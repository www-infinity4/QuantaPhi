import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EBAY_TOPICS,EBAY_REPORTED_TRENDS,EBAY_TREND_SOURCE,
 ebayQuantCards,preferredEbayTopics,ebaySearchUrl,safeEbayListingUrl,
 safeEbayImageUrl,normalizeEbayItem,normalizeEbayFeed,ebayBidDraft,ebayAccountViews} from '../ebay-quick-cards-core.mjs';
import {ebayQuickCardsAPI} from '../workers/quantaphi-site/ebay-api.mjs';
const sample={
 itemId:'v1|123|0',itemWebUrl:'https://www.ebay.com/itm/176734829110?var=1',
 title:'Morgan silver dollar',buyingOptions:['AUCTION'],
 image:{imageUrl:'https://i.ebayimg.com/images/g/test/s-l1600.jpg'},
 currentBidPrice:{currency:'USD',value:'72.50'},bidCount:13,
 itemEndDate:'2026-11-03T19:00:00.000Z',
 seller:{username:'actual_seller'},condition:'Used'
};
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('stable shopping topics cover multiple catalog families and signed-in Quant scoring',()=>{
 assert.ok(EBAY_TOPICS.length>=7);
 const quant=ebayQuantCards();
 assert.equal(quant.length,EBAY_TOPICS.length);
 const prioritized=preferredEbayTopics({'ebay-topic-radio':70,'ebay-topic-coins':20},2);
 assert.deepEqual(prioritized.map(x=>x.id),['radio','coins']);
 assert.equal(preferredEbayTopics({},1)[0].id,'coins');
 assert.match(EBAY_TREND_SOURCE,/ebay\.com/);
 assert.ok(EBAY_REPORTED_TRENDS.every(x=>x.source.includes('2026')));
});
test('listing URLs are bounded to original eBay items; photos to eBay image CDN',()=>{
 assert.match(safeEbayListingUrl(sample.itemWebUrl),/www\.ebay\.com\/itm/);
 for(const bad of ['http://www.ebay.com/itm/1','https://ebay.com.evil.test/itm/1',
  'https://www.ebay.com/sch/i.html','javascript:alert(1)','https://user@ebay.com/itm/1'])
  assert.equal(safeEbayListingUrl(bad),'',bad);
 for(const bad of ['https://evil.test/photo.png','http://i.ebayimg.com/a.png','https://i.ebayimg.com.evil.test/p.png'])
  assert.equal(safeEbayImageUrl(bad),'',bad);
 assert.equal(safeEbayImageUrl(sample.image.imageUrl),sample.image.imageUrl);
 const original=new URL(ebaySearchUrl('Morgan coins & currency','auction'));
 assert.equal(original.searchParams.get('_nkw'),'Morgan coins & currency');
 assert.equal(original.searchParams.get('LH_Auction'),'1');
 assert.equal(new URL(ebaySearchUrl('repair supplies','buy')).searchParams.get('LH_BIN'),'1');
});
test('auction and fixed price modes refuse wrong buying options and do not make up bids',()=>{
 const item=normalizeEbayItem(sample,'auction');
 assert.equal(item.bidCount,13);
 assert.equal(item.price,'$72.50');
 assert.equal(item.seller,'actual_seller');
 assert.equal(item.ends,sample.itemEndDate);
 assert.equal(normalizeEbayItem(sample,'buy'),null);
 const fixed=normalizeEbayItem({...sample,buyingOptions:['FIXED_PRICE'],price:{currency:'USD',value:'29.99'},bidCount:undefined},'buy');
 assert.equal(fixed.price,'$29.99');
 assert.equal(fixed.bidCount,null);
 assert.equal(normalizeEbayItem({...sample,itemWebUrl:'https://attacker.example/itm/2'},'auction'),null);
 assert.equal(normalizeEbayItem({...sample,image:{imageUrl:'https://attacker.example/img'}},'auction').image,'');
 const list=normalizeEbayFeed({itemSummaries:[sample,sample,{...sample,itemWebUrl:'https://phishing.test/itm/8'}]},'auction');
 assert.equal(list.length,1);
});
test('edge returns clear not-configured and rejects unsupported methods, filters and offsets',async()=>{
 const base='https://quantaphi.org/api/ebay/quick-cards?mode=auction&q=morgan';
 assert.equal((await (await ebayQuickCardsAPI(new Request(base),{})).json()).error,'ebay_browse_not_configured');
 const env={EBAY_CLIENT_ID:'fixture',EBAY_CLIENT_SECRET:'fixture_secret'};
 assert.equal((await ebayQuickCardsAPI(new Request(base,{method:'POST'}),env)).status,405);
 assert.equal((await ebayQuickCardsAPI(new Request(base.replace('mode=auction','mode=unsafe')),env)).status,400);
 assert.equal((await ebayQuickCardsAPI(new Request(base+'&offset=-20'),env)).status,400);
});
test('edge token is server-only and uses bid-count, auction and ending-soonest controls',async()=>{
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url:String(url),options});
  if(String(url).includes('oauth2/token'))return {ok:true,json:async()=>({access_token:'server_fixture_token',expires_in:3600})};
  return {ok:true,json:async()=>({itemSummaries:[sample],total:45})};
 };
 const env={EBAY_CLIENT_ID:'fixture_client',EBAY_CLIENT_SECRET:'fixture_secret'};
 const base='https://quantaphi.org/api/ebay/quick-cards?mode=auction&q=old%20radios';
 const result=await ebayQuickCardsAPI(new Request(base),env,{fetcher});
 assert.equal(result.status,200);
 const data=await result.json();
 assert.equal(data.ok,true);
 assert.equal(data.provider,'eBay Browse API');
 assert.equal(data.itemSummaries.length,1);
 const search=calls.find(x=>x.url.includes('item_summary/search'));
 assert.ok(search);
 const u=new URL(search.url);
 assert.equal(u.searchParams.get('sort'),'endingSoonest');
 assert.match(u.searchParams.get('filter'),/bidCount/);
 assert.match(u.searchParams.get('filter'),/AUCTION/);
 assert.equal(search.options.headers.Authorization,'Bearer server_fixture_token');
 assert.ok(!JSON.stringify(data).includes('fixture_secret'));
});
test('homepage and edge references are wired to the same endpoint and no private bidding is claimed',()=>{
 const html=read('index.html'),edge=read('workers/quantaphi-site/worker.js'),app=read('ebay-quick-cards.mjs');
 assert.match(html,/id="ebayQuickCards"/);
 assert.match(html,/ebay-quick-cards\.css/);
 assert.match(html,/ebay-quick-cards\.mjs/);
 assert.match(edge,/ebayQuickCardsAPI\(request,env\)/);
 assert.match(app,/loadOwnQuantScores/);
 assert.match(app,/fetchLiveSourceResults/);
 assert.match(app,/Open eBay to bid/);
 assert.doesNotMatch(app,/placeProxyBid|place_proxy_bid|EBAY_CLIENT_SECRET/);
});

test('bid review uses verified seller currency and never claims an offsite bid is placed',()=>{
 const item=normalizeEbayItem(sample,'auction');
 assert.equal(item.canBid,true);
 assert.equal(item.bidCurrency,'USD');
 assert.equal(item.currentBidValue,72.5);
 assert.equal(ebayBidDraft(item,'74.00').ok,true);
 assert.equal(ebayBidDraft(item,'72.50').ok,false);
 assert.equal(ebayBidDraft(item,'not a price').ok,false);
 assert.equal(ebayBidDraft(item,'10000000000').ok,false);
 assert.equal(ebayBidDraft(item,'74.009').ok,false);
 assert.equal(ebayBidDraft(item,'74.00').step,'provider_handoff');
 const intl=normalizeEbayItem({...sample,currentBidPrice:{currency:'GBP',value:'40.00'}},'auction');
 assert.equal(ebayBidDraft(intl,'41.00').ok,false,'No local max bid review for unsupported region');
});
test('buy now is offered on auctions only when eBay reports FIXED_PRICE as still available',()=>{
 const mixed=normalizeEbayItem({...sample,buyingOptions:['AUCTION','FIXED_PRICE'],price:{currency:'USD',value:'159.00'}},'auction');
 assert.equal(mixed.canBuyNow,true);
 assert.equal(mixed.canBid,true);
 assert.equal(mixed.buyNowPrice,'$159.00');
 assert.equal(normalizeEbayItem(sample,'auction').canBuyNow,false);
 assert.equal(normalizeEbayItem({...sample,buyingOptions:['FIXED_PRICE'],price:{currency:'USD',value:'21.00'}},'buy').canBuyNow,true);
});
test('My eBay navigation is an account-shaped UI, not a fabricated authenticated session',()=>{
 assert.deepEqual(ebayAccountViews.map(x=>x.id),['buying','bidding','selling','purchases']);
 const app=read('ebay-quick-cards.mjs'),css=read('ebay-quick-cards.css');
 for(const text of ['My eBay','Maximum bid','Continue on eBay','Get eBay account permission'])assert.ok(app.includes(text),text);
 assert.match(app,/eqc-my-ebay/);
 assert.match(app,/eqc-bid-review/);
 assert.match(app,/Not connected/);
 assert.match(app,/Get eBay account permission/);
 assert.match(css,/\.eqc-search button/);
 assert.match(css,/#3665f3/);
 assert.match(css,/eqc-my-ebay/);
 assert.doesNotMatch(app,/place_proxy_bid|placeProxyBid|collectPassword|EBAY_CLIENT_SECRET/);
});
