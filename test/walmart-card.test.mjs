import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WALMART_PRODUCTS,validWalmartProduct,nextWalmartProduct} from '../walmart-card.mjs';
import {cleanFeedState,markViewed} from '../quanta-feed-rank.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('Walmart starts with the owner-selected pizza and dated source price',()=>{
 assert.equal(WALMART_PRODUCTS[0].itemId,'19668500198');
 assert.equal(WALMART_PRODUCTS[0].price,3.87);
 assert.equal(WALMART_PRODUCTS.length,4);
 assert.ok(WALMART_PRODUCTS.every(validWalmartProduct));
 assert.ok(!validWalmartProduct({...WALMART_PRODUCTS[0],url:'https://walmart.com.example.org/ip/19668500198'}));
 assert.ok(!validWalmartProduct({...WALMART_PRODUCTS[0],url:'https://www.walmart.com/ip/another-item/999'}));
 assert.ok(!validWalmartProduct({...WALMART_PRODUCTS[0],image:'javascript:alert(1)'}));
});
test('next item uses real product candidates and respects signed-in interest weights',()=>{
 const p=nextWalmartProduct(WALMART_PRODUCTS[0].id,cleanFeedState({}),{'walmart-cauliflower':70});
 assert.equal(p.id,'walmart-cauliflower');
 let current=WALMART_PRODUCTS[0],state=cleanFeedState({});
 const seen=new Set([current.id]);
 for(let i=0;i<12;i++){
  state=markViewed(state,current.id);
  const next=nextWalmartProduct(current.id,state);
  assert.notEqual(next.id,current.id);assert.ok(validWalmartProduct(next));
  seen.add(next.id);current=next;
 }
 assert.equal(seen.size,4);
});
test('the real Walmart product card remains reachable without taking every visitor\'s first slot',()=>{
 const home=read('index.html'),deck=read('oracle-card-deck.js'),styles=read('walmart-card.css');
 assert.equal((home.match(/id="walmartShoppingCard"/g)||[]).length,1);
 assert.match(deck,/\['walmartShoppingCard','Walmart/);
 assert.match(deck,/function chooseOpening\(\)/);
 assert.doesNotMatch(deck,/const candidate=sundayPromo/);
 assert.match(deck,/walmartShoppingCard:\['walmart-shopping','Shopping'/);
 assert.match(styles,/main\.app>#walmartShoppingCard\{display:none!important\}/);
 assert.match(home,/data-walmart-next/);
 assert.match(home,/Price checked October 24, 2026/);
});
test('buy action opens actual Walmart top-level HTTPS, with no iframe checkout or APK detour',()=>{
 const home=read('index.html'),module=read('walmart-card.mjs');
 const buy=home.match(/<a class="walmart-card-buy"[^>]+>/)?.[0]||'';
 assert.match(buy,/href="https:\/\/www.walmart.com\/ip\//);
 assert.doesNotMatch(buy,/inPageSite|target=|data-site-url/);
 assert.doesNotMatch(module,/createElement\(['"]iframe|downloads\/|window.open|preventDefault/);
 assert.match(module,/\$\('buy'\).href=p.url/);
});
