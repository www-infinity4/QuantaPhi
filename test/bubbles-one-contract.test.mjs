import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path, import.meta.url),'utf8');
const root='android/bubbles-one/';
test('a separate package; no forced old recorder launcher',()=>{
 const gradle=read(root+'app/build.gradle');
 assert.match(gradle,/applicationId 'org\.quantaphi\.bubblesone'/);
 assert.doesNotMatch(read(root+'app/src/main/java/org/quantaphi/bubblesone/AssistantService.java'),/startActivity\(new Intent\(.*VIDEO_CAPTURE/);
});
test('one first-run setup and actual Android-owned grants',()=>{
 const activity=read(root+'app/src/main/java/org/quantaphi/bubblesone/MainActivity.java');
 assert.match(activity,/Set up Bubbles/);
 assert.match(activity,/requestPermissions/);
 assert.match(activity,/ACTION_MANAGE_OVERLAY_PERMISSION/);
 assert.match(activity,/getBoolean\("enabled", false\)\) proceed\(\)/);
});
test('external finished video requires actual share and copies bytes',()=>{
 const manifest=read(root+'app/src/main/AndroidManifest.xml');
 const activity=read(root+'app/src/main/java/org/quantaphi/bubblesone/MainActivity.java');
 assert.match(manifest,/android.intent.action.SEND/);
 assert.match(manifest,/video\/\*/);
 assert.match(activity,/getContentResolver\(\)\.openInputStream\(source\)/);
 assert.match(activity,/total == 0/);
 assert.match(activity,/512L \* 1024L \* 1024L/);
 assert.doesNotMatch(activity,/MediaProjection|MediaRecorder/);
});
test('voice, persistent local conversation and real AI gateway connected',()=>{
 const service=read(root+'app/src/main/java/org/quantaphi/bubblesone/AssistantService.java');
 const backend=read(root+'app/src/main/java/org/quantaphi/bubblesone/CloudChat.java');
 const notebook=read(root+'app/src/main/java/org/quantaphi/bubblesone/LocalNotebook.java');
 assert.match(service,/SpeechRecognizer\.createSpeechRecognizer/);
 assert.match(service,/TextToSpeech/);
 assert.match(service,/new LocalNotebook/);
 assert.match(backend,/bubbles-tools\.marvaseater\.workers\.dev\/v1\/assist/);
 assert.match(notebook,/SQLiteOpenHelper/);
});
