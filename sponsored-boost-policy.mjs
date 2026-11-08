/** QuantaPhi direct-sold sponsored boost selection - server reviewed campaign data only.
 * No collection, tracking, wallet operations, identity, provider API or bank access.
 * This pure function does NOT attest that funds settled, click events occurred,
 * or a merchant is actually onboarded: those facts require a trusted backend.
 * Never use for Google AdSense creatives; Google's serving controls are separate.
 */
const validId=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9-]{0,69}$/.test(x);
const millis=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(x)
 ?Date.parse(x):NaN;
const safeFinite=x=>typeof x==='number'&&Number.isFinite(x);
const sensitiveCategories=new Set(['cannabis','alcohol','nicotine','tobacco','adult','health','medication','politics','religion','credit','gambling','weapons']);
const arr=x=>Array.isArray(x)?x:[];

export function qualifiesSponsorCampaign(campaign,context){
 const c=campaign,when=millis(context?.now);
 if(!c||!Number.isFinite(when)||!validId(c.id)||!validId(c.brandId)||
    c.status!=='approved'||c.sponsorLabel!=='Sponsored'||
    c.fundingStatus!=='settled'||!validId(c.contractReceipt)||!validId(c.fundingReceipt)||
    typeof c.category!=='string'||sensitiveCategories.has(c.category.toLowerCase())||
    !Number.isSafeInteger(c.maxViewsPerSession)||c.maxViewsPerSession<1||c.maxViewsPerSession>10||
    !Number.isSafeInteger(c.minimumGapMinutes)||c.minimumGapMinutes<1||c.minimumGapMinutes>10080||
    !Number.isFinite(millis(c.startsAt))||!Number.isFinite(millis(c.endsAt))||
    !(millis(c.startsAt)<=when&&when<millis(c.endsAt))||
    !Array.isArray(c.variants)||!c.variants.length||c.variants.length>30)return false;
 return true;
}
const eligibleVariant=(x,when)=>validId(x?.id)&&x.status==='approved'&&
 x.rightsVerified===true&&x.inStock===true&&
 Number.isFinite(millis(x.productUpdatedAt))&&
 millis(x.productUpdatedAt)<=when&&when-millis(x.productUpdatedAt)<=48*60*60*1000;

export function selectSponsoredBoost(campaigns,visitor,context){
 if(!Array.isArray(campaigns)||!visitor||!context||visitor.personalizationOptIn!==true||
    visitor.activeSession!==true||!Number.isFinite(millis(context.now)))return null;
 const followed=new Set(arr(visitor.followingBrandIds).filter(validId).slice(0,800));
 const liked=new Set(arr(visitor.likedProductIds).filter(validId).slice(0,800));
 const hidden=new Set(arr(visitor.notForMeBrandIds).filter(validId).slice(0,800));
 const when=millis(context.now);
 const choices=[];
 // No offsite/device surveillance, sensitive-category inference or bank traits.
 for(const c of campaigns.slice(0,150)){
  if(!qualifiesSponsorCampaign(c,context)||hidden.has(c.brandId))continue;
  const timesShown=visitor.seenSponsoredThisSession?.[c.id]||0;
  if(!Number.isSafeInteger(timesShown)||timesShown<0||timesShown>=c.maxViewsPerSession)continue;
  const last=visitor.lastSponsoredAt?.[c.id],since=last?when-millis(last):Infinity;
  if(!(since>=c.minimumGapMinutes*60*1000))continue;
  const items=c.variants.filter(x=>eligibleVariant(x,when));
  const signal=followed.has(c.brandId)?'follow':items.some(x=>liked.has(x.id))?'liked':'';
  if(!signal||!items.length)continue;
  const prev=visitor.lastVariantByCampaign?.[c.id];
  const fresh=items.filter(x=>x.id!==prev);
  const group=(fresh.length?fresh:items).sort((a,b)=>a.id.localeCompare(b.id));
  const best=group[0];
  const score=(signal==='follow'?100:80)+(context.category===c.category?10:0)-timesShown*20;
  choices.push({campaign:c,variant:best,signal,score});
 }
 if(!choices.length)return null;
 choices.sort((a,b)=>b.score-a.score||a.campaign.id.localeCompare(b.campaign.id));
 const winner=choices[0];
 return Object.freeze({
  sponsored:true,sponsorLabel:'Sponsored',
  brandId:winner.campaign.brandId,
  campaignId:winner.campaign.id,
  variantId:winner.variant.id,
  why:winner.signal==='follow'?'You chose to follow this brand':'You liked this product'
 });
}

export function modelCampaignLift({budgetUsd,baselineClicks,pilotClicks}={}){
 if(!safeFinite(budgetUsd)||budgetUsd<=0||budgetUsd>1000000||
    !Number.isSafeInteger(baselineClicks)||baselineClicks<0||
    !Number.isSafeInteger(pilotClicks)||pilotClicks<0)return null;
 return Object.freeze({
  status:'illustrative_only',
  verified:false,
  budgetUsd,
  modeledClicksIncreasePercent:baselineClicks===0?null:((pilotClicks-baselineClicks)/baselineClicks)*100,
  modeledCostPerClickUsd:pilotClicks===0?null:budgetUsd/pilotClicks,
  notes:'Hypothetical arithmetic; only trusted, consent-aware receipts can establish delivered views or valid clicks.'
 });
}
