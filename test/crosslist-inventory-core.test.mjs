import test from 'node:test';
import assert from 'node:assert/strict';
import {CROSSLIST_MARKETPLACES,planCrosslistSale} from '../crosslist-inventory-core.mjs';

test('marketplace capabilities are explicit and Mercari import is not false live synchronization',()=>{
 assert.deepEqual(CROSSLIST_MARKETPLACES.map(p=>p.id),['ebay','etsy','mercari','poshmark']);
 assert.equal(CROSSLIST_MARKETPLACES.find(p=>p.id==='mercari').nativeSync,false);
 assert.equal(CROSSLIST_MARKETPLACES.find(p=>p.id==='etsy').nativeSync,true);
 assert.equal(CROSSLIST_MARKETPLACES.find(p=>p.id==='ebay').requiresUserOAuth,true);
});

const listings=[
 {provider:'ebay',listingId:'123',sku:'SKU-01',quantity:1,status:'active'},
 {provider:'etsy',listingId:'456',sku:'SKU-01',quantity:1,status:'active'},
 {provider:'mercari',listingId:'789',sku:'SKU-01',quantity:1,status:'active'},
 {provider:'poshmark',listingId:'ABC',sku:'SKU-01',quantity:1,status:'active'}
];
const sale={provider:'ebay',orderId:'paid-order-01',sku:'SKU-01',quantity:1,status:'paid'};

test('unverified or unpaid events cannot trigger an automatic delist plan',()=>{
 for(const opts of [
  {sale,listings},
  {sale:{...sale,status:'created'},listings,proof:{verifiedBy:'server',provider:'ebay',orderId:'paid-order-01'}},
  {sale,listings,proof:{verifiedBy:'server',provider:'etsy',orderId:'paid-order-01'}}
 ]){
  const result=planCrosslistSale(opts);
  assert.equal(result.status,'unverified');assert.deepEqual(result.actions,[]);
 }
});

test('verified single-unit sale prepares target withdrawals only, never claims to have executed them',()=>{
 const proof={verifiedBy:'server',provider:'ebay',orderId:'paid-order-01'};
 const a=planCrosslistSale({sale,listings,proof,enabledAdapters:['etsy']});
 const b=planCrosslistSale({sale,listings,proof,enabledAdapters:['etsy']});
 assert.deepEqual(a,b,'Deterministic plan for idempotent ledger processing');
 assert.equal(a.status,'planned');
 assert.deepEqual(a.actions.map(x=>x.provider),['etsy','mercari','poshmark']);
 assert.equal(a.actions[0].action,'withdraw');
 assert.equal(a.actions[0].status,'requires_server_execution');
 assert.equal(a.actions[1].status,'manual_follow_up');
 assert.ok(a.actions.every(x=>x.status!=='withdrawn'&&x.status!=='sold'));
 assert.ok(a.actions.every(x=>x.key.includes('paid-order-01')));
});

test('same SKU listings for other accounts or inactive inventory are not touched',()=>{
 const a=planCrosslistSale({sale,listings:[
  ...listings,
  {provider:'etsy',listingId:'other',sku:'SKU-02',status:'active',quantity:1},
  {provider:'etsy',listingId:'closed',sku:'SKU-01',status:'withdrawn',quantity:1}
 ],proof:{verifiedBy:'server',provider:'ebay',orderId:'paid-order-01'},enabledAdapters:['etsy']});
 assert.equal(a.actions.length,3);
 assert.ok(a.actions.every(x=>x.listingId!=='other'&&x.listingId!=='closed'));
});

test('multi-unit remaining inventory is reconciled, not blanket delisted',()=>{
 const p=planCrosslistSale({sale:{...sale,quantity:1},proof:{verifiedBy:'server',provider:'ebay',orderId:'paid-order-01'},
  listings:[{provider:'etsy',listingId:'many',sku:'SKU-01',quantity:3,status:'active'}],enabledAdapters:['etsy']});
 assert.equal(p.actions[0].action,'set_quantity');
 assert.equal(p.actions[0].quantity,2);
});
