import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountCardActions} from '../quanta-card-actions.mjs';
import {findSourceCard,isPublicSourceCard} from '../source-quick-cards.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('shared controls are exported and bound to real browser actions',()=>{
 assert.equal(typeof mountCardActions,'function');
 const src=read('quanta-card-actions.mjs');
 for(const label of ['☆ Star','+ Collect','↗ Share','+1 Build','Quick Search'])assert.ok(src.includes(label),label);
 assert.match(src,/navigator\.share/);
 assert.match(src,/navigator\.clipboard/);
 assert.match(src,/quantaPhiCollected/);
 assert.match(src,/robotDirectionsInput/);
 assert.match(src,/mountTinyFishCardReader\(bar,card\)/);
 assert.doesNotMatch(src,/providerSearchUrl\(provider,value\)/);
 assert.doesNotMatch(src,/providerSearchUrl\(provider,value\)\|\|/);
 assert.match(src,/sharePreviewUrl/);
 assert.match(src,/quantaphi:collected/);
 assert.doesNotMatch(src,/QuantaStarCredit|fetch\(/);
});
test('Oracle viewer retains the original DOM and gives every original card an action bar',()=>{
 const src=read('oracle-card-deck.js');
 assert.match(src,/stage\.append\(entry\.node\);active=entry/);
 assert.match(src,/import\('\/quanta-card-actions\.mjs'\)/);
 assert.match(src,/mountCardActions\(container/);
 assert.match(src,/!entry\.id\.startsWith\('source-'\)/);
});
test('source cards, details and feed all use the same real actions',()=>{
 const experience=read('quanta-card-experience.mjs');
 const src=read('source-quick-cards.mjs');
 const feed=read('quanta-feed.mjs');
 assert.match(experience,/import \{mountCardActions\}/);
 assert.match(experience,/mountCardActions\(root,card,\{showSearch:/);
 assert.match(src,/mountCardTools\(tools,card\)/);
 assert.match(feed,/mountCardTools\(tools,selected\)/);
});
test('FOX One is real original post, officially embedded, and no invented MP4 or GIF',()=>{
 const card=findSourceCard('fox-one'),source=read('quanta-card-experience.mjs');
 assert.ok(isPublicSourceCard(card));
 assert.equal(card.featureUrl,'https://x.com/foxone/status/2113352129427730641');
 assert.match(source,/data-conversation/);
 assert.match(source,/data-dnt/);
 assert.match(source,/platform\.twitter\.com\/widgets\.js/);
 assert.match(source,/twttr\?\.widgets/);
 assert.doesNotMatch(source,/video\.twimg\.com\/|\.mp4\?autoplay/);
});
test('FOX One live news promo is a separate interactive card and preserves the original',()=>{
 const news=findSourceCard('fox-one-live-news');
 assert.ok(isPublicSourceCard(news));
 assert.equal(news.featureUrl,'https://x.com/foxone/status/2070282166190408122');
 assert.equal(news.official,'https://www.fox.com/stream/fox-news');
 assert.equal(findSourceCard('fox-one').featureUrl,'https://x.com/foxone/status/2113352129427730641');
 const source=read('quanta-card-experience.mjs');
 assert.match(source,/const spot=card\.featureUrl/);
 assert.match(source,/if\(id==='fox-one'\|\|id==='fox-one-live-news'\)mountFoxOneSpot/);
 assert.doesNotMatch(source,/video\.twimg\.com\/|\.mp4\?autoplay/);
});
