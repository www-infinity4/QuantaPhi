import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync(new URL('../live-tv-cards.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../live-tv-cards.css',import.meta.url),'utf8');
const news=src.slice(src.indexOf('export function mountLiveNews(root){'));

test('LiveNOW card is publisher-first without an automatic broken video panel',()=>{
 assert.match(news,/ltv-source-first/);
 assert.match(news,/https:\/\/www\.livenowfox\.com\/live/);
 assert.match(news,/Try in-card video/);
 assert.match(news,/tryPlayer\.addEventListener\('click'/);
 assert.match(news,/if\(!requested\|\|frame\)return/);
 assert.match(news,/frame loaded|Player frame loaded/);
 assert.match(news,/does not confirm video playback/);
 assert.match(css,/\.ltv-screen-source\{min-height:0;aspect-ratio:auto/);
});

test('blocked video falls back to publisher and ignores untrusted postMessages',()=>{
 assert.match(news,/player\.addEventListener\('error'/);
 assert.match(news,/payload\?\.event==='onError'/);
 assert.match(news,/event\.source!==frame\.contentWindow/);
 assert.match(news,/youtube-nocookie\.com/);
 assert.match(news,/Video unavailable\? Show source/);
 assert.match(news,/window\.removeEventListener\('message',reportedError\)/);
 assert.match(news,/frame\.src='about:blank'/);
});
