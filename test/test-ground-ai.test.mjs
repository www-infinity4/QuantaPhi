import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {TESTS,fixtureIndex,fixtureJSON,auditReply,safeExport} from '../test-ground-ai/engine.mjs';
test('Test Ground AI tests nine distinct capabilities without auto-minting',()=>{
 assert.equal(TESTS.length,9);
 assert.equal(new Set(TESTS.map(x=>x.id)).size,9);
 for(const id of ['tools','math','search','repo','json','index','developer','wallet','channels'])
  assert.ok(TESTS.some(t=>t.id===id),id);
 assert.equal(fixtureJSON().automaticWalletPayouts,false);
 assert.match(fixtureIndex(),/<h1>Test Ground AI<\/h1>/);
 assert.doesNotThrow(()=>JSON.parse(fs.readFileSync('test-ground-ai/application.json','utf8')));
});
test('Test Ground distinguishes real tool completion from unverified chat claims',()=>{
 const probe=TESTS.find(x=>x.id==='math');
 assert.equal(auditReply(probe,{ok:true,output:'The frequency is 339 kHz',receipt:{tool:'resonance.calculate',status:'complete'}}).state,'passed');
 assert.equal(auditReply(probe,{ok:true,output:'339',receipt:{tool:'oracle.chat',status:'complete'}}).state,'unverified');
 assert.equal(auditReply(TESTS.find(x=>x.id==='json'),{ok:true,output:'I deployed your JSON',receipt:{tool:'oracle.chat',status:'complete'}}).state,'flagged');
 assert.equal(auditReply(TESTS.find(x=>x.id==='repo'),{ok:true,output:'Here are files',receipt:{tool:'oracle.chat',status:'complete'}}).state,'unverified');
 assert.equal(auditReply(probe,{ok:false,error:'connection_unavailable'}).state,'failed');
});
test('Test Ground export contains no wallet balance, secrets, or unjustified mint receipts',()=>{
 const obj=JSON.parse(safeExport([{test:'repo',state:'unverified',reason:'Not proven',receiptStatus:'started',observedAt:'2026-10-20'}]));
 assert.equal(obj.transactions,0);assert.equal(obj.walletRewardsIssued,0);
 assert.equal(obj.observations[0].state,'unverified');
 const ui=fs.readFileSync('test-ground-ai/ui.mjs','utf8');
 assert.match(ui,/bubbles-tools\.marvaseater\.workers\.dev\/v1\/assist/);
 assert.match(ui,/api\.github\.com\/repos/);
 assert.doesNotMatch(ui,/QuantaStarCredit|mintWallet|debitWallet|localStorage\.setItem/);
});
test('Mobile Oracle Octaves layout has one real transcript, input and result export',()=>{
 const h=fs.readFileSync('test-ground-ai/index.html','utf8');
 const css=fs.readFileSync('test-ground-ai/style.css','utf8');
 for(const id of ['transcript','prompt','status','runAll','runTest','export'])assert.match(h,new RegExp('id="'+id+'"'));
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/touch-action:pan-y/);
 assert.match(h,/type="module" src="\/test-ground-ai\/ui\.mjs"/);
});
