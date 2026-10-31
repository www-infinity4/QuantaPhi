import test from 'node:test';
import assert from 'node:assert/strict';
import {allocateBulkPool,formatUsdMinor} from '../design-lab/bulk-pool-core.mjs';

const offer={quantity:300,unitPriceMinor:100,extraCostMinor:0,currency:'USD'};
const buyers=(count,quantity)=>Array.from({length:count},(_,i)=>({id:'buyer-'+i,quantity}));
const plan=(participants,changes={})=>allocateBulkPool({offer:{...offer,...changes},buyers:participants,baselineUnitPriceMinor:100});

test('USD output preserves the last cent for the largest exact supported total',()=>{
 assert.equal(formatUsdMinor(Number.MAX_SAFE_INTEGER),'$90,071,992,547,409.91');
 assert.equal(formatUsdMinor(-101),'-$1.01');assert.equal(formatUsdMinor(0),'$0.00');
 assert.throws(()=>formatUsdMinor(1.5),/safe integer/);
 const p=allocateBulkPool({offer:{quantity:97,unitPriceMinor:92857724275676,extraCostMinor:419},buyers:[{id:'one',quantity:97}]});
 assert.equal(p.totalMinor,Number.MAX_SAFE_INTEGER);
 assert.equal(formatUsdMinor(p.allocations[0].totalMinor),'$90,071,992,547,409.91');
});

test('300 meals fully allocate as five shares of 60 or ten shares of 30',()=>{
 for(const [count,quantity] of [[5,60],[10,30]]){
  const p=plan(buyers(count,quantity));
  assert.equal(p.status,'allocated');assert.equal(p.fullyAllocated,true);
  assert.equal(p.allocatedQuantity,300);assert.equal(p.unallocatedQuantity,0);
  assert.equal(p.totalMinor,30000);assert.equal(p.unallocatedCostMinor,0);
  assert.equal(p.allocations.length,count);
  assert.equal(p.allocations.every(b=>b.quantity===quantity&&b.totalMinor===quantity*100),true);
  assert.equal(p.canOrder,false);assert.equal(p.proposalOnly,true);
  assert.equal(p.baselineComparison.savingsMinor,0);
  assert.equal(p.baselineComparison.improvesCashCost,false);
 }
});

test('five buyers requesting 30 leave 150 meals and their costs explicitly unallocated',()=>{
 const p=plan(buyers(5,30),{extraCostMinor:1000});
 assert.equal(p.status,'underfilled');assert.equal(p.fullyAllocated,false);
 assert.equal(p.allocatedQuantity,150);assert.equal(p.unallocatedQuantity,150);
 assert.equal(p.unallocatedCostMinor,15500);
 assert.deepEqual(p.allocations.map(b=>b.totalMinor),[3100,3100,3100,3100,3100]);
 assert.equal(p.allocations.reduce((sum,b)=>sum+b.totalMinor,0)+p.unallocatedCostMinor,p.totalMinor);
 assert.equal(p.allocationReady,false);assert.equal(p.canOrder,false);
});

test('cent remainders are conserved deterministically without floating-point rounding',()=>{
 const input={offer:{quantity:3,unitPriceMinor:100,extraCostMinor:2},buyers:buyers(3,1)};
 const a=allocateBulkPool(input),b=allocateBulkPool(input);
 assert.deepEqual(a,b);
 assert.deepEqual(a.allocations.map(x=>x.extraCostMinor),[1,1,0]);
 assert.deepEqual(a.allocations.map(x=>x.totalMinor),[101,101,100]);
 assert.equal(a.allocations.reduce((s,x)=>s+x.totalMinor,0),302);
 assert.deepEqual(a.allocations[0].unitCost,{numeratorMinor:101,quantity:1});
});

test('unallocated stock gets its proportional extra costs including remainder cents',()=>{
 const p=allocateBulkPool({offer:{quantity:3,unitPriceMinor:100,extraCostMinor:2},buyers:[{id:'one',quantity:1}]});
 assert.equal(p.allocations[0].extraCostMinor,1);assert.equal(p.unallocatedCostMinor,201);
 assert.equal(p.totalMinor,302);
});

test('budgets include each buyer share of extras and cannot be overridden by full allocation',()=>{
 const p=allocateBulkPool({offer:{quantity:2,unitPriceMinor:100,extraCostMinor:1},buyers:[{id:'a',quantity:1,maxTotalMinor:100},{id:'b',quantity:1,maxTotalMinor:101}]});
 assert.equal(p.fullyAllocated,true);assert.equal(p.status,'over_budget');
 assert.equal(p.allocations[0].totalMinor,101);assert.equal(p.allocations[0].underBudget,false);
 assert.equal(p.withinBudgets,false);assert.equal(p.allocationReady,false);assert.equal(p.canOrder,false);
});

test('oversubscribed demand remains unresolved rather than silently trimming one buyer',()=>{
 const p=plan(buyers(6,60));
 assert.equal(p.status,'overcommitted');assert.equal(p.excessDemand,60);
 assert.equal(p.requestedQuantity,360);assert.equal(p.allocatedQuantity,0);
 assert.equal(p.unallocatedQuantity,300);assert.equal(p.unallocatedCostMinor,30000);
 assert.equal(p.allocations.every(b=>b.quantity===0&&b.totalMinor===0&&b.underBudget===null),true);
 assert.equal(p.fullyAllocated,false);assert.equal(p.allocationReady,false);
});

