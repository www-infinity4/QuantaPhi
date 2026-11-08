import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../bubbles-cloud-wallet.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../workers/unified-wallet/worker.js',import.meta.url),'utf8');

test('the existing Bubbles wallet displays only server-verified GIT serial receipts',()=>{
 assert.match(source,/v1\/wallet\/git-serials/);
 assert.match(source,/GIT coin serials/);
 assert.match(source,/nextBeforeSerial/);
 assert.match(source,/serial/);
 assert.match(source,/ledger not connected|not yet available/i);
 assert.doesNotMatch(source,/\/v1\/tokens\/mint.*GIT/);
 assert.match(worker,/readGitSerialReceipts/);
 assert.match(worker,/quantState\(env,account\.id\)/);
});

test('the GIT list never selects its wallet via an untrusted query string',()=>{
 assert.doesNotMatch(source,/walletId=/);
 assert.doesNotMatch(worker,/url\.searchParams\.get\(['"]walletId['"]\)/);
});
