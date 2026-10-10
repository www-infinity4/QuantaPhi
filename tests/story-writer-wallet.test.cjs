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

test('Story Writer is light blue and has separate star, collect and share payout buttons',()=>{
 const css=file('phi-story-writer.css'),image=file('phi-image-builder.css'),writer=file('phi-story-writer.js');
 assert.match(image,/background:linear-gradient\(155deg,#e0f1ff,#afd7fa\)/);
 assert.match(css,/background:linear-gradient\(155deg,#e0f1ff,#afd7fa\)/);
 assert.doesNotMatch(css,/#24133e/);
 for(const id of ['sw-star','sw-collect','sw-share'])assert.match(writer,new RegExp(id));
 for(const kind of ['star','collect','share'])assert.match(writer,new RegExp("QuantaStarCredit\\?\\.\\('"+kind+"'"));
 assert.match(writer,/quantaPhi:storyWriter:stars:v1/);
 assert.match(writer,/retried the original idempotent receipt/);
 assert.match(writer,/ledger confirmation/);
});
test('Media Star triggers full StarQuest refresh and masked sessions do not write Guest',()=>{
 const wallet=file('wallet-runtime.js'),radio=file('fred-spaces-radio.js'),index=file('index.html');
 assert.match(wallet,/const named=String\(session\?\.username/);
 assert.match(wallet,/if\(matches.length===1\)/);
 assert.match(wallet,/wallet.key!=='__guest__'/);
 assert.match(wallet,/const verified=cloudStarState/);
 assert.match(wallet,/phi:media-star-wallet-synced/);
 assert.match(radio,/phi:media-star-wallet-synced/);
 assert.match(index,/phi-story-writer\.css\?v=20261010-sky-blue2/);
 assert.match(index,/wallet-runtime\.js\?v=20261010-masked-media-sync4/);
});
