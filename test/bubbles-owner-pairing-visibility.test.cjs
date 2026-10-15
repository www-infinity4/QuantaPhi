const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('Android Bubbles places its owner pairing field above the transcript and composer',()=>{
 const js=fs.readFileSync('bubbles-ai.js','utf8');
 const css=fs.readFileSync('bubbles-ai.css','utf8');
 assert.match(js,/nativeOwnerInput\.type='password'/);
 assert.match(js,/nativeOwnerInput\.placeholder='Paste 64-character owner code'/);
 assert.match(js,/nativeOwnerRow\.append\(ownerHelp,nativeOwnerInput,nativeOwnerPaste,nativeOwnerButton,nativeOwnerStatus\)/);
 assert.match(js,/panel\.insertBefore\(nativeOwnerRow,status\)/);
 assert.doesNotMatch(js,/panel\.insertBefore\(nativeOwnerRow,conversation\)/);
 assert.match(js,/window\.QuantaBrainOwner\?\.connectWithCode\?\.\(code\)/);
 assert.match(js,/if\(!\/\^\[a-f0-9\]\{64\}\$\/i\.test\(copied\)\)/);
 assert.match(css,/\.ba-native-owner\{flex:none;display:grid/);
 assert.match(css,/\.ba-native-owner \.ba-field,\.ba-native-owner \.ba-muted\{grid-column:1\/-1\}/);
});

test('Pairing secrets are not sent through normal chat messages',()=>{
 const js=fs.readFileSync('bubbles-ai.js','utf8');
 const block=js.slice(js.indexOf('nativeOwnerRow.addEventListener(\'submit\''),js.indexOf('panel.insertBefore(nativeOwnerRow,status)'));
 assert.ok(block.length>0);
 assert.doesNotMatch(block,/sendNativeText|sendNativeSpeech|messages\.push\(/);
 assert.match(block,/nativeOwnerInput\.value=''/);
});
