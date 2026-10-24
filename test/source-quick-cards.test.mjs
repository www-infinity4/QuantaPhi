import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {QUICK_CARD_SOURCES,findSourceCard,validSourceCard,PUBLIC_SOURCE_IDS,isPublicSourceCard} from '../source-quick-cards.mjs';
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const detail=readFileSync(new URL('../source-quick-card.html',import.meta.url),'utf8');
const launcher=readFileSync(new URL('../source-quick-cards.mjs',import.meta.url),'utf8');
const deck=readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
const tools=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
test('all sixteen provider quick cards exist, have unique IDs and real HTTPS original links',()=>{
 assert.equal(QUICK_CARD_SOURCES.length,16);
 assert.equal(new Set(QUICK_CARD_SOURCES.map(c=>c.id)).size,16);
 for(const card of QUICK_CARD_SOURCES){
  assert.ok(validSourceCard(card),card.id);
  assert.equal(findSourceCard(card.id),card);
  assert.match(card.focus,/./);
  assert.match(card.details,/./);
  assert.ok(!/https?:\/\/localhost/.test(card.official));
 }
 assert.equal(findSourceCard('not-registered'),null);
 assert.deepEqual(QUICK_CARD_SOURCES.map(p=>p.id),
 ['google','youtube','facebook','instagram','chatgpt','x','reddit','tiktok','whatsapp','bing','yahoo-news','cnn','fox-one','fox-news','tv-guide','starmaker']);
});
test('Google and Bing start real engine requests inside the Infinity Viewer',()=>{
 for(const id of ['google','bing']){
  const card=findSourceCard(id);
  assert.equal(card.searchParameter,'q');
  assert.match(card.featureUrl,/^https:\/\/(?:www\.)?(?:google|bing)\.com\/search$/);
 }
 assert.match(tools,/infinity-search-results\.html/);
 assert.match(tools,/window\.QuantaOpenSite\(a\)/);
 assert.match(tools,/field.name='q'/);
 assert.match(launcher,/mountCardTools\(tools,card\)/);
 assert.ok(!launcher.includes('Open quick card in Infinity Viewer'));
});
test('homepage and Oracle swipe each original provider card with its controls, no viewer detour',()=>{
 assert.match(home,/id="siteQuickCards"/);
 assert.match(home,/source-quick-cards\.mjs\?v=20261024-public-search2/);
 assert.match(launcher,/item\.dataset\.sourceId=card\.id/);
 assert.match(launcher,/mountCardTools\(tools,card\)/);
 assert.match(launcher,/quantaphi:source-cards-ready/);
 assert.match(deck,/function registerSourceCards\(\)/);
 assert.match(deck,/#brandProductCards \.iqc-card\[data-source-id\]/);
 assert.match(deck,/feedId:id/);
 assert.match(deck,/entries\.push\(entry\)/);
 assert.doesNotMatch(deck,/\['siteQuickCards','Source quick cards/);
 assert.doesNotMatch(launcher,/preview\.href=/);
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

test('cross-origin links cannot white-screen the local Infinity iframe',()=>{
 assert.match(home,/url\.origin!==location\.origin/);
 assert.match(home,/location\.assign\(url\.href\)/);
 assert.match(home,/link\.target='_blank'/);
 assert.match(home,/link\.rel='noopener noreferrer'/);
 assert.match(home,/frame\.src=url\.href/);
});

test('the old visual catalog is removed without deleting source widgets or the original chooser',()=>{
 assert.match(home,/id="quantaDiscoveryFeed"[^>]+hidden/);
 assert.match(home,/id="siteQuickCards"[^>]+hidden/);
 assert.match(home,/id="scienceQuickCards"[^>]+hidden/);
 assert.doesNotMatch(home,/<script type="module" src="\/quanta-feed.mjs/);
 assert.match(home,/id="oracleCardDeck"/);
 assert.match(deck,/registerSourceCards/);
 assert.match(deck,/const google=entries\.find\(e=>e\.id==='source-google'\)/);
 assert.match(deck,/viewerTouched/);
});
test('Google logo and Infinity local results page are genuine assets and do not frame google.com',()=>{
 const page=readFileSync(new URL('../infinity-search-results.html',import.meta.url),'utf8');
 assert.match(tools,/www\.google\.com\/images\/branding\/googlelogo/);
 assert.match(tools,/qcx-google-wordmark/);
 assert.match(page,/orange-brook-a2ac\.marvaseater\.workers\.dev\/search/);
 assert.match(page,/engines:engine/);
 assert.match(page,/filter\(r=>r\.engines\.some\(e=>e===engine\)\)/);
 assert.match(page,/not verified.*results/);
 assert.doesNotMatch(page,/<iframe/);
 assert.match(tools,/window\.QuantaOpenSite\(a\)/);
});

test('standalone Google results HTML contains executable JavaScript, not an inert blank iframe',()=>{
 const html=readFileSync(new URL('../infinity-search-results.html',import.meta.url),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script&&script.includes('void search()'));
 assert.doesNotThrow(()=>new Script(script,{filename:'infinity-search-results-inline.js'}));
});

test('functional source cards enter Public while link-only integrations remain separately accessible',()=>{
 assert.deepEqual(PUBLIC_SOURCE_IDS,[
  'google','bing','youtube','reddit','x','tiktok','starmaker','fox-one',
  'cnn','fox-news','yahoo-news','tv-guide','facebook','instagram','whatsapp'
 ]);
 assert.equal(PUBLIC_SOURCE_IDS.length,15);
 assert.equal(isPublicSourceCard(findSourceCard('chatgpt')),false);
 for(const card of QUICK_CARD_SOURCES)assert.equal(isPublicSourceCard(card),PUBLIC_SOURCE_IDS.includes(card.id));
 assert.match(launcher,/QUICK_CARD_SOURCES.filter\(isPublicSourceCard\)/);
 assert.match(deck,/node.dataset.sourceReady!=='true'/);
 assert.match(deck,/sources=entries.filter\(e=>e.id.startsWith\('source-'\)/);
});

test('FOX One exact original video post is source-linked, without fabricating a GIF or autoplay guarantee',()=>{
 const c=findSourceCard('fox-one');
 assert.equal(c.featureUrl,'https://x.com/foxone/status/2113352129427730641');
 assert.equal(c.official,'https://www.fox.com/');
 assert.match(tools,/function mountFoxOneSpot/);
 assert.match(tools,/https:\/\/platform\.twitter\.com\/widgets\.js/);
 assert.match(tools,/widgets\?\.load/);
 assert.match(tools,/Third-party autoplay is controlled/);
 assert.match(tools,/qcx-fox-one-brand/);
});
