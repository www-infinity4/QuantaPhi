const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles');
const auth=fs.readFileSync(path.join(root,'ChatGPTSignIn.java'),'utf8');
const service=fs.readFileSync(path.join(root,'BubblesService.java'),'utf8');
const activity=fs.readFileSync(path.join(root,'MainActivity.java'),'utf8');
test('Android uses documented dynamic OSS OAuth on loopback with PKCE and state',()=>{
 for(const expected of ['dynamic_agent_client','ext_agent_host_id','agent_name_hint','code_challenge_method','S256',
 '127.0.0.1','/auth/callback','getQueryParameter("state")','getQueryParameter("client_id")',
 'code_verifier','/api/accounts/oauth/token','response_type','offline_access'])
  assert.ok(auth.includes(expected),expected);
 assert.ok(auth.includes('server.accept()'));
 assert.ok(auth.includes('state.equals(callback.getQueryParameter("state"))'));
 assert.ok(auth.includes('callbackClient != null && !callbackClient.equals(issued)'));
});
test('ID token is signature-verified and plan permission is checked independently',()=>{
 for(const expected of ['SHA256withRSA','RSAPublicKeySpec','jwks_uri','\"RS256\"','\"nonce\"',
 '\"iss\"','\"aud\"','\"exp\"','\"sub\"','chatgpt.tokens.use.direct','resource.invoke',
 'AES/GCM/NoPadding','AndroidKeyStore'])
  assert.ok(auth.includes(expected),expected);
});
test('inference streams directly to approved Responses API, never to owner worker',()=>{
 assert.ok(auth.includes('new URL(RESOURCE + "/responses")'));
 assert.match(auth,/put\("store", false\)/);
 assert.match(auth,/put\("stream", true\)/);
 assert.ok(auth.includes('response.completed'));
 assert.ok(auth.includes('response.failed'));
 assert.ok(auth.includes('response.incomplete'));
 assert.ok(auth.includes('if (!completed || result.toString().trim().isEmpty())'));
 assert.ok(service.includes('ChatGPTSignIn.hasPlan(this)'));
 assert.match(service, /ChatGPTSignIn\.ask\(this, prompt\)/);
 assert.ok(service.includes('trying Oracle'), 'ChatGPT failure should fall back with an explicit status');
 assert.ok(service.includes('putString("ai_provider", "Oracle Cloudflare")'), 'Fallback provider should be identified');
 assert.ok(!auth.includes('bubbles-tools.marvaseater.workers.dev'));
});
test('login needs explicit action, has signout, and no web token bridge',()=>{
 assert.ok(activity.includes('setText("Continue with ChatGPT")'));
 assert.ok(activity.includes('ChatGPTSignIn.start(this'));
 assert.ok(activity.includes('ChatGPTSignIn.signOut(this'));
 assert.ok(!auth.includes('WebView'));
 assert.ok(!auth.includes('window.postMessage'));
});

test('OAuth browser return is branded, app-linkable, and does not claim completed authorization',()=>{
 const html=fs.readFileSync(path.join(root,'BubblesAuthReturnPage.java'),'utf8');
 const manifest=fs.readFileSync(path.join(__dirname,'../android/bubbles-overlay/app/src/main/AndroidManifest.xml'),'utf8');
 assert.match(auth,/BubblesAuthReturnPage\.render\(valid, activity\.getPackageName\(\)\)/);
 assert.match(auth,/Referrer-Policy: no-referrer/);
 assert.match(auth,/Content-Security-Policy/);
 assert.match(html,/Head back to Bubbles/);
 assert.match(html,/Return to Bubbles app/);
 assert.match(html,/Open QuantaPhi Bubbles/);
 assert.match(html,/intent:\/\/return#Intent;scheme=quantaphi-bubbles;package=/);
 assert.match(html,/finishing the secure connection/);
 assert.doesNotMatch(html,/You may close this tab/);
 assert.match(manifest,/android:scheme="quantaphi-bubbles" android:host="return"/);
 assert.match(activity,/getIntent\(\)\.setData\(null\)/);
});
