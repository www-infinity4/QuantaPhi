'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {runInNewContext} = require('node:vm');

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
  assert.match(html, /<link rel="stylesheet" href="\.\/oracle-interface\.css">/);
  assert.match(html, /<body class="oracle-quanta">/);
  assert.match(html, /color-scheme:\s*light/);
  assert.match(html, /background:\s*var\(--oracle-paper\)/);
  assert.match(html, /background:\s*var\(--oracle-surface\)/);
  assert.match(html, /background:\s*var\(--oracle-red\)/);
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

test('the native form cannot carry dimensions before the local module initializes', () => {
  const html = fs.readFileSync('infinity-coin-housing.html', 'utf8');
  const form = html.match(/<form\b[^>]*id="dimension-form"[^>]*>[\s\S]*?<\/form>/)?.[0];
  assert.ok(form);
  const fieldset = form.match(/<fieldset\b[^>]*\sdisabled(?:\s|>)[\s\S]*?<\/fieldset>/)?.[0];
  assert.ok(fieldset, 'keep measurement controls disabled before script initialization');
  const inputs = [...form.matchAll(/<input\b[^>]*>/g)].map(([input]) => input);
  assert.equal(inputs.length, 2);
  for (const input of inputs) {
    assert.ok(fieldset.includes(input));
    assert.doesNotMatch(input, /\sname\s*=/i, 'measurements must not be serializable by the browser');
  }
  assert.match(fieldset, /<button\b[^>]*type="submit"/);
  assert.match(html, /The calculator needs JavaScript/);
});

test('the module installs a local submit handler before enabling the measurement form', async () => {
  const {proposeHousingEnvelope} = await load();
  const html = fs.readFileSync('infinity-coin-housing.html', 'utf8');
  const source = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source);
  const fieldset = {disabled: true};
  let submit;
  const elements = {
    'dimension-controls': fieldset,
    'dimension-form': {
      addEventListener(type, handler) {
        assert.equal(type, 'submit');
        assert.equal(fieldset.disabled, true);
        submit = handler;
      }
    },
    diameter: {value: '38.1'},
    thickness: {value: '3.0'},
    calculation: {textContent: ''}
  };
  runInNewContext(source.replace(/^import .*;$/m, ''), {
    document: {getElementById: id => elements[id]},
    proposeHousingEnvelope
  });
  assert.equal(fieldset.disabled, false);
  const event = {prevented: false, preventDefault() { this.prevented = true; }};
  submit(event);
  assert.equal(event.prevented, true);
  assert.match(elements.calculation.textContent, /38\.7 mm diameter[\s\S]*52\.7 mm diameter × 10 mm thick/);
  assert.match(elements.calculation.textContent, /Not a CAD release/);
  elements.diameter.value = '';
  event.prevented = false;
  submit(event);
  assert.equal(event.prevented, true);
  assert.match(elements.calculation.textContent, /Measure coin diameter/);
});
