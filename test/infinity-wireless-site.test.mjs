import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('Infinity Wireless URLs route through the QuantaPhi site worker',()=>{
 const worker=read('workers/quantaphi-site/worker.js');
 assert.match(worker,/path === '\/wireless'/);
 assert.match(worker,/sourcePath: '\/wireless\/index\.html'/);
 assert.match(worker,/publicPath: '\/wireless\/'/);
});
test('Wireless is a directly interactive first-party card in mixed and original Oracle carousel',()=>{
 const home=read('index.html'),deck=read('oracle-card-deck.js');
 assert.match(home,/<section id="infinityWirelessCard"/);
 assert.match(home,/id="order-form"/);
 assert.match(home,/id="order-status"/);
 assert.match(home,/name="city"/);
 assert.match(home,/name="acceptedPlanningOnly"/);
 assert.match(home,/src="\/wireless\/switchboard\.svg"/);
 assert.match(home,/<script[^>]+src="\/wireless\/order\.mjs/);
 assert.doesNotMatch(home.match(/<section id="infinityWirelessCard"[\s\S]*?<\/section>/)?.[0]||'',/<iframe\b/i);
 assert.match(deck,/\['infinityWirelessCard','Infinity Wireless/);
 assert.match(deck,/infinityWirelessCard:\['infinity-wireless','Technology'/);
});
test('Original switchboard artwork is non-fabricated illustration rather than a live network map',()=>{
 const svg=read('wireless/switchboard.svg');
 assert.match(svg,/<svg /);
 assert.match(svg,/Planning concept/);
 assert.doesNotMatch(svg,/live coverage|tower connected|DARPA-grade/i);
});
