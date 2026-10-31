'use strict';const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),deck=fs.readFileSync('oracle-card-deck.js','utf8'),css=fs.readFileSync('oracle-card-deck.css','utf8');
assert.match(html,/id="oracleCardStage"/);assert.match(html,/id="oracleCardNext"/);
assert.match(html,/Scroll interactive cards \/ widgets/);
assert.match(deck,/document\.createComment/);assert.match(deck,/marker\.parentNode\.insertBefore\(node,marker\)/);
assert.match(deck,/stage\.append\(entry\.node\)/);assert.doesNotMatch(deck,/cloneNode/);
for(const id of ['phiChannelCards','infiniteBook','phiStoryWriter','phiMediaBuilder'])assert.ok(deck.includes(id));
assert.match(css,/oracle-card-deck-active:not\(\.oracle-shelf-open\)/);
assert.doesNotMatch(css,/#sponsorBoard|#bitcoinCrusherShoe|#shoplcShirtButton/);
assert.doesNotThrow(()=>new Function(deck));
console.log('Original-card spotlight, flip and accessible shelf contracts passed');
assert.match(deck,/watcher\.observe\(entry\.node/);
assert.match(deck,/if\(available\(entry\)\)/);

assert.match(deck,/\['cardoneCapitalOffer','10X Westshore/);
assert.match(deck,/cardoneButton\?\.addEventListener\('click'/);
assert.match(deck,/show\(entry\)/);
assert.match(deck,/entries\.find\(x=>x\.id===spotlightRequested/);
assert.doesNotMatch(html,/class="oracle-card-deck-feature"/);
assert.match(html,/oracle-card-deck\.js\?v=20261031-following-publisher1/);
assert.match(css,/\.oracle-card-deck-active[^\n]*#cardoneCapitalOffer/);
assert.match(css,/\.oracle-shelf-open[^\n]*#cardoneCapitalOffer/);

for(const id of ['googleTrendNba','googleTrendMlb','googleTrendCulture']){
 assert.ok(deck.includes(id),'All live trending cards should rotate');
 assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(css,new RegExp('#'+id));
}
assert.match(deck,/data-oracle-spotlight/);
assert.doesNotMatch(html,/Featured search trend cards/);

assert.match(html,/data-oracle-feed="public"/);
assert.match(html,/data-oracle-feed="for-you"/);
assert.match(html,/data-oracle-feed="following"/);
assert.match(html,/id="oracleCardFollow"/);
assert.match(deck,/nextFeedDirection/);
assert.match(deck,/markOpened\(readDirections\(\),active\.feedId\)/);
assert.match(deck,/loadOwnQuantScores/);
assert.match(deck,/const visited=\[\]/);
assert.match(css,/\.oracle-direction-tabs/);

assert.match(deck,/registerSourceCards/);
assert.match(deck,/source-cards-ready/);
assert.match(deck,/feedId:id/);
assert.doesNotMatch(deck,/\['siteQuickCards','Source quick cards/);

assert.match(html,/id="siteQuickCards"[^>]+hidden/);
assert.match(deck,/viewerTouched/);
assert.match(deck,/source-google/);

// Regression: For You and Public cannot oscillate between two favorites.
assert.match(deck,/seenByTab/);
assert.match(deck,/nextDeckCycle/);
assert.match(deck,/tour\.remaining/);
assert.match(deck,/ready cards in this direction/);

assert.doesNotMatch(deck,/\['bubblesAICard','Talk to Bubbles'\]/);
assert.match(html,/class=\"search\" role=\"search\"/);
assert.ok(html.indexOf('class=\"search\"')<html.indexOf('id=\"qtraffic\"'),'Search must lead before traffic counters');
assert.doesNotMatch(html,/<section class=\"q-bubbles-entry\"/);
assert.match(deck,/connectQuant\(\{select:true,revision\}\)/);

assert.match(html,/data-oracle-family="accepted"/);
assert.match(html,/data-oracle-family="website"/);
assert.match(html,/data-oracle-family="original"/);
assert.match(deck,/selectNextFamilyPool\(tour\.cards,cardFamily\(active\)\)/);
assert.match(deck,/openingFamilyPool\(cards,openingCursor\)/);
assert.match(deck,/show\(chosen\)/);
