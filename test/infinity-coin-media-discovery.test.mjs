import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {orderCoinMedia,youtubeSearchLink} from '../coin-media-discovery.mjs';
const media=[{id:'abcdefghijk',kind:'music',title:'Space Music',published:'2026-10-28T00:00:00Z'},{id:'lmnopqrstuv',kind:'music',title:'Jazz Show',published:'2026-10-27T00:00:00Z'},{id:'123456789ab',kind:'movies',title:'Official Trailer',published:'2026-10-20T00:00:00Z'},{id:'invalid',kind:'movies',title:'fake'}];
test('selection filters category and source and avoids watched videos',()=>{
 assert.deepEqual(orderCoinMedia(media,{kind:'music',seen:['abcdefghijk']}).map(x=>x.id),['lmnopqrstuv','abcdefghijk']);
 assert.deepEqual(orderCoinMedia(media,{kind:'movies'}).map(x=>x.id),['123456789ab']);
 assert.deepEqual(orderCoinMedia(media,{kind:'music',query:'space'}).map(x=>x.id),['abcdefghijk']);
 assert.equal(orderCoinMedia(media,{kind:'science'}).length,0);
});
test('search uses real provider results and never assumes a media ID',()=>{
 assert.match(youtubeSearchLink('jazz & blues','music'),/youtube.com\/results\?search_query=/);
 assert.match(decodeURIComponent(youtubeSearchLink('jazz & blues','music')),/jazz & blues/);
});
test('viewer retains real provider player and device-local preference boundary',()=>{
 const source=fs.readFileSync(new URL('../coin-media-discovery.mjs',import.meta.url),'utf8');
 assert.match(source,/youtube-nocookie.com\/embed/);
 assert.match(source,/referrerPolicy='strict-origin-when-cross-origin'/);
 assert.match(source,/localStorage/);
 assert.doesNotMatch(source,/request\.body|POST|mint\(/);
 const page=fs.readFileSync(new URL('../infinity-coin-cards.html',import.meta.url),'utf8');
 assert.equal((page.match(/data-coin-media/g)||[]).length,2);
});
