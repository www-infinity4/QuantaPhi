import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MARKETPLACE_SOURCES,marketSearchLink,combineMarketplaceResults,searchMarketplaceListings} from '../quanta-marketplace-carousel.mjs';
import {liveSourceProfile,safeSourceResultUrl} from '../quanta-card-live-source.mjs';

test('one independent marketplace carousel contains eBay, Etsy, Mercari and Poshmark',()=>{
 assert.deepEqual(MARKETPLACE_SOURCES.map(x=>x.id),['ebay','etsy','mercari','poshmark']);
 for(const source of MARKETPLACE_SOURCES)assert.ok(liveSourceProfile(source.id),source.id);
 const view=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
 assert.match(view,/mountMarketplaceCarousel/);
 assert.match(view,/id==='ebay'/);
});

test('only actual first-party listing pages survive, never forged seller domains',()=>{
 const ok={
  ebay:'https://www.ebay.com/itm/18810001122',
  etsy:'https://www.etsy.com/listing/4486750515/example',
  mercari:'https://www.mercari.com/us/item/m10316477687/',
  poshmark:'https://poshmark.com/listing/Vintage-Radio-6085e36e7f80d21bc01bf587'
 };
 for(const [site,url] of Object.entries(ok)){
  const p=liveSourceProfile(site);
  assert.equal(safeSourceResultUrl(p,url),url);
  assert.equal(safeSourceResultUrl(p,'https://'+new URL(url).hostname+'.phish.test'+new URL(url).pathname),null);
  assert.equal(safeSourceResultUrl(p,url.replace('https:','http:')),null);
 }
 assert.equal(safeSourceResultUrl(liveSourceProfile('mercari'),'https://www.mercari.com/us/category/vintage-radios-1055/'),null);
 assert.equal(safeSourceResultUrl(liveSourceProfile('etsy'),'https://www.etsy.com/search?q=radio'),null);
});

test('one user query stays on legitimate original storefront search paths',()=>{
 const q='silver dollars & cameras';
 const ebay=marketSearchLink('ebay',q,'auction');
 assert.equal(new URL(ebay).hostname,'www.ebay.com');
 assert.equal(new URL(ebay).searchParams.get('LH_Auction'),'1');
 assert.equal(new URL(marketSearchLink('ebay',q,'buy_now')).searchParams.get('LH_BIN'),'1');
 assert.equal(new URL(marketSearchLink('etsy',q)).searchParams.get('q'),q);
 assert.equal(new URL(marketSearchLink('mercari',q)).hostname,'www.mercari.com');
 assert.equal(marketSearchLink('other',q),null);
 assert.equal(marketSearchLink('ebay',''),null);
});

test('comparison is fair across marketplaces and never fabricates price, images or auction types',()=>{
 const data={
  ebay:{items:[{title:'Coin A',url:'https://www.ebay.com/itm/100'},{title:'Coin B',url:'https://www.ebay.com/itm/200'}]},
  etsy:{items:[{title:'Coin C',url:'https://www.etsy.com/listing/123/coin-c'}]},
  mercari:{items:[{title:'Coin D',url:'https://www.mercari.com/us/item/m123/'}]}
 };
 const mixed=combineMarketplaceResults(data);
 assert.deepEqual(mixed.map(x=>x.providerId),['ebay','etsy','mercari','ebay']);
 assert.deepEqual(Object.keys(mixed[0]).sort(),['provider','providerId','snippet','title','url']);
 assert.ok(mixed.every(x=>!('price' in x)&&!('buyingOption' in x)&&!('image' in x)));
});

test('independent searches tolerate per-site outages without inventing results',async()=>{
 const calls=[];
 const fetcher=async url=>{
  const q=new URL(url).searchParams.get('q');
  calls.push(q);
  if(q.includes('etsy.com'))throw Error('etsy temporarily unavailable');
  if(q.includes('ebay.com'))return {ok:true,json:async()=>({results:[{title:'Verified eBay item',url:'https://www.ebay.com/itm/444'}]})};
  return {ok:true,json:async()=>({results:[{title:'Spoof',url:'https://phishing.test/us/item/55'}]})};
 };
 const result=await searchMarketplaceListings('old camera',{fetcher});
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].providerId,'ebay');
 assert.equal(result.status.etsy,'unavailable');
 assert.equal(result.status.mercari,'empty');
 assert.ok(calls.some(x=>x.startsWith('site:ebay.com/itm')));
 assert.ok(calls.some(x=>x.startsWith('site:etsy.com/listing')));
 assert.ok(calls.some(x=>x.startsWith('site:mercari.com/us/item')));
 assert.equal(result.checkoutConnected,false);
});
