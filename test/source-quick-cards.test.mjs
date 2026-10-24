import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QUICK_CARD_SOURCES,findSourceCard,validSourceCard} from '../source-quick-cards.mjs';
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const detail=readFileSync(new URL('../source-quick-card.html',import.meta.url),'utf8');
const launcher=readFileSync(new URL('../source-quick-cards.mjs',import.meta.url),'utf8');
const deck=readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
test('all fifteen provider quick cards exist, have unique IDs and real HTTPS original links',()=>{
 assert.equal(QUICK_CARD_SOURCES.length,15);
 assert.equal(new Set(QUICK_CARD_SOURCES.map(c=>c.id)).size,15);
 for(const card of QUICK_CARD_SOURCES){
  assert.ok(validSourceCard(card),card.id);
  assert.equal(findSourceCard(card.id),card);
  assert.match(card.focus,/./);
  assert.match(card.details,/./);
  assert.ok(!/https?:\/\/localhost/.test(card.official));
 }
 assert.equal(findSourceCard('not-registered'),null);
 assert.deepEqual(QUICK_CARD_SOURCES.map(p=>p.id),
 ['google','youtube','facebook','instagram','chatgpt','x','reddit','tiktok','whatsapp','bing','yahoo-news','cnn','fox-news','tv-guide','starmaker']);
});
test('Google and Bing have real provider-submitted search bars, not result placeholders',()=>{
 for(const id of ['google','bing']){
  const card=findSourceCard(id);
  assert.equal(card.searchParameter,'q');
  assert.match(card.featureUrl,/^https:\/\/(?:www\.)?(?:google|bing)\.com\/search$/);
 }
 assert.match(launcher,/form.method='GET'/);
 assert.match(launcher,/form.target='_blank'/);
 assert.match(launcher,/input.maxLength=300/);
});
test('home and Oracle deck surface source cards through the original in-page viewer',()=>{
 assert.match(home,/id="siteQuickCards"/);
 assert.match(home,/source-quick-cards\.mjs\?v=/);
 assert.match(deck,/\['siteQuickCards','Source quick cards/);
 assert.match(launcher,/classList\.add\('inPageSite'\)/);
 assert.match(launcher,/\/source-quick-card\.html\?card=/);
 assert.match(home,/window\.QuantaOpenSite=openSite/);
});
test('card detail uses existing Cardone Bubbles embed with specialized context, no impersonation or sends',()=>{
 assert.match(detail,/sourceQuickCardDetail/);
 assert.match(detail,/source-quick-cards\.mjs/);
 assert.match(launcher,/script\.src='\/bubbles-embed\.js'/);
 assert.match(launcher,/bubbleRole='specialist'/);
 assert.match(launcher,/bubbleInstructions/);
 assert.match(launcher,/Never claim|Never execute|Never claim/i); // agent safety prompt
 assert.match(launcher,/No messages, social account feeds, location, recordings or contact information are transferred/);
 assert.match(launcher,/before sending/);
});
test('provider permissions and content limitations remain explicit',()=>{
 assert.match(findSourceCard('reddit').details,/permission/);
 assert.match(findSourceCard('facebook').details,/sign-in/);
 assert.match(findSourceCard('instagram').details,/official embeds/);
 assert.match(findSourceCard('whatsapp').details,/cannot be embedded/);
 assert.match(findSourceCard('starmaker').details,/backing tracks/);
 assert.match(findSourceCard('fox-news').details,/draft-only/);
 assert.match(findSourceCard('chatgpt').details,/not get embedded/);
 assert.ok(!launcher.includes('localStorage.setItem'));
 assert.ok(!launcher.includes('navigator.geolocation'));
 assert.ok(!launcher.includes('navigator.mediaDevices.getUserMedia'));
 assert.ok(!launcher.includes('fetch('));
});
