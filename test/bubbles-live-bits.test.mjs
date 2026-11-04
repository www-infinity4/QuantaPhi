import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newLiveBitsState,advanceLiveBits} from '../bubbles-live-iteration-feed.mjs';

const turn = () => advanceLiveBits(newLiveBitsState(),{type:'turn_started'});
test('an iteration begins with owner context; no fabricated actions or spendable credits',()=>{
 const s=turn();
 assert.equal(s.entries.length,1);
 assert.match(s.entries[0].headline,/context/i);
 assert.equal(s.credits,0);
 assert.equal(s.candidates,0);
});
test('context checked before receipts; separate user criteria produce unique reusable bit observations',()=>{
 let s=advanceLiveBits(turn(),{type:'memory',state:'retrieved'});
 s=advanceLiveBits(s,{type:'tool_receipt',tool:'github.read_file',status:'complete',receiptId:'receipt_git_0001',criteriaSummary:'Compare the QuantaPhi player and radio code',criteriaKey:'goal-A',resource:'www-infinity4/QuantaPhi'});
 s=advanceLiveBits(s,{type:'tool_receipt',tool:'github.read_file',status:'complete',receiptId:'receipt_git_0002',criteriaSummary:'Inspect a different repo for keyboard behavior',criteriaKey:'goal-B',resource:'www-infinity4/Keyboard'});
 assert.equal(s.candidates,2);
 assert.equal(s.credits,0);
 assert.ok(s.entries.some(e=>e.criteria==='Compare the QuantaPhi player and radio code'&&e.criteriaKey==='goal-A'));
 assert.ok(s.entries.some(e=>e.criteriaKey==='goal-B'));
 const again=advanceLiveBits(s,{type:'tool_receipt',tool:'github.read_file',status:'complete',receiptId:'receipt_git_0001'});
 assert.equal(again.candidates,2);
});
test('tool-start events are visible but must not be represented as completed',()=>{
 let s=turn();
 s=advanceLiveBits(s,{type:'tool_started',tool:'cloudflare.d1.create',operationId:'op-d1-000001',criteriaSummary:'Create an owner-approved catalog'});
 assert.match(s.entries.at(-1).headline,/Cloudflare.*D1/);
 assert.equal(s.entries.at(-1).state,'running');
 assert.equal(s.candidates,0);
 s=advanceLiveBits(s,{type:'tool_progress',tool:'cloudflare.d1.create',operationId:'op-d1-000001',detail:'Waiting for database confirmation'});
 assert.equal(s.entries.at(-1).state,'running');
 assert.equal(s.candidates,0);
});
test('failed results stay failed; unsupported tool strings do not create steps',()=>{
 let s=turn();
 s=advanceLiveBits(s,{type:'tool_receipt',tool:'cloudflare.d1.create',status:'failed',receiptId:'receipt_d1_0001'});
 assert.equal(s.entries.at(-1).state,'failed');
 assert.equal(s.candidates,0);
 const n=s.entries.length;
 s=advanceLiveBits(s,{type:'tool_started',tool:'evil.prompt',operationId:'bad-operation'});
 assert.equal(s.entries.length,n);
});
test('completion retains the visible history and switching conversations clears it',()=>{
 let s=advanceLiveBits(turn(),{type:'memory',state:'unavailable'});
 s=advanceLiveBits(s,{type:'turn_finished',failed:false});
 assert.match(s.live,/reply/i);
 assert.equal(s.entries.length,2);
 s=advanceLiveBits(s,{type:'session_changed'});
 assert.equal(s.entries.length,0);
 assert.equal(s.candidates,0);
});

test('the same live status line loads on every Bubbles website entrypoint without changing chat transport',()=>{
 const fs=requireSource();
 for(const page of ['index.html','bubbles.html','bubbles/index.html','bubbles-chrome.html']){
  const html=fs(page);
  assert.match(html,/bubbles-live-iteration-feed\.mjs\?v=20261104-live-bits1/);
  assert.match(html,/bubbles-live-iteration-feed\.css\?v=20261104-live-bits1/);
  assert.match(html,/bubbles-ai\.js\?v=20261103-work-first1/);
 }
 const module=fs('bubbles-live-iteration-feed.mjs');
 assert.match(module,/status\.after\(wrapper\)/);
 assert.doesNotMatch(module,/fetch\(|localStorage|walletWrites|innerHTML/);
});
function requireSource(){
 return file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
}
