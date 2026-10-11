'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source=fs.readFileSync('bubbles-voice-gate.js','utf8');
function gate(){const context={};vm.runInNewContext(source,context);return context.BubblesVoiceGate.create({followupMs:20000})}

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
