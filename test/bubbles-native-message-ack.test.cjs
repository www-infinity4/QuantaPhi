'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const site=fs.readFileSync('bubbles-ai.js','utf8');
function bridge(sendMessage){
 const state=site.slice(site.indexOf('const nativeAcceptedIds='),site.indexOf('let nativeGPTAvailable='));
 const methods=site.slice(site.indexOf(' sendNativeText:'),site.indexOf(' drainNativeReply:'));
 const context={sendMessage,status:{},nativeOverlay:true,busy:false,nativeSpeechPending:false,nativeSpeechReply:''};
 vm.createContext(context);vm.runInContext(state+'\nthis.bridge={'+methods+'};',context);return context;
}
const id='12345678-1234-4234-8234-123456789abc';
const next='22345678-1234-4234-8234-123456789abc';
test('lost native acknowledgement retries the same turn without duplicating a model or tool call',async()=>{
 let finish;const calls=[];const c=bridge((...args)=>{calls.push(args);return new Promise(r=>finish=r)});
 assert.equal(c.bridge.sendNativeSpeech('repair my page',id),true);
 assert.equal(c.bridge.sendNativeSpeech('repair my page',id),true);
 assert.equal(c.bridge.sendNativeText('next request',next),false);
 assert.equal(calls.length,1);
 finish();await new Promise(setImmediate);
 assert.equal(c.bridge.sendNativeText('next request',next),true);
 assert.equal(calls.length,2);
});
test('busy rejection does not consume the ID, and async pairing preflight is serialized',async()=>{
 const calls=[];const c=bridge((...args)=>{calls.push(args);return Promise.resolve()});
 c.busy=true;assert.equal(c.bridge.sendNativeText('first',id),false);
 c.busy=false;assert.equal(c.bridge.sendNativeText('first',id),true);
 assert.equal(c.bridge.sendNativeSpeech('second',next),false);
 await new Promise(setImmediate);
 assert.equal(c.bridge.sendNativeSpeech('second',next),true);
 assert.equal(calls.length,2);
});
test('legacy no-ID calls remain compatible; invalid IDs never dispatch; rejection releases the bridge',async()=>{
 let calls=0;const c=bridge(()=>{calls++;return Promise.reject(Error('offline'))});
 assert.equal(c.bridge.sendNativeText('hello','not-a-message-id'),false);
 assert.equal(c.bridge.sendNativeText('hello'),true);
 await new Promise(setImmediate);
 assert.match(c.status.textContent,/could not complete/);
 assert.equal(c.bridge.sendNativeText('try again'),true);
 await new Promise(setImmediate);assert.equal(calls,2);
});

test('screen evidence stays a separate argument and never becomes the owner command',async()=>{
 const calls=[];const c=bridge((...args)=>{calls.push(args);return Promise.resolve()});
 assert.equal(c.bridge.sendNativeText('explain this page',id,'untrusted visible text'),true);
 assert.deepEqual(Array.from(calls[0]),['explain this page',false,'untrusted visible text']);
 await new Promise(setImmediate);
});
