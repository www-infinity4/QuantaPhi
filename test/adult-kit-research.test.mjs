import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareAdultKitResearch,formatAdultKitChecklist} from '../adult-kit-research.mjs';
import {ADULT_LIFESTYLE_KITS} from '../adult-lifestyle-catalog.mjs';

test('every lifestyle kit prepares a local, source-only multi-store plan with role-aware destinations',()=>{
 for(const kit of ADULT_LIFESTYLE_KITS){
  const plan=prepareAdultKitResearch({kitId:kit.id,budget:'450.00',region:'CO'});
  assert.equal(plan.status,'research_only');
  assert.equal(plan.kitId,kit.id);
  assert.equal(plan.budgetCents,45000);
  assert.equal(plan.budgetLabel,'$450.00');
  assert.equal(plan.region,'CO');
  assert.equal(plan.sources.length,kit.sourceIds.length);
  assert.deepEqual(plan.sources.map(x=>x.id),kit.sourceIds);
  assert.equal(plan.merchantQuotesAvailable,false);
  assert.equal(plan.shipmentsQuoted,false);
  assert.equal(plan.savingsCents,null);
  assert.equal(plan.ordersPlaced,0);
  assert.equal(plan.walletDebits,0);
  assert.equal(plan.profileSaved,false);
  for(const row of plan.sources){
   assert.equal(row.quoteStatus,'not_verified');
   assert.equal(row.fulfillmentStatus,'not_quoted');
   assert.ok(row.role);
   assert.ok(row.officialUrl.startsWith('https://'));
   assert.equal('price' in row,false);
   assert.equal('image' in row,false);
  }
 }
});

test('kit roles distinguish editorial, medical, booking, venue and physical merchants',()=>{
 const byId=id=>ADULT_LIFESTYLE_KITS.flatMap(kit=>prepareAdultKitResearch({kitId:kit.id}).sources).find(x=>x.id===id);
 assert.equal(byId('playboy').role,'publisher');
 assert.equal(byId('hims').role,'health-provider');
 assert.equal(byId('amsterdam-de-wallen').role,'visitor-guide');
 assert.equal(byId('amsterdam-coffeeshops').role,'venue-information');
 assert.equal(byId('opentable').role,'booking-platform');
 assert.equal(byId('cafe-de-jaren').role,'dining-venue');
 assert.equal(byId('victorias-secret').role,'retailer');
 assert.equal(byId('grav').role,'regulated-accessories');
});

test('a kit plan never accepts protected cannabis sources or dubious budget and destination inputs',()=>{
 assert.throws(()=>prepareAdultKitResearch({kitId:'cannabis-sources'}),RangeError);
 assert.throws(()=>prepareAdultKitResearch({kitId:'not-a-kit'}),RangeError);
 for(const bad of ['-1','0','1.005','1e9','99999999','USD 10','']){
  assert.throws(()=>prepareAdultKitResearch({kitId:'room-party',budget:bad}),RangeError,bad);
 }
 assert.throws(()=>prepareAdultKitResearch({kitId:'room-party',budget:'30.00',region:'<script>alert(1)</script>'}),RangeError);
 assert.throws(()=>prepareAdultKitResearch({kitId:'room-party',region:'A'.repeat(61)}),RangeError);
});

test('copy-friendly checklist is user initiated and does not promise merged checkout or freight savings',()=>{
 const plan=prepareAdultKitResearch({kitId:'room-party',budget:'499.99',region:'Nebraska'});
 const receipt=formatAdultKitChecklist(plan);
 assert.match(receipt,/Room and party setup/);
 assert.match(receipt,/Budget ceiling: \$499\.99/);
 assert.match(receipt,/Philips Hue/);
 assert.match(receipt,/Sonos/);
 assert.match(receipt,/https:\/\/www\.etsy\.com\//);
 assert.match(receipt,/No live product prices or availability verified/);
 assert.match(receipt,/Direct and combined shipping not quoted/);
 assert.doesNotMatch(receipt,/guaranteed savings|order confirmed|payment authorized/i);
 assert.throws(()=>formatAdultKitChecklist({status:'purchased'}));
});

test('the plan module has no tracking, wallet charging, network requests, cookies or storage',()=>{
 const src=readFileSync(new URL('../adult-kit-research.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/fetch\s*\(|localStorage|sessionStorage|document\.cookie|sendBeacon|placeOrder|navigator\.clipboard|purchaseAuthorized\s*:\s*true/);
 const card=readFileSync(new URL('../restricted-ad-card.mjs',import.meta.url),'utf8');
 assert.match(card,/prepareAdultKitResearch\(/);
 assert.match(card,/kitPlanForm\.addEventListener\('submit'/);
 assert.match(card,/selectedKitId==='cannabis-sources'/);
 assert.match(card,/kitPlanBox\.hidden=true/);
});
