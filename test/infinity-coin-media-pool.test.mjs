import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseYouTubeFeed,coinMediaRoute,mediaSearchUrl} from '../workers/quantaphi-site/coin-media-pool.mjs';
const feed='<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><yt:videoId>abcdefghijk</yt:videoId><title>A &amp; B</title><published>2026-10-30T01:02:03Z</published></entry><entry><yt:videoId>bad</yt:videoId><title>Bad</title><published>2026-01-01</published></entry></feed>';
test('feed parsing accepts only real video IDs and titles, decodes entities',()=>{
 assert.deepEqual(parseYouTubeFeed(feed,{kind:'music',name:'NPR Music'}),[{id:'abcdefghijk',kind:'music',title:'A & B',channel:'NPR Music',published:'2026-10-30T01:02:03Z'}]);
 assert.deepEqual(parseYouTubeFeed('<html>fake</html>',{kind:'music',name:'NPR Music'}),[]);
});
test('media endpoint limits source hosts, returns safe partial success and no invented playability',async()=>{
 const urls=[];
 const fetcher=async url=>{urls.push(url);return {ok:true,text:async()=>feed}};
 const response=await coinMediaRoute(new Request('https://quantaphi.org/api/infinity-coin-media?kind=music'),{fetcher});
 const data=await response.json();
 assert.equal(response.status,200);assert.equal(data.ok,true);assert.equal(data.count,1);
 assert.equal(data.items[0].channel,'NPR Music');
 assert.equal(urls.length,1);assert.ok(urls[0].startsWith('https://www.youtube.com/feeds/videos.xml?channel_id='));
 assert.equal(data.partial,false);
 assert.match(data.note,/Not a full YouTube search/);
});
test('film choices are verified editorial trailer records, not promised free full films',async()=>{
 const response=await coinMediaRoute(new Request('https://quantaphi.org/api/infinity-coin-media?kind=movies'),{fetcher:async()=>{throw Error('offline')}});
 const d=await response.json();
 assert.equal(d.items.length,2);assert.equal(d.partial,true);assert.equal(d.feedsAvailable,0);
 assert.ok(d.items.every(x=>x.channel==='Rotten Tomatoes Trailers'&&x.kind==='movies'));
 assert.equal(d.feedChannels,2);
 assert.match(mediaSearchUrl('sci fi horror','movies'),/youtube.com\/results\?search_query=/);
});
test('invalid kind and non-GET reject before source fetch',async()=>{
 assert.equal((await coinMediaRoute(new Request('https://quantaphi.org/api/infinity-coin-media?kind=wallet'))).status,400);
 assert.equal((await coinMediaRoute(new Request('https://quantaphi.org/api/infinity-coin-media',{method:'POST'}))).status,405);
});
test('a failed feed does not become an empty verified search result',async()=>{
 const res=await coinMediaRoute(new Request('https://quantaphi.org/api/infinity-coin-media?kind=music'),{fetcher:async()=>{throw Error('offline')}});
 const d=await res.json();assert.equal(d.partial,true);assert.equal(d.feedsAvailable,0);assert.equal(d.count,0);assert.equal(d.ok,true);
});
