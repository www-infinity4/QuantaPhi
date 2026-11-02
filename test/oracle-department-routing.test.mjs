import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const context={window:{}};vm.runInNewContext(read('oracle-card-departments.js'),context);
const api=context.window.OracleDepartments;
const entry=(id,title='',category='')=>({id,feedId:id,title,category,node:{dataset:{sourceCategory:category}}});
test('Mixed and normal departments refuse restricted ads and cards',()=>{
 assert.equal(api.matches(entry('dispensary-livwell','21+ dispensary'),'mixed'),false);
 assert.equal(api.matches(entry('bruceBannerWeedmapsCard','Bruce Banner weedmaps'),'fashion'),false);
 assert.equal(api.matches(entry('source-playboy','Playboy'),'mixed'),false);
 assert.equal(api.matches(entry('source-levi','Levi’s jeans','Fashion'),'mixed'),true);
 assert.equal(api.matches(entry('source-levi','Levi’s jeans','Fashion'),'adult'),false);
});
test('21+ has its own isolated department, Food / Restaurants finds real directory',()=>{
 assert.equal(api.matches(entry('dispensary-livwell','21+ dispensary'),'adult'),true);
 assert.equal(api.matches(entry('source-restaurant-directory','Infinity Restaurant Directory','Restaurants'),'restaurants'),true);
 assert.equal(api.matches(entry('walmartShoppingCard','Groceries · Walmart','Groceries'),'restaurants'),false);
 assert.equal(api.matches(entry('source-restaurant-directory','Restaurant directory'),'adult'),false);
});
test('Top dropdown routes normal department cards without showing age-restricted in default mixed',()=>{
 const html=read('index.html'),deck=read('oracle-card-deck.js');
 assert.match(html,/id="oracleDepartment"/);
 assert.match(html,/value="restaurants"/);
 assert.match(html,/value="adult"/);
 assert.match(html,/id="oracleNationwideRestaurants"/);
 assert.ok(html.indexOf('oracle-card-departments.js')<html.indexOf('oracle-card-deck.js'));
 assert.match(deck,/departmentApi\.matches/);
 assert.match(deck,/oracle:restaurant-nearby-request/);
 assert.match(deck,/oracle:restaurant-nationwide/);
 assert.match(deck,/const request=entries\.find\(x=>x\.id===spotlightRequested.*departmentMatches/);
});


test('Source imagery leads; merchant actions remain accessible and neutral, not fake big blue ad buttons',()=>{
 const css=read('oracle-department-picker.css'),brands=read('infinity-accepted-cards.mjs');
 assert.match(brands,/cardImageCandidates\(card\)/);
 assert.match(css,/\.iac-media:not\(\.iac-logo-only\)/);
 assert.match(css,/\.iac-website-actions :is\(button,a\)/);
 assert.match(css,/background:#f8f9fa!important/);
 assert.match(css,/min-height:44px!important/);
});
