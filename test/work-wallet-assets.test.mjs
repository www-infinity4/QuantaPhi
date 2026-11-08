import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import wallet from '../workers/unified-wallet/worker.js';
import {readGitAsset,readGptCoinAsset} from '../workers/unified-wallet/engineering-assets.mjs';
import {auditWalletWorkBindings,EXPECTED_GIT_DB} from '../workers/unified-wallet/work-asset-binding-policy.mjs';

function ledger(){
 const sql=new DatabaseSync(':memory:');
 const DB={prepare(query){
  const statement=sql.prepare(query);
  return {bind(...params){
   return {first:async()=>statement.get(...params),run:async()=>({meta:statement.run(...params)})};
  }};
 }};
 return {DB,sql};
}

test('GIT balance reads only actual awards and separates pending claims per wallet',async()=>{
 const env=ledger();
 env.GIT_DB=env.DB;
 assert.equal((await readGitAsset(env,'owner')).status,'ledger_unavailable');
 env.sql.exec(`CREATE TABLE gitcoin_awards(receipt_id TEXT PRIMARY KEY,wallet_id TEXT,amount INTEGER);
  CREATE TABLE gitcoin_serials(serial_no INTEGER PRIMARY KEY,receipt_id TEXT UNIQUE,wallet_id TEXT);
  CREATE TABLE gitcoin_line_claims(recipient_wallet_id TEXT,status TEXT);
  INSERT INTO gitcoin_awards VALUES ('r1','owner',1),('r2','owner',1),('r3','another',1);
  INSERT INTO gitcoin_serials VALUES (1,'r1','owner'),(2,'r2','owner'),(3,'r3','another');
  INSERT INTO gitcoin_line_claims VALUES ('owner','pending'),('owner','verified'),('another','rejected');`);
 assert.deepEqual(await readGitAsset(env,'owner'),{available:true,status:'ledger_verified',credited:2,pending:1,awaitingSerial:0,spendAvailable:false});
 assert.deepEqual(await readGitAsset(env,'another'),{available:true,status:'ledger_verified',credited:1,pending:0,awaitingSerial:0,spendAvailable:false});
 assert.equal((await readGitAsset(env,null)).credited,null);
});

test('the authenticated wallet imports only an issuer-signed receipt for the current account, exactly once',async()=>{
 const env=ledger();
 env.sql.exec(readFileSync(new URL('../workers/unified-wallet/gpt-coin-schema.sql',import.meta.url),'utf8'));
 const a='sq_'+'a'.repeat(40),b='sq_'+'b'.repeat(40),encoder=new TextEncoder();
 const accountHash=async token=>Buffer.from(await crypto.subtle.digest('SHA-256',encoder.encode(token))).toString('hex');
 const identities=new Map([[await accountHash(a),{id:'account-a'}],[await accountHash(b),{id:'account-b'}]]);
 env.IDENTITY_DB={prepare:()=>({bind:hash=>({first:async()=>identities.get(hash)})})};
 const key=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
 const now=Date.now(),receipt={version:1,asset:'GPT_COIN',issuer:'fixture-issuer',receiptId:'receipt-fixture-0001',
  recipient:'account-a',amount:4,issuedAt:now-500,expiresAt:now+60_000};
 async function proof(r){
  const payload=JSON.stringify(['quantaphi:gpt-coin:v1',r.issuer,r.receiptId,r.recipient,r.amount,r.issuedAt,r.expiresAt]);
  const signature=await crypto.subtle.sign('Ed25519',key.privateKey,encoder.encode(payload));
  return {receipt:r,signature:Buffer.from(signature).toString('base64url')};
 }
 const importReceipt=(value,token)=>wallet.fetch(new Request('https://wallet.test/v1/wallet/gpt-coin/import',{
  method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(value)
 }),env,{});
 const signed=await proof(receipt);
 assert.equal((await importReceipt(signed)).status,401);
 assert.equal((await importReceipt(signed,a)).status,503);
 assert.equal((await readGptCoinAsset(env,'account-a')).credited,null);
 env.GPT_COIN_ISSUER=receipt.issuer;
 env.GPT_COIN_ISSUER_PUBLIC_KEY=Buffer.from(await crypto.subtle.exportKey('raw',key.publicKey)).toString('base64url');
 assert.equal((await importReceipt(signed,b)).status,403);
 assert.equal((await importReceipt({...signed,receipt:{...receipt,amount:99}},a)).status,403);
 const first=await importReceipt(signed,a),replay=await importReceipt(signed,a);
 assert.equal(first.status,200);assert.equal((await first.json()).replayed,false);
 assert.equal((await replay.json()).replayed,true);
 assert.equal((await importReceipt(await proof({...receipt,amount:5}),a)).status,409);
 assert.equal((await readGptCoinAsset(env,'account-a')).credited,4);
 assert.equal((await readGptCoinAsset(env,'account-b')).credited,0);
 assert.throws(()=>env.sql.exec('DELETE FROM gpt_coin_imports'),/immutable_gpt_coin_receipt/);
 delete env.GPT_COIN_ISSUER_PUBLIC_KEY;
 assert.equal((await readGptCoinAsset(env,'account-a')).credited,4,'old signed imports remain readable while imports are paused');
});

