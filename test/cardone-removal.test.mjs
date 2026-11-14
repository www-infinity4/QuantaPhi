import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const publicFiles=['index.html','oracle-card-deck.js','oracle-card-deck.css','bubbles-card-catalog.mjs','tinyfish-card-catalog.mjs','public-card-trends.js','sitemap.xml'];
test('Grant and Gary Cardone cards are absent from public site entry points',()=>{
 for(const path of publicFiles){
  assert.doesNotMatch(read(path),/cardone|churchOfIAmCard|church-of-i-am|cardoneCapitalOffer/i,path);
 }
});
test('remaining public quick cards still have their carousel and feeds',()=>{
 const home=read('index.html'),deck=read('oracle-card-deck.js');
 for(const id of ['walmartShoppingCard','pixieStoryCard','googleTrendNba','oracleCardDeck']){
  assert.match(home,new RegExp('id="'+id+'"'),id);
 }
 for(const id of ['walmartShoppingCard','pixieStoryCard','googleTrendNba']){
  assert.ok(deck.includes(id),id);
 }
 assert.ok(read('bubbles-card-catalog.mjs').includes("app('pixie-stories'"));
});
test('retired Cardone property route is absent from sitemap',()=>{
 assert.doesNotMatch(read('sitemap.xml'),/cardone-capital\.html/i);
});
