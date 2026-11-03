import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 GIFT_LANES,interpretGiftRequest,recommendGiftLanes,validMerchantLink
} from '../santas-helper-core.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('free text recognizes voluntary recipient, budget and interests without stereotyping',()=>{
 const request=interpretGiftRequest('I want to buy for my mother, under $85. She loves gardening and books');
 assert.equal(request.recipient,'mother');
 assert.equal(request.budgetCents,8500);
 assert.deepEqual(request.interests,['books','garden']);
 assert.deepEqual(recommendGiftLanes('I want to buy for my mother').map(x=>x.id),GIFT_LANES.map(x=>x.id));
});

test('no personality or fragrance preference is inferred just from a relative',()=>{
 const result=interpretGiftRequest('gift for my dad');
 assert.deepEqual(result.interests,[]);
 assert.equal(result.recipient,'father');
 assert.ok(recommendGiftLanes('gift for my dad').length>=4);
});

test('bounded user requests do not invent a budget or include HTML',()=>{
 assert.equal(interpretGiftRequest('hello').budgetCents,null);
 assert.equal(interpretGiftRequest('gift under $90').budgetCents,9000);
 assert.equal(interpretGiftRequest('gift for mom <img src=x>').recipient,'mother');
 assert.ok(interpretGiftRequest('a'.repeat(3000)).raw.length<=600);
});

test('every lane offers genuine HTTPS merchant discovery with no fake prices or advertised inventory',()=>{
 assert.ok(GIFT_LANES.length>=4);
 for(const lane of GIFT_LANES){
  assert.match(lane.id,/^[a-z-]+$/);
  assert.ok(lane.links.length>=2);
  for(const item of lane.links){assert.equal(validMerchantLink(item.url),true);assert.ok(item.name);}
  assert.equal('price' in lane,false);
 }
 for(const url of ['http://example.com','javascript:alert(1)','https://user:pass@example.com','https://example.com:444/x','https://evil.example/'])assert.equal(validMerchantLink(url),false);
});

test('Santa has its own department in the existing selector and five image-ready original cards',()=>{
 const catalog=read('oracle-card-departments.js'),deck=read('oracle-card-deck.js'),html=read('index.html'),ui=read('santas-helper.mjs');
 assert.match(catalog,/\['santas-helper','Holidays/);
 assert.match(catalog,/department==='santas-helper'/);
 assert.match(html,/id="oracleDepartment"/);
 assert.match(html,/value="santas-helper"/);
 assert.match(html,/id="santasHelperCards"/);
 assert.match(html,/santas-helper\.mjs/);
 assert.match(deck,/quantaphi:santa-cards-ready/);
 assert.match(deck,/registerSantaCards/);
 assert.match(ui,/data-santa-card/);
 for(const name of ['welcome','fragrance','fashion','hobbies','keepsakes']){
  assert.match(ui,new RegExp("santa-"+name));
  assert.match(read('assets/santas-helper-'+name+'.svg'),/<svg[\s\S]*<\/svg>/);
 }
});

test('photo is explicitly local preview only, with no upload or biometric classification',()=>{
 const ui=read('santas-helper.mjs');
 assert.match(ui,/Photo preview only/);
 assert.match(ui,/URL\.createObjectURL/);
 assert.match(ui,/URL\.revokeObjectURL/);
 assert.doesNotMatch(ui,/fetch\([^)]*photo|FormData\(|faceRecognition|biometric/i);
});
