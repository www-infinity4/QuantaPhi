import test from 'node:test';
import assert from 'node:assert/strict';
import {newBitSession,applyBitObservation} from '../bubbles-bit-session.mjs';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('every turn requires retrieved owner context before any provisional action counts',()=>{
 let s=applyBitObservation(newBitSession(),{type:'turn_started'});
 s=applyBitObservation(s,{type:'tool_receipt',tool:'web.search',status:'complete',receiptId:'receipt_12345678'});
 assert.equal(s.candidateCount,0);
 s=applyBitObservation(s,{type:'memory',state:'retrieved'});
 s=applyBitObservation(s,{type:'tool_receipt',tool:'web.search',status:'complete',receiptId:'receipt_12345678'});
 assert.equal(s.candidateCount,1);
 s=applyBitObservation(s,{type:'turn_started'});
 s=applyBitObservation(s,{type:'tool_receipt',tool:'web.search',status:'complete',receiptId:'another_12345678'});
 assert.equal(s.candidateCount,1);
});
test('real receipt aliases, failed operations, missing identifiers and invented tools cannot add Bits',()=>{
 let s=applyBitObservation(newBitSession(),{type:'memory',state:'retrieved'});
 s=applyBitObservation(s,{type:'tool_receipt',tool:'github.read_file',status:'complete',receiptId:'read_proof_1234'});
 s=applyBitObservation(s,{type:'tool_receipt',tool:'github.read_file',status:'complete',receiptId:'read_proof_1234'});
 s=applyBitObservation(s,{type:'tool_receipt',tool:'web.search',status:'failed',receiptId:'failed_proof_1234'});
 s=applyBitObservation(s,{type:'tool_receipt',tool:'web.search',status:'complete'});
 s=applyBitObservation(s,{type:'tool_receipt',tool:'fake.mint',status:'complete',receiptId:'fake_proof_1234'});
 assert.equal(s.candidateCount,1);assert.equal(s.duplicates,1);
 assert.equal(s.creditedBits,0);assert.equal(s.spendableBits,0);assert.equal(s.walletWrites,0);
});
test('new conversation clears unsaved local projections and never transfers the previous session count',()=>{
 let s=applyBitObservation(newBitSession(),{type:'memory',state:'retrieved'});
 s=applyBitObservation(s,{type:'tool_receipt',tool:'web.search',status:'complete',receiptId:'search_proof_1234'});
 s=applyBitObservation(s,{type:'session_changed'});
 assert.equal(s.candidateCount,0);assert.equal(s.seenReceiptIds.length,0);assert.equal(s.contextReady,false);
});
test('technical steps count consistently; a later wallet confirmation upgrades one receipt only once',()=>{
 let s=applyBitObservation(newBitSession(),{type:'memory',state:'retrieved'});
 for(const [tool,receiptId] of [['github.commit','commit_receipt_123'],['github.workflow_checks','test_receipt_123'],['cloudflare.worker.verify','deploy_receipt_123']]){
  s=applyBitObservation(s,{type:'tool_receipt',tool,status:'complete',receiptId});
 }
 assert.equal(s.candidateCount,3);assert.equal(s.creditedBits,0);
 const paid={type:'tool_receipt',tool:'github.commit',status:'complete',receiptId:'commit_receipt_123',
  credit:{status:'credited',asset:'BUBBLE_BIT',amount:1,receiptId:'commit_receipt_123',creditId:'commit_receipt_123'}};
 s=applyBitObservation(s,paid);s=applyBitObservation(s,paid);
 assert.equal(s.candidateCount,3);assert.equal(s.creditedBits,1);
 s=applyBitObservation(s,{...paid,receiptId:'unpaid_receipt_123'});
 assert.equal(s.creditedBits,1);assert.equal(s.walletWrites,0);
});
test('no user input, source snippet, GitHub URL or private context text is retained in the Bits projection',()=>{
 let s=applyBitObservation(newBitSession(),{type:'memory',state:'retrieved',text:'secret password'});
 s=applyBitObservation(s,{type:'tool_receipt',tool:'web.search',status:'complete',receiptId:'source_proof_1234',text:'secret password',url:'https://wrong.example?secret=password'});
 assert.ok(!JSON.stringify(s).includes('secret password'));
 assert.ok(!JSON.stringify(s).includes('wrong.example'));
});
test('Bubbles iteration renders an evidence-linked Bits counter without adding wallet mints',()=>{
 assert.match(src('bubbles-iteration-bubbles.mjs'),/newBitSession/);
 assert.match(src('bubbles-iteration-bubbles.mjs'),/applyBitObservation/);
 assert.match(src('bubbles-iteration-bubbles.mjs'),/Bubbles Bits/);
 assert.match(src('bubbles-ai.js'),/receiptId:json\.receipt\.id/);
 assert.match(src('bubbles-ai.js'),/type:'turn_started'/);
 assert.match(src('bubbles-ai.css'),/ba-iteration-bits/);
 assert.doesNotMatch(src('bubbles-bit-session.mjs'),/fetch\(|localStorage|wallet\.|mint\(|innerHTML/);
});

test('authenticated Bubbles archive lookup precedes tool routing and is reused by the reply',()=>{
 const js=src('bubbles-ai.js');
 const start=js.indexOf('async function sendMessage(');
 const context=js.indexOf('const firstOwnerContext=await currentOwnerContext(spoken);',start);
 const router=js.indexOf('const aiConsult=',start);
 const reuse=js.indexOf('const ownerContext=firstOwnerContext;',router);
 assert.ok(start>=0&&context>start&&router>context&&reuse>router);
 assert.equal(js.slice(start).split('currentOwnerContext(spoken)').length-1,1);
});
