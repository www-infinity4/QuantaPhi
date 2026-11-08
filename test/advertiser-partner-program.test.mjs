import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PARTNER_TERMS,validatePartnerProposal,partnerProposalIssueUrl,reviewAttributedSales} from '../advertiser-partner-core.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const offer={plan:'voluntary-support',businessName:'Sample Shoe Co',siteUrl:'https://sample-shoe.example.org/products',
 details:'We would like to support future independent editorial Quick Cards.',acknowledge:true};
const campaign={merchantId:'store-1',campaignId:'campaign-1',startsAt:'2026-11-01T00:00:00Z'};
const coverage={merchantId:'store-1',campaignId:'campaign-1',source:'authorized-merchant-orders',finalized:true,refundsComplete:true,
 periodStart:'2026-11-01T00:00:00Z',periodEnd:'2026-12-01T00:00:00Z'};
const sale=(orderId,netCents,extra={})=>({orderId,merchantId:'store-1',campaignId:'campaign-1',
 currency:'USD',state:'settled',attributedBy:'quantaphi-referral',verifiedBy:'merchant-provider',
 paidAt:'2026-11-10T12:00:00Z',netCents,...extra});

test('voluntary support has no required amount, no ranking advantage and no invoice',()=>{
 assert.equal(PARTNER_TERMS.voluntarySupport.requiredCents,0);
 assert.equal(PARTNER_TERMS.voluntarySupport.purchaseRanking,false);
 const result=validatePartnerProposal(offer);
 assert.equal(result.ok,true);
 assert.equal(result.request.plan,'voluntary-support');
 assert.equal(result.request.paymentAuthorized,false);
 assert.equal(result.request.invoiceAuthorized,false);
});
test('30-day $100 offer with $1,000 attributed sales TARGET is a review proposal, never a guarantee',()=>{
 assert.equal(PARTNER_TERMS.performanceReview.proposedFeeCents,10000);
 assert.equal(PARTNER_TERMS.performanceReview.targetNetSalesCents,100000);
 assert.equal(PARTNER_TERMS.performanceReview.windowDays,30);
 assert.equal(PARTNER_TERMS.performanceReview.salesGuaranteed,false);
 assert.equal(PARTNER_TERMS.performanceReview.underTargetFeeProposed,true);
 assert.equal(validatePartnerProposal({...offer,plan:'performance-review'}).ok,false);
 const result=validatePartnerProposal({...offer,plan:'performance-review',underTargetFeeAcknowledged:true});
 assert.equal(result.ok,true);
 assert.equal(result.request.paymentAuthorized,false);
});
test('public proposal links need independent commercial terms review; no immediate charge',()=>{
 const result=validatePartnerProposal({...offer,plan:'performance-review',underTargetFeeAcknowledged:true});
 const u=new URL(partnerProposalIssueUrl(result.request));
 assert.equal(u.hostname,'github.com');assert.match(u.pathname,/\/issues\/new$/);
 const body=u.searchParams.get('body');
 assert.match(body,/\$100/);assert.match(body,/\$1,000/);
 assert.match(body,/if verified 30-day attributed net sales are below/i);
 assert.match(body,/NOT a purchase, billing authorization, or sales guarantee/i);
});
test('proposals block credential links, fake plan names, nonbusiness and missing clear consent',()=>{
 for(const invalid of [
  {...offer,plan:'buy-traffic'},
  {...offer,businessName:'a'},
  {...offer,acknowledge:false},
  {...offer,siteUrl:'javascript:alert(1)'},
  {...offer,siteUrl:'https://me:secret@sample-shoe.example.org'},
  {...offer,siteUrl:'http://sample-shoe.example.org'},
  {...offer,siteUrl:'https://localhost'},
  {...offer,details:'!'.repeat(701)}
 ])assert.equal(validatePartnerProposal(invalid).ok,false,JSON.stringify(invalid).slice(0,120));
});
test('unverified, outside-campaign and wrong-merchant orders never count as proof',()=>{
 const check=reviewAttributedSales(campaign,{coverage,receipts:[
  sale('good',50000),
  sale('wrong-merchant',100000,{merchantId:'other'}),
  sale('wrong-campaign',100000,{campaignId:'other'}),
  sale('no-referral',100000,{attributedBy:'unknown'}),
  sale('uncleared',100000,{state:'pending'}),
  sale('invented',100000,{verifiedBy:'merchant-self-report'}),
  sale('future',100000,{paidAt:'2026-12-15T00:00:00Z'})
 ]},'2026-12-05T00:00:00Z');
 assert.equal(check.status,'under_target_review');
 assert.equal(check.netSalesCents,50000);
 assert.equal(check.paymentAuthorized,false);
});
test('same order id is counted once and refund-adjusted net is used',()=>{
 const check=reviewAttributedSales(campaign,{coverage,receipts:[
  sale('order-1',70000),sale('order-1',70000),sale('order-2',40000,{refundCents:20000})
 ]},'2026-12-05T00:00:00Z');
 assert.equal(check.netSalesCents,90000);
 assert.equal(check.status,'under_target_review');
 assert.equal(check.invoiceAuthorized,false);
});
test('exact $1,000 verified net sales meets the target without billing',()=>{
 const check=reviewAttributedSales(campaign,{coverage,receipts:[
  sale('a',75000),sale('b',25000)
 ]},'2026-12-05T00:00:00Z');
 assert.equal(check.status,'target_met');
 assert.equal(check.netSalesCents,100000);
 assert.equal(check.invoiceAuthorized,false);
});
test('30-day window and coverage are mandatory; nothing is billed on unverified receipts',()=>{
 assert.equal(reviewAttributedSales(campaign,{coverage:null,receipts:[sale('a',999999)]},'2026-12-05T00:00:00Z').status,'needs_verified_coverage');
 assert.equal(reviewAttributedSales(campaign,{coverage:{...coverage,refundsComplete:false},receipts:[sale('a',999999)]},'2026-12-05T00:00:00Z').status,'needs_verified_coverage');
 assert.equal(reviewAttributedSales(campaign,{coverage,receipts:[sale('a',999999)]},'2026-11-20T00:00:00Z').status,'in_progress');
 const dup=reviewAttributedSales(campaign,{coverage,receipts:[sale('a',30000),sale('a',90000)]},'2026-12-05T00:00:00Z');
 assert.equal(dup.status,'needs_verified_coverage');
 assert.equal(dup.invoiceAuthorized,false);
});
test('affiliate Quick Card contains the payment-safe partner offer, and the program has no charge endpoint',()=>{
 const affiliate=read('infinity-affiliates-card.mjs');
 const ui=read('advertiser-partner-card.mjs');
 const css=read('infinity-affiliates-card.css');
 assert.match(affiliate,/mountAdvertiserPartnerProgram/);
 assert.match(affiliate,/id="iaAdvertisingProgram"/);
 assert.match(ui,/Voluntary contribution/);
 assert.match(ui,/\$100/);
 assert.match(ui,/\$1,000/);
 assert.match(ui,/Prepare review request/);
 assert.match(ui,/NOT an invoice|not an invoice/i);
 assert.doesNotMatch(ui,/\bfetch\(/);
 assert.doesNotMatch(ui,/paymentIntent|createCharge|confirmPayment/);
 assert.match(css,/ia-advertiser/);
});
