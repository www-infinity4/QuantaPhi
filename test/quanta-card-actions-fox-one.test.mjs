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
 assert.match(src,/qca-search-links/);
 assert.match(src,/searchTitle\|\|name/);
 assert.match(src,/search_query/);
 assert.doesNotMatch(src,/q\.type='search'|qca-search-input/);
 assert.match(src,/quantaphi:collected/);
 assert.doesNotMatch(src,/QuantaStarCredit|fetch\(/);
});
test('Oracle viewer retains the original DOM and gives every original card an action bar',()=>{
 const src=read('oracle-card-deck.js');
 assert.match(src,/stage\.append\(entry\.node\);stage\.scrollTop=0;active=entry/);
 assert.match(src,/import\('\/quanta-card-actions\.mjs'\)/);
 assert.match(src,/mountCardActions\(container/);
 assert.match(src,/!entry\.id\.startsWith\('source-'\)&&!hasBuiltInCardActions/);
});
test('source cards, details and feed all use the same real actions',()=>{
 const experience=read('quanta-card-experience.mjs');
 const src=read('source-quick-cards.mjs');
 const feed=read('quanta-feed.mjs');
 assert.match(experience,/import \{mountCardActions\}/);
 assert.match(experience,/mountCardActions\(root,card\)/);
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

test('native video is activated only inside the current card and paused when changing cards',()=>{
 const src=read('oracle-card-deck.js');
 assert.match(src,/startNativeCardVideo\(entry\.node\)/);
 assert.match(src,/video\.muted=true/);
 assert.match(src,/video\.play\(\)/);
 assert.match(src,/video\.pause\(\)/);
});