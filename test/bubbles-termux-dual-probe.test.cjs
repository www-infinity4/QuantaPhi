'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const java='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('same Bubbles chat distinguishes shell-only check from installed-Python check',()=>{
 const source=read('bubbles-ai.js');
 const match=source.match(/function nativeTermuxProbeKind\(spoken\)\{[\s\S]*?\n\}/);
 assert.ok(match,'the actual website input classifier is present');
 const classify=vm.runInNewContext('('+match[0]+')');
 for(const q of ['check termux','Bubbles, check termux','please verify termux','test termux!'])
   assert.equal(classify(q),'shell',q);
 for(const q of ['check termux python','Bubbles, verify termux python','test python in termux','please check python'])
   assert.equal(classify(q),'python',q);
 for(const q of ['do not check termux','install python in termux','run rm -rf /','what is termux?',
                 'explain check termux','check termux and delete files'])
   assert.equal(classify(q),null,q);
 assert.match(source,/nativeTermuxProbeRequests\.push\(\{action:'probe',kind\}\)/);
 assert.match(source,/kind==='shell'\?'shell check':'Python test'/);
});

test('Android service, approval screen and callback keep the requested probe kind',()=>{
 const service=read(java+'BubblesService.java');
 const activity=read(java+'MainActivity.java');
 const overlay=read(java+'FloatingOracleWindow.java');
 const probe=read(java+'TermuxProbe.java');
 const receiver=read(java+'TermuxProbeResultReceiver.java');
 assert.match(service,/TermuxProbeKind\.fromUserText\(addressed\)/);
 assert.match(service,/putExtra\("termux_probe_kind", kind\)/);
 assert.match(overlay,/putExtra\("termux_probe_kind", kind\)/);
 assert.match(activity,/TermuxProbe\.run\(this, kind\)/);
 assert.match(activity,/TermuxProbe\.permitted\(this\)/);
 assert.match(activity,/\.setNegativeButton\("Cancel"/);
 assert.match(probe,/"shell"\.equals\(kind\) \? SHELL_SCRIPT : SCRIPT/);
 assert.match(probe,/putExtra\("probe_kind", kind\)/);
 assert.match(probe,/"queued", "Command sent; execution is not yet verified/);
 assert.match(receiver,/output\.getInt\("exitCode"/);
 assert.match(receiver,/output\.getString\("stdout"/);
 assert.match(receiver,/output\.getString\("stderr"/);
 assert.match(receiver,/"shell"\.equals\(kind\)/);
 assert.match(receiver,/TermuxProbe\.saveResult\(context, id, kind,/);
 assert.doesNotMatch(probe,/pkg install|pip install|apt install/);
});

test('native Java command classifier rejects unsafe and non-request messages',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bubbles-termux-kind-'));
 try {
  const main=path.join(root,java+'TermuxProbeKind.java');
  const check=path.join(root,'android/bubbles-overlay/checks/TermuxProbeKindCheck.java');
  const compile=spawnSync('javac',['-d',temp,main,check],{encoding:'utf8'});
  assert.equal(compile.status,0,compile.stderr||compile.stdout);
  const run=spawnSync('java',['-cp',temp,'org.quantaphi.bubbles.TermuxProbeKindCheck'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
});

test('shell probe is fixed and independent of Python installations',()=>{
 const source=read(java+'TermuxProbe.java');
 assert.match(source,/SHELL_SCRIPT\s*=\s*"printf /);
 assert.match(source,/termux=ok/);
 assert.match(source,/RUN_COMMAND_PENDING_INTENT/);
 assert.match(source,/PendingIntent.FLAG_ONE_SHOT/);
 assert.match(source,/context.startService\(request\)/);
 assert.match(source,/timed_out_unverified/);
});
