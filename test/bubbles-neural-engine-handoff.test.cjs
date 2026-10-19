const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=p=>fs.readFileSync(p,'utf8');
const policy=read(base+'NeuralSpeechEngine.java');
const picker=read(base+'BubblesVoicePicker.java');
const service=read(base+'BubblesService.java');
const activity=read(base+'MainActivity.java');
const manifest=read('android/bubbles-overlay/app/src/main/AndroidManifest.xml');

test('Hayai offline neural engine is identified by actual service, not SIM or model guessing',()=>{
 assert.match(policy,/dev\.ahmedmohamed\.hayaitts/);
 assert.match(policy,/android\.intent\.action\.TTS_SERVICE/);
 assert.match(policy,/queryIntentServices/);
 assert.match(policy,/serviceInfo\.packageName/);
 assert.match(manifest,/android\.intent\.action\.TTS_SERVICE/);
 assert.match(manifest,/<package android:name="dev\.ahmedmohamed\.hayaitts"/);
 assert.doesNotMatch(policy,/getSimSerialNumber|getSubscriberId|getImei|WRITE_SECURE_SETTINGS|QUERY_ALL_PACKAGES/);
});

test('Bubbles binds to selected TTS engine without overwriting Android system default',()=>{
 assert.match(service,/NeuralSpeechEngine\.preferredEngine\(this\)/);
 assert.match(service,/new TextToSpeech\(this, onInit, selectedEngine\)/);
 assert.match(service,/new TextToSpeech\(this, onInit\)/);
 assert.match(service,/NeuralSpeechEngine\.useAndroidDefault\(this\)/);
 assert.match(service,/reloadSpeechEngine\(\)/);
 assert.match(service,/savedEngine\.equals\(selectedEngine == null \? tts\.getDefaultEngine\(\) : selectedEngine\)/);
 assert.match(policy,/getSharedPreferences\(BubblesVoicePicker\.PREFS/);
 assert.match(policy,/\.putString\(BubblesVoicePicker\.ENGINE, engine\)/);
 assert.doesNotMatch(policy,/Settings\.Secure\.put|Settings\.System\.put|setDefaultEngine/);
});

test('one native voice button offers free engine setup with honest fallback',()=>{
 assert.match(activity,/Enable free neural voice/);
 assert.match(activity,/BubblesVoicePicker\.enableFreeNeural\(this, state::setText\)/);
 assert.doesNotMatch(activity,/Change Android speech engine/);
 assert.doesNotMatch(activity,/Optional: install open-source neural voices/);
 assert.match(picker,/NeuralSpeechEngine\.hayaiAvailable\(activity\)/);
 assert.match(picker,/new TextToSpeech\(activity, init, NeuralSpeechEngine\.HAYAI_PACKAGE\)/);
 assert.match(picker,/NeuralSpeechEngine\.useEngine\(activity, NeuralSpeechEngine\.HAYAI_PACKAGE\)/);
 assert.doesNotMatch(picker,/getCurrentEngine/);
 assert.match(picker,/Install an offline English voice inside HayaiTTS first/);
 assert.match(picker,/new Intent\(activity, BubblesService\.class\)/);
 assert.match(picker,/https:\/\/github\.com\/HayaiApp\/HayaiTTS\/releases/);
 assert.doesNotMatch(picker,/API_KEY|subscription|price required/);
});
