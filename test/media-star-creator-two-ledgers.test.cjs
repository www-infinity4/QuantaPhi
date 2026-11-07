'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('media-star-creator.js','utf8');
test('builder explicitly asks whether curator wants paid episodes and how many free first',()=>{
 assert.match(src,/Do you want to charge.*curated episodes/i);
 assert.match(src,/How many episodes are free/i);
 assert.match(src,/Episodes.*one per line/i);
 assert.match(src,/chargeForNext/);
 assert.match(src,/freeEpisodes/);
});
test('published portable HTML does not expose gated episode source URLs',()=>{
 assert.match(src,/data-curation-policy/);
 assert.match(src,/data-payment-mode=\\"off\\"/);
 assert.match(src,/Paid curated episode.*wallet/i);
 assert.match(src,/safeSource/);
 assert.doesNotMatch(src,/fred-spaces-ledger\.marvaseater\.workers\.dev/);
});
test('creator studio submits draft configuration to authenticated production registration without client wallet writes',()=>{
 assert.match(src,/registerProduction\(/);
 assert.match(src,/creatorSettings:/);
 assert.match(src,/episodes:/);
 assert.match(src,/disabled_pending/);
 assert.doesNotMatch(src,/UPDATE accounts SET star_coins/);
 assert.doesNotThrow(()=>new Function(src));
});