test('an awarded GIT without its global serial must remain pending issuance, not appear credited',async()=>{
 const env=ledger();env.GIT_DB=env.DB;
 env.sql.exec(`CREATE TABLE gitcoin_awards(receipt_id TEXT PRIMARY KEY,wallet_id TEXT,amount INTEGER);
  CREATE TABLE gitcoin_serials(serial_no INTEGER PRIMARY KEY,receipt_id TEXT UNIQUE,wallet_id TEXT);
  CREATE TABLE gitcoin_line_claims(recipient_wallet_id TEXT,status TEXT);
  INSERT INTO gitcoin_awards VALUES ('r1','owner',1),('r2','owner',1),('r3','another',1);
  INSERT INTO gitcoin_serials VALUES (1,'r1','owner'),(2,'r3','another');
  INSERT INTO gitcoin_line_claims VALUES ('owner','pending');`);
 const owner=await readGitAsset(env,'owner');
 assert.equal(owner.available,true);
 assert.equal(owner.credited,1,'one award has a matching immutable serial, one does not');
 assert.equal(owner.awaitingSerial,1,'server can reconcile the missing serial without fabricating another coin');
 assert.equal(owner.pending,1);
 const other=await readGitAsset(env,'another');
 assert.equal(other.credited,1);
 assert.equal(other.awaitingSerial,0);
 // A serial linked to a different wallet may not silently credit the owner.
 env.sql.exec("UPDATE gitcoin_serials SET wallet_id='another' WHERE receipt_id='r1'");
 assert.equal((await readGitAsset(env,'owner')).credited,0);
 env.sql.exec('DROP TABLE gitcoin_serials');
 assert.equal((await readGitAsset(env,'owner')).status,'ledger_unavailable','missing authoritative serial ledger never means zero verified issuance');
});

test('reviewed GIT binding addition cannot erase production identity, recovery or secret bindings',()=>{
 const before=[
  {name:'BOT_WORK_SECRET',type:'secret_text'},
  {name:'DB',type:'d1',id:'711b3e05-f318-4d30-9a67-4de2af92aa6d'},
  {name:'IDENTITY_DB',type:'d1',id:'a1a973b2-a37c-4e1c-b68e-a73803238206'},
  {name:'RECOVERY_ACCESS_AUD',type:'plain_text'},
  {name:'RECOVERY_ACCESS_ISSUER',type:'plain_text'},
  {name:'RECOVERY_OWNER_ACCOUNT_ID',type:'plain_text'},
  {name:'RECOVERY_OWNER_EMAIL',type:'plain_text'}
 ];
 const after=[...before,{...EXPECTED_GIT_DB}];
 assert.equal(auditWalletWorkBindings(before,after).safe,true);
 assert.equal(auditWalletWorkBindings(before,after.filter(x=>x.name!=='BOT_WORK_SECRET')).safe,false,'never drop bot payout secret');
 assert.equal(auditWalletWorkBindings(before,after.filter(x=>x.name!=='RECOVERY_OWNER_EMAIL')).safe,false,'never drop recovery owner association');
 assert.equal(auditWalletWorkBindings(before,after.map(x=>x.name==='DB'?{...x,id:'00000000-0000-0000-0000-000000000000'}:x)).safe,false,'never swap live money D1');
 assert.equal(auditWalletWorkBindings(before,after.map(x=>x.name==='GIT_DB'?{...x,id:'00000000-0000-0000-0000-000000000000'}:x)).safe,false,'never link a different GIT ledger');
 assert.equal(auditWalletWorkBindings(before,before).safe,false,'missing new GIT binding is not a ready release');
 assert.equal(auditWalletWorkBindings(before,[...after,{name:'BUBBLE_BITS_ENABLED',type:'plain_text'}]).safe,false,'cannot silently enable live minting');
 assert.equal(auditWalletWorkBindings(before,[...after,{name:'GPT_COIN_ISSUER_PUBLIC_KEY',type:'plain_text'}]).safe,false,'issuer rollout is separate');
 assert.equal(auditWalletWorkBindings(before,after.concat(after.find(x=>x.name==='GIT_DB'))).safe,false,'duplicated binding names block safe release');
});
