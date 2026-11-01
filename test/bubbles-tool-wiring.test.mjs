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
