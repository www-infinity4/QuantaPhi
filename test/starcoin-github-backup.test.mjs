import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cloudStarCoinBackup,compareStarCoinBackup,githubStarCoinBackup} from '../workers/bubbles-connections/starcoin-backup.mjs';

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
test('private repo stores one immutable Cloudflare snapshot and rejects changes to committed data',async()=>{
  const files=new Map(),commit='a'.repeat(40);
  const repoName='owner/infinity-starcoins-backup';
  const request=async(url,opts)=>{
    const path=new URL(url).pathname;
    if(path==='/repos/'+repoName)return Response.json({full_name:repoName,private:true,permissions:{push:true}});
    if(opts.method==='GET')return files.has(path)
      ?Response.json({type:'file',sha:commit,size:files.get(path).length,content:Buffer.from(files.get(path)).toString('base64')})
      :new Response('',{status:404});
    if(opts.method==='PUT'){
      const input=JSON.parse(opts.body);
      files.set(path,Buffer.from(input.content,'base64').toString());
      return Response.json({commit:{sha:commit}});
    }
    throw Error('unexpected request');
  };
  const snapshot=await cloudStarCoinBackup(userId,wallet,state);
  const settings={token:'test-credential',repository:repoName,snapshot,request};
  const first=await githubStarCoinBackup(settings);
  assert.equal(first.status,'committed');
  assert.equal(files.size,3);
  assert.equal((await githubStarCoinBackup(settings)).status,'already_backed_up');
  assert.equal((await githubStarCoinBackup({...settings,mode:'verify'})).status,'matched');
  const key='/repos/'+repoName+'/contents/starcoins/latest.json';
  const tampered=JSON.parse(files.get(key));
  tampered.data.balanceTenths=9999;
  files.set(key,JSON.stringify(tampered));
  await assert.rejects(githubStarCoinBackup({...settings,mode:'verify'}),/backup_mismatch_review_required/);
  assert.ok(![...files.values()].some(x=>x.includes('test-credential')));
});
