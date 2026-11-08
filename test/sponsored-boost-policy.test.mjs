import test from 'node:test';
import assert from 'node:assert/strict';
import {selectSponsoredBoost,qualifiesSponsorCampaign,modelCampaignLift} from '../sponsored-boost-policy.mjs';

const now='2026-11-07T19:00:00.000Z';
const campaign={
 id:'trial-100',brandId:'radio-company',category:'retail',status:'approved',
 sponsorLabel:'Sponsored',contractReceipt:'contract-2026-11-07-001',
 fundingReceipt:'verified-settlement-2026-11-07-001',fundingStatus:'settled',
 startsAt:'2026-11-07T12:00:00.000Z',endsAt:'2026-11-14T12:00:00.000Z',
 maxViewsPerSession:2,minimumGapMinutes:30,
 variants:[
  {id:'radio-1',status:'approved',rightsVerified:true,inStock:true,productUpdatedAt:'2026-11-07T15:00:00.000Z'},
  {id:'radio-2',status:'approved',rightsVerified:true,inStock:true,productUpdatedAt:'2026-11-07T17:00:00.000Z'}
 ]
};
const visitor={
 personalizationOptIn:true,activeSession:true,followingBrandIds:['radio-company'],
 likedProductIds:[],notForMeBrandIds:[],seenSponsoredThisSession:{},lastSponsoredAt:{},
 lastVariantByCampaign:{}
};
const context={now,category:'retail'};
test('Never target if no opt-in, no voluntary brand signal, inactive session, or explicit Not for me',()=>{
 assert.equal(selectSponsoredBoost([campaign],{...visitor,personalizationOptIn:false},context),null);
 assert.equal(selectSponsoredBoost([campaign],{...visitor,activeSession:false},context),null);
 assert.equal(selectSponsoredBoost([campaign],{...visitor,followingBrandIds:[]},context),null);
 assert.equal(selectSponsoredBoost([campaign],{...visitor,notForMeBrandIds:['radio-company']},context),null);
 assert.equal(selectSponsoredBoost([campaign],{...visitor,seenSponsoredThisSession:{'trial-100':2}},context),null);
 assert.equal(selectSponsoredBoost([campaign],{...visitor,lastSponsoredAt:{'trial-100':'2026-11-07T18:45:00.000Z'}},context),null);
});
test('Paid sponsorships require approved inventory, valid rights, contract and settled funding',()=>{
 for(const change of [
  {status:'pending'}, {fundingStatus:'pending'}, {fundingReceipt:''},
  {contractReceipt:''},{sponsorLabel:'Promoted'}, {startsAt:'2026-11-08T12:00:00.000Z'},
  {endsAt:'2026-11-07T12:00:00.000Z'}, {category:'cannabis'}
 ]){
  assert.equal(qualifiesSponsorCampaign({...campaign,...change},context),false,JSON.stringify(change));
 }
 assert.equal(qualifiesSponsorCampaign(campaign,context),true);
});
test('Rotate only recent eligible approved products without repeating previous image/product',()=>{
 const result=selectSponsoredBoost([campaign],visitor,context);
 assert.equal(result.sponsored,true);
 assert.equal(result.sponsorLabel,'Sponsored');
 assert.equal(result.campaignId,'trial-100');
 assert.equal(result.why,'You chose to follow this brand');
 assert.equal(result.variantId,'radio-1');
 const next=selectSponsoredBoost([campaign],{...visitor,lastVariantByCampaign:{'trial-100':'radio-1'}},context);
 assert.equal(next.variantId,'radio-2');
 const sold=selectSponsoredBoost([{...campaign,variants:[
  {...campaign.variants[0],inStock:false},
  {...campaign.variants[1],rightsVerified:false}
 ]}],visitor,context);
 assert.equal(sold,null);
 const stale=selectSponsoredBoost([{...campaign,variants:campaign.variants.map(v=>({...v,productUpdatedAt:'2026-10-01T13:00:00.000Z'}))}],visitor,context);
 assert.equal(stale,null);
});
test('Visitor likes a specific item but does not give access to unrelated advertisers',()=>{
 const a={...campaign,brandId:'radio-company',variants:campaign.variants};
 const b={...campaign,id:'trial-200',brandId:'other-company',variants:[{...campaign.variants[0],id:'other-1'}]};
 const state={...visitor,followingBrandIds:[],likedProductIds:['radio-1']};
 assert.equal(selectSponsoredBoost([b,a],state,context).campaignId,'trial-100');
 assert.equal(selectSponsoredBoost([b],state,context),null);
});
test('Do not consume or infer wallet, finance, personal identity, location or browsing history',()=>{
 const state={...visitor,chime:{balance:950},paypal:{token:'secret'},location:'private',searchHistory:['private'],medicalInfo:'confidential'};
 const out=selectSponsoredBoost([campaign],state,context);
 assert.deepEqual(Object.keys(out).sort(),['brandId','campaignId','sponsored','sponsorLabel','variantId','why'].sort());
 assert.ok(!JSON.stringify(out).includes('secret'));
 assert.ok(!JSON.stringify(out).includes('950'));
 assert.ok(!JSON.stringify(out).includes('private'));
});
test('Pilot comparisons are modeled, not verified clicks, earnings or new customer identities',()=>{
 const p=modelCampaignLift({budgetUsd:100,baselineClicks:50,pilotClicks:100});
 assert.equal(p.budgetUsd,100);
 assert.equal(p.modeledClicksIncreasePercent,100);
 assert.equal(p.modeledCostPerClickUsd,1);
 assert.equal(p.status,'illustrative_only');
 assert.equal(p.verified, false);
 assert.equal(modelCampaignLift({budgetUsd:100,baselineClicks:0,pilotClicks:100}).modeledClicksIncreasePercent,null);
 assert.equal(modelCampaignLift({budgetUsd:-1,baselineClicks:20,pilotClicks:100}),null);
});
