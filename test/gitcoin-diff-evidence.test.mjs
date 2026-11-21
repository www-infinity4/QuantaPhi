import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractGitLineCandidates,queueGitHubCommitCandidates} from '../workers/infinity-brain-clock/gitcoin-diff-evidence.mjs';
const SHA='b'.repeat(40), OWNER='owner_account', REPO='www-infinity4/QuantaPhi';
const receipt='bb_'+'a'.repeat(64);
const commit=()=>({
 sha:SHA,parents:[{sha:'a'.repeat(40)}],
 files:[{filename:'src/code.js',status:'modified',additions:2,patch:
   '@@ -1,2 +1,3 @@\n const original=true;\n-const removed=true;\n+const x=1;\n+const y=2;'}]
});
const context={repo:REPO,commitSha:SHA,sourceReceiptId:receipt,userId:OWNER};
test('real GitHub diff hunk produces one stable candidate per added, nonempty source line',async()=>{
 const found=await extractGitLineCandidates(commit(),context);
 assert.equal(found.status,'candidates');
 assert.equal(found.items.length,2);
 assert.deepEqual(found.items.map(x=>x.lineNumber),[2,3]);
 assert.ok(found.items.every(x=>x.repo===REPO&&x.commitSha===SHA&&x.userId===OWNER));
 assert.ok(found.items.every(x=>x.sourceReceiptId===receipt&&x.source==='brain_verified_github_commit_v1'));
 assert.ok(found.items.every(x=>/^[a-f0-9]{64}$/.test(x.contentSha256)));
 assert.notEqual(found.items[0].contentSha256,found.items[1].contentSha256);
});
test('blank lines, untracked docs, binary and oversized code generation never become automatic GIT claims',async()=>{
 const bad=commit();
 bad.files.push({filename:'docs/README.md',status:'added',additions:1,patch:'@@ -0,0 +1,1 @@\n+Not source code'});
 bad.files.push({filename:'dist/bundle.js',status:'added',additions:1,patch:'@@ -0,0 +1,1 @@\n+generated'});
 bad.files.push({filename:'src/a.js',status:'added',additions:2,patch:'@@ -0,0 +1,2 @@\n+   \n+const yes=1'});
 const result=await extractGitLineCandidates(bad,context);
 assert.deepEqual(result.items.map(x=>x.filePath),['src/code.js','src/code.js','src/a.js']);
 const truncated=commit();truncated.files[0].patch=null;
 assert.equal((await extractGitLineCandidates(truncated,context)).status,'manual_review_required');
 const mismatch=commit();mismatch.sha='d'.repeat(40);
 assert.equal((await extractGitLineCandidates(mismatch,context)).status,'blocked');
});
test('Brain checks real commit API before submitting only pending claims to server wallet',async()=>{
 const sent=[];
 const env={
  GITCOIN_CLAIMS_ENABLED:'1',GITHUB_TOKEN:'fixture_github_token',
  BOT_WORK_SECRET:'fixture_bot_key',
  BOT_WALLET:{async fetch(url,opts){
   sent.push({url,opts,body:JSON.parse(opts.body)});
   return Response.json({ok:true,status:'pending_independent_line_and_rights_review',
    receiptId:'source_candidate_only',mintedGitCoins:0,spendableGitCoins:0});
  }}
 };
 let called=0;
 const fetcher=async (url,opts)=>{
  called++;
  assert.equal(url,'https://api.github.com/repos/'+REPO+'/commits/'+SHA);
  assert.equal(opts.headers.Authorization,'Bearer fixture_github_token');
  return Response.json(commit());
 };
 const result=await queueGitHubCommitCandidates(env,context,fetcher);
 assert.equal(result.status,'pending_review');
 assert.equal(result.submittedPending,2);
 assert.equal(result.mintedGitCoins,0);
 assert.equal(result.spendableGitCoins,0);
 assert.equal(called,1);
 assert.equal(sent.length,2);
 assert.ok(sent.every(x=>x.url.endsWith('/internal/gitcoin-line-claim')));
 assert.ok(sent.every(x=>x.opts.headers['X-Bot-Work-Key']==='fixture_bot_key'));
 assert.ok(sent.every(x=>x.body.userId===OWNER&&!('recipient_wallet_id'in x.body)));
});
test('disabled/unsafe proof cannot call wallet or issue GIT',async()=>{
 let calls=0;
 const doNotCall=async()=>{calls++;throw Error('No network permitted')};
 const blank=await queueGitHubCommitCandidates({},context,doNotCall);
 assert.equal(blank.status,'disabled');
 assert.equal(calls,0);
 const env={GITCOIN_CLAIMS_ENABLED:'1',GITHUB_TOKEN:'g',BOT_WORK_SECRET:'b',BOT_WALLET:{fetch:doNotCall}};
 const unsafe=await queueGitHubCommitCandidates(env,context,async()=>Response.json({...commit(),sha:'f'.repeat(40)}));
 assert.equal(unsafe.status,'blocked');
 assert.equal(calls,0);
});

test('only the authenticated Brain commit receipt can attempt candidate creation for bound executor',()=>{
 const brain=fs.readFileSync('workers/infinity-brain-clock/worker.js','utf8');
 assert.match(brain,/queueGitHubCommitCandidates/);
 assert.match(brain,/GITCOIN_CLAIMS_ENABLED==='1'/);
 assert.match(brain,/metadata\.receipt\?\.tool==='github\.commit'/);
 assert.match(brain,/sourceReceiptId:metadata\.receipt\.id/);
 assert.match(brain,/this\.ctx\.storage\.get\('bot-work-recipient'\)/);
 assert.doesNotMatch(brain,/gitcoin_awards.*INSERT/);
});
