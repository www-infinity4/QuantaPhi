import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cloudStarCoinBackup,compareStarCoinBackup} from '../workers/bubbles-connections/starcoin-backup.mjs';

const userId='account-one';
const wallet={user:{id:userId,username:'user-one'},balances:{STARCOIN:4.2}};
const state={username:'user-one',starCoins:4,pendingShareCredits:2,shareCount:42,
  ledger:[{id:'r1',type:'share_reward',amount:1,balance:4,referenceId:'share-one',ts:1700000000000}]};

test('Cloudflare StarCoin mirror uses verified account and integer tenths',async()=>{
  const result=await cloudStarCoinBackup(userId,wallet,state);
  assert.equal(result.data.balanceTenths,42);
  assert.equal(result.data.receipts.length,1);
  assert.match(result.hash,/^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(result).includes(userId),false);
});

test('different account or inconsistent balance is never mirrored',async()=>{
  await assert.rejects(cloudStarCoinBackup('another-account',wallet,state),/starcoin_account_identity_mismatch/);
  await assert.rejects(cloudStarCoinBackup(userId,{...wallet,balances:{STARCOIN:0}},state),/starcoin_sources_disagree/);
  await assert.rejects(cloudStarCoinBackup(userId,wallet,{...state,username:'different'}),/starcoin_account_identity_mismatch/);
});

test('matching receipts may advance; modified shared receipt is flagged',async()=>{
  const previous=(await cloudStarCoinBackup(userId,wallet,state)).data;
  const newer={...previous,balanceTenths:43,receipts:previous.receipts.concat({id:'r2',type:'collect',amount:0.1,balance:4.3,referenceId:'share-two',time:1700000000001})};
  assert.equal(compareStarCoinBackup(previous,newer).status,'consistent_receipts');
  await assert.rejects(async()=>compareStarCoinBackup(previous,{...newer,receipts:newer.receipts.map(r=>r.id==='r1'?{...r,amount:999}:r)}),/backup_mismatch_review_required/);
});