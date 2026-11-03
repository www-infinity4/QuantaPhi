import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  COUPON_BRANDS,filterVerifiedOffers,collectFollowedOffers,
  checkoutAdvice,sanitizeDeviceCouponWallet,COUPON_WALLET_KEY
} from '../coupon-wallet-core.mjs';

const at='2026-11-03T18:00:00.000Z';
const offer=(overrides={})=>({
  id:'issuer-pepsi-123',brandId:'pepsi',title:'Pepsi 12 oz cans · 12-pack',
  sourceUrl:'https://www.pepsi.com/products/pepsi',verifiedAt:'2026-11-03T17:00:00.000Z',
  expiresAt:'2026-11-11T00:00:00.000Z',reviewStatus:'editorial-reviewed',
  redemption:'paper-manufacturer',store:'any-participating',details:'Manufacturer printable coupon; exact items and terms apply',
  ...overrides
});

test('Pepsi and Mello Yello are different issuers and each has real original-image attribution',()=>{
  assert.deepEqual(COUPON_BRANDS.map(x=>x.id),['pepsi','mello-yello']);
  assert.equal(COUPON_BRANDS[0].issuer,'PepsiCo');
  assert.equal(COUPON_BRANDS[1].issuer,'The Coca-Cola Company');
  for(const brand of COUPON_BRANDS){
    assert.match(brand.image,/^https:\/\//);
    assert.match(brand.imageSource,/^https:\/\//);
    assert.match(brand.official,/^https:\/\//);
  }
  assert.notEqual(COUPON_WALLET_KEY,'quantaPhiCardStarsV1');
});

test('only recent, nonexpired, independently reviewed offers with an official issuer link are saved',()=>{
  const entries=[
    offer(),
    offer({id:'bad',sourceUrl:'https://deals.example.org/pepsi'}),
    offer({id:'stale',verifiedAt:'2026-10-25T10:00:00.000Z'}),
    offer({id:'ended',expiresAt:'2026-11-02T00:00:00.000Z'}),
    offer({id:'unreviewed',reviewStatus:'unreviewed'}),
    offer({id:'co-special',brandId:'mello-yello',sourceUrl:'https://www.coca-cola.com/us/en/offerings',redemption:'merchant-app'})
  ];
  const verified=filterVerifiedOffers(entries,at);
  assert.deepEqual(verified.map(x=>x.id),['issuer-pepsi-123','co-special']);
});

test('bad URL lookalikes, invalid dates, wrong brand and fake code redemption cannot become wallet assets',()=>{
  const entries=[
    offer({id:'spoof',sourceUrl:'https://www.pepsi.com.evil.example/path'}),
    offer({id:'unsafe',sourceUrl:'javascript:alert(1)'}),
    offer({id:'bad-date',verifiedAt:'tomorrow'}),
    offer({id:'future',verifiedAt:'2026-11-04T00:00:00.000Z'}),
    offer({id:'brand-not-supported',brandId:'other-brand'}),
    offer({id:'arbitrary-code',redemption:'invented-barcode'})
  ];
  assert.deepEqual(filterVerifiedOffers(entries,at),[]);
});

test('Following auto-saves exactly once to the non-financial device coupon collection',()=>{
  const verified=filterVerifiedOffers([offer(),offer(),offer({id:'co-special',brandId:'mello-yello',sourceUrl:'https://www.coca-cola.com/us/en/offerings',redemption:'merchant-app'})],at);
  const first=collectFollowedOffers([],verified,['pepsi'],at);
  const second=collectFollowedOffers(first,verified,['pepsi'],at);
  assert.equal(first.length,1);
  assert.deepEqual(second,first);
  assert.equal(first[0].id,'issuer-pepsi-123');
  assert.equal(first[0].brandId,'pepsi');
});

test('at checkout Walmart and McDonald’s are policy-aware and cannot claim automatic tender',()=>{
  const paper=offer(),app=offer({id:'mello-app',brandId:'mello-yello',sourceUrl:'https://www.coca-cola.com/us/en/offerings',redemption:'merchant-app'});
  const wm=checkoutAdvice(paper,'walmart-in-store');
  assert.equal(wm.canAutoApply,false);
  assert.match(wm.message,/paper/i);
  const md=checkoutAdvice(app,'mcdonalds');
  assert.equal(md.canAutoApply,false);
  assert.match(md.message,/one.*deal|app.*deal/i);
  assert.equal(checkoutAdvice(paper,'walmart-online').canAutoApply,false);
});

test('homepage mounts the original moving-card source bank with distinct layouts and wallet controls',()=>{
  const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
  const home=read('index.html'),deck=read('oracle-card-deck.js'),ui=read('coupon-quick-cards.mjs'),css=read('coupon-quick-cards.css');
  assert.match(home,/id="couponDiscoveryCards"/);
  assert.match(home,/coupon-quick-cards\.mjs/);
  assert.match(home,/coupon-quick-cards\.css/);
  assert.match(deck,/#couponDiscoveryCards \.iqc-card\[data-source-id\]/);
  for(const id of ['pepsi','mello-yello','coupon-wallet']){
    assert.match(ui,new RegExp(id));
  }
  assert.match(ui,/quantaphi:source-cards-ready/);
  assert.match(ui,/mountCardActions/);
  assert.match(ui,/data|sourceReady/);
  assert.match(ui,/autoSave/);
  assert.match(ui,/fetch\(/);
  assert.match(css,/@media\s*\(max-width:\s*480px\)/);
  assert.match(css,/:focus-visible/);
});

test('reopening the device wallet cannot resurrect expired, stale or unreviewed coupons',()=>{
 const raw={autoSave:true,checkedAt:'2026-11-01T10:00:00.000Z',saved:[
  offer({id:'expired',expiresAt:'2026-11-02T00:00:00.000Z'}),
  offer({id:'fresh'})
 ]};
 const clean=sanitizeDeviceCouponWallet(raw,at);
 assert.equal(clean.autoSave,true);
 assert.deepEqual(clean.saved.map(x=>x.id),['fresh']);
 assert.deepEqual(sanitizeDeviceCouponWallet({saved:[offer({reviewStatus:'pending'})]},at).saved,[]);
});
