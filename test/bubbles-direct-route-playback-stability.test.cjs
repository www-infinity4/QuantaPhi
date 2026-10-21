'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const site=fs.readFileSync('bubbles-ai.js','utf8');
const base='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=name=>fs.readFileSync(base+name,'utf8');
test('Bubbles routes ordinary repository edits directly but explicit multi-agent requests to Robot Brain',()=>{
 assert.match(site,/const requestsAgents=.*robot/);
 assert.match(site,/const codeTask=.*edit\|fix\|repair/);
 assert.match(site,/const directCoding=!ownerGithubNonAction&&!requestsAgents&&!namedRecordBIssue&&codeTask/);
 assert.match(site,/directRequest\|\|githubCheck\|\|createRepository\|\|coderRequest\|\|directCoding/);
 assert.match(site,/else if\(!embedded&&isOwnerWorkRequest\(request\)\)/);
 assert.ok(site.indexOf('directRequest||githubCheck||createRepository||coderRequest||directCoding')<
           site.indexOf('else if(!embedded&&isOwnerWorkRequest(request))'));
 assert.match(site,/if\(!repositorySelectionExplicit\)await suggestRepositoryTargets\(request,false\)/);
 assert.match(site,/targets\.length===1/);
});
test('repo creation and named workflow Actions are direct verified requests',()=>{
 assert.match(site,/action=createRepository\?'create_repository'/);
 assert.match(site,/namedWorkflow&&workflowDispatch\?'dispatch_workflow':'list_workflows'/);
 assert.match(site,/args\.workflow=namedWorkflow/);
 assert.match(site,/args\.ref=/);
 assert.match(site,/repository_created/);
 assert.match(site,/status==='dispatch_accepted'/);
 assert.match(site,/connect the owner GitHub account/);
 assert.match(site,/Direct GitHub needs|Tell Bubbles the repository name/);
 assert.match(site,/GitHub Actions workflows:/);
});
test('Android reports retained local background transcripts and memory pressure',()=>{
 const phone=read('PhonePlaybackService.java'),notes=read('MediaNotes.java'),room=read('RoomNotes.java'),main=read('MainActivity.java');
 assert.match(phone,/ActivityManager\.MemoryInfo/);
 assert.match(phone,/info\.lowMemory/);
 assert.match(phone,/onTrimMemory\(int level\)/);
 assert.match(phone,/level == ComponentCallbacks2\.TRIM_MEMORY_RUNNING_CRITICAL/);
 assert.match(phone,/level >= ComponentCallbacks2\.TRIM_MEMORY_MODERATE/);
 assert.match(phone,/onLowMemory\(\)/);
 assert.match(phone,/catch \(Throwable error\)/);
 assert.match(phone,/BubblesService\.releaseVoiceModel\(model\)/);
 assert.match(notes,/phone_media_last_received/);
 assert.match(room,/room_notes_last_received/);
 assert.match(main,/Last phone audio heard:/);
 assert.match(main,/Last room words heard:/);
 assert.match(main,/Background issue:/);
 assert.match(phone,/PhonePlaybackService\.this/);
 assert.doesNotMatch(phone,/TRIM_MEMORY_RUNNING_CRITICAL && !memoryStopped/);
});

test('spoken repository creation requires explicit naming and uses echo cooldown',()=>{
 assert.match(site,/const repoName=createRepository\?\(request\.match/);
 assert.doesNotMatch(site,/repo\(\?:sitory\)\?\\s\+\(\[A-Za-z0-9_\\.-\]\+\)/);
 assert.match(site,/speaking=false;voiceEchoUntil=Date\.now\(\)\+2500/);
});
