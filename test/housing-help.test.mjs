import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {HOUSING_HELP_BRAND,HOUSING_HELP_RESOURCES,housingResource,housingResourceRoute,housingCompanions,housingResourceCard} from '../housing-help-catalog.mjs';
import {lookupQuickCard,searchQuickCards} from '../quick-card-search-core.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('six distinct Infinity community resources surround the card, including the requested local providers',()=>{
 const cards=housingCompanions();assert.equal(cards.length,6);assert.equal(new Set(cards.map(c=>c.id)).size,6);
 for(const id of ['bath-access','home-repair','home-loan','sieda','scicap','chariton-valley'])assert.ok(cards.some(c=>c.id===id),id);
 for(const c of HOUSING_HELP_RESOURCES){assert.equal(c.brand,HOUSING_HELP_BRAND);assert.equal(c.paid,false);assert.match(c.availability,/current funding/);assert.ok(c.area);assert.ok(c.checked);}
});
test('Sieda weatherization is not falsely advertised as serving Monroe; the two local Monroe options are explicit',()=>{
 assert.doesNotMatch(housingResource('sieda').area,/Monroe/);assert.match(housingResource('sieda').area,/Wapello/);
 assert.match(housingResource('scicap').area,/Monroe/);assert.match(housingResource('chariton-valley').area,/Monroe/);
 assert.match(housingResource('sieda').description,/not a home purchase or general remodeling/);
 assert.match(housingResource('home-repair').description,/age 62/);
});
test('explicit geography changes listings while benefit status and income never target or rank advertisements',()=>{
 assert.ok(housingCompanions({state:'CA'}).every(c=>!c.state));assert.equal(housingCompanions({state:'CA'}).length,6);
 assert.deepEqual(housingCompanions({state:'IA',goal:'buy',monthlyIncome:0,benefits:'ssi'}).map(x=>x.id),housingCompanions({state:'IA',goal:'buy',monthlyIncome:100000,benefits:'none'}).map(x=>x.id));
 assert.equal(housingCompanions({state:'CA',goal:'rent'})[0].id,'housing-agency');
 assert.ok(housingCompanions({state:'IA'},1).some(c=>c.id==='habitat'));
});
test('source and share actions use a fixed reviewed provider identity, not caller-supplied URLs or private answers',()=>{
 for(const query of ['SIEDA','seida','SCICAP','Chariton Valley housing','bathroom help','Habitat for Humanity'])assert.ok(searchQuickCards(query).some(c=>c.id.startsWith('housing-help-')),query);
 assert.equal(lookupQuickCard('housing-help-sieda').official,housingResource('sieda').url);
 assert.equal(lookupQuickCard('housing-help-unknown'),null);
 assert.equal(housingResource('__proto__'),null);assert.equal(housingResourceRoute('https://evil.example'), '');
 const card=housingResourceCard({id:'sieda',url:'https://evil.example',name:'Fake'});assert.equal(card.official,housingResource('sieda').url);
 for(const r of HOUSING_HELP_RESOURCES){
  for(const url of [r.url,r.actionUrl,r.contactUrl].filter(Boolean)){const parsed=new URL(url);assert.equal(parsed.protocol,'https:');assert.equal(parsed.username,'');}
  const c=housingResourceCard(r);assert.equal(c.route,housingResourceRoute(r.id));
  assert.ok(existsSync(new URL('..'+c.shareImage,import.meta.url)),c.shareImage);
  assert.ok(!c.route.includes('income'));assert.ok(!c.shareDescription.includes('approved by Infinity'));
 }
});
test('standalone and Oracle use the same six help cards and preserve neutral sensitive-topic ad handling',()=>{
 assert.match(read('disability-housing.mjs'),/mountHousingHelpAround/);
 const switchboard=read('shop-phi-switchboard.mjs');
 assert.match(switchboard,/if\(active.id==='disability-housing'\)/);
 assert.ok(switchboard.indexOf("if(active.id==='disability-housing')")<switchboard.indexOf('const candidates=await inventory(lane)'));
 assert.match(switchboard,/if\(SENSITIVE.test\(text\)\)return \{id:'neutral'/);
 assert.match(read('housing-help-cards.mjs'),/HOUSING_HELP_BRAND/);
 assert.doesNotMatch(read('housing-help-cards.mjs'),/fetch\(|sendBeacon|document.cookie|innerHTML/);
});