test('whole redistributable packs are respected and mismatches do not produce allocations',()=>{
 const good=plan(buyers(5,60),{packSize:30});assert.equal(good.fullyAllocated,true);
 const bad=plan([{id:'a',quantity:45},{id:'b',quantity:255}],{packSize:30});
 assert.equal(bad.status,'incompatible_pack');assert.deepEqual(bad.incompatibleBuyerIds,['a','b']);
 assert.equal(bad.allocatedQuantity,0);assert.equal(bad.unallocatedQuantity,300);
 assert.throws(()=>plan(buyers(5,60),{packSize:31}),/whole packs/);
});

test('baseline compares equal quantities and fees prevent fictional cash savings',()=>{
 const p=plan(buyers(5,60),{extraCostMinor:1000});
 assert.deepEqual(p.baselineComparison,{comparison:'equal_quantity',quantity:300,baselineUnitPriceMinor:100,baselineTotalMinor:30000,proposedTotalMinor:31000,savingsMinor:-1000,improvesCashCost:false});
 assert.equal(p.allocations[0].savingsMinor,-200);
 const lower=allocateBulkPool({offer:{...offer,unitPriceMinor:80},buyers:buyers(10,30),baselineUnitPriceMinor:100});
 assert.equal(lower.baselineComparison.savingsMinor,6000);assert.equal(lower.baselineComparison.improvesCashCost,true);
 const unknown=allocateBulkPool({offer,buyers:buyers(5,60)});
 assert.equal(unknown.baselineComparison,null);assert.equal(unknown.allocations[0].savingsMinor,null);
});

test('input records are not mutated and IDs do not become object prototype keys',()=>{
 const input={offer:{...offer},buyers:[{id:'__proto__',quantity:150},{id:'constructor',quantity:150}]};
 const before=structuredClone(input);const p=allocateBulkPool(input);
 assert.deepEqual(input,before);assert.equal(p.allocations[0].id,'__proto__');
 assert.equal(Object.isFrozen(p),true);assert.equal(Object.isFrozen(p.allocations),true);
 assert.throws(()=>plan([{id:' a ',quantity:30},{id:'a',quantity:30}]),/Duplicate buyer/);
 assert.throws(()=>plan([{id:'a\nb',quantity:30}]),/Buyer ID/);
});

test('missing, malformed, negative, fractional, coerced and excessive inputs fail closed',()=>{
 assert.throws(()=>allocateBulkPool(),/offer/i);
 for(const quantity of [0,-1,1.5,'300',NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>plan(buyers(5,60),{quantity}),/safe integer/);
 for(const unitPriceMinor of [-1,0.1,'100',NaN])assert.throws(()=>plan(buyers(5,60),{unitPriceMinor}),/safe integer/);
 assert.throws(()=>plan(buyers(5,60),{extraCostMinor:-1}),/safe integer/);
 assert.throws(()=>plan(buyers(5,60),{extraCostMinor:null}),/safe integer/);
 assert.throws(()=>plan(buyers(5,60),{packSize:null}),/safe integer/);
 assert.throws(()=>plan([{id:'a',quantity:0}]),/safe integer/);
 assert.throws(()=>plan([{id:'a',quantity:1,maxTotalMinor:-1}]),/safe integer/);
 assert.throws(()=>plan([{id:'',quantity:1}]),/Buyer ID/);
 assert.throws(()=>allocateBulkPool({offer,buyers:new Array(2)}),/buyer/i);
 assert.throws(()=>allocateBulkPool({offer,buyers:buyers(1001,1)}),/at most 1000/);
 assert.throws(()=>plan(buyers(5,60),{currency:'usd'}),/Currency/);
 assert.throws(()=>plan(buyers(5,60),{currency:null}),/Currency/);
 assert.throws(()=>allocateBulkPool({offer,buyers:buyers(5,60),baselineUnitPriceMinor:'100'}),/safe integer/);
 const empty=plan([]);assert.equal(empty.status,'underfilled');assert.equal(empty.unallocatedCostMinor,30000);
});

test('totals and demand overflow are rejected while large exact intermediate products remain safe',()=>{
 const max=Number.MAX_SAFE_INTEGER;
 assert.throws(()=>allocateBulkPool({offer:{quantity:2,unitPriceMinor:max},buyers:buyers(2,1)}),/safe integer arithmetic/);
 assert.throws(()=>allocateBulkPool({offer:{quantity:1,unitPriceMinor:max,extraCostMinor:1},buyers:buyers(1,1)}),/safe integer arithmetic/);
 assert.throws(()=>allocateBulkPool({offer:{quantity:max,unitPriceMinor:0},buyers:[{id:'a',quantity:max},{id:'b',quantity:1}]}),/safe integer arithmetic/);
 assert.throws(()=>allocateBulkPool({offer:{quantity:2,unitPriceMinor:1},buyers:buyers(2,1),baselineUnitPriceMinor:max}),/safe integer arithmetic/);
 const big=allocateBulkPool({offer:{quantity:3,unitPriceMinor:0,extraCostMinor:max},buyers:[{id:'a',quantity:2},{id:'b',quantity:1}]});
 assert.equal(big.allocations.reduce((sum,b)=>sum+b.totalMinor,0),max);
 assert.deepEqual(big.allocations.map(b=>b.extraCostMinor),[6004799503160661,3002399751580330]);
});
