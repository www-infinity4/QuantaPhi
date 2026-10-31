import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPONENTS,RECIPES,validateRecipe} from '../design-lab/component-kit-core.mjs';

const copy=value=>JSON.parse(JSON.stringify(value));
const recipe=id=>copy(RECIPES.find(r=>r.id===id));
const invalid=(r,pattern,options)=>{
 const result=validateRecipe(r,options);
 assert.equal(result.valid,false);assert.match(result.errors.join('\n'),pattern);return result;
};

test('component and recipe contracts are deeply immutable',()=>{
 assert.equal(COMPONENTS.length,10);
 for(const component of COMPONENTS){
  for(const field of ['id','label','radioPart','purpose','maxAuthority','limit'])assert.equal(typeof component[field],'string');
  assert.ok(Object.isFrozen(component));assert.ok(Object.isFrozen(component.inputs));assert.ok(Object.isFrozen(component.outputs));
 }
 assert.ok(Object.isFrozen(RECIPES));
 assert.throws(()=>RECIPES[0].wires[0].type='purchase');
 assert.throws(()=>COMPONENTS[0].outputs.push('order-receipt'));
});

test('the two implemented recipes have complete typed paths and public-read authority',()=>{
 assert.deepEqual(RECIPES.map(r=>r.id),['coin-research','bulk-pool']);
 for(const r of RECIPES){
  const validation=validateRecipe(r);
  assert.deepEqual(validation.errors,[]);assert.equal(validation.valid,true);
  assert.equal(validation.authority,'public_read');
  assert.equal(validation.componentCount,r.components.length);assert.equal(validation.wireCount,r.wires.length);
  assert.ok(Object.isFrozen(validation));assert.ok(Object.isFrozen(validation.errors));
 }
});

test('an offer cannot connect to a diagnostic input merely because both are records',()=>{
 const r=recipe('coin-research');r.wires[0].type='offer';
 invalid(r,/Incompatible wire type/);invalid(r,/Missing required input/);
});

test('a missing demand wire blocks allocation readiness',()=>{
 const r=recipe('bulk-pool');r.wires=r.wires.filter(w=>w.type!=='demand');
 invalid(r,/Missing required input: pool-allocator \(demand\)/);
});

test('unknown or duplicate components and external endpoints fail closed',()=>{
 const unknown=recipe('bulk-pool');unknown.components.push('external-checkout');
 invalid(unknown,/Unknown component/);
 const duplicate=recipe('bulk-pool');duplicate.components.push('pool-input');
 invalid(duplicate,/Duplicate component/);
 const external=recipe('bulk-pool');external.wires[0].to='external-checkout';
 invalid(external,/Wire endpoint is not in the recipe/);
});

test('duplicate wires and ambiguous input producers fail closed',()=>{
 const r=recipe('bulk-pool');r.wires.push({...r.wires[0]});
 invalid(r,/Duplicate wire/);
});

test('purchase authority cannot be hidden behind a read-only recipe declaration',()=>{
 const r=recipe('bulk-pool');r.components.push('purchase-relay');
 r.wires.push({from:'proposal-meter',to:'purchase-relay',type:'proposal'});r.output='order-receipt';
 const result=invalid(r,/Recipe authority does not cover component: purchase-relay/);
 assert.equal(result.authority,'purchase');
 invalid(r,/exceeds allowed authority/);
 r.authority='purchase';invalid(r,/exceeds allowed authority/);
 assert.equal(validateRecipe(r,{maxAuthority:'purchase'}).valid,true);
});

test('declaring extra authority is bounded even when all components only read',()=>{
 const r=recipe('bulk-pool');r.authority='private_read';
 invalid(r,/exceeds allowed authority/);
 assert.equal(validateRecipe(r,{maxAuthority:'private_read'}).valid,true);
 invalid(r,/known authority/,{maxAuthority:'admin'});
 r.authority='admin';invalid(r,/known authority/);
});

test('cycles and self wires are detected instead of producing a ready schematic',()=>{
 const r=recipe('bulk-pool');
 r.wires.push({from:'proposal-meter',to:'pool-input',type:'proposal'});
 invalid(r,/contains a cycle/);
 const self=recipe('bulk-pool');self.wires.push({from:'pool-input',to:'pool-input',type:'offer'});
 invalid(self,/cannot wire to itself/);
});

test('declared output must be a single terminal producer, not an intermediate signal',()=>{
 const r=recipe('coin-research');r.output='intent';
 invalid(r,/terminal producer/);
 const disconnected=recipe('bulk-pool');disconnected.components.push('goal-switch');
 invalid(disconnected,/disconnected from the declared output: goal-switch/);
});

test('malformed or oversized input returns an invalid frozen result without executing anything',()=>{
 for(const r of [null,undefined,[],{},42,'bulk-pool'])assert.equal(validateRecipe(r).valid,false);
 const malformed=recipe('bulk-pool');malformed.wires.push(null);invalid(malformed,/Malformed wire/);
 const tooMany=recipe('bulk-pool');tooMany.components=Array(1001).fill('pool-input');invalid(tooMany,/between 1 and 1000/);
 const tooManyWires=recipe('bulk-pool');tooManyWires.wires=Array(1001).fill({});invalid(tooManyWires,/at most 1000/);
 const malformedOptions=validateRecipe(RECIPES[0],null);assert.equal(malformedOptions.valid,false);
});
