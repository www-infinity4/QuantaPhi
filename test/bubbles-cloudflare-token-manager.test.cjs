const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ui=fs.readFileSync('bubbles-ai.js','utf8');
const worker=fs.readFileSync('workers/infinity-brain-clock/worker.js','utf8');
test('main Android/website Bubbles offers an actual owner approval card, never a master token input',()=>{
 assert.match(ui,/function proposeCloudflareWorkerToken\(/);
 assert.match(ui,/\['Cloudflare token manager'/);
 assert.match(ui,/verifiedOwnerHeaders\(\)/);
 assert.match(ui,/\/work\/cloudflare\/token-plan/);
 assert.match(ui,/\/work\/cloudflare\/token-confirm/);
 assert.match(ui,/approve\.addEventListener\('click'/);
 assert.match(ui,/approve\.disabled=!plan\.managerConfigured/);
 assert.match(ui,/No token will be placed in the APK/);
 assert.doesNotMatch(ui,/localStorage\.setItem\(['"]CLOUDFLARE/);
});
test('cloudflare token issuance is behind owner auth in Worker and never uses the GitHub GHP token',()=>{
 assert.match(worker,/path==='/); // source is actually route-scoped
 const where=worker.indexOf("if(['/work/cloudflare/token-plan'");
 assert.ok(where>0);
 const code=worker.slice(where,worker.indexOf('// Read-only scientific tool',where));
 assert.match(code,/await ownerAuthorized\(env,token\)/);
 assert.match(code,/origin_not_allowed/);
 assert.match(code,/request_too_large/);
 assert.match(code,/clock\.internal/);
 assert.doesNotMatch(code,/GHP|GITHUB_TOKEN|API_KEY/);
 const broker=fs.readFileSync('workers/infinity-brain-clock/cloudflare-token-broker.mjs','utf8');
 assert.match(broker,/CLOUDFLARE_TOKEN_MANAGER/);
 assert.match(broker,/AES-GCM/);
 assert.match(broker,/TOKEN_PLAN_TTL_MS=5\*60\*1000/);
 assert.match(broker,/availableToAndroidApk:false/);
 assert.doesNotMatch(broker,/localStorage|document\.cookie/);
});
