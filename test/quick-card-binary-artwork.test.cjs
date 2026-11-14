'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('public QuantaPhi share artwork is fetched as real binary from original source, not Pages HTML',async()=>{
 const calls=[],png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
 const scope={URL,Request,Response,Headers,AbortController,AbortSignal,setTimeout,clearTimeout,fetch:async(input)=>{
  const url=typeof input==='string'?input:input.url;calls.push(url);
  if(url.includes('raw.githubusercontent.com/www-infinity4/QuantaPhi/main/assets/share/x-money-card.png')){
   return new Response(png,{status:200,headers:{'Content-Type':'application/octet-stream'}});
  }
  return new Response('<html>GitHub Pages HTML fallback</html>',{status:200,headers:{'Content-Type':'text/html'}});
 }};
 vm.createContext(scope);
 const worker=fs.readFileSync('workers/quantaphi-site/worker.js','utf8')
  .replace(/^import \{videoAPI\} from '\.\/video-api\.mjs';\s*/m,"const videoAPI=()=>{throw Error('no video in image test')};\n")
  .replace('export default','globalThis.worker=');
 vm.runInContext(worker,scope);
 const response=await scope.worker.fetch(new Request('https://quantaphi.org/assets/share/x-money-card.png'));
 assert.equal(response.status,200);
 assert.match(response.headers.get('Content-Type'),/image\/png/);
 assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
 assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[...png]);
 assert.equal(calls.length,1,'raw original artwork should be the first and only request');
 assert.match(calls[0],/raw\.githubusercontent\.com/);
});
