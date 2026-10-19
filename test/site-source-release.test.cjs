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

const routing=source.split('\n').filter(line=>/^  const (?:repairRef|newQuantaRelease|newOctavesRelease|requestFlowRelease|sourceRef) =/.test(line)).join('\n');
const sourceRef=new Function('route','incoming',routing+';return sourceRef;');
test('the automatic request interface and planner follow current main, including legacy cache URLs',()=>{
 for(const sourcePath of ['/index.html','/bubbles.html','/bubbles/index.html','/bubbles-chrome.html','/bubbles-ai.js','/bubbles-brain-actions.js','/robot-directions.js','/robot-work-report.js','/src/specialist-planner.js']){
  for(const query of ['','?v=20261017-verified-receipts1','?v=20261019-auto-start1'])assert.equal(sourceRef({repo:'QuantaPhi',sourcePath},new URL('https://quantaphi.org/'+query)),'main');
 }
});
test('existing account, download and live-GPT source pins are preserved',()=>{
 const url=new URL('https://quantaphi.org/');
 assert.equal(sourceRef({repo:'QuantaPhi',sourcePath:'/bubbles-connections.mjs'},url),'5314715a3a403b548f54440dd7975c7dd7972390');
 assert.equal(sourceRef({repo:'QuantaPhi',sourcePath:'/apk-downloads.js'},url),'6643d2727f5be56dd0f1b217f532099899833bca');
 assert.equal(sourceRef({repo:'QuantaPhi',sourcePath:'/bubbles-gpt-live.js'},url),'40dc5b89ec8ae53804daa7fae6184a904b73fab0');
 assert.match(source,/quantaphi-org-service-20261019-auto-request-v1/);
});
