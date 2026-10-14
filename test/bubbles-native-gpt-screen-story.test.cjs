const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const WEB=read('bubbles-ai.js');
const WINDOW=read('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/FloatingOracleWindow.java');
const MAIN=read('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/MainActivity.java');
const VOICE=read('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BubblesService.java');
const ACCESS=read('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BrainLearningService.java');
const STORY=read('phi-story-writer.js');
test('Android first-party Bubbles uses per-user native OAuth inference without a WebView token bridge',()=>{
 assert.match(WEB,/nativeChatGPT\(prompt\)/);
 assert.match(WEB,/setNativeGPTAvailable/);
 assert.match(WEB,/takeNativeGPTLogin/);
 assert.match(WEB,/finishNativeGPTRequest/);
 assert.match(WINDOW,/ChatGPTSignIn\.hasPlan\(service\)/);
 assert.match(WINDOW,/ChatGPTSignIn\.ask\(service,prompt\)/);
 assert.match(MAIN,/open_chatgpt_signin/);
 assert.doesNotMatch(WINDOW,/addJavascriptInterface\(/);
 assert.match(WINDOW,/SITE_HOST\.equals\(location\.getHost\(\)\)/);
});
test('Android screen text requires an explicit command and an installed accessibility service',()=>{
 assert.match(VOICE,/BrainLearningService\.currentVisibleText\(\)/);
 assert.match(ACCESS,/getRootInActiveWindow\(\)/);
 assert.match(ACCESS,/node\.isPassword\(\) \|\| node\.isEditable\(\)/);
 assert.match(ACCESS,/app\.equals\("com\.android\.systemui"\)/);
 assert.match(VOICE,/Screen text:/);
});
test('story personalization needs opt-in and avoids pretending ChatGPT sign-in shares history',()=>{
 assert.match(STORY,/quantaPhi:storyWriter:personalize:v1/);
 assert.match(STORY,/window\.BubblesMemory/);
 assert.match(STORY,/personalize\.checked/);
 assert.match(WEB,/conversations\.json/);
 assert.match(WEB,/ChatGPT sign-in does not share old chats/);
});
