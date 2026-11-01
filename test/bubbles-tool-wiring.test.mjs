import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
test('same Bubbles turn is guarded before asynchronous owner code and memory lookups',()=>{
 const start=source.indexOf('async function sendMessage(');
 const end=source.indexOf("\n window.addEventListener('bubbles:chatgpt-ready'",start);
 assert.ok(start>=0&&end>start);
 const code=source.slice(start,end);
 const guard=code.indexOf('if(busy||turnPending)return;');
 const pairing=code.indexOf('await consumeOwnerCodeFromChat(');
 const context=code.indexOf('await currentOwnerContext(');
 assert.ok(guard>0&&guard<pairing&&pairing<context);
 assert.match(code,/turnPending=true;\s*try\{/);
 assert.match(code,/finally\s*\{turnPending=false;\}/);
});
test('ordinary Bubbles replies distinguish partial/failed/blocked tool receipts from verified actions',()=>{
 const file=source;
 assert.match(file,/describeBubblesToolOutcome\(/);
 assert.match(file,/json\.receipt/);
 assert.match(file,/answerStatus/);
});

test('receipt explanation preserves actual answer and marks incomplete actions',()=>{
 const start=source.indexOf('function describeBubblesToolOutcome(');
 const end=source.indexOf('function normalizeOwnerAssistantReply(',start);
 const describe=new Function(source.slice(start,end)+'\nreturn describeBubblesToolOutcome;')();
 assert.equal(describe({receipt:{tool:'web.search',status:'complete'}},'Found three sources'),'Found three sources');
 assert.match(describe({receipt:{tool:'web.search',status:'failed'}},'No sources'),/failed; no successful action/);
 assert.match(describe({receipt:{tool:'github.read_file',status:'blocked'}},'Source is unavailable'),/blocked/);
 assert.match(describe({receipt:{tool:'web.search',status:'complete'},answerStatus:'partial'},'Source results found'),/remains incomplete/);
 assert.equal(describe({output:'Model reply'},'Hello'),'Hello');
});

test('accepted voice is retained during owner context preflight and drained after lock release',async()=>{
 const vm=await import('node:vm');
 const start=source.indexOf('function drainVoiceTurns()');
 const end=source.indexOf('let playbackVersion=',start);
 assert.ok(start>=0&&end>start);
 const context={busy:false,turnPending:true,voicePending:['first accepted voice'],Promise,seen:[]};
 context.sendMessage=text=>context.seen.push(text);
 vm.runInNewContext(source.slice(start,end)+';drainVoiceTurns();',context);
 assert.equal(context.voicePending.length,1,'voice must not be shifted while preflight lock is held');
 assert.deepEqual(context.seen,[]);
 context.turnPending=false;
 vm.runInNewContext('drainVoiceTurns()',context);
 await Promise.resolve();await Promise.resolve();
 assert.equal(context.voicePending.length,0);
 assert.deepEqual(context.seen,['first accepted voice']);
 const heard=source.slice(source.indexOf('function heardTranscript('),source.indexOf('async function startVoice()',source.indexOf('function heardTranscript(')));
 assert.match(heard,/if\(turn\.type==='message'\)\{if\(busy\|\|turnPending\)enqueueVoiceTurn/);
 assert.match(source,/finally\{turnPending=false;drainVoiceTurns\(\);\}/);
});

test('ChatGPT bridge and AI consultation cannot falsely advertise readiness while preflight is occupied',()=>{
 assert.match(source,/event\.detail\?\.respond\?\.\(!embedded&&!busy&&!turnPending&&ownerReady/);
 assert.match(source,/if\(embedded\|\|busy\|\|turnPending\|\|!text\)/);
 const start=source.indexOf("window.addEventListener('bubbles:ai-consult'");
 assert.ok(start>0);
 assert.match(source.slice(start,start+250),/embedded\|\|busy\|\|turnPending/);
});
