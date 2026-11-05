import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {validSpaceLink, normalizeSpaceEntry, filterSpaceEntries} from '../x-spaces-quick-card.mjs';

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
