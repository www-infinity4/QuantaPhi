'use strict';const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),deck=fs.readFileSync('oracle-card-deck.js','utf8'),css=fs.readFileSync('oracle-card-deck.css','utf8');
assert.match(html,/id="oracleCardStage"/);assert.match(html,/id="oracleCardNext"/);
assert.match(html,/Scroll interactive cards \/ widgets/);
assert.match(deck,/document\.createComment/);assert.match(deck,/marker\.parentNode\.insertBefore\(node,marker\)/);
assert.match(deck,/stage\.append\(entry\.node\)/);assert.doesNotMatch(deck,/cloneNode/);
for(const id of ['phiChannelCards','infiniteBook','bubblesAICard','phiStoryWriter','phiMediaBuilder'])assert.ok(deck.includes(id));
assert.match(css,/oracle-card-deck-active:not\(\.oracle-shelf-open\)/);
assert.doesNotMatch(css,/#sponsorBoard|#bitcoinCrusherShoe|#shoplcShirtButton/);
assert.doesNotThrow(()=>new Function(deck));
console.log('Original-card spotlight, flip and accessible shelf contracts passed');
assert.match(deck,/watcher\.observe\(entry\.node/);
assert.match(deck,/if\(available\(entry\)\)/);

assert.match(deck,/\['cardoneCapitalOffer','10X Westshore/);
assert.match(deck,/cardoneButton\?\.addEventListener\('click'/);
assert.match(deck,/show\(entry\)/);
assert.match(deck,/entries\.find\(x=>x\.id===spotlightRequested\)/);
assert.match(html,/id="oracleCardCardone"/);
assert.match(html,/oracle-card-deck\.js\?v=20261024-directions1/);
assert.match(css,/\.oracle-card-deck-active[^\n]*#cardoneCapitalOffer/);
assert.match(css,/\.oracle-shelf-open[^\n]*#cardoneCapitalOffer/);

for(const id of ['googleTrendNba','googleTrendMlb','googleTrendCulture']){
 assert.ok(deck.includes(id),'All live trending cards should rotate');
 assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(css,new RegExp('#'+id));
}
assert.match(deck,/data-oracle-spotlight/);
assert.match(html,/href="\/trending-now\.html"/);

assert.match(html,/data-oracle-feed="public"/);
assert.match(html,/data-oracle-feed="for-you"/);
assert.match(html,/data-oracle-feed="following"/);
assert.match(html,/id="oracleCardFollow"/);
assert.match(deck,/nextFeedDirection/);
assert.match(deck,/markOpened\(readDirections\(\),active\.feedId\)/);
assert.match(deck,/loadOwnQuantScores/);
assert.match(deck,/const visited=\[\]/);
assert.match(css,/\.oracle-direction-tabs/);
