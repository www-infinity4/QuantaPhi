import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BRAND_PRODUCT_CARDS,validBrandProduct} from '../brand-product-cards.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const home=read('index.html'),deck=read('oracle-card-deck.js'),module=read('brand-product-cards.mjs'),css=read('brand-product-cards.css');

test('six distinct real denim products across Pepe Jeans, GUESS and Levi’s are represented',()=>{
 assert.equal(BRAND_PRODUCT_CARDS.length,6);
 assert.equal(new Set(BRAND_PRODUCT_CARDS.map(p=>p.id)).size,6);
 assert.deepEqual(new Set(BRAND_PRODUCT_CARDS.map(p=>p.brand)),new Set(['Pepe Jeans','GUESS JEANS','Levi’s']));
 assert.equal(BRAND_PRODUCT_CARDS.filter(p=>p.brand==='Pepe Jeans').length,2);
 for(const p of BRAND_PRODUCT_CARDS){
  assert.ok(validBrandProduct(p),'Valid original source: '+p.id);
  assert.equal(p.checked,'2026-10-24');
  assert.match(p.url,/^https:\/\//);
  assert.match(p.image,/^https:\/\//);
  assert.match(p.description,/[A-Za-z]/);
  assert.ok(!p.image.includes('placeholder'),'Actual manufacturer product photograph: '+p.id);
  assert.ok(!p.image.includes('picsum'),'No stock photos: '+p.id);
 }
});

test('exact product photos and exact product destinations match item code',()=>{
 const pepe=BRAND_PRODUCT_CARDS.find(p=>p.id==='pepe-brooke');
 assert.match(pepe.url,/PL20506284UA/);assert.match(pepe.image,/PL2050628_4UA/);
 const vapour=BRAND_PRODUCT_CARDS.find(p=>p.id==='pepe-vapour');
 assert.match(vapour.url,/PM207785J671/);assert.match(vapour.image,/8905875130871-15/);
 const guess=BRAND_PRODUCT_CARDS.find(p=>p.id==='guess-g11-light');
 assert.match(guess.url,/W4BA0YD5CCA-GJRV/);assert.match(guess.image,/W4BA0YD5CCA-GJRV/);
 const dark=BRAND_PRODUCT_CARDS.find(p=>p.id==='guess-g11-dark');
 assert.match(dark.url,/W5RA0YD5M42-GJHR/);assert.match(dark.image,/W5RA0YD5M42-GJHR/);
 for(const [id,sku] of [['levis-501-dark','005013373'],['levis-501-medium','005013306']]){
  const p=BRAND_PRODUCT_CARDS.find(q=>q.id===id);
  assert.ok(p.url.includes(sku)&&p.image.includes(sku));
 }
});

test('product cards use five working QuantaPhi actions plus exact shop links, no fake offers',()=>{
 assert.match(module,/mountCardActions\(activity,/);
 assert.match(module,/Shop this exact item/);
 assert.match(module,/aria-label/);
 assert.match(module,/img\.addEventListener\('error'/);
 assert.match(module,/Independent product discovery/);
 assert.doesNotMatch(module,/affiliate=|discount-code|coupon-code|sponsored by|paid partnership/i);
 const original=read('quanta-card-actions.mjs');
 for(const label of ['Star','Collect','Share','+1 Build','Quick Search'])assert.ok(original.includes(label),'Shared action '+label);
});

test('all six original product widgets are exposed to the three direction tabs as independent articles',()=>{
 assert.match(home,/id="brandProductCards" hidden/);
 assert.match(home,/brand-product-cards\.mjs\?v=20261024-real-products1/);
 assert.match(home,/brand-product-cards\.css\?v=20261024-real-products1/);
 assert.match(deck,/#brandProductCards \.iqc-card\[data-source-id\]/);
 assert.match(deck,/const products=sources\.filter/);
 assert.match(deck,/const candidate=products\[0\]\|\|sources\[0\]\|\|google/);
 assert.match(module,/source-cards-ready/);
 assert.match(module,/dataset\.sourceReady='true'/);
 for(const tab of ['public','for-you','following'])assert.ok(home.includes('data-oracle-feed="'+tab+'"'));
});

test('APK/Chrome downloads are collapsed but Bubbles voice/chat code still mounts',()=>{
 assert.match(home,/<details class="q-install-details"/);
 assert.match(home,/href="\/bubbles-chrome\.html">Install Bubbles in Chrome/);
 assert.match(home,/href="\/downloads\/bubbles\.apk"/);
 assert.doesNotMatch(home,/<section class="q-bubbles-entry"/);
 const brain=read('bubbles-ai.js');
 assert.match(brain,/const host=document\.getElementById\('bubblesAICard'\)/);
 assert.doesNotMatch(brain,/if\(document\.body\?\.classList\?\.contains\?\.\('oracle-quanta'\)\)return/);
 assert.match(brain,/document\.body\.append\(launcher,panel\)/);
});

test('product cards retain mobile portrait product photos and readable calls to action',()=>{
 assert.match(css,/aspect-ratio:4\/4\.2/);
 assert.match(css,/min-height:54px/);
 assert.match(css,/@media\(max-width:410px\)/);
 assert.match(css,/:focus-visible/);
});
