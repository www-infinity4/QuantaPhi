/* QuantaPhi direct-sold sponsorship media kit (proposal only).
 * Not an ads billing, contract, ad-view measurement or Google AdSense approval API.
 * Paid campaigns need separately authenticated consent, delivery, invoice and receipt.
 */
export const RATE_OPTIONS=Object.freeze([
 Object.freeze({id:'pilot',label:'Trial Boost',priceUsd:100,duration:'7-day pilot discussion',status:'proposed',guaranteedImpressions:null}),
 Object.freeze({id:'featured',label:'Featured Quick Card',priceUsd:1000,duration:'30-day feature discussion',status:'proposed',guaranteedImpressions:null}),
 Object.freeze({id:'regional',label:'Regional / themed rotation',priceUsd:5000,duration:'30-day regional discussion',status:'proposed',guaranteedImpressions:null}),
 Object.freeze({id:'category',label:'Category sponsorship',priceUsd:15000,duration:'monthly category discussion',status:'proposed',guaranteedImpressions:null}),
 Object.freeze({id:'enterprise',label:'Flagship premium sponsorship',priceUsd:100000,duration:'custom monthly enterprise discussion',status:'proposed',guaranteedImpressions:null})
]);
export function quoteForTier(id){
 const match=RATE_OPTIONS.find(t=>t.id===id);
 if(!match)throw Error('unknown_tier');
 return match;
}
const count=(value)=>Number.isSafeInteger(value)&&value>=0;
export function compareCampaign({costUsd,priorClicks,newClicks,actualVerified=false,serverReceipt}={}){
 if(!Number.isFinite(costUsd)||costUsd<0||costUsd>100000000||
  !count(priorClicks)||!count(newClicks))throw Error('invalid_campaign_inputs');
 // A public quote calculator can never certify its own event inputs.
 if(actualVerified&&!serverReceipt?.auditedByServer)throw Error('server_receipt_required');
 const round=n=>Math.round(n*100)/100;
 return Object.freeze({
  clickDifference:newClicks-priorClicks,
  clickIncreasePercent:priorClicks?round((newClicks-priorClicks)/priorClicks*100):null,
  priorCostPerClickUsd:priorClicks?round(costUsd/priorClicks):null,
  newCostPerClickUsd:newClicks?round(costUsd/newClicks):null,
  reportStatus:actualVerified?'server_receipt_claim_requires_independent_audit':'illustrative_unverified'
 });
}
export function disclosureForTraffic(report){
 const n=report?.pageViews;
 if(!count(n))return 'No current Cloudflare page-view record is verified.';
 const source=report?.source==='Cloudflare GraphQL httpRequests1dGroups'?'Cloudflare GraphQL':'unverified provider';
 return n.toLocaleString('en-US')+' Cloudflare-recorded page views ('+source+'). '+
  (report.includesBots?'This includes bots. ':'Bot filtering not established. ')+
  'These are not unique visitors, not sponsored ad impressions, not paid views and not ad clicks. '+
  'Qualified ad impressions and conversions require a separate consent-aware server-side campaign ledger.';
}
