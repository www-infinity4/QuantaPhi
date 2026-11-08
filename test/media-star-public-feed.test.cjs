'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const SRC=fs.readFileSync('media-star-public-cards.mjs','utf8');
const HTML=fs.readFileSync('index.html','utf8');
const CSS=fs.readFileSync('media-star-public-cards.css','utf8');
test('public media cards mount only from the Cloudflare moderated creator feed into original Oracle card bank',()=>{
 assert.match(SRC,/v1\/production\/media-star-cards/);
 assert.match(SRC,/normalizeMediaStarPublicCatalog/);
 assert.match(SRC,/infinityAcceptedCards/);
 assert.match(SRC,/dataset\.sourceReady='true'/);
 assert.match(SRC,/quantaphi:source-cards-ready/);
 assert.match(HTML,/media-star-public-cards\.mjs/);
 assert.match(HTML,/media-star-public-cards\.css/);
});
test('each approved media card uses original Media Star artwork, free play and non-charging paid notice',()=>{
 assert.match(SRC,/media-star-512\.png/);
 assert.match(SRC,/Play free episode/);
 assert.match(SRC,/Creator checkout unavailable/);
 assert.doesNotMatch(SRC,/fetch\([^)]*\/v1\/spaces\/unlock/);
 assert.match(CSS,/min-height:48px/);
});
test('unapproved, malformed and duplicate media never reach public cards; paid sources are not exposed',async()=>{
 const core=await import(pathToFileURL(path.resolve('media-star-public-feed-core.mjs')).href);
 const good={contentId:'media-star:creator01:sourceabc123',title:'Approved collection',freeEpisodeCount:1,
  curatedPriceStarCoins:1,paymentState:'disabled_pending_verification',
  episodes:[{episodeId:'e1',position:0,title:'First',free:true,sourceUrl:'https://www.youtube.com/watch?v=abcdefghijk'},
   {episodeId:'e2',position:1,title:'Second',free:false,sourceUrl:'https://example.com/locked-secret'}]};
 assert.deepEqual(core.normalizeMediaStarPublicCatalog({ok:true,publisherApproval:'pending',cards:[good]}),[]);
 const cards=core.normalizeMediaStarPublicCatalog({ok:true,publisherApproval:'moderated_only',cards:[good,good,{...good,contentId:'evil'}]});
 assert.equal(cards.length,1);
 assert.equal(cards[0].episodes[0].free,true);
 assert.equal(cards[0].episodes[0].sourceUrl,'https://www.youtube.com/watch?v=abcdefghijk');
 assert.equal(cards[0].episodes[1].sourceUrl,null);
 assert.equal(cards[0].episodes[1].requiresUnlock,true);
 assert.equal(core.safePublicMediaUrl('https://127.0.0.1/secret'),null);
});
