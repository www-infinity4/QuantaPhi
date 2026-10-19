const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = 'android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const native = fs.readFileSync(base+'NativeWalletVault.java','utf8');
const window = fs.readFileSync(base+'FloatingOracleWindow.java','utf8');
const brain = fs.readFileSync('robot-brain-owner.js','utf8');
const recovery = fs.readFileSync('wallet-recovery.html','utf8');

test('a verified account is backed up under a native AndroidKeystore key, not SIM or Chrome',()=>{
 for(const piece of ['AndroidKeyStore','AES/GCM/NoPadding','GCMParameterSpec','getSharedPreferences','BubblesWalletVerify',
  'https://starquest-ledger.marvaseater.workers.dev/v1/state','Bearer ','validUsername','validToken'])
  assert.ok(native.includes(piece),piece);
 for(const secret of ['getSubscriberId(','getSimSerialNumber(','getImei(','getDeviceId(','getLine1Number(','ANDROID_ID'])
  assert.ok(!native.includes(secret),'SIM/phone identity must not be a wallet credential: '+secret);
 assert.ok(!native.includes('addJavascriptInterface('));
});

test('APK stores only server-confirmed wallet and cannot replace a selected WebView account',()=>{
 assert.ok(native.includes('verified.equals(siteName)'));
 assert.ok(native.includes('username.equals(verify(token))'));
 assert.ok(native.includes('existing != null && !username.equals(existing.optString("username"))'));
 assert.ok(native.includes('if (snapshot.optBoolean("selected")) return'));
 assert.ok(native.includes('if(localStorage.getItem(\'starquest_session\'))return false'));
 assert.ok(native.includes('if (!trusted(view)) return'));
 assert.ok(native.includes('SITE.equals(u.getHost())'));
 assert.ok(window.includes('NativeWalletVault.synchronize(service, view)'));
 assert.ok(window.includes('pollBridgeReady(view, loadGeneration, 0)'));
});

test('browser alone does not claim to know physical device',()=>{
 assert.ok(!brain.includes("node('button','Recognize this device')"));
 assert.ok(brain.includes('checked automatically when the page opens'));
 assert.ok(recovery.includes('Other accounts are NOT silently merged'));
 assert.ok(recovery.includes('different verified wallet identity'));
});
