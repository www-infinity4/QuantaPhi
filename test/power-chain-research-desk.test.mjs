import test from 'node:test';
import assert from 'node:assert/strict';
import {RESEARCH_DESK_SEATS, reviewPowerChainResearch, compareResearchReadback} from '../design-lab/power-chain-research-desk.mjs';

const plan={query:'solar battery storage research',lanes:['research','shop'],targets:['nasa.gov','homedepot.com'],execution:'public-web-index'};
const source=(target,title,path)=>({target,title,url:'https://www.'+target+'/'+path,snippet:'Public index preview, not independently fact-checked'});
const receipt={query:plan.query,targets:2,checked:2,found:2,failed:0,stopped:false,
 steps:[{target:'nasa.gov',status:'matched',results:1},{target:'homedepot.com',status:'matched',results:1}],
 results:[source('nasa.gov','Original reference','solar'),source('homedepot.com','Product information','listing')],execution:'public-web-index',finishedAt:'2026-11-15T17:00:00.000Z'};

test('specialists separate discovery, source review, decision, veto and execution',()=>{
 assert.deepEqual(RESEARCH_DESK_SEATS.map(x=>x.id),['scanner','analyst','chief','veto','executor']);
 assert.equal(RESEARCH_DESK_SEATS.some(x=>/trade|wallet|order/i.test(x.purpose)),false);
});

test('verified host links remain discovery only, with no merchant or transaction permissions',()=>{
 const review=reviewPowerChainResearch(plan,receipt);
 assert.equal(review.status,'research_discovery');
 assert.equal(review.sources.length,2);
 assert.equal(review.distinctHosts,2);
 assert.equal(review.claimsVerified,false);
 assert.equal(review.merchantQuotesVerified,false);
 assert.equal(review.veto.blocked,false);
 assert.deepEqual(review.execution,{mode:'research_only',browserActionsExecuted:0,ordersPlaced:0,checkoutAuthorized:false,tradeAuthorized:false});
});

test('unsafe URLs, forged targets and duplicate links never enter source evidence',()=>{
 const bad={...receipt,results:[...receipt.results,receipt.results[0],source('fake.example','Faked source','/foo'),{target:'nasa.gov',title:'Spoof',url:'https://nasa.gov.evil.test/more'},{target:'nasa.gov',title:'Insecure',url:'http://nasa.gov/foo'}]};
 const review=reviewPowerChainResearch(plan,bad);
 assert.equal(review.sources.length,2);
 assert.equal(review.rejectedSourceRows,4);
 assert.equal(review.veto.blocked,true);
 assert.ok(review.veto.reasons.includes('untrusted_source_rows'));
});

test('failed and interrupted research cannot be reported complete',()=>{
 const review=reviewPowerChainResearch(plan,{...receipt,checked:1,steps:receipt.steps.slice(0,1),failed:1,stopped:true});
 assert.equal(review.status,'blocked');
 assert.ok(review.veto.reasons.includes('stopped'));
 assert.ok(review.veto.reasons.includes('partial_source_checks'));
 assert.ok(review.veto.reasons.includes('search_errors'));
});

test('zero results are surfaced honestly with a veto, not invented citations',()=>{
 const review=reviewPowerChainResearch(plan,{...receipt,found:0,results:[],steps:receipt.steps.map(x=>({...x,status:'empty',results:0}))});
 assert.equal(review.sources.length,0);
 assert.equal(review.status,'blocked');
 assert.ok(review.veto.reasons.includes('no_safe_source_links'));
});

test('result receipts must correspond to the same plan before review',()=>{
 assert.throws(()=>reviewPowerChainResearch(plan,{...receipt,query:'different query'}),/same research query/);
 assert.throws(()=>reviewPowerChainResearch({...plan,targets:['bad.local']},receipt),/approved source circuit/);
 assert.throws(()=>reviewPowerChainResearch(plan,{...receipt,steps:[{target:'unlisted.example',status:'matched'}]}),/outside the plan/);
});

test('readback is an exact match, not permission or proof of a browser click',()=>{
 const action={jobId:'power-1330-1',kind:'open_source',url:'https://www.nasa.gov/solar'};
 assert.deepEqual(compareResearchReadback(action,{...action}),{matches:true,actionExecuted:false,checkoutAuthorized:false});
 assert.equal(compareResearchReadback(action,{...action,url:'https://evil.test/' }).matches,false);
 assert.equal(compareResearchReadback({...action,kind:'pay'},{...action,kind:'pay'}).matches,false);
});
