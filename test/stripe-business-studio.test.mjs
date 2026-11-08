import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAX_STRIPE_SELLER_CARDS,parseStripeSellerCards,parseStripeUsdCents,buildStripeSellerDraft,reviewStripeSellerEligibility} from '../stripe-business-studio-core.mjs';
import {assessExternalUsdReceipt,assessBubblesCashAllowance} from '../infinity-cash-receipt-gates.mjs';
import {findCard} from '../bubbles-card-catalog.mjs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('coin seller and lawn service use one prospective merchant, no fake account or payouts',()=>{
 for(const [kind,label] of [['coins','Coin Collectibles'],['services','Lawn Mowing']]){
  const cards=Array.from({length:500},(_,i)=>'shop-card-'+(i+1));
  const plan=buildStripeSellerDraft({sellerSlug:'test-seller',displayName:label,businessType:kind,cardIds:cards,priceUsd:'25.00',notes:'First business Quick Card'});
  assert.equal(MAX_STRIPE_SELLER_CARDS,500);
  assert.equal(plan.cards.length,500);
  assert.equal(plan.provider,'stripe_connect');
  assert.equal(plan.accountStatus,'not_connected');
  assert.equal(plan.payoutsVerified,false);
  assert.equal(plan.checkoutEnabled,false);
  assert.equal(plan.cards.at(-1).priceCents,2500);
  assert.ok(plan.cards.every(card=>card.sellerSlug==='test-seller'&&card.checkoutEnabled===false&&card.rightsVerified===false));
  assert.ok(!JSON.stringify(plan).includes('merchant_ref'));
 }
});
test('a new business can prepare Stripe setup before creating its first Quick Card',()=>{
 const plan=buildStripeSellerDraft({sellerSlug:'new-lawn',displayName:'Neighborhood Lawn Care',businessType:'services',cardIds:'',priceUsd:'30.00',notes:''});
 assert.equal(plan.cardCount,0);
 assert.deepEqual(plan.cards,[]);
 assert.equal(plan.accountStatus,'not_connected');
 assert.equal(plan.checkoutEnabled,false);
});

test('seller drafts reject duplicate cards, extra privileges, over capacity, invalid dollars and restricted business groups',()=>{
 assert.deepEqual(parseStripeSellerCards('a,b\nc'),['a','b','c']);
 assert.throws(()=>parseStripeSellerCards('a,a'),/duplicate_card/);
 assert.throws(()=>parseStripeSellerCards('a/../../../b'),/invalid_card/);
 assert.throws(()=>parseStripeSellerCards(Array.from({length:501},(_,i)=>'a'+i).join(',')),/over_card_limit/);
 for(const s of ['0','0.00','-5','5e2','$10','1,000.00',' 25.00 ','0.001','999999.00'])assert.equal(parseStripeUsdCents(s),null,s);
 assert.equal(parseStripeUsdCents('0.50'),50);
 assert.equal(parseStripeUsdCents('10.00'),1000);
 const args={sellerSlug:'fred',displayName:'Fred Coin Shop',businessType:'coins',cardIds:['fred-coin'],priceUsd:'100.00',notes:''};
 for(const key of ['stripeAccountId','secret','payoutBank','connected','authToken','paymentAuthorized','sellerId'])assert.throws(()=>buildStripeSellerDraft({...args,[key]:'forged'}),/unsupported_field/,key);
 for(const kind of ['cannabis','alcohol','nicotine','gambling','weapons'])assert.throws(()=>buildStripeSellerDraft({...args,businessType:kind}),/invalid_business_type/);
});
test('seller eligibility always requires real authenticated backend and processor state',()=>{
 const plan=buildStripeSellerDraft({sellerSlug:'fred',displayName:'Fred Coin Shop',businessType:'coins',cardIds:['fred-card'],priceUsd:'100.00',notes:''});
 for(const x of [{},{merchantVerified:true,chargesEnabled:true,payoutsEnabled:true,rightsApproved:true,ownerAuthenticated:true},{accountStatus:'verified',merchantVerified:true,chargesEnabled:true,payoutsEnabled:true,rightsApproved:true,ownerAuthenticated:true}]){
  const eligibility=reviewStripeSellerEligibility(plan,x);
  assert.equal(eligibility.canCreateCharge,false);
  assert.equal(eligibility.canAccessCustomerFunds,false);
  assert.equal(eligibility.status,'awaiting_trusted_backend');
 }
});
test('a $500 Chime claim or bank receipt key is never $500 in Infinity Cash Wallet',()=>{
 const base={amountCents:50000,currency:'USD',providerReference:'bank-transfer-claim',sender:'Fred'};
 for(const x of [
  base,{...base,signatureVerified:true},{...base,signatureVerified:true,merchantMatched:true},
  {...base,signatureVerified:true,merchantMatched:true,providerStatus:'pending'},
  {...base,signatureVerified:true,merchantMatched:true,providerStatus:'settled'},
  {...base,signatureVerified:true,merchantMatched:true,providerStatus:'settled',licensedProgramApproved:true,reconciled:true}
 ]){
  const y=assessExternalUsdReceipt(x);
  assert.equal(y.canCreditCashWallet,false);
  assert.equal(y.canSpend,false);
  assert.equal(y.amountCents===50000||y.amountCents===null,true);
  assert.equal(y.currency,'USD');
 }
 assert.equal(assessExternalUsdReceipt({amountCents:-5,currency:'USD'}).status,'invalid_amount');
 assert.equal(assessExternalUsdReceipt({amountCents:50000,currency:'EUR'}).status,'unsupported_currency');
});
test('Bubbles cannot be authorized to guarantee growth or spend from a browser instruction',()=>{
 for(const x of [
  {requestedCents:50000,ownerApproved:true,availableCents:50000,merchantVerified:true},
  {requestedCents:500,ownerApproved:true,availableCents:1000,merchantVerified:true},
  {requestedCents:1,ownerApproved:false,availableCents:100000,merchantVerified:true},
  {requestedCents:50000,ownerApproved:true,availableCents:50000,merchantVerified:true,guaranteedGrowth:true}
 ]){
  const y=assessBubblesCashAllowance(x);
  assert.equal(y.canMoveMoney,false);
  assert.equal(y.canInvestFunds,false);
  assert.equal(y.canPromiseReturns,false);
 }
});
test('real Bubbles Stripe Studio is findable; HTML only asks for public draft data',()=>{
 const card=findCard('set up my stripe account');
 assert.ok(card);assert.equal(card.url,'/stripe-business-studio.html');
 const html=source('stripe-business-studio.html'),js=source('stripe-business-studio.js');
 assert.match(html,/<h1[^>]*>Stripe Business Studio<\/h1>/);
 assert.match(html,/id="stripeSellerForm"/);
 assert.match(html,/id="stripeSellerCards"/);
 assert.match(html,/id="stripeExport"/);
 assert.match(html,/Stripe not connected/i);
 assert.match(html,/No guaranteed cash returns/i);
 assert.match(html,/bubbles-embed\.js/);
 assert.match(js,/buildStripeSellerDraft\(/);
 assert.match(js,/\.textContent\s*=/);
 assert.doesNotMatch(js,/fetch\(|localStorage|sessionStorage|\.innerHTML\s*=/);
 assert.doesNotMatch(html,/<input[^>]*type="file"|name="bankAccount"|name="ssn"|name="routing"/i);
 assert.match(source('quick-card-builder.html'),/href="\/stripe-business-studio\.html"/);
});
