import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeGithubRepo, makeTermuxSetup, makeAiInstructions} from '../gitcoin/setup-snippets.mjs';

test("validates a user's real repo name and rejects shell metacharacters",()=>{
 assert.equal(normalizeGithubRepo('  Alice/One-Repo  '),'Alice/One-Repo');
 for(const repo of ['','owner','owner/name; echo bad','../repo','me/../../abc','owner/repo name','owner/repo$(x)','owner/--','owner/name\nno']){
   assert.throws(()=>normalizeGithubRepo(repo),/invalid_github_repository/);
 }
});
test("termux script scans the user's own repo into an unminted local ledger",()=>{
 const cmd=makeTermuxSetup('owner/repo');
 assert.match(cmd,/pkg install -y git gh nodejs python/);
 assert.match(cmd,/github\.com\/owner\/repo\.git/);
 assert.match(cmd,/\-\-repo owner\/repo/);
 assert.match(cmd,/termux-ledger\.py["'] scan/);
 assert.match(cmd,/termux-ledger\.py["'] balance/);
 assert.match(cmd,/gitcoin-workspaces\/owner\/repo/);
 assert.doesNotMatch(cmd,/gh auth login.*--with-token/);
 assert.doesNotMatch(cmd,/mint\(|settle\(|wallet.*credit/i);
});
test('copy-for-AI prompt links to real source without claiming secret credentials or automatic issuance',()=>{
 const prompt=makeAiInstructions('owner/repo');
 assert.match(prompt,/owner\/repo/);
 assert.match(prompt,/gitcoin\/TERMUX\.md/);
 assert.match(prompt,/Quant AI/);
 assert.match(prompt,/local SQLite/);
 assert.match(prompt,/do not (?:claim|mint|issue)/i);
 assert.match(prompt,/Bubbles Bits/);
 assert.match(prompt,/GPT Coin/);
 assert.doesNotMatch(prompt,/IBM accepts GIT/);
});
