import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveGitLineReceipt,queuePendingGitLineClaim} from '../workers/unified-wallet/gitcoin-claim-intake.mjs';
const good=()=>({
 version:1,source:'brain_verified_github_commit_v1',sourceReceiptId:'bb_'+'a'.repeat(64),
 userId:'owner_account',repo:'www-infinity4/QuantaPhi',commitSha:'b'.repeat(40),
 filePath:'src/wallet.js',lineNumber:42,contentSha256:'c'.repeat(64),
 language:'javascript',intent:'new_logic'
});
function db(owner='owner_account'){
 const statements=[], binds=[];
 const table={
  prepare(sql){
   statements.push(sql);
   return{bind(...args){
    binds.push({sql,args});
    return{
     async first(){
      if(sql.includes('FROM gitcoin_bubbles_executor'))return args[0]===owner?
       {wallet_id:'wallet_ref',binding_id:'binding_ref'}:null;
      if(sql.includes('FROM gitcoin_line_claims'))return {
       receipt_id:args[0],recipient_wallet_id:'wallet_ref',status:'pending',
       repo:'www-infinity4/QuantaPhi',commit_sha:'b'.repeat(40),
       file_path:'src/wallet.js',line_number:42,content_sha256:'c'.repeat(64)
      };
      throw Error('Unexpected D1 query');
     },
     async run(){return{meta:{changes:1}}},
    }
   }}
  }
 };
 return{table,statements,binds};
}
test('one source GitHub code line maps to a deterministic receipt; edits/line changes are distinct',async()=>{
 const one=await deriveGitLineReceipt(good());
 assert.match(one,/^[a-f0-9]{64}$/);
 assert.equal(await deriveGitLineReceipt(good()),one);
 assert.notEqual(await deriveGitLineReceipt({...good(),lineNumber:43}),one);
 assert.notEqual(await deriveGitLineReceipt({...good(),commitSha:'d'.repeat(40)}),one);
});
test('receipt intake requires server verified owner and can never mint spendable GIT',async()=>{
 const d=db();
 const env={GITCOIN_CLAIMS_ENABLED:'1',GITCOIN_DB:d.table,
   IDENTITY_DB:{prepare(){return{bind(){return{async first(){return{id:'owner_account'}}}}}}}};
 const result=await queuePendingGitLineClaim(env,good());
 assert.equal(result.ok,true);
 assert.equal(result.status,'pending_independent_line_and_rights_review');
 assert.equal(result.mintedGitCoins,0);
 assert.equal(result.spendableGitCoins,0);
 assert.equal(result.recipient,'verified_executor_wallet');
 assert.ok(d.statements.some(s=>s.includes('gitcoin_bubbles_executor')&&s.includes('owner_verified=1')));
 assert.ok(d.statements.some(s=>s.includes('INSERT OR IGNORE INTO gitcoin_line_claims')));
 assert.ok(d.statements.every(s=>!s.includes('INSERT INTO gitcoin_awards')&&!s.includes('UPDATE gitcoin_awards')));
 assert.equal(d.binds.find(x=>x.sql.includes('gitcoin_bubbles_executor')).args[0],'owner_account');
 await assert.rejects(()=>queuePendingGitLineClaim({...env,GITCOIN_CLAIMS_ENABLED:'0'},good()),/gitcoin_claim_intake_disabled/);
 await assert.rejects(()=>queuePendingGitLineClaim({...env,GITCOIN_DB:null},good()),/gitcoin_claim_intake_disabled/);
 await assert.rejects(()=>queuePendingGitLineClaim(env,{...good(),userId:'stranger'}),/gitcoin_executor_not_verified/);
});
test('unverified, browser or malformed line claims cannot be queued',async()=>{
 const env={GITCOIN_CLAIMS_ENABLED:'1',GITCOIN_DB:db().table,
  IDENTITY_DB:{prepare(){return{bind(){return{async first(){return{id:'owner_account'}}}}}}}};
 for(const malformed of [
  {source:'browser'}, {source:'model_reply'}, {sourceReceiptId:'fake'},
  {repo:'www-infinity3/QuantaPhi'}, {commitSha:'bad'},
  {filePath:'../secrets.env'}, {filePath:'.github/secrets'},
  {lineNumber:0}, {lineNumber:1.25}, {contentSha256:'x'},
  {language:'pdf'}, {intent:'repeat_refresh'}
 ]){
  await assert.rejects(()=>queuePendingGitLineClaim(env,{...good(),...malformed}));
 }
});
test('same receipt never changes wallet, account or line on retry',async()=>{
 const d=db();
 d.table.prepare=(sql)=>{
  d.statements.push(sql);
  return{bind(...args){d.binds.push({sql,args});return{
   async first(){
    if(sql.includes('FROM gitcoin_bubbles_executor'))return{wallet_id:'wallet_ref',binding_id:'binding_ref'};
    if(sql.includes('FROM gitcoin_line_claims'))return{
      receipt_id:args[0],recipient_wallet_id:'not_my_wallet',
      repo:'www-infinity4/QuantaPhi',commit_sha:'b'.repeat(40),
      file_path:'src/wallet.js',line_number:42,content_sha256:'c'.repeat(64),status:'pending'
    };
   },
   async run(){return{meta:{changes:0}}}
  }}}
 };
 const env={GITCOIN_CLAIMS_ENABLED:'1',GITCOIN_DB:d.table,
  IDENTITY_DB:{prepare(){return{bind(){return{async first(){return{id:'owner_account'}}}}}}}};
 await assert.rejects(()=>queuePendingGitLineClaim(env,good()),/gitcoin_claim_conflict/);
});

test('public callers cannot submit line claims, and trusted callers cannot bypass disabled GIT issuance pipeline',async()=>{
 const wallet=(await import('../workers/unified-wallet/worker.js')).default;
 const url='https://wallet.example.test/internal/gitcoin-line-claim';
 const make=headers=>new Request(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://quantaphi.org',...headers},body:JSON.stringify(good())});
 const blocked=await wallet.fetch(make({}),{BOT_WORK_SECRET:'trusted_test_secret'},{});
 assert.equal(blocked.status,401);
 assert.equal((await blocked.json()).error,'bot_work_authorization_required');
 const spoof=await wallet.fetch(make({'X-Bot-Work-Key':'wrong'}),{BOT_WORK_SECRET:'trusted_test_secret'},{});
 assert.equal(spoof.status,401);
 const disabled=await wallet.fetch(make({'X-Bot-Work-Key':'trusted_test_secret'}),
  {BOT_WORK_SECRET:'trusted_test_secret'},{});
 assert.equal(disabled.status,503);
 assert.equal((await disabled.json()).error,'gitcoin_claim_intake_disabled');
});
