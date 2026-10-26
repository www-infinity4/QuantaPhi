'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('workers/quantaphi-site/worker.js','utf8');
test('QuantaPhi gateway serves current main Oracle styling and video studio assets',async()=>{
 const calls=[];
 const context={URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,
  fetch:async target=>{
   calls.push(target instanceof Request ? target.url : String(target));
   return new Response('/* latest source */',{status:200,headers:{'Content-Type':'text/css'}});
  }
 };
 const standalone=source.replace(/^import \{videoAPI\} from '.\/video-api\.mjs';\s*/,'')
  .replace('export default', 'globalThis.worker=');
 assert.doesNotMatch(standalone,/^import\s/m,'worker mock must not silently bypass unhandled imports');
 vm.runInNewContext(standalone,context);
 const expected=[
  '/oracle-interface.css',
  '/video-studio.html',
  '/phi-imagine-video.js',
  '/phi-video-builder.js'
 ];
 for(const path of expected){
  const offset=calls.length;
  const response=await context.worker.fetch(new Request('https://quantaphi.org'+path),{});
  assert.equal(response.status,200,path);
  assert.equal(response.headers.get('x-quantaphi-app'),'QuantaPhi',path);
  assert.ok(calls.slice(offset).some(url=>new URL(url).pathname==='/www-infinity4/QuantaPhi/main'+path),path+' must read QuantaPhi main');
 }
 assert.ok(!calls.some(url=>url.includes('8d0a91fd4b814dd10b8b2541bf01762c3b6c2635')));
 assert.ok(!calls.some(url=>url.includes('/www-infinity4/Oracle/main/oracle-interface.css')));
});

const routing=source.split('\n').filter(line=>/^  const (?:repairRef|newQuantaRelease|newOctavesRelease|requestFlowRelease|chatRepairRelease|signinRelease|accountRelease|sourceRef) =/.test(line)).join('\n');
const sourceRef=new Function('route','incoming',routing+';return sourceRef;');
test('the automatic request interface and planner follow current main, including legacy cache URLs',()=>{
 for(const sourcePath of ['/index.html','/bubbles.html','/bubbles/index.html','/bubbles-chrome.html','/bubbles-ai.js','/bubbles-brain-actions.js','/robot-directions.js','/robot-work-report.js','/src/specialist-planner.js','/bubbles-ai.css','/bubbles-card-workspace.mjs']){
  for(const query of ['','?v=20261017-verified-receipts1','?v=20261019-auto-start1'])assert.equal(sourceRef({repo:'QuantaPhi',sourcePath},new URL('https://quantaphi.org/'+query)),'main');
 }
});
test('account connection repair follows current main; unrelated source pins stay preserved',()=>{
 const url=new URL('https://quantaphi.org/');
 assert.equal(sourceRef({repo:'QuantaPhi',sourcePath:'/bubbles-connections.mjs'},url),'main');
 assert.equal(sourceRef({repo:'QuantaPhi',sourcePath:'/apk-downloads.js'},url),'6643d2727f5be56dd0f1b217f532099899833bca');
 assert.equal(sourceRef({repo:'QuantaPhi',sourcePath:'/bubbles-gpt-live.js'},url),'40dc5b89ec8ae53804daa7fae6184a904b73fab0');
 assert.match(source,/quantaphi-org-service-20261026-cf-consent-v9/);
 assert.doesNotMatch(source,/quantaphi-org-service-20261026-oracle-auth-v7/);
 assert.doesNotMatch(source,/quantaphi-org-service-20261026-mobile-oauth-v8/);
});

test('old and new sign-in URLs use the same current account repair',()=>{
 for(const sourcePath of ['/bubbles.html','/bubbles-accounts.html','/bubbles-signin-gate.mjs','/bubbles-connections-gate.mjs','/bubbles-connections.mjs','/bubbles-auth.css','/bubbles-auth-return.mjs','/assets/auth-cloudflare.svg','/assets/auth-github.svg']){
  for(const v of ['20261026-signin2','20261018-direct2','20261026-oracle-auth1'])assert.equal(sourceRef({repo:'QuantaPhi',sourcePath},new URL('https://quantaphi.org/?v='+v)),'main');
  assert.equal(sourceRef({repo:'QuantaPhi',sourcePath},new URL('https://quantaphi.org/?v=future-release')),'main');
 }
});

test('versioned chat repair assets use one tested immutable commit, while future main stays current',()=>{
 for(const sourcePath of ['/bubbles-ai.js','/bubbles-brain-actions.js','/bubbles-ai.css','/bubbles-card-workspace.mjs','/robot-directions.js','/robot-work-report.js']){
  assert.equal(sourceRef({repo:'QuantaPhi',sourcePath},new URL('https://quantaphi.org/?v=20261019-chat-repair1')),'70324fb07090c9e2c15929b4a70c11afa4693c86');
  assert.equal(sourceRef({repo:'QuantaPhi',sourcePath},new URL('https://quantaphi.org/?v=future-release')),'main');
 }
});

test('Infinity results and directory pages allow only same-origin viewer framing',async()=>{
 const context={URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,
 fetch:async()=>new Response('<html><body>source</body></html>',{headers:{'Content-Type':'text/html','X-Frame-Options':'DENY'}})};
 vm.runInNewContext(source.replace(/^import \{videoAPI\} from '.\/video-api\.mjs';\s*/,'').replace('export default','globalThis.worker='),context);
 for(const path of ['/infinity-search-results.html','/directory/','/studio/','/source-quick-card.html']){
  const response=await context.worker.fetch(new Request('https://quantaphi.org'+path),{});
  assert.equal(response.headers.get('X-Frame-Options'),'SAMEORIGIN',path);
 }
 const home=await context.worker.fetch(new Request('https://quantaphi.org/'),{});
 assert.equal(home.headers.get('X-Frame-Options'),'DENY');
});

test('the quality-gated card release uses one immutable source for all its assets',()=>{
 for(const path of ['/source-quick-cards.mjs','/oracle-card-deck.js','/oracle-card-deck.css','/quanta-card-experience.css','/quanta-card-experience.mjs'])assert.equal(sourceRef({repo:'QuantaPhi',sourcePath:path},new URL('https://quantaphi.org/?v=20261024-quality-gate4')),'60f916b744e24c909106f01ae346d9abb2a187b9');
});

test('Walmart release assets use their tested immutable commit',()=>{
 for(const [path,v] of [['/oracle-card-deck.js','20261024-walmart1'],['/walmart-card.css','20261024-pizza1'],['/walmart-card.mjs','20261024-pizza1']])assert.equal(sourceRef({repo:'QuantaPhi',sourcePath:path},new URL('https://quantaphi.org/?v='+v)),'a0ed33c9fe67a475c8c395af00142fbe4f58c8ac');
});
