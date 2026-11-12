/* Advertiser partnership terms: proposals only, never processor orders.
 * Published client data is not trusted payment evidence. Production billing
 * requires authenticated merchant agreement, attribution and reconciliation.
 */
export const PARTNER_TERMS=Object.freeze({
 voluntarySupport:Object.freeze({requiredCents:0,purchaseRanking:false,invoiceAuthorized:false}),
 performanceReview:Object.freeze({
  proposedFeeCents:10000,targetNetSalesCents:100000,windowDays:30,
  underTargetFeeProposed:true,salesGuaranteed:false,invoiceAuthorized:false
 })
});
const checkText=(x,min,max)=>typeof x==='string'&&x.trim().length>=min&&x.trim().length<=max;
function safeSite(input){
 try{
  const u=new URL(input),host=u.hostname.toLowerCase();
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&
    /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(host)&&
    !host.endsWith('.local')&&!host.endsWith('.internal')&&!host.endsWith('.example')?
    u.href:null;
 }catch{return null}
}
export function validatePartnerProposal(source){
 if(!source||!['voluntary-support','performance-review'].includes(source.plan))return {ok:false,error:'Choose one of the two partnership options.'};
 if(!checkText(source.businessName,3,95))return {ok:false,error:'Provide the public business name (3–95 characters).'};
 const siteUrl=safeSite(source.siteUrl);
 if(!siteUrl)return {ok:false,error:'Provide a public HTTPS business website, without credentials.'};
 if(source.details!==undefined&&source.details!==''&&!checkText(source.details,1,700))return {ok:false,error:'Keep the business note under 700 characters.'};
 if(source.acknowledge!==true)return {ok:false,error:'Confirm this only prepares a public request, not a payment or campaign.'};
 if(source.plan==='performance-review'&&source.underTargetFeeAcknowledged!==true)
  return {ok:false,error:'Acknowledge the exact proposed $100 fee below the $1,000 target before requesting review.'};
 const request=Object.freeze({
  businessName:source.businessName.trim(),siteUrl,details:(source.details||'').trim(),
  plan:source.plan,paymentAuthorized:false,invoiceAuthorized:false,
  salesGuaranteed:false,contractSigned:false
 });
 return {ok:true,request};
}
export function partnerProposalIssueUrl(request){
 if(!request||request.paymentAuthorized!==false||request.invoiceAuthorized!==false)
  throw Error('Reviewed proposal required.');
 const performance=request.plan==='performance-review';
 const body=[
  'Infinity advertiser program · merchant inquiry (NOT an accepted contract)',
  '',
  'Public business: '+request.businessName,
  'Public website: '+request.siteUrl,
  'Program: '+(performance?'30-day $100 performance-review proposal':'Voluntary after-the-fact support contribution'),
  ...(performance?[
   'Proposed $100 fee only if verified 30-day attributed net sales are below $1,000.',
   'The $1,000 amount is a target, NOT a promised result. This proposal requires signed merchant terms, evidence and separate billing consent.'
  ]:[
   'No mandatory amount, no placement purchased, no preferential ranking and no recurring charge.'
  ]),
  'Public note: '+(request.details||'No further public details'),
  '',
  'NOT a purchase, billing authorization, or sales guarantee. No payment or campaign starts from this issue.',
  'Do not post names of customers, addresses, credentials, phone numbers or payment information.'
 ].join('\n');
 const url=new URL('https://github.com/www-infinity4/QuantaPhi/issues/new');
 url.searchParams.set('title','Infinity Ads · '+(performance?'Performance review':'Voluntary contribution')+' · '+request.businessName);
 url.searchParams.set('body',body);
 return url.href;
}
const dayMs=86400000;
function utc(input){if(typeof input!=='string'||!input.endsWith('Z'))return NaN;return Date.parse(input)}
const result=(status,netSalesCents=null)=>Object.freeze({
 status,netSalesCents,targetNetSalesCents:PARTNER_TERMS.performanceReview.targetNetSalesCents,
 proposedFeeCents:PARTNER_TERMS.performanceReview.proposedFeeCents,
 paymentAuthorized:false,invoiceAuthorized:false
});
export function reviewAttributedSales(campaign,{coverage,receipts}={},asOf=new Date().toISOString()){
 if(!campaign||!checkText(campaign.merchantId,1,100)||!checkText(campaign.campaignId,1,100))return result('needs_verified_coverage');
 const start=utc(campaign.startsAt),now=utc(asOf),end=start+30*dayMs;
 if(!Number.isFinite(start)||!Number.isFinite(now))return result('needs_verified_coverage');
 // Complete provider coverage must attest the entire period including
 // refunds/chargebacks; a click, visitor interest, estimate or owner note is not a sale.
 if(!coverage||coverage.merchantId!==campaign.merchantId||
  coverage.campaignId!==campaign.campaignId||coverage.source!=='authorized-merchant-orders'||
  coverage.finalized!==true||coverage.refundsComplete!==true||coverage.chargebacksComplete!==true||
  utc(coverage.periodStart)!==start||utc(coverage.periodEnd)!==end||
  !Array.isArray(receipts))return result('needs_verified_coverage');
 if(now<end)return result('in_progress');
 const used=new Map();let net=0;
 for(const row of receipts){
  if(!row||row.merchantId!==campaign.merchantId||row.campaignId!==campaign.campaignId||
   row.currency!=='USD'||row.state!=='settled'||row.attributedBy!=='quantaphi-referral'||
   row.verifiedBy!=='merchant-provider')continue;
  const paid=utc(row.paidAt);
  if(!Number.isFinite(paid)||paid<start||paid>=end)continue;
  if(!checkText(row.orderId,1,120)||!Number.isSafeInteger(row.netCents)||
   row.netCents<0||!Number.isSafeInteger(row.refundCents??0)||
   (row.refundCents??0)<0||!Number.isSafeInteger(row.chargebackCents??0)||
   (row.chargebackCents??0)<0||(row.refundCents??0)+(row.chargebackCents??0)>row.netCents)return result('needs_verified_coverage');
  const sum=row.netCents-(row.refundCents??0)-(row.chargebackCents??0);
  if(used.has(row.orderId)){
   if(used.get(row.orderId)!==sum)return result('needs_verified_coverage');
   continue;
  }
  used.set(row.orderId,sum);net+=sum;
  if(!Number.isSafeInteger(net))return result('needs_verified_coverage');
 }
 return result(net>=PARTNER_TERMS.performanceReview.targetNetSalesCents?'target_met':'under_target_review',net);
}
