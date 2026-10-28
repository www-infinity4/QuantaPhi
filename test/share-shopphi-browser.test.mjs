import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const index=source('index.html'),shop=source('shop-ad-phi.js'),form=source('shopphi-sell.html'),css=source('shop-ad-phi.css'),actions=source('quanta-card-actions.mjs'),money=source('x-money.html');
test('Android carousel spotlights original cards and preserves navigable controls',()=>{
 assert.match(index,/oracle-card-spotlight\.css/);
 assert.match(index,/id="oracleCardStage"/);
 assert.match(index,/id="oracleCardPrevious"/);
 assert.match(index,/id="oracleCardNext"/);
 assert.match(index,/id="oracleCardFollow"/);
 const s=source('oracle-card-spotlight.css');
 assert.match(s,/oracle-original-cover/);
 assert.match(s,/oracle-card-deck-nav/);
 assert.match(s,/prefers-reduced-motion/);
 assert.doesNotMatch(s,/display:\s*none!important[^}]*oracleCardStage/);
});
test('seller has full-width eBay-like fields and an honest preview instead of fake publication',()=>{
 assert.match(form,/data-seller-page="true"/);
 assert.match(form,/shop-ad-phi\.js/);
 assert.match(shop,/sap-item-specifics/);
 for(const field of ['category','condition','shipping','quantity','priceLabel','title','description'])assert.ok(shop.includes(field),'field '+field);
 assert.match(shop,/Save my item to ShopPhi/);
 assert.match(shop,/form\.hidden=false/);
 assert.match(shop,/feature\.scrollIntoView/);
 assert.match(shop,/Connect your existing Unified Wallet/);
 assert.match(css,/sap-seller-fullscreen/);
 assert.match(css,/sap-submit-listing/);
 assert.match(index,/shop-ad-phi\.js\?v=20261027-seller-live1/);
});
test('ordinary Quick Cards never masquerade Google results as a TinyFish website browser',()=>{
 assert.doesNotMatch(actions,/providerSearchUrl\(provider,value\)\|\|/);
 assert.match(actions,/mountTinyFishCardReader/);
 assert.match(actions,/Open original website/);
 assert.doesNotMatch(shop,/https:\/\/www\.google\.com\/search/);
 assert.match(shop,/https:\/\/www\.ebay\.com\/sch\/i\.html/);
});
test('X Money has its own raster social preview and no generic site cover',()=>{
 assert.match(money,/assets\/share\/x-money-card\.png\?v=20261027-share1/);
 assert.match(money,/name="twitter:image"/);
 assert.match(money,/name="twitter:card" content="summary_large_image"/);
 assert.doesNotMatch(money,/content="https:\/\/quantaphi\.org\/preview\.png/);
 const preview=readFileSync(new URL('../assets/share/x-money-card.png',import.meta.url));
 assert.deepEqual([...preview.slice(0,8)],[137,80,78,71,13,10,26,10]);
 assert.equal(preview.readUInt32BE(16),1200);
 assert.equal(preview.readUInt32BE(20),630);
});
