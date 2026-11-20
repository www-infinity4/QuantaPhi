import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareRecord,classifyObservedResource,createAuditReceipt} from '../local-mirror-core.mjs';
const worker = () => readFileSync(new URL('../local-mirror-worker.mjs',import.meta.url),'utf8');
const page = () => readFileSync(new URL('../local-mirror.html',import.meta.url),'utf8');
const app = () => readFileSync(new URL('../local-mirror-app.mjs',import.meta.url),'utf8');

test('bounded opt-in lexical profile does not claim AI embeddings',async()=>{
 const record=await prepareRecord('  Ancient stars, stars, and moon.  ','2026-11-20T10:00:00.000Z');
 assert.equal(record.length,31);
 assert.equal(record.lexicalProfile.stars,2);
 assert.match(record.sha256,/^[a-f0-9]{64}$/);
 assert.equal(record.timestamp,'2026-11-20T10:00:00.000Z');
 assert.ok(!('embedding' in record));
 assert.throws(()=>prepareRecord('x'.repeat(8001)),/limit/i);
 assert.throws(()=>prepareRecord('   '),/empty/i);
});
test('radar classification is transparent and heuristic, not a fingerprinting verdict',()=>{
 assert.equal(classifyObservedResource('https://quantaphi.org/local-mirror-app.mjs','https://quantaphi.org').kind,'first-party');
 assert.equal(classifyObservedResource('https://www.google-analytics.com/g/collect','https://quantaphi.org').kind,'suspected-analytics');
 assert.equal(classifyObservedResource('https://cdn.example.org/site.js','https://quantaphi.org').kind,'third-party');
 assert.equal(classifyObservedResource('not-a-url','https://quantaphi.org').kind,'invalid');
});
test('local SHA-256 receipt cannot be misrepresented as zero-egress attestation',async()=>{
 const receipt=await createAuditReceipt({sourceHash:'a'.repeat(64),count:1,time:'2026-11-20T10:00:00.000Z'});
 assert.equal(receipt.networkProof,'not-established');
 assert.equal(receipt.observedBytesSent,null);
 assert.match(receipt.receiptHash,/^[a-f0-9]{64}$/);
 assert.equal(receipt.count,1);
 assert.ok(!('signature' in receipt));
});
test('worker requires opt-in before storing snippets and does not contain direct network calls',()=>{
 const source=worker();
 assert.match(source,/type === 'STORE' && request\.consent === true/);
 assert.match(source,/indexedDB\.open/);
 assert.match(source,/type === 'CLEAR'/);
 assert.doesNotMatch(source,/store\.put\(record\)/);
 assert.match(source,/store\.put\(metadata\)/);
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts\s*\(/);
});
test('standalone playground uses restrictive CSP and discloses Radar limits',()=>{
 const html=page(), js=app();
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/worker-src 'self'/);
 assert.match(html,/form-action 'none'/);
 assert.match(html,/Local Mirror/);
 assert.match(html,/Shadow Web Radar/);
 assert.match(js,/consent\.checked/);
 assert.match(js,/new Worker\('/);
 assert.doesNotMatch(html,/<script[^>]+src=["']https?:|<iframe/i);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|\.innerHTML\s*=/);
 assert.match(html,/does not monitor other tabs or websites/i);
});
