import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RATE_OPTIONS, quoteForTier, compareCampaign, disclosureForTraffic} from '../advertiser-sales-core.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('proposed packages include genuine $100 trial and $100000 premium without performance guarantee',()=>{
 assert.deepEqual(RATE_OPTIONS.map(t=>t.priceUsd),[100,1000,5000,15000,100000]);
 assert.equal(quoteForTier('pilot').priceUsd,100);
 assert.equal(quoteForTier('enterprise').priceUsd,100000);
 assert.ok(RATE_OPTIONS.every(t=>t.status==='proposed'&&t.guaranteedImpressions===null));
 assert.throws(()=>quoteForTier('owner_free_1000'),/unknown_tier/);
});

test('reports never represent Cloudflare pageviews as actual sponsored ad impressions',()=>{
 const source=disclosureForTraffic({source:'Cloudflare GraphQL httpRequests1dGroups',pageViews:163463,includesBots:true,uniqueVisitors:false});
 assert.match(source,/includes bots/i);
 assert.match(source,/not .*ad impressions|not .*sponsored impressions/i);
 assert.match(source,/not unique visitors/i);
 assert.ok(!source.includes('verified ad clicks'));
});

test('manual before and after comparisons are explicitly hypothetical, with honest zero divisions',()=>{
 const example=compareCampaign({costUsd:100,priorClicks:50,newClicks:100,actualVerified:false});
 assert.equal(example.priorCostPerClickUsd,2);
 assert.equal(example.newCostPerClickUsd,1);
 assert.equal(example.clickDifference,50);
 assert.equal(example.clickIncreasePercent,100);
 assert.equal(example.reportStatus,'illustrative_unverified');
 const none=compareCampaign({costUsd:100,priorClicks:0,newClicks:0,actualVerified:false});
 assert.equal(none.newCostPerClickUsd,null);
 assert.equal(none.clickIncreasePercent,null);
 assert.throws(()=>compareCampaign({costUsd:100,priorClicks:10,newClicks:20,actualVerified:true}),/server_receipt_required/);
});

test('a buyer can read a real public media kit and source boundaries without fake purchase or dead checkout',()=>{
 const html=read('advertise.html');
 assert.match(html,/<h1[^>]*>Advertise on QuantaPhi<\/h1>/);
 assert.match(html,/id="salesPrices"/);
 assert.match(html,/id="salesTraffic"/);
 assert.match(html,/id="salesCopy"/);
 assert.match(html,/Sponsored/i);
 assert.match(html,/not unique visitors/i);
 assert.match(html,/not ad impressions/i);
 assert.match(html,/\$100,000/);
 assert.match(html,/\$100/);
 assert.doesNotMatch(html,/stripe\.com\/checkout|<form[^>]*action="\/charge"|auto.?pay|clicks guaranteed/i);
 const js=read('advertise.js');
 assert.match(js,/\/api\/site-traffic/);
 assert.match(js,/source.*Cloudflare|Cloudflare.*source/s);
 assert.match(js,/\.textContent=/);
 assert.doesNotMatch(js,/innerHTML=|\/api\/advertisers\/charge|\/api\/wallet/);
});

test('retains separate AdSense publisher config and never asserts site approval',()=>{
 assert.equal(read('ads.txt').trim(),'google.com, pub-4614831062084491, DIRECT, f08c47fec0942fa0');
 assert.match(read('advertise.html'),/AdSense approval and payout are unverified/i);
 assert.match(read('advertise.html'),/no contracts signed/i);
 assert.match(read('advertise.html'),/no visitor profile.*sold/i);
 assert.match(read('about.html'),/href="\/advertise\.html"/);
});
