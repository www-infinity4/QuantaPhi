const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('Bubbles JavaScript follows current main even when the homepage remains pinned',async()=>{
 const calls=[];
 const source=fs.readFileSync('workers/quantaphi-site/worker.js','utf8').replace(/^import \{videoAPI\} from '.\/video-api\.mjs';\s*/,'').replace('export default','globalThis.worker=');
 const c={URL,Request,Response,Headers,AbortSignal,AbortController,setTimeout,clearTimeout,fetch:async(url)=>{calls.push(typeof url==='string'?url:url.url);return new Response('/* current Bubbles */',{headers:{'Content-Type':'application/javascript'}});}};
 vm.runInNewContext(source,c);
 const result=await c.worker.fetch(new Request('https://quantaphi.org/bubbles-ai.js?v=old-cache-key'),{});
 assert.equal(result.status,200);
 assert.ok(calls.some(url=>url.includes('/QuantaPhi/main/bubbles-ai.js')));
 assert.ok(!calls.some(url=>url.includes('/6643d2727f5be56dd0f1b217f532099899833bca/bubbles-ai.js')));
});
