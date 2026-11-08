import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eligibleCreatorSuggestion,evaluateSetDraft,creatorSetEconomy,claimEntitlement,canShowLockedAsset,createSetBrief} from '../collectible-set-core.mjs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const items=Array.from({length:10},(_,i)=>({id:'piece-'+(i+1),digest:'sha256:'+String(i+1).padStart(64,'0'),rights:'original',imageReady:true}));
const draft=more=>evaluateSetDraft({title:'Original artwork cards',creatorId:'draft-owner',items,freeCover:{id:'cover',digest:'sha256:'+'f'.repeat(64)},consent:true,...more});

test('no silent private gallery inference: only deliberately selected files with explicit opt-in',()=>{
 assert.equal(eligibleCreatorSuggestion({consent:false,imageCount:50,scope:'selected-files'}),false);
 assert.equal(eligibleCreatorSuggestion({consent:true,imageCount:50,scope:'saved-images'}),false);
 assert.equal(eligibleCreatorSuggestion({consent:true,imageCount:1,scope:'selected-files'}),false);
 assert.equal(eligibleCreatorSuggestion({consent:true,imageCount:10,scope:'selected-files'}),true);
 assert.equal(eligibleCreatorSuggestion({consent:true,imageCount:10,scope:'authorized-saved-manifest'}),false);
 assert.equal(eligibleCreatorSuggestion({consent:true,imageCount:10,scope:'authorized-saved-manifest',consentVerified:true,source:'first-party-collection'}),true);
 assert.equal(eligibleCreatorSuggestion({consent:false,imageCount:10,scope:'authorized-saved-manifest',consentVerified:true,source:'first-party-collection'}),false);
});
test('one free separate cover plus ten paid artworks costs ten Star Coins only as a proposal',()=>{
 const q=creatorSetEconomy({pieceCount:10,unitCost:1,freePreview:true});
 assert.equal(q.paidPieces,10);assert.equal(q.totalStarCoins,10);
 assert.equal(q.previewIsCollectible,false);assert.equal(q.paymentStatus,'proposal_only');
 assert.equal(draft().complete,true);assert.equal(draft().publication,'needs_server_review');assert.equal(draft().canCollectPayment,false);
});
test('duplicate images, duplicate cover and unknown rights fail closed',()=>{
 assert.equal(draft({items:items.map((x,i)=>i===1?{...x,digest:items[0].digest}:x)}).complete,false);
 assert.equal(draft({items:items.map((x,i)=>i===3?{...x,rights:'unknown'}:x)}).complete,false);
 assert.equal(draft({freeCover:{id:'cover',digest:items[0].digest}}).complete,false);
 assert.equal(draft({consent:false}).complete,false);
});
test('a forged browser object cannot unlock paid bytes, even if receipt metadata matches',()=>{
 const receipt={verified:true,creatorId:'creator-1',setId:'set-1',itemId:'piece-2',recipientAccount:'buyer-1'};
 assert.equal(claimEntitlement(receipt,{creatorId:'creator-1',setId:'set-1',itemId:'piece-2',recipientAccount:'buyer-1'}),true);
 assert.equal(canShowLockedAsset({isFreeCover:false,entitlement:receipt,viewerAccount:'buyer-1'}),false);
 assert.equal(canShowLockedAsset({isFreeCover:true}),true);
});
test('GPT plan warns that provenance cannot guarantee copying prevention and payment is off',()=>{
 const brief=createSetBrief({title:'My vintage cartoons',pieces:10,category:'vintage art'});
 for(const word of ['10 Star Coins','rights','cannot guarantee','no payments'])assert.ok(brief.includes(word),word);
});
test('studio is linked from existing Media Star, contains opt-in, previews and no charging or album API',()=>{
 const html=src('collectible-set-studio.html'),ui=src('collectible-set-studio.mjs'),creator=src('media-star-creator.js');
 assert.ok(html.includes('id="coverFile"'));assert.ok(html.includes('id="pieceFiles"'));
 assert.ok(html.includes('id="privateOptIn"'));assert.ok(html.includes('id="canPublish"'));
 assert.ok(html.includes('/creator-gpt-handoff.html'));
 assert.ok(creator.includes("location.assign('/collectible-set-studio.html')"));
 for(const value of ['file.arrayBuffer()','crypto.subtle.digest','URL.createObjectURL','URL.revokeObjectURL'])assert.ok(ui.includes(value),value);
 for(const unsafe of ['getUserMedia','navigator.mediaDevices','fetch(','wallet.spend','localStorage.setItem'])assert.equal(ui.includes(unsafe),false,unsafe);
 assert.ok(src('collectible-set-studio.css').includes('min-height:48px'));
});
