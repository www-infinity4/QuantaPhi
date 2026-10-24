'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('property page links official offer, sources and credited image',()=>{
 const page=read('cardone-capital.html');
 assert.match(page,/10X Westshore South/);
 assert.match(page,/https:\/\/cardonecapital\.com\/westshoresouth\//);
 assert.match(page,/https:\/\/cardonecapital\.com\/wp-content\/uploads\/2026\/09\/10X-Westshore\.jpg/);
 assert.match(page,/targeted 5% cashflow/);
 assert.match(page,/not a promise/);
 assert.match(page,/not Cardone Capital/);
 assert.match(page,/https:\/\/invest\.cardonecapital\.com/);
});
test('specialist Bubbles uses the existing first-party embed and cannot charge',()=>{
 const page=read('cardone-capital.html');
 assert.match(page,/src="\/bubbles-embed\.js"/);
 assert.match(page,/data-bubble-role="specialist"/);
 assert.match(page,/No payment processing/);
 assert.doesNotMatch(page,/<input[^>]+(?:cardNumber|creditCard|routingNumber|cvv)/i);
 assert.doesNotMatch(page,/merchant_secret|sk_live_/);
});
test('main website links to an independently attributed, source-backed card without replacing original sections',()=>{
 const home=read('index.html');
 assert.match(home,/id="cardoneCapitalOffer"/);
 assert.match(home,/href="\/cardone-capital\.html"/);
 assert.match(home,/id="oracleCardDeck"/);
 assert.match(home,/id="publicCardTrends"/);
 assert.match(home,/id="bubblesAICard"/);
});
test('new research page is present in sitemap and tracker can watch its card',()=>{
 assert.match(read('sitemap.xml'),/https:\/\/quantaphi\.org\/cardone-capital\.html/);
 assert.match(read('public-card-trends.js'),/cardone-offer.*cardoneCapitalOffer/);
});

test('Cardone property card is wired to the Oracle next/previous carousel and one-tap spotlight',()=>{
 const home=read('index.html'),deck=read('oracle-card-deck.js');
 const css=read('oracle-card-deck.css');
 assert.match(home,/id="oracleCardCardone"/);
 assert.match(home,/id="cardoneCapitalOffer"/);
 assert.match(home,/href="\/cardone-capital\.html"/);
 assert.match(deck,/\['cardoneCapitalOffer','10X Westshore/);
 assert.match(deck,/cardoneButton\?\.addEventListener/);
 assert.match(deck,/stage\.append\(entry\.node\)/);
 assert.match(deck,/spotlightRequested/);
 assert.match(css,/#cardoneCapitalOffer/);
});
