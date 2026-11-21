import test from 'node:test';
import assert from 'node:assert/strict';
import {liveSourceProfile,safeSourceResultUrl,verifiedSourceRows,sourceBrokerUrl,fetchLiveSourceResults} from '../quanta-card-live-source.mjs';

const listing='https://www.ebay.com/itm/176734829110';
test('live profiles cover existing marketplace, news and grading cards only',()=>{
 for(const id of ['ebay','vintage-toys','antique-collectibles','us-mint','pcgs','ngc','cnn','fox-news','yahoo-news'])
  assert.ok(liveSourceProfile(id),id);
 assert.equal(liveSourceProfile('fake-ebay'),null);
 assert.equal(liveSourceProfile('__proto__'),null);
});

test('domain isolation blocks phishing, HTTPS downgrades, credentials, ports, and non-listings',()=>{
 const p=liveSourceProfile('ebay');
 assert.equal(safeSourceResultUrl(p,listing),listing);
 for(const u of ['https://ebay.com.attack.example/itm/8','https://fake-ebay.com/itm/8',
  'http://www.ebay.com/itm/8','https://user:pass@ebay.com/itm/8',
  'https://www.ebay.com:8080/itm/8','javascript:alert(1)',
  'https://www.ebay.com/sch/i.html?_nkw=coins']){
  assert.equal(safeSourceResultUrl(p,u),null,u);
 }
});

test('only attributed matching original-source result rows survive',()=>{
 const rows=verifiedSourceRows(liveSourceProfile('ebay'),{results:[
  {title:'1881 Morgan Dollar - actual listing',url:listing,content:'Public snippet, seller must verify.'},
  {title:'Duplicated',url:listing},
  {title:'Payment bypass',url:'https://ebay.com.login-pay.test/itm/8'},
  {title:'No source',url:'https://example.net/itm/9'},
  {title:'eBay search page, not a specific listing',url:'https://ebay.com/sch/i.html'},
  {title:'Bad HTML <script>',url:'https://www.ebay.com/itm/176734829111',content:'<img onerror=alert(1)>'}
 ]});
 assert.equal(rows.length,2);
 assert.equal(rows[0].url,listing);
 assert.match(rows[1].snippet,/onerror/); // Renderer uses textContent, never innerHTML.
});

test('broker searches only the fixed site; user query is encoded and bounded',()=>{
 const url=new URL(sourceBrokerUrl('ebay','Morgan dollars & parts'));
 assert.equal(url.origin,'https://orange-brook-a2ac.marvaseater.workers.dev');
 assert.equal(url.searchParams.get('q'),'site:ebay.com/itm Morgan dollars & parts');
 assert.equal(url.searchParams.get('engines'),'google');
 assert.equal(sourceBrokerUrl('unknown','silver'),null);
 assert.equal(sourceBrokerUrl('ebay',''),null);
});

test('public source broker falls back, but never passes off unrelated search results as retailer items',async()=>{
 const urls=[];let count=0;
 const fetcher=async (url,options)=>{
  urls.push(url);count++;
  assert.equal(options.credentials,'omit');
  assert.equal(options.cache,'no-store');
  return {ok:true,json:async()=>({results: count===1?
   [{title:'Spoofed eBay',url:'https://example.org/itm/123'}]:
   [{title:'Original coin listing',url:listing,snippet:'Public item page'}]})};
 };
 const data=await fetchLiveSourceResults('ebay','morgan coins',fetcher);
 assert.equal(count,2);assert.equal(data.items.length,1);
 assert.equal(data.items[0].title,'Original coin listing');
 assert.match(urls[0],/engines=google/);
 assert.doesNotMatch(urls[1],/engines=/);
 assert.equal(data.method,'independent web search');
});

test('upstream failure never turns into fabricated inventory or headlines',async()=>{
 await assert.rejects(fetchLiveSourceResults('fox-news','politics',async()=>{throw Error('offline')}),/source_results_unavailable/);
 const empty=await fetchLiveSourceResults('cnn','politics',async()=>({ok:true,json:async()=>({results:[{title:'Not CNN',url:'https://somewhere.test/'}]})}));
 assert.deepEqual(empty.items,[]);
});
