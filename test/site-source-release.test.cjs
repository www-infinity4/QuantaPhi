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
   calls.push(String(target));
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
