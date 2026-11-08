import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readGitSerialReceipts} from '../workers/unified-wallet/engineering-assets.mjs';

function fixture(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(`CREATE TABLE gitcoin_serials(
  serial_no INTEGER PRIMARY KEY, receipt_id TEXT UNIQUE, wallet_id TEXT, git_type TEXT, issued_at TEXT);
 CREATE TABLE gitcoin_awards(receipt_id TEXT PRIMARY KEY, wallet_id TEXT, amount INTEGER);
 INSERT INTO gitcoin_serials VALUES
  (1,'receipt-a','wallet-a','git:app','2026-11-08 00:01:00'),
  (2,'receipt-b','wallet-b','git:website','2026-11-08 00:02:00'),
  (3,'receipt-c','wallet-a','git:test','2026-11-08 00:03:00'),
  (4,'receipt-d','wallet-a','git:repair','2026-11-08 00:04:00');
 INSERT INTO gitcoin_awards VALUES
  ('receipt-a','wallet-a',1),('receipt-b','wallet-b',1),
  ('receipt-c','wallet-a',1),('receipt-d','wallet-a',1);`);
 const GIT_DB={prepare(query){const statement=sql.prepare(query);return{
  bind(...params){return {all:async()=>({results:statement.all(...params)})}}
 }}};
 return {GIT_DB,sql};
}

test('wallet serial page reads only settled awards for the verified wallet, never the other user',async()=>{
 const env=fixture();
 const page=await readGitSerialReceipts(env,'wallet-a',{limit:2});
 assert.equal(page.available,true);
 assert.deepEqual(page.items.map(x=>x.serial),['GIT-000000000004','GIT-000000000003']);
 assert.equal(page.nextBeforeSerial,3);
 assert.deepEqual(page.items.map(x=>x.receiptId),['receipt-d','receipt-c']);
 const next=await readGitSerialReceipts(env,'wallet-a',{limit:2,beforeSerial:page.nextBeforeSerial});
 assert.deepEqual(next.items.map(x=>x.serial),['GIT-000000000001']);
 assert.equal(next.nextBeforeSerial,null);
 const other=await readGitSerialReceipts(env,'wallet-b',{limit:10});
 assert.deepEqual(other.items.map(x=>x.serial),['GIT-000000000002']);
});

test('wallet serials fail closed without DB, account binding, valid cursor, or matching award',async()=>{
 const env=fixture();
 assert.deepEqual(await readGitSerialReceipts({},'wallet-a',{}),{available:false,status:'ledger_unavailable',items:[],nextBeforeSerial:null});
 assert.equal((await readGitSerialReceipts(env,null,{})).status,'wallet_link_required');
 await assert.rejects(readGitSerialReceipts(env,'wallet-a',{beforeSerial:-1}),/invalid_git_cursor/);
 await assert.rejects(readGitSerialReceipts(env,'wallet-a',{limit:999}),/invalid_git_limit/);
 env.sql.exec("INSERT INTO gitcoin_serials VALUES(5,'unawarded','wallet-a','git:other','2026-11-08 00:05:00');");
 const page=await readGitSerialReceipts(env,'wallet-a',{limit:10});
 assert.equal(page.items.some(x=>x.receiptId==='unawarded'),false);
});
