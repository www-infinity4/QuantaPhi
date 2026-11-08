import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyStripeSignature,classifySandboxSponsorCheckout,handleStripeSponsorSandboxWebhook} from '../workers/sponsor-boost/stripe-sandbox-webhook.mjs';

const secret='whsec_test_local_source_only';
const paylink='plink_1UZO996EcqqJzlWvCVkSrIz2';
const makeEvent=(change={})=>({
 id:'evt_sponsor_test_001',type:'checkout.session.completed',livemode:false,
 data:{object:{
  id:'cs_test_quanta_001',object:'checkout.session',livemode:false,
  mode:'payment',payment_status:'paid',amount_total:10000,currency:'usd',
  payment_link:paylink,customer:null,
  metadata:{platform:'QuantaPhi',project_issue:'1315',environment:'sandbox',
   campaign_kind:'sponsored_boost_pilot',review_status:'not_approved',fulfillment:'disabled'},
  ...change
 }}
});
const at=1762555200;
function signed(event,sec=secret,t=at){
 const raw=JSON.stringify(event);
 const digest=createHmac('sha256',sec).update(t+'.'+raw).digest('hex');
 return {raw,header:'t='+t+',v1='+digest};
}
const cfg={paymentLinkId:paylink,expectedAmountCents:10000,expectedCurrency:'usd',accountId:'acct_1UZNk46EcqqJzlWv'};
class MemoryD1{
 constructor(){this.rows=new Map();this.writes=[];}
 prepare(sql){
  const self=this;
  return {bind(...values){return {async run(){
   self.writes.push({sql,values});
   const key=values[0];
   if(self.rows.has(key))return {meta:{changes:0}};
   self.rows.set(key,values);
   return {meta:{changes:1}};
  }}}};
 }
}
function env(db=new MemoryD1()){return {STRIPE_TEST_WEBHOOK_SECRET:secret,SPONSOR_SANDBOX_DB:db,STRIPE_TEST_PAYMENT_LINK_ID:paylink,STRIPE_TEST_ACCOUNT_ID:'acct_1UZNk46EcqqJzlWv'};}
test('rejects invalid, altered, stale, future or malformed Stripe signatures',async()=>{
 const {raw,header}=signed(makeEvent());
 assert.equal(await verifyStripeSignature(raw,header,secret,at),true);
 assert.equal(await verifyStripeSignature(raw+' ',header,secret,at),false);
 assert.equal(await verifyStripeSignature(raw,header,'whsec_wrong_secret',at),false);
 assert.equal(await verifyStripeSignature(raw,header,secret,at+301),false);
 assert.equal(await verifyStripeSignature(raw,header,secret,at-301),false);
 assert.equal(await verifyStripeSignature(raw,'t=abc,v1='+header.split('v1=')[1],secret,at),false);
 assert.equal(await verifyStripeSignature(raw,'t='+at+',v1=xyz',secret,at),false);
 assert.equal(await verifyStripeSignature(raw,'',secret,at),false);
});
test('only exact live=false paid USD 100.00 checkouts from trusted test Payment Link are accepted',()=>{
 const event=makeEvent();
 assert.deepEqual(classifySandboxSponsorCheckout(event,cfg),{
  eventId:'evt_sponsor_test_001',sessionId:'cs_test_quanta_001',
  paymentLinkId:paylink,amountCents:10000,currency:'usd'
 });
 for(const bad of [
  {...event,livemode:true},
  {...event,type:'payment_intent.succeeded'},
  {...event,account:'acct_wrong'},
  makeEvent({livemode:true}),
  makeEvent({payment_status:'unpaid'}),
  makeEvent({amount_total:99}),
  makeEvent({currency:'eur'}),
  makeEvent({payment_link:'plink_wrong'}),
  makeEvent({metadata:{...event.data.object.metadata,review_status:'approved'}}),
  makeEvent({mode:'subscription'}),
  makeEvent({id:'pi_test_wrong'}),
  makeEvent({object:'payment_intent'})
 ])assert.equal(classifySandboxSponsorCheckout(bad,cfg),null,JSON.stringify(bad).slice(0,160));
});
test('webhook requires secret plus isolated D1, rejects forgeries, and never activates cards',async()=>{
 const d=new MemoryD1(),settings=env(d),event=makeEvent();
 const {raw,header}=signed(event);
 const req=new Request('https://example.org/webhook/stripe-sponsor-test',{method:'POST',headers:{'stripe-signature':header,'content-type':'application/json'},body:raw});
 const first=await handleStripeSponsorSandboxWebhook(req,settings,at);
 assert.equal(first.status,200);
 const state=await first.json();
 assert.equal(state.status,'sandbox_receipt_recorded');
 assert.equal(state.canActivateAd,false);
 assert.equal(state.realMoney,false);
 assert.equal(d.rows.size,1);
 assert.equal(d.writes.length,1);
 assert.match(d.writes[0].sql,/INSERT OR IGNORE INTO sponsor_stripe_sandbox_receipt/);
 assert.doesNotMatch(d.writes[0].sql,/UPDATE sponsor_campaign|active/i);
 const second=await handleStripeSponsorSandboxWebhook(new Request('https://example.org/webhook/stripe-sponsor-test',{method:'POST',headers:{'stripe-signature':header},body:raw}),settings,at);
 assert.equal(second.status,200);
 assert.equal((await second.json()).status,'sandbox_duplicate_ignored');
 assert.equal(d.rows.size,1);
 const fake=await handleStripeSponsorSandboxWebhook(new Request('https://example.org/webhook/stripe-sponsor-test',{method:'POST',headers:{'stripe-signature':header},body:raw+' '}),settings,at);
 assert.equal(fake.status,400);
 assert.equal(d.writes.length,2);
 assert.equal((await handleStripeSponsorSandboxWebhook(new Request('https://example.org/webhook/stripe-sponsor-test',{method:'POST',body:raw}),settings,at)).status,400);
 assert.equal((await handleStripeSponsorSandboxWebhook(new Request('https://example.org/webhook/stripe-sponsor-test',{method:'POST',headers:{'stripe-signature':header},body:raw}),{...settings,STRIPE_TEST_WEBHOOK_SECRET:''},at)).status,503);
 assert.equal((await handleStripeSponsorSandboxWebhook(new Request('https://example.org/webhook/stripe-sponsor-test',{method:'POST',headers:{'stripe-signature':header},body:raw}),{...settings,SPONSOR_SANDBOX_DB:null},at)).status,503);
});
test('no test charge can become a real sponsored campaign or wallet payout',async()=>{
 const body=JSON.stringify(makeEvent({amount_total:10000}));
 const {header}=signed(makeEvent());
 const d=new MemoryD1();
 const response=await handleStripeSponsorSandboxWebhook(new Request('https://example.org/webhook/stripe-sponsor-test',{method:'POST',headers:{'stripe-signature':header},body}),env(d),at);
 assert.equal((await response.json()).canActivateAd,false);
 assert.equal(d.rows.size,1);
 const source=await import('../workers/sponsor-boost/stripe-sandbox-webhook.mjs');
 assert.ok(source.default.fetch);
});
