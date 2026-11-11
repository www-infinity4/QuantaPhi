import test from 'node:test';
import assert from 'node:assert/strict';
import {DEPARTMENTS,departmentFor,matchesDepartment,placementPolicy,freshApprovedCreatives,freshBrokerCreative} from '../quanta-context-placement.mjs';
import {cleanFeedState,feedCandidates,toggleInterest} from '../quanta-feed-rank.mjs';
import {readFileSync} from 'node:fs';
const now=new Date('2026-11-10T12:30:00-06:00');
const card=(id,category='Shopping',extra={})=>({id,name:id,category,feature:id,study:'Official source',...extra});
test('Oracle departments classify the real card inventory; Sports and News stay separate',()=>{
 assert.ok(DEPARTMENTS.some(x=>x.id==='sports')&&DEPARTMENTS.some(x=>x.id==='news'));
 assert.equal(departmentFor(card('googleTrendNba','Sports')),'sports');
 assert.equal(departmentFor(card('verified-news','News')),'news');
 assert.equal(departmentFor(card('developer-tool','Developer tools')),'developers');
 assert.equal(departmentFor(card('palm-hotel','Travel')),'travel');
 assert.equal(matchesDepartment(card('nba','Sports'),'sports'),true);
 assert.equal(matchesDepartment(card('nba','Sports'),'news'),false);
 assert.equal(matchesDepartment(card('nba','Sports'),'all'),true);
});
test('For You is limited to followed cards or visitor-chosen departments; Public is broader',()=>{
 let state=cleanFeedState({});
 const all=[card('go-shopping','Shopping'),card('latest-news','News'),card('bball-team','Sports')];
 assert.deepEqual(feedCandidates(all,'for-you',state).map(c=>c.id),[]);
 assert.equal(feedCandidates(all,'public',state).length,3);
 state=toggleInterest(state,'sports');
 assert.deepEqual(feedCandidates(all,'for-you',state).map(c=>c.id),['bball-team']);
 state={...state,following:['go-shopping']};
 assert.deepEqual(new Set(feedCandidates(all,'for-you',state).map(c=>c.id)),new Set(['bball-team','go-shopping']));
 assert.deepEqual(feedCandidates(all,'following',state).map(c=>c.id),['go-shopping']);
 assert.ok(!('gender' in cleanFeedState({gender:'male',interests:['sports']})));
});
test('verified lunch ad can run when region/time is verified; business unknown hours never imply open now',()=>{
 const campaign={id:'mcd-source',title:'Official restaurant promotion',type:'sponsored',approved:true,reviewed:true,
  category:'Restaurants',createdAt:'2026-11-09T18:00:00Z',startsAt:'2026-11-02T00:00:00Z',endsAt:'2026-11-30T23:59:59Z',
  dayparts:['lunch'],image:'https://example.org/mcd.png',sourceUrl:'https://example.org/promotion'};
 const a=placementPolicy(campaign,{now,daypart:'lunch'});
 assert.equal(a.eligible,true);
 assert.equal(a.openNow,false);
 assert.notEqual(a.reason,'Open now');
 assert.equal(placementPolicy(campaign,{now:new Date('2026-11-11T02:30:00-06:00'),daypart:'overnight'}).eligible,false);
 assert.equal(placementPolicy({...campaign,merchantHours:{verified:true,open:false}},{now,daypart:'lunch'}).eligible,false);
});
test('seasonal mismatch, expiry and unreviewed paid campaign fail closed',()=>{
 const base={id:'winter-gear',type:'sponsored',approved:true,reviewed:true,createdAt:'2026-11-02T00:00:00Z',
  startsAt:'2026-11-01T00:00:00Z',endsAt:'2026-12-31T23:59:59Z',season:'winter',image:'https://example.org/winter.jpg',sourceUrl:'https://example.org/winter'};
 assert.equal(placementPolicy(base,{now}).eligible,true);
 assert.equal(placementPolicy(base,{now:new Date('2026-07-10T12:30:00-05:00')}).eligible,false);
 assert.equal(placementPolicy({...base,endsAt:'2026-11-08T00:00:00Z'},{now}).eligible,false);
 assert.equal(placementPolicy({...base,reviewed:false},{now}).eligible,false);
 const staleElection={...base,id:'old-election-ad',category:'Political campaign',endsAt:'2026-11-03T00:00:00Z'};
 assert.equal(placementPolicy(staleElection,{now}).eligible,false);
});
test('sensitive targeting is blocked, independent public service notices do not require paid ad consent',()=>{
 assert.equal(placementPolicy({id:'colorectal',category:'Medical screening',type:'sponsored',approved:true,reviewed:true},{now}).eligible,false);
 assert.equal(placementPolicy({id:'cigars',category:'21+',type:'sponsored',approved:true,reviewed:true},{now}).eligible,false);
 assert.equal(placementPolicy({id:'ss-office',type:'public-service',sourceUrl:'https://www.ssa.gov/',category:'Government services'},{now}).eligible,true);
});
test('fresh source-verified cards are deduplicated and require actual approved images and dates',()=>{
 const candidate={slug:'new-company-card',status:'approved',title:'Official item',website:'https://example.org/',
  image:'https://example.org/item.webp',createdAt:'2026-11-09T12:00:00Z',cardUrl:'https://quantaphi.org/cards/new-company-card'};
 assert.equal(freshApprovedCreatives({cards:[candidate,candidate]},{now}).length,1);
 assert.equal(freshApprovedCreatives({cards:[{...candidate,image:''}]},{now}).length,0);
 assert.equal(freshApprovedCreatives({cards:[{...candidate,createdAt:'2025-08-01T00:00:00Z'}]},{now}).length,0);
 assert.equal(freshApprovedCreatives({cards:[{...candidate,status:'unlisted'}]},{now}).length,0);
 assert.equal(freshApprovedCreatives({cards:[{...candidate,image:'data:image/png;base64,fail'}]},{now}).length,0);
});
test('actual homepage and builder wiring never replace Oracle or silently publish fetched creative',()=>{
 const root=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const html=root('index.html'),deck=root('oracle-card-deck.js'),builder=root('quick-card-builder.js');
 assert.ok(html.includes('id="oracleCardDeck"'));
 assert.ok(html.includes('id="oracleCardDepartment"'));
 assert.ok(deck.includes("oracleCardDepartment"));
 assert.ok(builder.includes("freshApprovedCreatives"));
 assert.ok(builder.includes("qcpFreshAds"));
 assert.ok(!html.includes('homepage-v5.html'));
});

