const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const legacy='android/bubbles-overlay/app/src/main/';
const java=legacy+'java/org/quantaphi/bubbles/';
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');

test('Termux is declared in the original overlay, not a replacement assistant',()=>{
 const manifest=read(legacy+'AndroidManifest.xml');
 assert.match(manifest,/com\.termux\.permission\.RUN_COMMAND/);
 assert.match(manifest,/<package android:name="com\.termux"\/>/);
 assert.match(manifest,/TermuxProbeResultReceiver" android:exported="false"/);
 assert.match(read(java+'FloatingOracleWindow.java'),/SITE_URL = "https:\/\/quantaphi\.org\/bubbles\.html\?nativeOverlay=1"/);
 assert.doesNotMatch(read(java+'FloatingOracleWindow.java'),/addJavascriptInterface\(/);
});

test('owner approval and Android permission precede any diagnostic dispatch',()=>{
 const probe=read(java+'TermuxProbe.java');
 const main=read(java+'MainActivity.java');
 const service=read(java+'BubblesService.java');
 assert.match(main,/offerTermuxPythonProbe\(/);
 assert.match(main,/\.setNegativeButton\("Cancel"/);
 assert.match(main,/\.setPositiveButton\("Test Python"/);
 assert.match(main,/requestPermissions\(new String\[\]\{TermuxProbe.PERMISSION\}/);
 assert.match(probe,/if \(!permitted\(context\)\)/);
 assert.match(probe,/context.startService\(request\)/);
 assert.match(service,/handleTermuxProbe\(addressed, false\)/);
 assert.match(service,/handleTermuxProbe\(text, true\)/);
});

test('Python diagnostic runs only fixed safe code with low-storage and job cleanup checks',()=>{
 const probe=read(java+'TermuxProbe.java');
 assert.match(probe,/static final String SCRIPT/);
 assert.match(probe,/python --version/);
 assert.match(probe,/16384/);
 assert.match(probe,/storage=low_no_files_created/);
 assert.match(probe,/mktemp -d/);
 assert.match(probe,/umask 077/);
 assert.match(probe,/trap .*rmdir/);
 assert.match(probe,/cleanup=verified_job_directory_removed/);
 assert.doesNotMatch(probe,/rm -rf/);
 assert.doesNotMatch(probe,/pkg install|pip install|apt install/);
 assert.match(probe,/RUN_COMMAND_PENDING_INTENT/);
});

test('callback separates dispatch, exit, failed cleanup, and absent results',()=>{
 const receiver=read(java+'TermuxProbeResultReceiver.java');
 const probe=read(java+'TermuxProbe.java');
 assert.match(receiver,/getBundleExtra\("result"\)/);
 assert.match(receiver,/getInt\("exitCode"/);
 assert.match(receiver,/getInt\("err"/);
 assert.match(receiver,/code == 0 && serviceError == -1 && cleaned/);
 assert.match(receiver,/cleanup=" \+ \(cleaned \? "confirmed" : "not_verified"\)/);
 assert.match(probe,/timed_out_unverified/);
 assert.match(probe,/if \("queued"\.equals\(current.optString\("state"\)\)\)/);
});

test('identical Bubbles website chat requests and receives the Termux receipt',()=>{
 const site=read('bubbles-ai.js');
 const floating=read(java+'FloatingOracleWindow.java');
 assert.match(site,/nativeTermuxProbeRequests\.push\(\{action:'probe'\}\)/);
 assert.match(site,/drainNativeTermuxProbe:/);
 assert.match(site,/syncNativeTermuxProbe:/);
 assert.match(floating,/trustedChat\(website\)/);
 assert.match(floating,/QuantaBubbles\.drainNativeTermuxProbe\(\)/);
 assert.match(floating,/QuantaBubbles\.syncNativeTermuxProbe\(/);
 assert.doesNotThrow(()=>new Function(site));
});

function termuxShell(){
 const src=read(java+'TermuxProbe.java'),start=src.indexOf('static final String SCRIPT = String.join(');
 const end=src.indexOf('    );',start);
 assert.ok(start>0&&end>start,'Java embedded probe script present');
 return src.slice(start,end).split('\n').map(line=>{
  const item=/^\s*"((?:\\.|[^"\\])*)"\s*,?\s*$/.exec(line);
  return item?JSON.parse('"'+item[1]+'"'):null;
 }).filter(x=>x!==null).join('\n');
}
function fakeHome(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bubbles-termux-fixture-'));
 const home=path.join(dir,'termux-home'),bin=path.join(dir,'bin');
 fs.mkdirSync(home);fs.mkdirSync(bin);
 const python=path.join(bin,'python');
 fs.writeFileSync(python,'#!/bin/sh\nif [ "$1" = "--version" ]; then echo "Python 3 fixture"; exit 0; fi\nexec python3 "$@"\n',{mode:0o700});
 return {dir,home,bin};
}
function shellProbe(fixture){
 return spawnSync('sh',['-c',termuxShell()],{encoding:'utf8',timeout:10000,
  env:{...process.env,HOME:fixture.home,PATH:fixture.bin+':'+process.env.PATH}});
}
test('actual shell probe runs Python, reports exit and removes its only ephemeral working directory',()=>{
 const f=fakeHome();
 try{
  const result=shellProbe(f);
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/Bubbles Python works: 2 \+ 2 = 4/);
  assert.match(result.stdout,/cleanup=verified_job_directory_removed/);
  assert.match(result.stdout,/file_bytes_removed=\d+/);
  assert.deepEqual(fs.readdirSync(path.join(f.home,'.cache')),[]);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true})}
});
test('stale reaper removes only marked old Bubbles probe files, leaves unrelated projects untouched',()=>{
 const f=fakeHome();
 try{
  const cache=path.join(f.home,'.cache');fs.mkdirSync(cache);
  const old=path.join(cache,'bubbles-probe.abcdefgh');
  const other=path.join(cache,'bubbles-probe.hijklmno');
  const project=path.join(f.home,'projects');
  fs.mkdirSync(old);fs.mkdirSync(other);fs.mkdirSync(project);
  fs.writeFileSync(path.join(old,'marker'),'bubbles-termux-v1\n');
  fs.writeFileSync(path.join(old,'probe.py'),'print(1)\n');
  fs.writeFileSync(path.join(other,'probe.py'),'keep this');
  fs.writeFileSync(path.join(project,'private.py'),'do not touch');
  const hoursAgo=new Date(Date.now()-4*3600000);
  fs.utimesSync(old,hoursAgo,hoursAgo);fs.utimesSync(other,hoursAgo,hoursAgo);
  const result=shellProbe(f);
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/cleanup=stale_probe_directory_removed/);
  assert.equal(fs.existsSync(old),false);
  assert.equal(fs.readFileSync(path.join(other,'probe.py'),'utf8'),'keep this');
  assert.equal(fs.readFileSync(path.join(project,'private.py'),'utf8'),'do not touch');
 }finally{fs.rmSync(f.dir,{recursive:true,force:true})}
});
test('symlinked cache is rejected without modifying the linked destination',()=>{
 const f=fakeHome();
 try{
  const elsewhere=path.join(f.dir,'personal');
  fs.mkdirSync(elsewhere);fs.writeFileSync(path.join(elsewhere,'important.txt'),'safe');
  fs.symlinkSync(elsewhere,path.join(f.home,'.cache'),'dir');
  const result=shellProbe(f);
  assert.equal(result.status,76,result.stderr);
  assert.match(result.stdout,/cleanup=unsafe_cache_symlink/);
  assert.equal(fs.readFileSync(path.join(elsewhere,'important.txt'),'utf8'),'safe');
 }finally{fs.rmSync(f.dir,{recursive:true,force:true})}
});
test('low storage creates no job directory and retains the Python environment',()=>{
 const f=fakeHome();
 try{
  fs.writeFileSync(path.join(f.bin,'df'),'#!/bin/sh\nprintf "Filesystem 1024-blocks Used Available Capacity Mounted on\\nmock 20000 19999 1 100%% /\\n"\n',{mode:0o700});
  const result=shellProbe(f);
  assert.equal(result.status,73,result.stderr);
  assert.match(result.stdout,/storage=low_no_files_created/);
  assert.equal(fs.existsSync(path.join(f.home,'.cache')),false);
  assert.ok(fs.existsSync(path.join(f.bin,'python')));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true})}
});

test('natural spoken and typed Python checks share a bounded diagnostic, not arbitrary commands',()=>{
 const site=read('bubbles-ai.js');
 const javaService=read(java+'BubblesService.java');
 const line=site.split('\n').find(x=>x.includes('if(nativeOverlay && /^')&&x.includes('test(spoken)'));
 assert.ok(line,'first-party Android WebView intercepts local diagnostic requests');
 const m=line.match(/&& (\/\^.*\$\/i)\.test\(spoken\)/);
 assert.ok(m,'the actual website interpreter must be executable as a regular expression');
 const matches=Function('return '+m[1])();
 for(const utterance of [
  'test python in termux','please check python','Bubbles, verify termux python',
  'run python test','is python working in termux?','does python work'
 ]) assert.equal(matches.test(utterance),true,utterance);
 for(const utterance of [
  'do not run python','please install python packages',
  'delete files from termux','run rm -rf /','execute arbitrary python',
  'explain what a python test is'
 ]) assert.equal(matches.test(utterance),false,utterance);
 assert.match(javaService,/does.*python.*work/);
 assert.match(javaService,/TermuxProbe/);
});
