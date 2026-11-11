'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const load = () => import('../infinity-coin-housing-core.mjs');

test('proposal uses actual entered coin dimensions and labels every dimension provisional', async () => {
  const {proposeHousingEnvelope} = await load();
  const p = proposeHousingEnvelope(38.1, 3.0);
  assert.equal(p.coinDiameterMm, 38.1);
  assert.equal(p.coinThicknessMm, 3);
  assert.equal(p.cavityDiameterMm, 38.7);
  assert.equal(p.outerDiameterMm, 52.7);
  assert.equal(p.outerThicknessMm, 10);
  assert.equal(p.status, 'unverified_concept');
  assert.equal(p.productionReady, false);
});

test('rejects unmeasured, unrealistic or non-finite physical dimensions', async () => {
  const {proposeHousingEnvelope} = await load();
  for (const pair of [[null,3],['',3],[0,2],[1000,2],[20,0],[20,NaN],[20,Infinity],[20,25],[-10,2]]) {
    assert.throws(() => proposeHousingEnvelope(...pair), RangeError);
  }
});

test('never turns browser-provided dimensions into manufacturing certification', async () => {
  const {proposeHousingEnvelope} = await load();
  const p = proposeHousingEnvelope(24, 2);
  assert.equal(p.productionReady, false);
  assert.equal(p.quoteVerified, false);
  assert.equal(p.inventoryVerified, false);
  assert.equal(p.checkoutEnabled, false);
});

test('preview is readable and cannot present unavailable stock as purchasable', () => {
  const html = fs.readFileSync('infinity-coin-housing.html','utf8');
  assert.match(html, /name="viewport"/);
  assert.match(html, /type="module"/);
  assert.match(html, /<svg\b/);
  assert.match(html, /not for sale/i);
  assert.match(html, /concept/i);
  assert.match(html, /CAD pending/i);
  assert.match(html, /Prototype pending/i);
  assert.match(html, /Inventory unverified/i);
  assert.doesNotMatch(html, /buy now|add to cart|checkout\(/i);
});

test('manufacturing packet points to the recovered original security concept', () => {
  const doc = fs.readFileSync('docs/INFINITY-ALUMINUM-COIN-HOUSING-1919.md','utf8');
  assert.match(doc, /alloy-lattice-puf\.md/);
  assert.match(doc, /\.STEP/);
  assert.match(doc, /6061-T6/);
  assert.match(doc, /RFQ/);
  assert.match(doc, /No verified inventory/i);
});
