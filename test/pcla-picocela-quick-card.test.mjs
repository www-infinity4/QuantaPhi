import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DISCOVERY_CARDS,findDiscovery,safeDiscovery} from '../quanta-feed-catalog.mjs';
import {feedCard,ALL_FEED_CARDS} from '../quanta-feed.mjs';

test('PCLA Japanese mesh networking card exists in the original public discovery feed',()=>{
 const card=findDiscovery('pcla-picocela');
 assert.ok(card,'Missing PCLA discovery card');
 assert.equal(feedCard('pcla-picocela')?.origin,'discovery');
 assert.equal(ALL_FEED_CARDS.filter(x=>x.id==='pcla-picocela').length,1);
 assert.equal(DISCOVERY_CARDS.filter(x=>x.id==='pcla-picocela').length,1);
 assert.equal(card.url,'https://picocela.com/en/');
 assert.equal(card.official,'https://picocela.com/en/');
 assert.equal(card.symbol,'PCLA');
 assert.equal(card.exchange,'NASDAQ');
 assert.equal(safeDiscovery(card),true);
});

test('PCLA describes real manufacturer capabilities and does not claim an Infinity partnership',()=>{
 const card=findDiscovery('pcla-picocela');
 assert.match(card.study,/PicoCELA Backhaul Engine/);
 assert.match(card.study,/PicoManager/);
 assert.match(card.study,/multi-hop/i);
 assert.match(card.study,/no verified commercial partnership|not a verified partnership/i);
 assert.doesNotMatch(card.study,/guaranteed|risk-free|buy now/i);
});

test('PCLA historical quote is dated, reverse-split aware and not presented as live gains',()=>{
 const card=findDiscovery('pcla-picocela');
 assert.equal(card.quoteDate,'2026-11-06');
 assert.equal(card.quoteCloseUsd,6.10);
 assert.equal(card.splitRatio,'1-for-30');
 assert.match(card.marketUrl,/^https:\/\/finance\.yahoo\.com\/quote\/PCLA\/history\//);
 assert.match(card.study,/reverse split/i);
 assert.match(card.study,/split-adjusted/i);
 assert.match(card.status,/not live/i);
 assert.match(card.study,/not financial advice/i);
});

test('PCLA card has a source-backed bespoke mesh-network visual and in-card research actions',()=>{
 const source=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../quanta-card-experience.css',import.meta.url),'utf8');
 assert.match(source,/card\.id==='pcla-picocela'/);
 assert.match(source,/mountPclaResearch\(root,card\)/);
 assert.match(source,/PicoCELA Backhaul Engine/);
 assert.match(source,/Official PicoCELA/);
 assert.match(source,/Market history/);
 assert.match(css,/qcx-pcla-mesh/);
 assert.match(css,/qcx-pcla-node/);
});


test('PCLA mounts as a real original homepage source-bank card in the active Oracle carousel',async()=>{
 const {ACTIVE_SOURCE_CARDS,PUBLIC_SOURCE_IDS,isPublicSourceCard,findSourceCard}=await import('../source-quick-cards.mjs');
 const card=ACTIVE_SOURCE_CARDS.find(x=>x.id==='pcla-picocela');
 assert.ok(card,'PCLA missing from real source quick-card registry');
 assert.ok(PUBLIC_SOURCE_IDS.includes(card.id),'PCLA omitted from public shelf');
 assert.equal(findSourceCard('pcla-picocela'),card);
 assert.equal(card.official,'https://picocela.com/en/');
 assert.equal(card.marketUrl,'https://finance.yahoo.com/quote/PCLA/history/');
 assert.equal(card.quoteDate,'2026-11-06');
 assert.equal(isPublicSourceCard(card),true);
 const fs=await import('node:fs');
 const launcher=fs.readFileSync(new URL('../source-quick-cards.mjs',import.meta.url),'utf8');
 const oracle=fs.readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
 assert.match(launcher,/ACTIVE_SOURCE_CARDS\.filter\(isPublicSourceCard\)/);
 assert.match(launcher,/window\.dispatchEvent\(new Event\('quantaphi:source-cards-ready'\)\)/);
 assert.match(oracle,/#siteQuickCards \.iqc-card\[data-source-id\]/);
 assert.match(oracle,/entries\.push\(entry\)/);
});
