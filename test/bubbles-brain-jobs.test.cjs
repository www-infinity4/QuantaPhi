'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const src=fs.readFileSync('bubbles-ai.js','utf8');
const start=src.indexOf('function isBrainJobIntent(text){');
const end=src.indexOf('function isOwnerWorkRequest(text){',start);
if(start<0||end<0)throw Error('Missing Bubbles owner intent functions');
const {isBrainJobIntent,brainJobDetail}=vm.runInNewContext(src.slice(start,end)+';({isBrainJobIntent,brainJobDetail})');
test('owner speech for a concrete Robot Brain job produces an instruction',()=>{
 const phrase='make a job in robot brain to fix the antique radio viewer links';
 assert.equal(isBrainJobIntent(phrase),true);
 assert.equal(brainJobDetail(phrase),'fix the antique radio viewer links');
});
test('owner asks for work details rather than generating a blank job',()=>{
 assert.equal(isBrainJobIntent('create a job in robot brain'),true);
 assert.equal(brainJobDetail('create a job in robot brain'),'');
});
test('follow up wording addressed to Bubbles can reach Robot Brain',()=>{
 assert.equal(isBrainJobIntent('Bubbles tell my robot brain to investigate the gallery renderer'),true);
 assert.equal(brainJobDetail('Bubbles tell my robot brain to investigate the gallery renderer'),'investigate the gallery renderer');
 assert.equal(isBrainJobIntent('I need it to make a job in the robot brain'),true);
});
test('informational and negative statements are not actionable commands',()=>{
 assert.equal(isBrainJobIntent('why can Bubbles not create a job in robot brain'),false);
 assert.equal(isBrainJobIntent('do not create a job in robot brain'),false);
 assert.equal(isBrainJobIntent('talk about the robot brain jobs'),false);
});
test('all iframe Bubbles instances are visitor-only, even without embed flag',()=>{
 assert.match(src,/const embedded=window\.parent!==window/);
 assert.match(src,/if\(embedded\|\|!ownerReady\|\|!ownerHeaders\)/);
});
test('deduped owner jobs are not reset to ready',()=>{
 assert.match(src,/if\(result\.deduplicated&&result\.ticket\.status!=='draft'\)/);
});
