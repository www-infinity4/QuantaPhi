import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Extract the real Worker entry guard, rather than testing a copied helper.
// The runner's rejected PR #1042 introduced a security regression by allowing
// an ordinary job with no sourceReview to enter this separate OIDC-only path.
const source=readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
const start=source.indexOf('async acceptSourceReview({lease,body,runUrl,engine}){');
const end=source.indexOf('const pinned=lease.job.sourceReview;',start);
assert.ok(start>0&&end>start&&end-start<2000,'actual source-review guard is present');
const preflight=source.slice(start,end);
const Guard=new Function('return class Guard {\n'+preflight+'  return true;\n }\n}')();
const guard=new Guard();

test('source-review entry rejects a valid ordinary writer lease without signed sourceReview scope',async()=>{
 for(const lease of [
  {engine:true,job:{}},
  {engine:true,job:{sourceReview:null}},
  {engine:true,job:{sourceReview:{kind:'unsupported'}}},
  {engine:false,job:{sourceReview:{kind:'source_review_only'}}}
 ])await assert.rejects(
  guard.acceptSourceReview({engine:true,lease,body:{},runUrl:'https://example.invalid'}),
  /source_review_runner_identity_required/
 );
});

test('source-review entry requires engine principal and the explicit source-only kind',async()=>{
 const lease={engine:true,job:{sourceReview:{kind:'source_review_only'}}};
 await assert.rejects(guard.acceptSourceReview({engine:false,lease}),/source_review_runner_identity_required/);
 assert.equal(await guard.acceptSourceReview({engine:true,lease}),true);
});

test('runtime check precedes review-validation, DB access, or any mutation',()=>{
 const guardText=preflight.replace(/\s+/g,' ');
 assert.match(guardText,/sourceReview\?\.kind!==['"]source_review_only['"]/);
 assert.ok(end<source.indexOf('validatePinkSourceReceipt(',start));
});
