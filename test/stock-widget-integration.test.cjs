'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const start = html.indexOf('let stockWidgetRequest=0,stockWidgetRuntimePromise=null;');
const end = html.indexOf('// The deadline covers both response headers', start);
assert.ok(start >= 0 && end > start, 'stock widget integration is present');
function fixture() {
 const context = vm.createContext({});
 vm.runInContext(html.slice(start, end), context);
 return context;
}
test('stock intents are distinguished from stock media searches', () => {
 const ui = fixture();
 for (const q of ['Meta stocks', 'META', '$AAPL', 'Google share price', 'metaoscare stocks']) {
  assert.equal(ui.stockQueryIntent(q), true, q);
 }
 for (const q of ['stock photos', 'stock image', 'stock photography', 'stock videos', 'photography']) {
  assert.equal(ui.stockQueryIntent(q), false, q);
 }
});
test('major known stocks resolve without an AI call and ambiguous words do not get invented tickers', () => {
 const ui = fixture();
 for (const [query, symbol, exchange] of [
  ['Meta Platforms stock', 'META', 'NASDAQ'],
  ['META', 'META', 'NASDAQ'],
  ['Alphabet stock', 'GOOGL', 'NASDAQ'],
  ['Google stock', 'GOOGL', 'NASDAQ'],
  ['GOOG', 'GOOG', 'NASDAQ'],
  ['Nvidia stocks', 'NVDA', 'NASDAQ'],
  ['IBM shares', 'IBM', 'NYSE'],
  ['Apple stocks', 'AAPL', 'NASDAQ']
 ]) {
  const result=ui.stockKnownListing(query);
  assert.equal(result?.symbol,symbol,query);
  assert.equal(result?.exchange,exchange,query);
 }
 assert.equal(ui.stockKnownListing('metaoscare stocks'),null);
 assert.equal(ui.stockKnownListing('Oscar stocks'),null);
});
test('missing resolver data shows a clear fallback and the runtime can load locally', () => {
 assert.match(html,/No verified stock ticker matched this search/);
 assert.match(html,/Did you mean Meta Platforms \(META\)\?/);
 assert.match(html,/\/widgetphi-stock\.js\?v=20261009-stock-recovery1/);
 const runtime = fs.readFileSync('widgetphi-stock.js', 'utf8');
 assert.match(runtime,/Open quote in Google Finance/);
 assert.match(runtime,/window\.WidgetPhiStock|global\.WidgetPhiStock/);
});
