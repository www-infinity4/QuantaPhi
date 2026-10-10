/* Regression checks for QuantaPhi Story Writer and ledger-safe image repair. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=name=>fs.readFileSync(path.resolve(__dirname,'..',name),'utf8');

test('Story Writer is mounted after Reads & Realms and before Image Builder',()=>{
 const html=file('index.html');
 assert.ok(html.indexOf('id="infiniteBook"')<html.indexOf('id="phiStoryWriter"'));
 assert.ok(html.indexOf('id="phiStoryWriter"')<html.indexOf('id="phiImageBuilder"'));
 assert.match(html,/phi-story-writer\.js\?v=/);
 assert.match(html,/phi-story-writer\.css\?v=/);
});
test('Story Writer invokes existing GPT and image pipeline, saves drafts, and uses existing credit route',()=>{
 const sw=file('phi-story-writer.js');
 assert.match(sw,/infinity-rogers\.marvaseater\.workers\.dev\/v1\/chat/);
 assert.match(sw,/generateFromStory\(storyId,direction\)/);
 assert.match(sw,/indexedDB\.open\('phi-story-writer-images-v1'/);
 assert.match(sw,/quantaPhi:storyWriter:drafts:v1/);
 assert.match(sw,/QuantaStarCredit\?\.\('collect'/);
 assert.match(sw,/QuantaStarCredit\?\.\('share'/);
 assert.match(sw,/if\(all\.some\(x=>x\.key===key\)\)/);
 assert.doesNotMatch(sw,/QuantaPhiWallet\.addToken\(/);
});
test('Fix Image reuses the preceding pixels and automatically reruns the image builder',()=>{
 const builder=file('phi-image-builder.js');
 assert.match(builder,/reopenAsReference\(instruction\)\.then\(ready=>ready\?build\(\):null\)/);
 assert.match(builder,/const previous=rawResult\|\|result/);
 assert.match(builder,/storyWriterId=artifact\?\.storyWriterId\|\|''/);
 assert.match(builder,/async generateFromStory\(/);
 assert.match(builder,/if\(busy\|\|preparingReference\)throw Error/);
});
test('Main wallet refresh uses authenticated username, not masked wallet key',()=>{
 const wallet=file('wallet-runtime.js');
 assert.match(wallet,/const sessionKey=String\(session\?\.key\|\|''\)/);
 assert.match(wallet,/session\?\.username\|\|profiles\?\.\[sessionKey\]\?\.username/);
 assert.match(wallet,/if\(sessionKey!==String\(current\?\.key\|\|''\)\)return null/);
 assert.match(wallet,/data-control-phi-sync-stars/);
 assert.match(wallet,/await window\.QuantaStarCoinCloud\?\.reconcile\?\.\(\)/);
});
test('Quanta ledger retains cloud idempotency, and does not count on page refresh',()=>{
 const cloud=file('star-coin-cloud.js');
 assert.match(cloud,/reference_id='quantaphi:'\+kind\+':'\+ref/);
 assert.match(cloud,/if\(!items\.some\(x=>x\.reference_id===reference_id\)\)/);
 assert.match(cloud,/if\(!r\.ok\)throw new Error/);
});
