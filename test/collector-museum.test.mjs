import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {museumRevealReady} from '../workers/quanta-phi-ledger/collector-cards.mjs';
const source=readFileSync(new URL('../workers/quanta-phi-ledger/collector-cards.mjs',import.meta.url),'utf8');
const worker=readFileSync(new URL('../workers/quanta-phi-ledger/worker.js',import.meta.url),'utf8');
const client=readFileSync(new URL('../collector-museum.js',import.meta.url),'utf8');
const wallet=readFileSync(new URL('../cloud-wallet-client.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const DAY=24*60*60*1000;
test('no card revealed before first purchase, even years after a design is published',()=>{
 assert.equal(museumRevealReady(null,12*DAY),false);
 assert.equal(museumRevealReady(0,100*DAY),false);
});
test('museum public reveal starts exactly seven days after the first sale',()=>{
 const firstSale=100*DAY;
 assert.equal(museumRevealReady(firstSale,firstSale+7*DAY-1),false);
 assert.equal(museumRevealReady(firstSale,firstSale+7*DAY),true);
 assert.equal(museumRevealReady(firstSale,firstSale+8*DAY),true);
});
test('four named museum series and private previews precede one-StarCoin checkout',()=>{
 for(const series of ['StarQuest','Chiller','ShopLC','Infinity Radio']){
  assert.ok(source.includes("'"+series+"'"));
  assert.ok(client.includes("'"+series+"'"));
 }
 assert.ok(client.includes("purchase.disabled=true"));
 assert.ok(client.includes("preview(card.designId)"));
 assert.ok(client.includes("quantaphi:collector:pending:"));
 assert.ok(client.includes("result.receipt.goldEdition"));
});
test('wallet balance and collector serial issue in one transactional write',()=>{
 assert.match(source,/CREATE TRIGGER.*qp_collector_charge_v1/);
 assert.match(source,/UPDATE accounts SET star_coins=star_coins-1/);
 assert.match(source,/insufficient_star_coins/);
 assert.match(source,/UNIQUE\(design_id,serial_number\)/);
 assert.match(source,/UNIQUE\(account_id,request_id\)/);
 assert.match(source,/INSERT INTO qp_collector_copies/);
 assert.match(source,/SELECT COALESCE\(MAX\(serial_number\),0\)\+1/);
});
test('public museum conceals artwork and unreleased sales totals',()=>{
 assert.match(source,/sold:revealed\?Number\(row.sold\):null/);
 assert.match(source,/artUrl:revealed\?artURL\(request,row.design_id\):null/);
 assert.match(source,/!revealed&&!authenticatedPreview/);
 assert.match(worker,/v1\\\/collector\\\/preview/);
});
test('Cloudflare client allows only the canonical authenticated collector endpoint',()=>{
 assert.match(wallet,/url\.origin==='https:\/\/quanta-phi-ledger\.marvaseater\.workers\.dev'/);
 assert.match(wallet,/url\.pathname\.startsWith\('\/v1\/collector\/'\)/);
 assert.match(worker,/listCollectorMuseum/);
});
test('hamburger has large words and links to standalone Card Museum',()=>{
 assert.match(index,/font-size:18px!important/);
 assert.match(index,/href="\/card-museum\/"/);
 assert.match(index,/id="qmenuBtn"[^>]*aria-expanded="false"/);
});
