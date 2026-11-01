import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DENVER_RETAIL_CARDS,validDenverRetailCard} from '../denver-retail-catalog.mjs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const renderer=read('denver-retail-quick-cards.mjs');
const css=read('denver-retail-quick-cards.css');
const home=read('index.html');

test('seven distinct Denver-area in-person retail destinations are independently addressable',()=>{
  assert.equal(DENVER_RETAIL_CARDS.length,7);
  assert.equal(new Set(DENVER_RETAIL_CARDS.map(c=>c.id)).size,7);
  assert.deepEqual(new Set(DENVER_RETAIL_CARDS.map(c=>c.id)),new Set([
    'denver-mint-store','denver-hammonds-candies','denver-enstrom-candies',
    'denver-pacific-mercantile','denver-chicago-food-depot',
    'denver-arash-international','denver-central-market'
  ]));
  for(const card of DENVER_RETAIL_CARDS){
    assert.ok(validDenverRetailCard(card),card.id);
    assert.match(card.address,/\bCO 80\d{3}\b/);
    assert.ok(card.products.length>=2);
    assert.match(card.description,/\w/);
    assert.ok(card.checked==='2026-11-01');
    assert.ok(!('price' in card), 'No invented prices or live inventory');
  }
});

test('validated original-site destinations do not allow unsafe links or crafted URLs',()=>{
  const first=DENVER_RETAIL_CARDS[0];
  assert.equal(validDenverRetailCard({...first,official:'javascript:alert(1)'}),false);
  assert.equal(validDenverRetailCard({...first,official:'https://user:pass@usmint.gov'}),false);
  assert.equal(validDenverRetailCard({...first,photo:'https://phishing.test/fake.jpg'}),false);
  assert.equal(validDenverRetailCard({...first,id:'ABC bad'}),false);
  assert.equal(validDenverRetailCard({...first,products:[]}),false);
});

test('Mint tour links remain separate from shop links and do not claim live bookings',()=>{
  const mint=DENVER_RETAIL_CARDS.find(c=>c.id==='denver-mint-store');
  assert.match(mint.tourUrl,/usmint\.gov\/about\/tours-and-locations/);
  assert.match(mint.shopUrl,/usmint\.gov\/shop/);
  assert.notEqual(mint.tourUrl,mint.shopUrl);
  assert.match(renderer,/Tour reservation details/);
  assert.doesNotMatch(renderer,/tickets available|booked|paid successfully/i);
});

test('retail cards mount as real Oracle swipeable widgets with native shared actions',()=>{
  assert.match(home,/denver-retail-quick-cards\.mjs\?v=20261101-retail1/);
  assert.match(home,/denver-retail-quick-cards\.css\?v=20261101-retail1/);
  assert.match(home,/id="premiumSourceCards"/);
  assert.match(renderer,/dataset\.sourceReady='true'/);
  assert.match(renderer,/dataset\.sourceId=card\.id/);
  assert.match(renderer,/mountCardActions\(actions/);
  assert.match(renderer,/quantaphi:source-cards-ready/);
  assert.match(renderer,/premiumSourceCards/);
  assert.match(renderer,/new URL\('https:\/\/www\.google\.com\/maps\/search\/\?api=1'\)/);
  assert.match(renderer,/rel='noopener noreferrer'/);
});

test('card hero is product-led, with original-source imagery when available',()=>{
  assert.match(renderer,/denver-retail-photo/);
  assert.match(renderer,/photo\.addEventListener\('error'/);
  assert.match(renderer,/Original product photos only where source-verified/);
  assert.match(css,/aspect-ratio:4\/3/);
  assert.match(css,/:focus-visible/);
  for(const card of DENVER_RETAIL_CARDS){
    if(card.photo)assert.match(card.photo,/^https:\/\//);
    assert.ok(!/placeholder|picsum|unsplash|fake|generated/i.test(card.photo||''));
  }
});
