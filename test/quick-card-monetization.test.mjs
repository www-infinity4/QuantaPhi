import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker,{normalizeCard,publicCard,normalizeCreatorPricing} from '../workers/quick-card-publisher/worker.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const item={title:'Pioneer Music Studio',website:'https://music.example.com/',description:'An original interactive studio for composing music.',interactionRequest:'Use the original musical interface after choosing a paid session.',kind:'visit'};
test('publisher accepts free or custom whole StarCoin price in TEXT, rejects fractions and invalid prices',()=>{
 assert.equal(normalizeCard(item).card.pricingMode,'free');
 assert.equal(normalizeCard({...item,monetization:'paid',priceStarCoins:'1'}).card.priceStarCoins,'1');
 assert.equal(normalizeCard({...item,monetization:'paid',priceStarCoins:'21000000000000000000'}).card.priceStarCoins,'21000000000000000000');
 for(const bad of ['0','-1','3.5','4e3','', '01'])assert.ok(normalizeCard({...item,monetization:'paid',priceStarCoins:bad}).error);
 assert.ok(normalizeCard({...item,monetization:'hidden'}).error);
 assert.ok(normalizeCreatorPricing({monetization:'paid',priceStarCoins:42}).error,'numbers must not lose precision');
});
test('a paid Quick Card never leaks the original app URL or launches it via public catalog',()=>{
 const row={slug:'pioneer-music-123456',title:'Pioneer Music Studio',description:item.description,interaction_request:item.interactionRequest,website:item.website,image:'',kind:'visit',search_template:'',video_id:'',preview_mode:'interactive',status:'approved',pricing_mode:'paid',price_star_coins:'2',creator_profile:'https://x.com/PioneerMusic'};
 const published=publicCard(row);
 assert.equal(published.locked,true);
 assert.equal(published.website,'');
 assert.equal(published.priceStarCoins,'2');
 assert.equal(published.kind,'locked');
 assert.doesNotMatch(JSON.stringify(published),/music\.example\.com/);
});
test('priced cards never charge without receipt-ready backend',async()=>{
 const response=await worker.fetch(new Request('https://quantaphi.org/api/quick-cards/health'),{CARDS_DB:{}});
 const packet=await response.json();
 assert.equal(packet.paidCheckoutReady,false);
 assert.equal(packet.creatorPayoutReady,false);
 assert.match(read('published-quick-card.js'),/disabled=true/);
 assert.doesNotMatch(read('published-quick-card.js'),/\/v1\/wallet\/debit/);
});
test('paid publisher schema migration exists and public discovery is still moderated',()=>{
 assert.match(read('workers/quick-card-publisher/schema.sql'),/price_star_coins TEXT/);
 assert.match(read('workers/quick-card-publisher/migrations/0002-paid-creator-plans.sql'),/ADD COLUMN price_star_coins/);
 assert.match(read('workers/quick-card-publisher/worker.mjs'),/status='approved'/);
});
test('the existing publisher fails closed when the installed Worker does not support paid drafts',()=>{
 const html=read('quick-card-builder.html'),js=read('quick-card-builder.js');
 assert.match(html,/id="qcpMonetization"/);assert.match(html,/id="qcpPriceStarCoins"/);
 assert.match(js,/health\?\.pricingDraftVersion!==1/);
 assert.match(js,/Server did not confirm paid pricing/);
});
