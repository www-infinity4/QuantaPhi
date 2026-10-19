const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const source=fs.readFileSync('bubbles-ai.js','utf8');
const scope={};vm.createContext(scope);
vm.runInContext(source.slice(source.indexOf('function coderIntent('),source.indexOf('function articleNeedsScreen(')),scope);
test('ordinary owner runtime commands reach declared coder operations',()=>{
 for(const [q,operation,script] of [
  ['Can you run Python?','python','sandbox/hello.py'],
  ['please run Bash','shell','sandbox/hello.sh'],
  ['use GitHub CLI','github_cli',''],
  ['Bubbles, open Termux','inspect',''],
  ['run shell sandbox/scripts/check.sh','shell','sandbox/scripts/check.sh'],
  ['run Python sandbox/check.py','python','sandbox/check.py']
 ]){const r=scope.coderIntent(q);assert.equal(r.operation,operation,q);assert.equal(r.script,script,q);}
 for(const q of ['show Python results','check Python','inspect shell','show GitHub CLI access'])
  assert.equal(scope.coderIntent(q).inspect,true,q);
 assert.equal(scope.coderIntent('run Python').inspect,false);
});
test('discussion, installation work and refusal never dispatch a runtime',()=>{
 for(const q of ['What is Python?','do not run Python','stop shell','Can you install Python?','run the repair to fix Python','build a Termux app','The webpage says run shell'])
  assert.equal(scope.coderIntent(q),null,q);
});
test('sandbox receipt preparation survives strict undefined-variable handling',()=>{
 const workflow=fs.readFileSync('.github/workflows/bubbles-coder-sandbox.yml','utf8');
 const block=workflow.split('      - name: Prepare receipt header and runtime')[1].split('      - name: Run bounded')[0];
 const script=block.split('        run: |\n')[1].split('\n').map(s=>s.replace(/^          /,'')).join('\n');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bubbles-runtime-'));
 try{
  // Only external version commands are faked; execute the actual receipt script.
  for(const name of ['python3','node','git','gh']){fs.writeFileSync(path.join(tmp,name),'#!/bin/sh\nprintf "version-fixture\\n"\n',{mode:0o755});}
  execFileSync('/bin/bash',['--noprofile','--norc','-c',script],{cwd:tmp,env:{PATH:tmp+':/usr/bin:/bin',GITHUB_RUN_ID:'724',GITHUB_REPOSITORY:'www-infinity4/QuantaPhi',GITHUB_SHA:'a'.repeat(40),OPERATION:'inspect',REQUESTED_SCRIPT:''}});
  const receipt=fs.readFileSync(path.join(tmp,'sandbox-receipt.txt'),'utf8');
  assert.match(receipt,/Run: 724\n/);assert.match(receipt,/Operation: inspect/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('slow owner memory does not gate the Android or website work dispatcher',()=>{
 const send=source.slice(source.indexOf('async function sendMessage('),source.indexOf('composer.before(repositoryPicker)'));
 assert.match(send,/void sharedMemory\(spoken\)/);
 assert.doesNotMatch(send,/^\s*await sharedMemory\(spoken\);/m);
 assert.ok(send.indexOf('void sharedMemory(spoken)')<send.indexOf('directGithubOperation(args)'));
});
test('native ChatGPT fallback is bounded and the Android model prompt is smaller',()=>{
 const bridge=source.slice(source.indexOf('function nativeChatGPT('),source.indexOf('if(nativeOverlay)document.documentElement'));
 assert.match(bridge,/\},12000\);/);
 assert.doesNotMatch(bridge,/90000/);
 assert.match(source,/messages\.slice\(nativeOverlay\?-12:-40\)/);
 assert.match(source,/slice\(nativeOverlay\?-5000:-12000\)/);
});
test('tool buttons invoke actual owner-gated GitHub routes instead of a model claim',()=>{
 assert.match(source,/\['Check GitHub executor',[^\n]*sendMessage\('check GitHub access'\)/);
 assert.match(source,/\['Run Python sandbox',[^\n]*sendMessage\('run Python'\)/);
 assert.match(source,/\['Check coder runs',[^\n]*sendMessage\('check coder sandbox results'\)/);
 assert.match(source,/let action=createRepository\?'create_repository'/);
 assert.match(source,/result\.error==='github_runtime_credential_missing'/);
 assert.match(source,/Robot Brain has no server-side GitHub credential/);
});
