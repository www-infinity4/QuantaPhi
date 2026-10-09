const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
test('original orange Oracle story replaces home violet without hiding artwork',()=>{
 const css=file('phi-oracle-story-orange.css'),html=file('index.html');
 assert.match(html,/phi-oracle-story-orange\.css\?v=20261009-orange-inline1/);
 assert.ok(html.indexOf('phi-oracle-story-orange.css')>html.indexOf('phi-card-controls.css'));
 assert.match(css,/#infiniteBook\[data-context="home"\] \.ib-story/);
 assert.match(css,/linear-gradient\(150deg,#fff9ea/);
 assert.match(css,/#infiniteBook \.ib-illustration-actions button/);
 assert.match(file('infinite-book.js'),/scheduleAutoIllustration\(story\)/);
 assert.match(css,/\.qzoneRed/);assert.match(css,/\.qzoneYellow/);assert.match(css,/\.qzonePurple/);
});
test('random four-roll source discovery stays active and samples whole Quant history',()=>{
 const reader=file('infinite-book.js'),writer=file('infinite-book-discovery.js');
 assert.match(reader,/indexedDraw\?\.\(/);
 assert.match(reader,/rand\(5\)<2\?focusPool\[rand\(focusPool\.length\)\]/);
 assert.match(writer,/read\(HISTORY\)\.slice\(-5000\)/);
 assert.match(writer,/focusPool/);
 assert.match(writer,/storytellingRealmNumber/);
 assert.match(reader,/storyKind=searchMode\?'asteroid':'reads-realms'/);
});
test('Bitcoin Crusher foot reveals real inline app, not fake slot',()=>{
 const html=file('index.html');
 assert.match(html,/id="bitcoinCrusherShoe"[^>]+aria-controls="quantaCrusherInline"/);
 assert.match(html,/id="quantaCrusherFrame"/);
 assert.match(html,/frame\.src='\/bitcoin-crusher\/\?embed=quanta'/);
 assert.match(html,/event\.origin!==location\.origin/);
 assert.match(html,/event\.source!==frame\.contentWindow/);
 assert.match(html,/type:'quantaphi:crusher-embed-height'/);
 assert.match(file('phi-oracle-story-orange.css'),/\.crusher-inline-frame/);
});