test('AdPhi image reuse must not claim licensed rights without current source records',()=>{
 const asset={id:'fixture-ad-01',category:'Shopping',title:'Fixture-only promotion',
  body:'Synthetic editorial fixture, not an advertiser agreement.',
  advertiser:'Synthetic test only',creativeApproved:true,approved:true,reviewed:true,
  imageUrl:'https://publisher.example.org/img.jpg',
  destinationUrl:'https://publisher.example.org/promo',
  createdAt:'2026-11-09T12:00:00Z',startsAt:'2026-11-01T00:00:00Z',endsAt:'2026-11-30T23:59:59Z',
  rights_cleared:true,rights_expires_at:'2026-12-31T23:59:59Z',
  sponsor_agreement_id:'fixture-only-no-commercial-contract'};
 const signed=freshBrokerCreative(asset,{now});
 assert.ok(signed?.rightsVerified===true,'only complete reviewed evidence can mark a campaign image cleared');
 for(const invalid of [
  {rights_cleared:false},{rights_cleared:undefined},
  {rights_expires_at:''},{rights_expires_at:'2026-11-01T00:00:00Z'},
  {sponsor_agreement_id:''},{sponsor_agreement_id:undefined}
 ])assert.equal(freshBrokerCreative({...asset,...invalid},{now}),null,
  'creative with missing rights evidence must not enter publisher preview');
});
