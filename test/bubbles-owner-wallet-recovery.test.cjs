const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const worker=fs.readFileSync('workers/unified-wallet/worker.js','utf8');
const page=fs.readFileSync('wallet-recovery.html','utf8');
const sql=fs.readFileSync('workers/unified-wallet/wallet-recovery-schema.sql','utf8');
test('single-use grant never mints or transfers records',()=>{
 assert.match(worker,/async function redeemRecovery\(request,env\)/);
 assert.match(worker,/UPDATE wallet_recovery_grants SET consumed_at=\?1 WHERE claim_hash=\?2 AND consumed_at IS NULL AND expires_at>\?1 RETURNING account_id/);
 assert.match(worker,/INSERT INTO account_devices\(token_hash,account_id,created_at,last_seen_at\)/);
 assert.match(worker,/INSERT INTO wallet_recovery_audit/);
 assert.match(worker,/SELECT id,username FROM accounts WHERE id=\?1/);
 assert.match(worker,/if\(!ALLOWED_ORIGINS\.has\(origin\)\)/);
 assert.doesNotMatch(worker.slice(worker.indexOf('async function redeemRecovery'),worker.indexOf('async function importLegacy')),/UPDATE accounts|UPDATE unified_wallet_state|INSERT INTO unified_wallet_events|UPDATE quant_wallet_balances|request\.cf|CF-Connecting-IP/);
});
test('claim redeems only once and cannot be created by public caller',()=>{
 assert.match(sql,/claim_hash TEXT PRIMARY KEY/);
 assert.match(sql,/consumed_at INTEGER/);
 assert.match(worker,/if\(url\.pathname==='\/v1\/wallet\/redeem-recovery'&&request\.method==='POST'\)/);
 assert.doesNotMatch(worker,/\/v1\/wallet\/create-recovery/);
});
test('web and APK recovery preserves other accounts and proves new enrollment before selecting it',()=>{
 assert.match(page,/id="ownerRecoveryCode"/);
 assert.match(page,/wallet\/redeem-recovery/);
 assert.match(page,/crypto\.getRandomValues/);
 assert.match(page,/api\(STAR,'\/v1\/state',deviceToken\)/);
 assert.match(page,/localStorage\.setItem\(prefix\+username,deviceToken\)/);
 assert.match(page,/history\.replaceState\(history\.state/);
 assert.doesNotMatch(page,/localStorage\.clear\(\)/);
});

test('recovery uses Android 12 compatible AbortController with response-body timeout',()=>{
 assert.match(page,/async function timedJson\(url,options,timeoutMs\)/);
 assert.match(page,/new AbortController\(\)/);
 assert.match(page,/await response\.json\(\)\.catch/);
 assert.doesNotMatch(page,/AbortSignal\.timeout\(/);
});
