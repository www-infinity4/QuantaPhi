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

test('card engagement repair history accepts only canonical card:id signatures',()=>{
 const observation={signature:'card:card-a',outcome:'passed',run:'42549289173',
  receipt:'https://github.com/www-infinity4/QuantaPhi/actions/runs/42549289173',sourceVerified:true};
 const accepted=learnRepairOutcome([],observation);
 assert.equal(accepted.length,1);
 const results=rankRepairCandidates({signals:[card('card-a',250,0)],outcomes:accepted});
 assert.equal(results[0].history.passed,1);
 assert.equal(results[0].suggestedPlaybook,'inspect_previous_successful_test');
 assert.equal(learnRepairOutcome([],{...observation,signature:'other:card-a'}).length,0);
});

test('numeric run IDs cannot replay or masquerade as canonical string CI receipts',()=>{
 const record={signature:'searxng_empty',outcome:'passed',run:'42549289173',
  receipt:'https://github.com/www-infinity4/QuantaPhi/actions/runs/42549289173',sourceVerified:true};
 const old=learnRepairOutcome([],record);
 const replay=learnRepairOutcome(old,{...record,run:42549289173});
 assert.deepEqual(replay,old);
 const ranked=rankRepairCandidates({signals:[ci('searxng_empty')],outcomes:[record,{...record,run:42549289173}]});
 assert.equal(ranked[0].history.observations,1);
});

test('malformed null telemetry and non-object entries are ignored safely',()=>{
 const valid=ci('searxng_empty',2);
 const got=rankRepairCandidates({signals:[null,undefined,42,'bad',[],valid,card('card-a',180,0)]});
 assert.equal(got.length,2);
 assert.equal(got[0].key,'ci:searxng_empty');
 assert.equal(got[0].count,2);
});

test('large click-through aggregates preserve a genuine weighted percentage',()=>{
 const v=rankRepairCandidates({signals:[card('big-card',1_000_000,6000),card('big-card',1_000_000,6000)]});
 assert.equal(v.length,1,'combined 0.6% must not be falsely reclassified as >=1%');
 assert.equal(v[0].views,2_000_000);
 assert.equal(v[0].clicks,12_000);
});
