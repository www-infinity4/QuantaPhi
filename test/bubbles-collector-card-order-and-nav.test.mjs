import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(read('data/bubbles-collector-mall-dining-cards-20261024.json'));
const byId=id=>data.cards.find(c=>c.id===id);

test('nineteen owner-requested cards retain distinct research, mall and dining lanes',()=>{
 assert.equal(data.cards.length,19);
 assert.equal(new Set(data.cards.map(c=>c.id)).size,data.cards.length);
 for(const id of ['vamworld','pcgs','ngc','heritage','topps','beckett','christies','loc','morrison-hotel-gallery','rolling-stone','coinworld','coinage','coins-magazine','shoplc-premium','sonic','burger-king','mcdonalds','restaurants-discovery','similar-collectors']){
  assert.ok(byId(id),id+' absent');
 }
 for(const card of data.cards){
  assert.ok(card.hero?.length>55,card.id+' needs explicit image direction');
  assert.ok(card.interaction?.length>75,card.id+' needs meaningful actual card interaction');
  assert.ok(card.quickSearch?.length>5,card.id+' needs search intent');
  assert.ok(card.freshness?.length>20,card.id+' needs freshness/rights notes');
  if(card.official)assert.ok(new URL(card.official).protocol==='https:',card.id);
 }
});
test('previous coin cards are explicitly upgrades, not duplicates',()=>{
 for(const id of ['vamworld','ngc','pcgs']){
  const x=byId(id);assert.equal(x.status,'upgrade_existing');assert.ok(x.existing?.length);
 }
 assert.match(read('docs/BUBBLES-COLLECTORS-MALL-DINING-20261024.md'),/Walmart/);
 assert.match(read('docs/BUBBLES-COLLECTORS-MALL-DINING-20261024.md'),/Levi.s/);
});
test('every published completed card keeps all user controls and single Oracle viewer',()=>{
 assert.deepEqual(data.requiredControls,['Star','Collect','Share','Quick Search','+ Follow','+1 Build']);
 assert.match(data.rotation,/Oracle/);
 assert.match(read('docs/BUBBLES-COLLECTORS-MALL-DINING-20261024.md'),/source.*timestamp/i);
});
test('no restaurant follows assume dining history or real coupon redemption',()=>{
 const doc=read('docs/BUBBLES-COLLECTORS-MALL-DINING-20261024.md');
 assert.match(doc,/NOT proof of a visit/);
 assert.match(doc,/opt.in/);
 for(const id of ['sonic','burger-king','mcdonalds'])assert.match(byId(id).interaction,/offer/i);
});
test('Bubbles page has contrast-friendly navigation without altering embedded chat',()=>{
 const html=read('bubbles.html');
 assert.match(html,/bubbles-bottom-nav/);
 assert.match(html,/bubblesGoBack/);assert.match(html,/bubblesGoForward/);
 assert.match(html,/bubbles-bottom-nav\[hidden\]/);
 assert.match(html,/bubbles-embedded .bubbles-bottom-nav/);
 assert.match(html,/href="\/bubbles-x-connect.html"/);
 assert.match(html,/-webkit-text-fill-color:#fff/);
});
test('all Android entry activities set navigation icon contrast',()=>{
 const base='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
 for(const p of [base+'MainActivity.java',base+'OracleChatActivity.java','android/bubbles-one/app/src/main/java/org/quantaphi/bubblesone/MainActivity.java'])
  assert.match(read(p),/NavigationContrast\.apply\(this\)/,p);
 for(const p of [base+'NavigationContrast.java','android/bubbles-one/app/src/main/java/org/quantaphi/bubblesone/NavigationContrast.java']){
  assert.match(read(p),/setNavigationBarColor/);assert.match(read(p),/LIGHT_NAVIGATION_BAR/);
 }
});
test('X sign-in fallback does not claim it authorizes automated posts',()=>{
 const c=read('bubbles-x-connect.html');
 assert.match(c,/https:\/\/x.com\/login/);
 assert.match(c,/does not yet grant Bubbles automatic access/);
 assert.match(c,/OAuth 2.0 \+ PKCE/);
 assert.doesNotMatch(c,/<input[^>]+(?:password|bearer|secret)/i);
});
