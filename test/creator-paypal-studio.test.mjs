import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAX_CREATOR_CARDS,parseCreatorCardIds,parseUsdPrice,prepareCreatorPayPalManifest,assessCreatorActivation} from '../creator-paypal-studio-core.mjs';
import {findCard} from '../bubbles-card-catalog.mjs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('500 eligible card drafts use one creator connection and never create 500 merchant accounts',()=>{
 const ids=Array.from({length:500},(_,i)=>'fred-media-'+String(i+1).padStart(4,'0'));
 const manifest=prepareCreatorPayPalManifest({creatorSlug:'fred',cardIds:ids,usdPrice:'1.00'});
 assert.equal(MAX_CREATOR_CARDS,500);
 assert.equal(manifest.cards.length,500);
 assert.equal(manifest.creatorSlug,'fred');
 assert.deepEqual(manifest.merchantConnection,{provider:'paypal',status:'not_connected',linked:false});
 assert.equal(manifest.cards[0].priceCents,100);
 assert.equal(manifest.cards[499].creatorSlug,'fred');
 assert.ok(manifest.cards.every(card=>card.canCharge===false&&card.rightsReviewStatus==='unverified'));
 assert.doesNotMatch(JSON.stringify(manifest),/bank_account|routing_number|paypal_email|access_token|merchant_id/i);
 assert.ok(manifest.cards.every(card=>!('paypalMerchantId' in card)));
});
test('bad or duplicate card IDs and >500 card bundles are rejected, never truncated silently',()=>{
 assert.deepEqual(parseCreatorCardIds('card-one,card-two\ncard-three'),['card-one','card-two','card-three']);
 assert.throws(()=>parseCreatorCardIds('card-one,card-one'),/duplicate_card_id/);
 assert.throws(()=>parseCreatorCardIds('card/unsafe'),/invalid_card_id/);
 assert.throws(()=>parseCreatorCardIds(''),/empty_card_ids/);
 assert.throws(()=>parseCreatorCardIds(Array.from({length:501},(_,i)=>'card-'+i).join('\n')),/too_many_cards/);
 assert.throws(()=>prepareCreatorPayPalManifest({creatorSlug:'fred',cardIds:['card-1','card-1'],usdPrice:'1.00'}),/duplicate_card_id/);
});
test('price parsing rejects ambiguous, negative, exaggerated and currency-bearing amounts',()=>{
 assert.equal(parseUsdPrice('0.99'),99);
 assert.equal(parseUsdPrice('25'),2500);
 assert.equal(parseUsdPrice('100000.00'),null);
 for(const s of ['0','0.00','-1.00','0.001','$1.00','1,000','1e5','NaN',' 1.00 '])assert.equal(parseUsdPrice(s),null,s);
 assert.throws(()=>prepareCreatorPayPalManifest({creatorSlug:'fred',cardIds:['card-1'],usdPrice:'0.00'}),/invalid_price/);
});
test('draft cannot self-assert verified seller, funds, rights, approved merchant or privileged provider data',()=>{
 for(const key of ['paypalMerchantId','paypalEmail','bankNumber','merchantConnection','rightsVerified','status','accessToken','creatorId']){
  assert.throws(()=>prepareCreatorPayPalManifest({creatorSlug:'fred',cardIds:['card-1'],usdPrice:'1.00',[key]:'forged'}),/invalid_template_field/,key);
 }
 assert.throws(()=>prepareCreatorPayPalManifest({creatorSlug:'not a slug!',cardIds:['card-1'],usdPrice:'1.00'}),/invalid_creator_slug/);
 const manifest=prepareCreatorPayPalManifest({creatorSlug:'fred',cardIds:['card-1'],usdPrice:'1.00'});
 assert.equal(manifest.publiclySellable,false);
 assert.equal(manifest.canStartCheckout,false);
 assert.equal(manifest.status,'draft_only');
});
test('activation preflight blocks any payment claim until provider/rights/source authorization and server receipts',()=>{
 const manifest=prepareCreatorPayPalManifest({creatorSlug:'fred',cardIds:['card-1'],usdPrice:'1.00'});
 for(const c of [
  {},{creatorSlug:'fred',verifiedSession:true},{creatorSlug:'other',verifiedSession:true,paypalPartnerApproved:true},
  {creatorSlug:'fred',verifiedSession:true,paypalPartnerApproved:true,merchantConnected:true,cardRightsReviewed:true},
  {creatorSlug:'fred',verifiedSession:true,paypalPartnerApproved:true,merchantConnected:true,cardRightsReviewed:true,checkoutApproved:true}
 ]){
  const r=assessCreatorActivation(manifest,c);
  assert.equal(r.canCharge,false);
  assert.equal(r.canPublishPaidCard,false);
  assert.equal(r.state,'server_activation_required');
 }
});
test('Bubbles can open the actual creator merchant template, without inventing a PayPal connection',()=>{
 const card=findCard('creator paypal studio');
 assert.ok(card);
 assert.equal(card.url,'/creator-paypal-studio.html');
 assert.equal(findCard('monetize quick cards')?.url,'/creator-paypal-studio.html');
});

test('creator studio is a real editable local batch tool, never fake connected checkout',()=>{
 const html=file('creator-paypal-studio.html'),js=file('creator-paypal-studio.js'),quick=file('quick-card-builder.html');
 assert.match(html,/<h1[^>]*>Creator PayPal Studio<\/h1>/);
 assert.match(html,/id="creatorPayPalBatch"/);
 assert.match(html,/id="creatorPayPalPrice"/);
 assert.match(html,/id="creatorPayPalExport"/);
 assert.match(html,/PayPal not connected/);
 assert.match(html,/https:\/\/www\.paypal\.com\/us\/business\/open-business-account/);
 assert.match(js,/prepareCreatorPayPalManifest\(/);
 assert.match(js,/\.textContent\s*=/);
 assert.match(js,/createObjectURL/);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|innerHTML\s*=/);
 assert.match(quick,/href="\/creator-paypal-studio\.html"/);
 assert.doesNotMatch(html,/Pay now|Payments activated|Bank connected/);
});
