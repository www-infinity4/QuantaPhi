import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {validSpaceLink, normalizeSpaceEntry, filterSpaceEntries, parseSpaceClipPostId} from '../x-spaces-quick-card.mjs';
import {readVerifiedLiveSpaces} from '../quanta-feed-spaces.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('X Spaces card accepts only canonical X Spaces links, not arbitrary URLs',()=>{
  assert.equal(validSpaceLink('https://x.com/i/spaces/1OyKAjYPeXqGb'),true);
  for(const bad of ['https://example.com/i/spaces/1OyKAjYPeXqGb','https://x.com/login','javascript:alert(1)','https://x.com@evil.com/i/spaces/1OyKAjYPeXqGb']){
    assert.equal(validSpaceLink(bad),false,bad);
  }
  const row=normalizeSpaceEntry({title:' My live discussion ',host:'TestHost',url:'https://x.com/i/spaces/1OyKAjYPeXqGb',status:'indexed'});
  assert.equal(row.host,'TestHost');
  assert.equal(row.state,'playback unverified');
  assert.equal(normalizeSpaceEntry({title:'bad',url:'https://example.com/'}),null);
});

test('X Spaces local search filters by topic and handle without manufacturing live status',()=>{
  const all=[
    normalizeSpaceEntry({title:'AI engineering',host:'Integrate',url:'https://x.com/i/spaces/1OyKAjYPeXqGb'}),
    normalizeSpaceEntry({title:'Country music',host:'MusicHost',url:'https://x.com/i/spaces/1daKzPaJQEeGX'})
  ];
  assert.equal(filterSpaceEntries(all,'AI').length,1);
  assert.equal(filterSpaceEntries(all,'@MusicHost')[0].host,'MusicHost');
  assert.equal(filterSpaceEntries(all,'unmatched').length,0);
});

test('QuantaPhi has dedicated Spaces quick card with manual source import and verified private index, not fake embeds',()=>{
 const js=read('x-spaces-quick-card.mjs'),html=read('index.html');
 assert.match(html,/id="xSpacesQuickCard"/);
 const oracle=read('oracle-card-deck.js');
 assert.match(oracle,/\['xSpacesQuickCard','Explore X Spaces'/);
 assert.match(oracle,/xSpacesQuickCard:\['x-spaces'/);
 assert.match(html,/src="\/x-spaces-quick-card.mjs\?/);
 assert.match(js,/readIndexedSpaces/);
 assert.match(js,/resolveDeviceToken/);
 assert.match(js,/Session-only/);
 assert.doesNotMatch(js,/<iframe|document.createElement\(['"]iframe|x.com\/i\/spaces\/\$\{/);
 assert.doesNotMatch(js,/api\.twitter\.com|api\.x\.com|auto.?charge|wallet.*mint/i);
 assert.match(js,/X controls Spaces playback/);
});

test('expanded station carousel has direct, first-party-published stream sources',()=>{
 const js=read('iowa-live-radio-cards.js');
 for(const station of ['KEXP','Jazz24','KNKX','WFMU','RadioMV English','RadioMV Español','RadioMV Deutsch','RadioMV Slavic']){
   assert.ok(js.includes(station),station);
 }
 for(const stream of ['kexp160.aac','6285_128k','6284_128k','freeform-128k','/stream/english.mp3','/stream/spanish.mp3','/stream/german.mp3','/stream/slavic.mp3']){
   assert.ok(js.includes(stream),stream);
 }
 assert.doesNotMatch(js,/ice[0-9]\.somafm|autoplay\s*=\s*true/i);
});

test('Spaces card has a live-source view and keeps audio status truthful',()=>{
 const source=read('x-spaces-quick-card.mjs');
 assert.match(read('quanta-feed-spaces.mjs'),/\/v1\/x\/spaces\/live/);
 assert.match(source,/Find live Spaces/);
 assert.match(source,/Listen here/);
 assert.doesNotMatch(source,/iframe\.src\s*=\s*chosen\.url|<iframe\s+src.*spaces/);
 assert.match(source,/Playback on this site is not available/);
});

test('live X Spaces search uses wallet authorization and rejects ended or fabricated sessions',async()=>{
 const token='sq_'+'t'.repeat(36);
 const urls=[];
 const fetcher=async (url,opts)=>{
  urls.push(String(url));
  assert.equal(opts.headers.Authorization,'Bearer '+token);
  return Response.json({source:'x_api_live',fetchedAt:'2026-11-06T21:00:00Z',spaces:[
   {state:'live',source:'x_api_live',title:'Genuine Space',creatorHandle:'ActualHost',url:'https://x.com/i/spaces/1OyKAjYPeXqGb'},
   {state:'ended',source:'x_api_live',title:'Ended',url:'https://x.com/i/spaces/1BRJjPRygqaKw'},
   {state:'live',source:'owner_import',title:'Unverified',url:'https://x.com/i/spaces/1BRJjPRygqaKw'}
  ]});
 };
 const live=await readVerifiedLiveSpaces({token,topic:'technology',fetcher});
 assert.equal(urls.length,1);
 assert.ok(urls[0].includes('/v1/x/spaces/live?q=technology'));
 assert.deepEqual(live.spaces.map(x=>x.title),['Genuine Space']);
 await assert.rejects(()=>readVerifiedLiveSpaces({token:'bad',topic:'technology',fetcher}),/wallet_not_connected/);
 await assert.rejects(()=>readVerifiedLiveSpaces({token,topic:'//abuse',fetcher}),/invalid_space_topic/);
 assert.equal(urls.length,1);
});

test('an X Space clip post can be requested in the card only through an official embedded post',()=>{
 assert.equal(parseSpaceClipPostId('https://x.com/Host/status/1888777666555444333'),'1888777666555444333');
 assert.equal(parseSpaceClipPostId('https://twitter.com/Host/status/1888777666555444333?s=2'),'1888777666555444333');
 for(const bad of ['https://evil.example/Host/status/1888777666555444333','https://x.com/i/spaces/1OyKAjYPeXqGb','javascript:alert(1)'])assert.equal(parseSpaceClipPostId(bad),null);
 const source=read('x-spaces-quick-card.mjs');
 assert.ok(source.includes('widgets.createTweet'),'must use documented official post embedding, not X Spaces iframes');
 assert.ok(source.includes('https://platform.x.com/widgets.js'));
});

test('a Fred X post supplied by the owner is discoverable without claiming a verified live session',()=>{
 const source=read('x-spaces-quick-card.mjs');
 const lifecycle=read('x-spaces-lifecycle.mjs');
 assert.match(source,/FRED_SHARED_POST/);
 assert.match(source,/Open original X post/);
 assert.match(source,/sharedPreview\.addEventListener/);
 assert.match(source,/clipButton\.click\(\)/);
 assert.match(lifecycle,/2119202415702605899/);
 assert.match(lifecycle,/replayAvailable===true/);
 assert.doesNotMatch(source,/fetch\([^)]*twitterapis\.com/);
});
