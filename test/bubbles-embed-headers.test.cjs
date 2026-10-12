'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('only embedded public Bubbles removes the upstream frame denial',async()=>{
 const context={URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,
  fetch:async()=>new Response('<html>Bubbles</html>',{headers:{'content-type':'text/html','X-Frame-Options':'deny'}})};
 vm.runInNewContext(fs.readFileSync('workers/quantaphi-site/worker.js','utf8').replace('export default','globalThis.worker ='),context);
 for(const [path,expected] of [['/bubbles.html?embed=1',null],['/bubbles.html','deny'],['/wallet/','deny']]){
  const response=await context.worker.fetch(new Request('https://quantaphi.org'+path),{});
  assert.equal(response.headers.get('x-frame-options'),expected,path);
 }
});
