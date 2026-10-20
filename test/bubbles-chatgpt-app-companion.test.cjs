'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const load=filename=>fs.readFileSync(root+filename,'utf8');
test('Bubbles can open ChatGPT Android app without a cloned login or unreadable iframe',()=>{
 const manifest=fs.readFileSync('android/bubbles-overlay/app/src/main/AndroidManifest.xml','utf8');
 const bridge=load('AppControlBridge.java');
 assert.match(manifest,/<package android:name="com\.openai\.chatgpt"\/>/);
 assert.match(bridge,/getLaunchIntentForPackage\(ChatGPTAppPolicy\.PACKAGE\)/);
 assert.doesNotMatch(bridge,/getSharedPreferences\([^)]*chatgpt|cookie|readChatHistory/);
});
test('ChatGPT screen viewing requires foreground app and Android accessibility',()=>{
 const service=load('BubblesService.java'),access=load('BrainLearningService.java');
 assert.match(service,/handleChatGPTAppRequest\(addressed, typed\)/);
 assert.match(service,/handleChatGPTAppRequest\(text, true\)/);
 assert.match(service,/ChatGPTAppPolicy\.PACKAGE\.equals\(BrainLearningService\.workflowForegroundPackage\(\)\)/);
 assert.match(service,/BrainLearningService\.inspectNowForPackage\(question,/);
 assert.match(service,/BrainLearningService\.workflowTypeInPackage\(/);
 assert.match(service,/BrainLearningService\.performRequestedActionInPackage\(/);
 assert.match(access,/expectedPackage\.equals\(String\.valueOf\(root\.getPackageName\(\)\)\)/);
 assert.match(access,/SCREEN_APP_NOT_FOREGROUND/);
 assert.match(access,/node\.isPassword\(\)/);
 assert.match(access,/TYPE_TEXT_VARIATION_PASSWORD/);
});
test('Current app screen is not mislabeled as complete ChatGPT history or exported to a repo',()=>{
 const policy=load('ChatGPTAppPolicy.java'),service=load('BubblesService.java');
 assert.match(policy,/ARCHIVE_UNAVAILABLE/);
 assert.match(service,/I can read the currently visible ChatGPT screen/);
 assert.match(service,/Nothing was read or tapped/);
 assert.match(service,/It has not been sent/);
 assert.doesNotMatch(policy,/HttpURLConnection|openAIKey|api\.openai\.com|ACTION_GLOBAL|SharedPreferences/);
});
