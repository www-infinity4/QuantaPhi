'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const site=fs.readFileSync('bubbles-ai.js','utf8');

const start=site.indexOf('function normalizeOwnerAssistantReply(');
const stop=site.indexOf('function isOwnerWorkRequest(',start);
assert.ok(start>0&&stop>start,'owner state guard must be present');
const normalize=vm.runInNewContext(site.slice(start,stop)+'\nnormalizeOwnerAssistantReply;',Object.create(null));

test('verified owner: Oracle cannot invent a fresh 64-character pairing blocker',()=>{
 const reply="I'm still blocked; to sync the website I need the 64-character one-time pairing code from the Bubbles app. Please paste it here.";
 const cleaned=normalize(reply,'repair this website',true);
 assert.match(cleaned,/already connected/i);
 assert.match(cleaned,/do not need another pairing code/i);
 assert.doesNotMatch(cleaned,/still blocked|please paste it here/i);
});

test('verified owner: ordinary helpful answers pass through unchanged',()=>{
 const reply="Your owner tools are connected, and the last repair still needs a deployment receipt.";
 assert.equal(normalize(reply,'what is the status',true),reply);
});

test('unverified owner: do not disguise a genuine connection problem',()=>{
 const reply='A pairing code is required for this separate device.';
 assert.equal(normalize(reply,'connect owner tools',false),reply);
});

test('explicit cross-device pairing instructions are not blocked',()=>{
 const reply='To link another phone, paste its one-time pairing code.';
 assert.equal(normalize(reply,'Please pair another phone',true),reply);
});

test('only model answers are corrected; authenticated tool receipts remain untouched',()=>{
 assert.match(site,/const answer=normalizeOwnerAssistantReply\(rawAnswer,request,ownerReady&&Boolean\(ownerHeaders\?\.Authorization\)\)/);
 const modelIndex=site.indexOf('const rawAnswer=extract(json)');
 const receiptIndex=site.indexOf('if(workEvidence){');
 assert.ok(receiptIndex>0&&modelIndex>receiptIndex,'tool work receipts must return before the model path');
});
