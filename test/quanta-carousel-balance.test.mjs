import test from 'node:test';
import assert from 'node:assert/strict';
import {CAROUSEL_FAMILIES,selectNextFamilyPool,openingFamilyPool} from '../quanta-carousel-balance.mjs';
const cards=[
 ...Array.from({length:116},(_,i)=>({id:'brand-'+i,family:'accepted'})),
 ...Array.from({length:65},(_,i)=>({id:'website-'+i,family:'website'})),
 ...Array.from({length:22},(_,i)=>({id:'original-'+i,family:'original'}))
];
test('all three families are available and openings vary across page loads',()=>{
 assert.deepEqual(CAROUSEL_FAMILIES,['accepted','website','original']);
 for(let i=0;i<6;i++)assert.equal(openingFamilyPool(cards,i)[0].family,CAROUSEL_FAMILIES[i%3]);
});
test('rotation does not bury websites behind 116 accepted cards',()=>{
 let remaining=[...cards],current='accepted',families=[];
 for(let i=0;i<9;i++){
  const pool=selectNextFamilyPool(remaining,current);
  assert.ok(pool.length);
  const chosen=pool[0];families.push(chosen.family);remaining=remaining.filter(x=>x!==chosen);current=chosen.family;
 }
 assert.deepEqual(families,['website','original','accepted','website','original','accepted','website','original','accepted']);
});
test('all available cards get shown without repeats, including when one family exhausts',()=>{
 let pending=[...cards],family='accepted',ids=[];
 while(pending.length){
  const pool=selectNextFamilyPool(pending,family);
  const chosen=pool[0];ids.push(chosen.id);family=chosen.family;pending=pending.filter(c=>c.id!==chosen.id);
 }
 assert.equal(ids.length,cards.length);assert.equal(new Set(ids).size,ids.length);
});
test('following-only or one-family catalogs still work',()=>{
 assert.deepEqual(selectNextFamilyPool(cards.slice(0,2),'accepted'),cards.slice(0,2));
 assert.deepEqual(selectNextFamilyPool([],'website'),[]);
 assert.deepEqual(selectNextFamilyPool([{id:'legacy'}],'website'),[{id:'legacy'}]);
 assert.deepEqual(openingFamilyPool([],2),[]);
});
