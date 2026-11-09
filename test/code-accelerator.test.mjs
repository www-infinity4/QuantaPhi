import test from 'node:test';
import assert from 'node:assert/strict';
import {rankRepairCandidates,learnRepairOutcome} from '../test-ground-ai/code-accelerator.mjs';

const ci=(signature,count=1)=>({type:'ci_failure',signature,path:'workers/bubbles-tools/search.mjs',count,
 receipt:'https://github.com/www-infinity4/QuantaPhi/actions/runs/42549289173',sourceVerified:true});
const card=(id,views,clicks)=>({type:'card_aggregate',id,views,clicks,
 receipt:'cloudflare-d1-aggregate:read-only-check-1',sourceVerified:true});

test('code accelerator ranks real failing CI before low-click opportunities without inventing patches',()=>{
 const results=rankRepairCandidates({signals:[ci('searxng_empty',4),card('card-a',180,0)],outcomes:[]});
 assert.equal(results.length,2);
 assert.equal(results[0].key,'ci:searxng_empty');
 assert.equal(results[0].nextStep,'inspect_source_and_reproduce');
 assert.equal(results[0].patch,null);
 assert.equal(results[0].completed,false);
 assert.ok(results[0].score>results[1].score);
 assert.equal(results[1].key,'card:card-a');
});
test('zero impressions is not evidence a card performs poorly',()=>{
 assert.deepEqual(rankRepairCandidates({signals:[card('new-card',0,0)]}),[]);
 assert.deepEqual(rankRepairCandidates({signals:[card('small-sample',4,0)]}),[]);
 assert.equal(rankRepairCandidates({signals:[card('exposed-card',140,0)]}).length,1);
});
test('ignore unsourced, unverified, private or malformed telemetry',()=>{
 const raw={...ci('ok'),sourceVerified:false};
 const bad=[raw, {...ci('ok'),receipt:'https://evil.invalid/actions/runs/999'},
  {...card('foo',300,0),receipt:''},{...card('foo',300,0),email:'visitor@example.com'},
  {...card('foo',300,0),id:'../../secrets'}, {...ci('ok'),path:'private/secrets.env'},
  {...ci('ok'),count:Infinity}];
 assert.deepEqual(rankRepairCandidates({signals:bad}),[]);
});
test('learning only considers deduplicated test/PR outcomes with a valid source receipt',()=>{
 const first=learnRepairOutcome([],{
  signature:'searxng_empty',outcome:'passed',run:'42549289173',
  receipt:'https://github.com/www-infinity4/QuantaPhi/actions/runs/42549289173',sourceVerified:true
 });
 assert.equal(first.length,1);
 assert.equal(learnRepairOutcome(first,first[0]).length,1);
 assert.equal(learnRepairOutcome(first,{signature:'searxng_empty',outcome:'passed',run:'999',receipt:'invalid',sourceVerified:true}).length,1);
 const plan=rankRepairCandidates({signals:[ci('searxng_empty',4)],outcomes:first});
 assert.equal(plan[0].history.passed,1);
 assert.equal(plan[0].history.failed,0);
 assert.equal(plan[0].verification,'source_references_only');
});
test('same error fingerprint is aggregated; histories cannot be used to mint rewards or deploy code',()=>{
 const results=rankRepairCandidates({signals:[ci('searxng_empty',2),ci('searxng_empty',3)],outcomes:[]});
 assert.equal(results.length,1);
 assert.equal(results[0].count,5);
 assert.equal(results[0].patch,null);
 assert.equal(results[0].productionVerified,false);
 assert.equal(results[0].walletRewards,0);
});
