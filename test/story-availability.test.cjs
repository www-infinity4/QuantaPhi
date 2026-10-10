'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('home shows available sourced catalog story immediately and upgrades it with GPT when ready', () => {
 const book = source('infinite-book.js');
 assert.match(book,/const ready = searchMode \? null : pickUnique\(roll, seenIds\(\)\)/);
 assert.match(book,/void nextStory\('',\{requireFresh:false\}\)/);
 assert.match(book,/const unread = unique\.length \? unique : all\.filter\(story=>story\.id!==current\?\.id\)/);
 assert.match(book,/if \(ready && current\?\.id !== ready\.id\) return/);
 assert.match(book,/Reading a verified archived story while Oracle researches/);
 assert.doesNotMatch(book,/\.ib-title'\)\.textContent=busy\?'Cloudflare AI temporarily unavailable':'Story unavailable'/);
});

test('AI-source fallback is never presented as a generated GPT narrative', () => {
 const discovery = source('infinite-book-discovery.js');
 const book = source('infinite-book.js');
 assert.match(discovery,/if\(!successful\)return \{\.\.\.backup,/);
 assert.match(discovery,/status:'Verified Wikipedia source excerpt · original GPT story not completed'/);
 assert.match(discovery,/discoveryMethod:'encyclopedia-backup'/);
 assert.match(discovery,/if\(keywords\.length&&!keywords\.some\(word=>evidence\.includes\(word\)\)\)return null/);
 assert.match(book,/function sourcedCard\(story\)/);
 assert.match(book,/Cited Wikipedia source excerpt · original AI story could not finish/);
 assert.match(book,/eligibleNarrative\?\.\(story\)/);
 assert.match(book,/if\(!spinReference\|\|spinSubmitted\|\|!storyValid\(story\)\|\|!window\.PhiInfiniteBookDiscover\?\.eligibleNarrative\?\.\(story\)\)return/);
});

test('updated production script URLs and syntax',()=>{
 const html=source('index.html');
 assert.match(html,/infinite-book-discovery\.js\?v=20261009-available-source1/);
 assert.match(html,/infinite-book\.js\?v=20261009-available-source1/);
 for(const name of ['infinite-book.js','infinite-book-discovery.js']){
  assert.doesNotThrow(()=>new vm.Script(source(name)), name);
 }
});
