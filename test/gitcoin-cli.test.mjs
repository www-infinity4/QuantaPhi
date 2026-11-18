import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../gitcoin/gh-gitcoin.mjs',import.meta.url));
function git(cwd,...args){return execFileSync('git',args,{cwd,encoding:'utf8'}).trim();}
function fixture(){const dir=mkdtempSync(path.join(tmpdir(),'gitcoin-cli-'));git(dir,'init','-q');git(dir,'config','user.email','example@example.test');git(dir,'config','user.name','Example');mkdirSync(path.join(dir,'src'));writeFileSync(path.join(dir,'src','first.js'),'export const first = 1;\nexport const second = 2;\n');git(dir,'add','.');git(dir,'commit','-qm','initial source');return dir;}
function call(dir,...args){return spawnSync(process.execPath,[cli,...args],{cwd:dir,encoding:'utf8'});}
test('scan committed additions and keep claims in .git, without claiming wallet credits',()=>{
 const dir=fixture();try{
  const result=call(dir,'scan','--intent','website','--builder','human','--repo','example/repo','--github-login','developer');
  assert.equal(result.status,0,result.stderr);
  const payload=JSON.parse(result.stdout);
  assert.equal(payload.summary.eligible,2);
  assert.equal(payload.status,'provisional_not_minted');
  const files=readdirSync(path.join(dir,'.git','gitcoin','claims'));
  assert.equal(files.length,1);
  assert.deepEqual(JSON.parse(readFileSync(path.join(dir,'.git','gitcoin','claims',files[0]),'utf8')),payload);
  assert.ok(!readdirSync(dir).includes('gitcoin-claims.json'));
  const balance=call(dir,'balance');
  assert.equal(balance.status,0);
  const b=JSON.parse(balance.stdout);
  assert.equal(b.local_eligible_candidates,2);
  assert.equal(b.verified_wallet_balance,null);
  assert.equal(b.status,'wallet_not_connected');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('staged preview never stores or mints and invalid options fail cleanly',()=>{
 const dir=fixture();try{
  writeFileSync(path.join(dir,'src','first.js'),'export const first = 1;\nexport const second = 2;\nexport const third = 3;\n');git(dir,'add','.');
  const p=call(dir,'preview','--intent','repair','--repo','example/repo');
  assert.equal(p.status,0,p.stderr);
  assert.equal(JSON.parse(p.stdout).summary.eligible,1);
  assert.equal(JSON.parse(p.stdout).status,'staged_preview_only');
  assert.equal(call(dir,'scan','--intent','illegal','--repo','example/repo').status,2);
  assert.equal(call(dir,'scan','--intent','website','--repo','../escape').status,2);
  assert.equal(readdirSync(path.join(dir,'.git')).includes('gitcoin'),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
