const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const base='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Cloudflare diagnostics run through the existing Termux callback and the original Android Bubbles',()=>{
 const probe=read(base+'TermuxProbe.java'),receiver=read(base+'TermuxProbeResultReceiver.java');
 const floating=read(base+'FloatingOracleWindow.java'),main=read(base+'MainActivity.java');
 const ai=read('bubbles-ai.js');
 assert.match(probe,/static final String CLOUDFLARE_SCRIPT/);
 assert.match(probe,/static String runCloudflare\(Context context\)/);
 assert.match(probe,/com\.termux\.RUN_COMMAND_PENDING_INTENT/);
 assert.match(floating,/termux_cloudflare_probe/);
 assert.match(main,/offerTermuxCloudflareProbe/);
 assert.match(ai,/nativeTermuxProbeRequests\.push\(\{action:'cloudflare'\}\)/);
 assert.match(receiver,/cloudflare_probe=complete/);
 assert.match(ai,/Termux Cloudflare network check/);
});

test('Cloudflare local probe is read-only, fixed-host, bounded and no account auth is inferred',()=>{
 const probe=read(base+'TermuxProbe.java'),receiver=read(base+'TermuxProbeResultReceiver.java');
 assert.match(probe,/https:\/\/quantaphi\.org\//);
 assert.match(probe,/https:\/\/www\.cloudflare\.com\//);
 assert.match(probe,/--connect-timeout/);
 assert.match(probe,/--max-time/);
 assert.doesNotMatch(probe,/\b(?:wrangler deploy|cf api|curl .*Authorization|pkg install|pip install|apt install)\b/i);
 assert.match(receiver,/Cloudflare network endpoints responded/);
 assert.match(receiver,/This does not verify account authorization or deployment/);
});

test('a blocked or absent callback cannot be converted into a verified response',()=>{
 const receiver=read(base+'TermuxProbeResultReceiver.java'),probe=read(base+'TermuxProbe.java');
 assert.match(receiver,/code == 0 && serviceError == -1/);
 assert.match(receiver,/cloudflare_probe=complete/);
 assert.match(probe,/timed_out_unverified/);
 assert.match(probe,/permission_blocked/);
 assert.match(probe,/PendingIntent\.FLAG_ONE_SHOT/);
});

test('Cloudflare checks keep original owner consent and do not bypass active assistant backend',()=>{
 const main=read(base+'MainActivity.java'),service=read(base+'BubblesService.java');
 const floating=read(base+'FloatingOracleWindow.java'),ai=read('bubbles-ai.js');
 assert.match(main,/\.setNegativeButton\("Cancel"/);
 assert.match(main,/\.setPositiveButton\("Test Cloudflare network"/);
 assert.match(service,/handleTermuxCloudflare/);
 assert.match(floating,/trustedChat\(website\)/);
 assert.match(ai,/https:\/\/bubbles-tools\.marvaseater\.workers\.dev\/v1\/assist/);
});
