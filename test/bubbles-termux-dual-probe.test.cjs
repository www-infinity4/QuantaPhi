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
 assert.match(activity,/Exact code to run/);
 assert.match(activity,/TermuxProbe\.SHELL_SCRIPT : TermuxProbe\.SCRIPT/);
 assert.match(activity,/TermuxProbe\.permitted\(this\)/);
 assert.match(activity,/\.setNegativeButton\("Cancel"/);
 assert.match(probe,/"shell"\.equals\(kind\) \? SHELL_SCRIPT : SCRIPT/);
 assert.match(probe,/putExtra\("probe_kind", kind\)/);
 assert.match(probe,/"queued", "Command sent; execution is not yet verified/);
 assert.match(probe,/TermuxReceiptPolicy\.acceptsCallback\(id, kind, latest\.optInt\("id"\)/);
 assert.match(probe,/if \("queued"\.equals\(priorState\) \|\| "timed_out_unverified"\.equals\(priorState\)\) return/);
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

test('actual callback decision rejects dispatch-only and incorrect output markers',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bubbles-termux-result-'));
 try {
  const src=path.join(root,java+'TermuxReceiptPolicy.java');
  const check=path.join(root,'android/bubbles-overlay/checks/TermuxReceiptPolicyCheck.java');
  const compile=spawnSync('javac',['-d',temp,src,check],{encoding:'utf8'});
  assert.equal(compile.status,0,compile.stderr||compile.stdout);
  const run=spawnSync('java',['-cp',temp,'org.quantaphi.bubbles.TermuxReceiptPolicyCheck'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
  assert.match(read(java+'TermuxProbeResultReceiver.java'),/TermuxReceiptPolicy\.succeeded\(kind, code, serviceError, stdout\)/);
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
});

test('second check cannot overwrite a queued receipt if Termux permission or visibility changes',()=>{
 const source=read(java+'TermuxProbe.java');
 const start=source.indexOf('static String run(Context context, String kind)');
 const end=source.indexOf('static void saveResult(',start);
 assert.ok(start>=0&&end>start);
 const method=source.slice(start,end);
 const queued=method.indexOf('JSONObject current = receipt(context);');
 const available=method.indexOf('if (!installed(context))');
 const permission=method.indexOf('if (!permitted(context))');
 assert.ok(queued>=0&&available>=0&&permission>=0);
 assert.ok(queued<available&&queued<permission,
   'the queued command must be protected before a second attempt records permission/app failure');
 assert.match(method,/if \("queued"\.equals\(current\.optString\("state"\)\)\)\s+return/);
});

test('actual fixed shell probe completes without Python or external commands',()=>{
 const source=read(java+'TermuxProbe.java');
 const match=source.match(/static final String SHELL_SCRIPT = ("(?:\\.|[^"\\])*");/);
 assert.ok(match,'check source must contain the actual shell probe');
 const command=JSON.parse(match[1]);
 assert.doesNotMatch(command,/\bpython\b|\bpkg\b|\bpip\b/i);
 const run=spawnSync('/bin/sh',['-c',command],{
  encoding:'utf8',timeout:3000,env:{...process.env,PATH:'/nonexistent'}
 });
 assert.equal(run.status,0,run.stderr||run.error?.message);
 assert.equal(run.stdout,'probe=termux-shell-v1\ntermux=ok\n');
 assert.equal(run.stderr,'');
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

test('a timed-out probe cannot be overwritten by a second dispatch before its callback',()=>{
 const source=read(java+'TermuxProbe.java');
 const start=source.indexOf('static String run(Context context, String kind)');
 const end=source.indexOf('static void saveResult(',start);
 const method=source.slice(start,end);
 assert.match(method,/"timed_out_unverified"\.equals\(current\.optString\("state"\)\)/,
   'late callback eligibility must be preserved until an explicit safe resolution');
});
