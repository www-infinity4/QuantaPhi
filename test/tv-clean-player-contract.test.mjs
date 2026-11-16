import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the homepage does not mount outdated World Series news, notifications, or game-priority services',()=>{
 const html=read('index.html');
 assert.doesNotMatch(html,/world-series-news|world-series-updates|tv-front-priority/);
 assert.doesNotMatch(html,/World Series/);
 const deck=read('oracle-card-deck.js');
 assert.doesNotMatch(deck,/World Series|TV_FRONT_BOOTSTRAP|tvFrontPriority|Live game · pinned first/);
});

test('KYOU card never embeds the entire external station website',()=>{
 const source=read('live-tv-cards.mjs');
 assert.doesNotMatch(source,/ltv-station-frame|station page opens automatically|fetchWorldSeries/);
 assert.match(source,/kyouReferralUrl\('live'\)/);
 assert.match(source,/ltv-poster/);
});

test('FOX and KYOU display ready-sized 16:9 poster screens before any media is requested',()=>{
 const source=read('live-tv-cards.mjs');
 const styles=read('live-tv-cards.css');
 assert.match(source,/liveNewsEmbed\(location\.origin\)/);
 assert.match(source,/ltv-poster/);
 assert.match(styles,/aspect-ratio:\s*16\/9/);
 assert.doesNotMatch(styles,/ltv-station-window\{height:520px/);
});

test('the normal MLB card remains without a stale World Series-specific tab',()=>{
 const source=read('google-trending-cards.js');
 assert.doesNotMatch(source,/World Series/);
 assert.match(source,/All MLB games/);
});

test('Oracle primes the selected and next card images without eager-loading every hidden card',()=>{
 const deck=read('oracle-card-deck.js');
 assert.match(deck,/function primeCardImage\(entry,high=false\)/);
 assert.match(deck,/primeCardImage\(entry,true\)/);
 assert.match(deck,/primeCardImage\(proposed\)/);
 assert.match(deck,/img\.fetchPriority='high'/);
});
