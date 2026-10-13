'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source=fs.readFileSync('bubbles-voice-gate.js','utf8');
function gate(){const context={};vm.runInNewContext(source,context);return context.BubblesVoiceGate.create({followupMs:20000})}

test('custom Brain wake name works alongside Bubbles and updates safely',()=>{
 const context={};vm.runInNewContext(source,context);
 const g=context.BubblesVoiceGate.create({name:'Brain'});
 assert.equal(g.accept('Hey Brain explain the wallet',1000).text,'explain the wallet');
 assert.equal(g.accept('Bubbles another question',5000).type,'message');
 g.reset();g.setName('Brain.*');
 assert.equal(g.accept('BrainXYZ explain this',6000).type,'ignore');
 assert.equal(g.accept('Brain.* explain this',6001).text,'explain this');
});

test('wake name opens a speech conversation without a Talk button',()=>{
 const g=gate();
 assert.equal(g.accept('It is sunny here',1000).type,'ignore');
 const first=g.accept('Hey Bubbles what is a Quant?',1000);
 assert.equal(first.type,'message');assert.equal(first.text,'what is a Quant?');
 assert.equal(g.accept('And how can I use it?',1400).type,'message');
 assert.equal(g.accept('Someone else talking',26000).type,'ignore');
});
test('name alone opens a conversation; mute requires an intentional command',()=>{
 const g=gate();
 assert.equal(g.accept('Bubbles',1000).type,'wake');
 assert.equal(g.accept('tell me about music',2000).type,'message');
 assert.equal(g.accept('Bubbles go quiet',2500).type,'mute');
 assert.equal(g.accept('hello?',3000).type,'ignore');
 assert.equal(g.accept('Bubbles wake up',4000).type,'wake');
 assert.equal(g.accept('a new task',4001).type,'message');
});
test('recognition duplicate results are never sent twice',()=>{
 const g=gate();
 assert.equal(g.accept('Bubbles explain lithium',1000).type,'message');
 assert.equal(g.accept('Bubbles explain lithium!',1500).type,'ignore');
 assert.equal(g.accept('Bubbles explain lithium',6000).type,'message');
});
test('unrecognized people and unrelated transcripts do not start a session',()=>{
 const g=gate();
 for(const s of ['the bubbles are beautiful','Bubblegum is red','Tell Alexa about it',''])assert.equal(g.accept(s,1000).type,'ignore');
 assert.equal(g.accept('Bubble AI, start listening',1100).type,'wake');
});


test('natural listening accepts speech after long silence and respects mute',()=>{
 const context={};vm.runInNewContext(source,context);
 const g=context.BubblesVoiceGate.create({requireWakeName:false});
 assert.equal(g.accept('Explain the wallet',1000).type,'message');
 assert.equal(g.accept('What about my quants?',600000).type,'message');
 assert.equal(g.accept('What about my quants?',600001).reason,'duplicate');
 assert.equal(g.accept('stop listening',601000).type,'mute');
 assert.equal(g.accept('Bubbles wake up',602000).type,'ignore');
 g.reset();
 assert.equal(g.accept('Hello again',603000).type,'message');
});
