import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QUICK_CARD_SOURCES,findSourceCard,validSourceCard} from '../source-quick-cards.mjs';
import {parseSpotifyLink,mapBounds} from '../source-quick-card-features.mjs';
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const detail=readFileSync(new URL('../source-quick-card.html',import.meta.url),'utf8');
const launcher=readFileSync(new URL('../source-quick-cards.mjs',import.meta.url),'utf8');
const deck=readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
test('original 15 plus eight new provider quick cards exist, have unique IDs and real HTTPS original links',()=>{
 assert.equal(QUICK_CARD_SOURCES.length,23);
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
 ['google','youtube','facebook','instagram','chatgpt','x','reddit','tiktok','whatsapp','bing','yahoo-news','cnn','fox-news','tv-guide','starmaker','google-maps','spotify','capcut','amazon','temu','walmart','wikipedia','pinterest']);
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

test('new cards have actual provider search or explicit native tools',()=>{
 for(const [id,param] of [['amazon','k'],['walmart','q'],['wikipedia','search']])assert.equal(findSourceCard(id).searchParameter,param);
 for(const id of ['google-maps','spotify','capcut'])assert.ok(QUICK_CARD_SOURCES.some(c=>c.id===id));
 const catalog=readFileSync(new URL('../bubbles-card-catalog.mjs',import.meta.url),'utf8');
 for(const id of ['google-maps','spotify','capcut','amazon','temu','walmart','wikipedia','pinterest'])assert.match(catalog,new RegExp("app\\('"+id+"'"));
 assert.match(launcher,/mountSourceFeature\(featureBox,card\)/);
});
test('Spotify embeds are allowlisted and location bounds reject invalid coordinates',()=>{
 assert.deepEqual(parseSpotifyLink('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')?.kind,'playlist');
 assert.equal(parseSpotifyLink('https://open.spotify.com.evil.test/playlist/37i9dQZF1DXcBWIGoYBM5M'),null);
 assert.equal(parseSpotifyLink('javascript:alert(1)'),null);
 assert.equal(mapBounds(NaN,0),null);
 assert.equal(mapBounds(91,0),null);
 assert.equal(mapBounds(41.25,-93.44)?.split(',').length,4);
});
