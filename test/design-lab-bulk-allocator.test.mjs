import test from 'node:test';
import assert from 'node:assert/strict';
import {moneyCents,formatCents,planBulkAllocation} from '../design-lab/bulk-allocator.mjs';
test('300 items at $1 exactly split among five buyers at 60 each',()=>{
 const p=planBulkAllocation({quantity:300,unitPrice:'1.00',buyers:5});
 assert.deepEqual(p.rows.map(r=>r.units),[60,60,60,60,60]);
 assert.equal(p.goodsCents,30000);assert.equal(p.deliveredCents,30000);
 assert.equal(p.unallocatedUnits,0);assert.equal(p.ordersPlaced,0);assert.equal(p.purchaseAuthorized,false);
});
test('300 items at $1 exactly split among ten buyers at 30 each',()=>{
 const p=planBulkAllocation({quantity:300,unitPrice:'1.00',buyers:10});
 assert.deepEqual(p.rows.map(r=>r.units),Array(10).fill(30));
 assert.deepEqual(p.rows.map(r=>r.deliveredCents),Array(10).fill(3000));
});
test('delivered costs include shipping tax and storage, exact cents reconciled',()=>{
 const p=planBulkAllocation({quantity:300,unitPrice:'1.00',buyers:5,shipping:'25.00',tax:'18.25',storage:'10.00'});
 assert.equal(p.sharedCents,5325);assert.equal(p.deliveredCents,35325);
 assert.equal(p.rows.reduce((s,r)=>s+r.deliveredCents,0),35325);
 assert.equal(p.rows.reduce((s,r)=>s+r.units,0),300);
 assert.deepEqual(p.rows.map(r=>r.deliveredCents),Array(5).fill(7065));
});
test('odd quantities and shared cents are fully allocated with no rounding loss',()=>{
 const p=planBulkAllocation({quantity:7,unitPrice:'0.03',buyers:3,shipping:'0.05',tax:'0.01',storage:'0.02'});
 assert.deepEqual(p.rows.map(r=>r.units),[3,2,2]);
 assert.equal(p.deliveredCents,29);
 assert.equal(p.rows.reduce((s,r)=>s+r.deliveredCents,0),29);
 assert.equal(p.unallocatedUnits,0);
});
test('invalid quantities, negative prices, fractional cents and excess buyers fail closed',()=>{
 const bad=[{quantity:300,unitPrice:'-1',buyers:5},{quantity:300,unitPrice:'1.001',buyers:5},{quantity:300.5,unitPrice:'1',buyers:5},{quantity:0,unitPrice:'1',buyers:5},{quantity:2,unitPrice:'1',buyers:3},{quantity:300,unitPrice:'1',buyers:0},{quantity:300,unitPrice:'1',buyers:5,shipping:'1e5'}];
 for(const input of bad)assert.throws(()=>planBulkAllocation(input),RangeError);
 assert.equal(moneyCents('1.20'),120);assert.equal(formatCents(7065),'$70.65');
});

test('the existing Design Lab mounts a real calculator, with no checkout or wallet action',async()=>{
 const {readFileSync}=await import('node:fs');
 const html=readFileSync(new URL('../design-lab/index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../design-lab/bulk-allocator-ui.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../design-lab/lab.css',import.meta.url),'utf8');
 assert.match(html,/id="bulkAllocatorForm"/);
 assert.match(html,/bulk-allocator-ui\.mjs/);
 assert.match(html,/name="storage"/);
 assert.match(html,/name="shipping"/);
 assert.match(ui,/planBulkAllocation\(fields\)/);
 assert.match(ui,/event\.preventDefault\(\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.doesNotMatch(ui,/fetch\(|localStorage|wallet|checkout|payment/i);
});
