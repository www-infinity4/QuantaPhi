import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the selected Quick Card stays ahead of companion tiles on a phone',()=>{
 const css=source('shop-phi-switchboard.css');
 assert.match(css,/shopphi-switchboard-grid\.shopphi-showcase-mode>\.oracle-card-deck-stage\s*\{\s*grid-row:1/);
 assert.match(css,/\.shopphi-flank-cta\s*\{[^}]*background:transparent/s);
});

test('passive companion rotation cannot replace the selected main card',()=>{
 const deck=source('oracle-card-deck.js');
 assert.doesNotMatch(deck,/addEventListener\('quantaphi:showcase-chapter-complete'/);
 assert.match(deck,/next\.addEventListener\('click',\(\)=>advance\(1\)\)/);
 assert.match(deck,/prev\.addEventListener\('click',\(\)=>advance\(-1\)\)/);
 assert.doesNotMatch(deck,/settleTopGesture/);
 assert.match(deck,/quantaphi:select-source-card/);
 const related=source('shop-phi-switchboard.mjs');
 assert.match(related,/event\.preventDefault\(\)/);
 assert.match(related,/new CustomEvent\('quantaphi:select-source-card'/);
});

test('verified Brain owner hides redundant inline provider sign-in without asserting provider grants',()=>{
 const ai=source('bubbles-ai.js'),gate=source('bubbles-signin-gate.mjs');
 assert.match(ai,/chatGate\.dataset\.ownerVerified='true'/);
 assert.match(ai,/Signed in to Bubbles & Robot Brain/);
 assert.match(gate,/gate\.dataset\.ownerVerified==='true'/);
 assert.match(ai,/await import\('\/bubbles-signin-gate\.mjs\?/);
 assert.doesNotMatch(ai,/signin_gate_load_timeout/);
 assert.doesNotMatch(ai,/Sign-in status unavailable\. Open Account Connections/);
});
