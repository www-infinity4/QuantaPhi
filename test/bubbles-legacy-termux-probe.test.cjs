const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
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
