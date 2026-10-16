'use strict';const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const builder=fs.readFileSync('media-star-creator.js','utf8');
const tv=fs.readFileSync('phi-channel-cards.js','utf8');
const html=fs.readFileSync('index.html','utf8');
test('Media Star carries independent per-person source/role credits without inheriting Fred wallet',()=>{
 assert.match(builder,/data-production-credits/);
 assert.match(builder,/creditManifest\(data\)/);
 assert.match(builder,/role.*guest/);
 assert.match(builder,/source_and_identity_pending/);
 assert.match(builder,/data-payment-mode="off"/);
 assert.match(builder,/searchProductionCredits/);
 assert.match(builder,/claimProductionCredit/);
 assert.match(builder,/No spendable StarCoins or cash are created/);
 assert.doesNotThrow(()=>new Function(builder));
});
test('Oracle playback records an authenticated observation rather than paying on a click',()=>{
 assert.match(tv,/recordProductionAfterPlayback/);
 assert.match(tv,/recordProductionPlay/);
 assert.match(tv,/observedSeconds:30/);
 assert.match(tv,/getPlayerState\(\)!==1/);
 assert.match(tv,/video\.onplaying/);
 assert.match(tv,/video\.onpause/);
 assert.match(tv,/productionTimer/);
 assert.match(html,/phi-channel-cards\.js\?v=20261015-credits1/);
 assert.match(html,/media-star-creator\.js\?v=20261015-credits1/);
 assert.doesNotThrow(()=>new Function(tv));
});
