import test from 'node:test';
import assert from 'node:assert/strict';
import {
 CASH_WALLET_CURRENCY,parseUsdCents,displayCashAmount,
 assessCashWalletFunding,assessCashWalletSpending,readCashWalletSnapshot
} from '../cash-wallet-core.mjs';

test('cash currency is real USD, not Quants, Infinity, coupons, or Star Coins',()=>{
 assert.equal(CASH_WALLET_CURRENCY,'USD');
 assert.equal(parseUsdCents('10.25'),1025);
 assert.equal(parseUsdCents('0.01'),1);
 assert.equal(displayCashAmount(1025),'$10.25');
});

test('funding amounts use exact integer cents with no floats or guessed rounding',()=>{
 for(const bad of ['0','0.00','1.234','-5','1e6','$10','10,00','0.001','Infinity','  ','01','1.',' .25',25,null]){
  assert.equal(parseUsdCents(bad),null,String(bad));
 }
 assert.equal(parseUsdCents('25'),2500);
 assert.equal(parseUsdCents('25.5'),2550);
 assert.equal(parseUsdCents('0.05'),5);
 assert.equal(parseUsdCents('999999.99'),99999999);
 assert.equal(parseUsdCents('1000000'),null);
});

test('without a verified signed-in payment provider, no cash load can be initiated',()=>{
 const result=assessCashWalletFunding({amount:'20.00'});
 assert.equal(result.status,'processor_unavailable');
 assert.equal(result.canStartPayment,false);
 assert.equal(result.cents,2000);
 assert.equal(result.canCreditBalance,false);
});

test('signed-in customers still cannot fund until a regulated provider is ready',()=>{
 const result=assessCashWalletFunding({amount:'20.00',authenticated:true});
 assert.equal(result.status,'processor_unavailable');
 assert.equal(result.canStartPayment,false);
});

test('funding requires account identity, configured policy limits, and partner authorization',()=>{
 assert.equal(assessCashWalletFunding({amount:'9.99',providerReady:true,authenticated:false,limitCents:5000}).status,'sign_in_required');
 assert.equal(assessCashWalletFunding({amount:'9.99',providerReady:true,authenticated:true}).status,'limit_unavailable');
 assert.equal(assessCashWalletFunding({amount:'75',providerReady:true,authenticated:true,limitCents:5000}).status,'over_limit');
 const good=assessCashWalletFunding({amount:'25',providerReady:true,authenticated:true,limitCents:5000});
 assert.equal(good.status,'eligible_for_partner_checkout');
 assert.equal(good.canStartPayment,false); // contract never directly starts payment
 assert.equal(good.canCreditBalance,false); // only verified provider settlement can credit
});

test('a missing or malformed account response never invents $0, a funded balance, or coverage',()=>{
 const none=readCashWalletSnapshot();
 assert.equal(none.status,'not_connected');
 assert.equal(none.availableCents,null);
 assert.equal(none.pendingCents,null);
 assert.equal(none.display,'—');
 for(const bad of [
  {availableCents:100,providerStatus:'ready'},
  {availableCents:100,pendingCents:0,authenticated:true},
  {availableCents:-1,pendingCents:0,authenticated:true,providerStatus:'ready'},
  {availableCents:50.5,pendingCents:0,authenticated:true,providerStatus:'ready'},
  {availableCents:100,pendingCents:0,authenticated:true,providerStatus:'ready',currency:'QUANT'}
 ])assert.equal(readCashWalletSnapshot(bad).status,'not_connected');
});

test('a verified server balance is explicitly separated into available and pending dollars',()=>{
 const result=readCashWalletSnapshot({authenticated:true,providerStatus:'ready',currency:'USD',availableCents:3900,pendingCents:2100});
 assert.equal(result.status,'connected');
 assert.equal(result.display,'$39.00');
 assert.equal(result.availableCents,3900);
 assert.equal(result.pendingCents,2100);
});

test('no connected provider or merchant means in-app spending is blocked, even if a balance is displayed',()=>{
 const result=assessCashWalletSpending({amountCents:250,availableCents:10000,authenticated:true});
 assert.equal(result.status,'merchant_not_connected');
 assert.equal(result.canCharge,false);
});

test('spending checks exact server price, positive cents, balance, and user approval',()=>{
 assert.equal(assessCashWalletSpending({amountCents:999,availableCents:1000,authenticated:true,merchantConnected:true,approved:false}).status,'approval_required');
 assert.equal(assessCashWalletSpending({amountCents:1100,availableCents:1000,authenticated:true,merchantConnected:true,approved:true}).status,'insufficient_funds');
 assert.equal(assessCashWalletSpending({amountCents:0,availableCents:1000,authenticated:true,merchantConnected:true,approved:true}).status,'invalid_quote');
 assert.equal(assessCashWalletSpending({amountCents:'1.00',availableCents:1000,authenticated:true,merchantConnected:true,approved:true}).status,'invalid_quote');
 const result=assessCashWalletSpending({amountCents:999,availableCents:1000,authenticated:true,merchantConnected:true,approved:true});
 assert.equal(result.status,'ready_for_server_authorization');
 assert.equal(result.canCharge,false); // a preview is not a payment authorization
});

test('cash wallet never treats unverified, pending, or synthetic balances as spendable',()=>{
 for(const balance of [null,-1,1.5,'200',NaN]){
  assert.notEqual(assessCashWalletSpending({amountCents:100,availableCents:balance,authenticated:true,merchantConnected:true,approved:true}).status,'ready_for_server_authorization');
 }
});

test('an unsupported or signed-out wallet cannot initiate store purchases',()=>{
 assert.equal(assessCashWalletSpending({amountCents:100,availableCents:200,authenticated:false,merchantConnected:true,approved:true}).status,'sign_in_required');
 assert.equal(assessCashWalletSpending({amountCents:100,availableCents:200,authenticated:true,merchantConnected:false,approved:true}).status,'merchant_not_connected');
});

