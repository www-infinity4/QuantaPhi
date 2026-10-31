import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REQUESTED_PUBLIC_CARDS,QUEUED_REQUESTS,validBrandSportsCard} from '../verified-brand-sports-catalog.mjs';
import {VERIFIED_CARD_COUNT,isSafeCardUrl,safeSportsArticle} from '../verified-brand-sports-cards.mjs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('all curated sources have real image URLs and exactly three source-aware interactions',()=>{
 assert.ok(REQUESTED_PUBLIC_CARDS.length>=25);
 assert.equal(VERIFIED_CARD_COUNT,REQUESTED_PUBLIC_CARDS.length);
 assert.equal(new Set(REQUESTED_PUBLIC_CARDS.map(x=>x.id)).size,REQUESTED_PUBLIC_CARDS.length);
 for(const item of REQUESTED_PUBLIC_CARDS){
  assert.ok(validBrandSportsCard(item),item.id);
  assert.equal(item.actions.length,3);
  assert.ok(item.actions.every(a=>isSafeCardUrl(a.url)));
  assert.match(item.visual,/^https:/);
 }
 assert.equal(validBrandSportsCard({...REQUESTED_PUBLIC_CARDS[0],visual:'data:image/svg+xml,broken'}),false);
 assert.equal(isSafeCardUrl('javascript:alert(1)'),false);
 assert.equal(isSafeCardUrl('https://name@example.org/'),false);
});
test('Packers and Lions source and FOX One viewing page are explicit',()=>{
 const item=REQUESTED_PUBLIC_CARDS.find(x=>x.id==='packers-lions-2026');
 assert.equal(item.network,'FOX');
 assert.ok(item.description.includes('3:25 PM Central'));
 assert.ok(item.actions[0].url.includes('fox.com'));
 assert.ok(item.actions[1].url.includes('packers.com'));
 assert.ok(item.secondaryVisual.includes('/det.png'));
});
test('World Series matchup has official provenance not a fake live score',()=>{
 const game=REQUESTED_PUBLIC_CARDS.find(x=>x.id==='world-series-game3-2026');
 assert.ok(game.description.includes('Oct 26, 2026'));
 assert.ok(game.secondaryVisual.includes('139.svg'));
 const pitchers=REQUESTED_PUBLIC_CARDS.find(x=>x.id==='world-series-pitchers-2026');
 assert.ok(pitchers.description.includes('Robert Gasser'));
 assert.ok(pitchers.description.includes('Freddy Peralta'));
});
test('uncertain brands and age restrictions are preserved without premature publication',()=>{
 const names=QUEUED_REQUESTS.map(x=>x.name);
 for(const name of ['Crown Royal','Bud Light','Petrona','how','Viper Google simulator'])assert.ok(names.includes(name));
 assert.equal(REQUESTED_PUBLIC_CARDS.some(x=>x.id.includes('bud-light')||x.id.includes('crown-royal')),false);
 const politics=REQUESTED_PUBLIC_CARDS.filter(x=>x.kind==='civic');
 assert.equal(politics.length,2);
 assert.ok(politics.every(x=>x.nonTargeted));
 const health=REQUESTED_PUBLIC_CARDS.find(x=>x.id==='colorectal-screening');
 assert.equal(health.nonTargeted,true);
 assert.match(health.official,/cancer.gov/);
});
test('same Oracle viewer, no useless generic search bar, original narration',()=>{
 const home=read('index.html'),deck=read('oracle-card-deck.js'),js=read('verified-brand-sports-cards.mjs');
 assert.match(home,/id="verifiedBrandSportsCards" hidden/);
 assert.match(home,/verified-brand-sports-cards\.mjs/);
 assert.match(deck,/#verifiedBrandSportsCards \.iqc-card\[data-source-id\]/);
 assert.match(js,/mountCardActions\(shared,/);
 assert.match(js,/showSearch:false/);
 assert.match(js,/sourceReady='false'/);
 assert.match(js,/sourceReady='true'/);
 assert.match(js,/sampleAnnouncerFacts/);
 assert.match(js,/speechSynthesis/);
});

test('on-card sports source headlines are restricted to attributed original hosts',()=>{
 assert.ok(safeSportsArticle('https://www.mlb.com/video/rays-vs-brewers-game-2-highlights','mlb.com'));
 assert.ok(safeSportsArticle('https://www.packers.com/news/something','packers.com'));
 assert.equal(safeSportsArticle('https://fake-mlb.com/news','mlb.com'),false);
 assert.equal(safeSportsArticle('https://mlb.com.evil.org/','mlb.com'),false);
 assert.equal(safeSportsArticle('https://name@mlb.com/news','mlb.com'),false);
});

test('Oracle opening selector is initialized before any eager hidden-bank images announce their cards',()=>{
 const deck=read('oracle-card-deck.js');
 const declaration=deck.indexOf('let openingCursor=null;');
 const firstSourceScan=deck.indexOf('registerSourceCards();');
 assert.ok(declaration>0 && firstSourceScan>declaration,'No temporary-dead-zone crash before chooser listeners mount');
});

test('Tide #bubbles source card has an actual Tide product image and three first-party actions',()=>{
 const tide=REQUESTED_PUBLIC_CARDS.find(x=>x.id==='tide-original-liquid');
 assert.ok(tide,'owner-requested Tide card exists in public rotation');
 assert.equal(tide.kind,'product');
 assert.equal(tide.checked,'2026-10-30');
 assert.equal(tide.official,'https://tide.com/en-us/shop/type/liquid/tide-original-liquid');
 assert.ok(tide.visual.startsWith('https://images.ctfassets.net/ajjw8wywicb3/'));
 assert.ok(tide.visual.includes('Tide_Belize_SUD_Original_listing'));
 assert.equal(tide.actions.length,3);
 assert.ok(tide.actions.every(x=>x.url.startsWith('https://tide.com/en-us/')));
 assert.match(tide.description,/independent card/);
 assert.doesNotMatch(tide.description,/\\$\\d/);
});
