import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const viewer=readFileSync(new URL('../quanta-official-viewer.mjs',import.meta.url),'utf8');
const workerSource=readFileSync(new URL('../workers/quantaphi-site/worker.js',import.meta.url),'utf8');

test('external preview is sandboxed without mic or clipboard permissions',()=>{
 assert.match(viewer,/frame\.setAttribute\('sandbox','allow-scripts allow-forms allow-same-origin'\)/);
 assert.doesNotMatch(viewer,/frame\.setAttribute\('allow','[^']*(?:microphone|clipboard-write)/);
 assert.match(viewer,/frame\.referrerPolicy='no-referrer'/);
 assert.match(viewer,/frame\.src=site\.url/,'existing pinned provider source remains in use');
});

test('main site and standalone viewer reject outside framing at the edge',async()=>{
 const context={URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,
  fetch:async()=>new Response('<!doctype html><html><body>demo</body></html>',{
   status:200,headers:{'content-type':'text/html'}
  })};
 const source=workerSource
  .replace(/^import \{videoAPI\} from '\.\/video-api\.mjs';\s*/,'')
  .replace('export default','globalThis.worker =');
 assert.doesNotMatch(source,/^import\s/m,'no unhandled worker imports');
 vm.runInNewContext(source,context);
 for(const path of ['/','/website-viewer.html']){
  const response=await context.worker.fetch(new Request('https://quantaphi.org'+path),{});
  assert.equal(response.status,200,path);
  assert.equal(response.headers.get('X-Frame-Options'),'SAMEORIGIN',path);
  assert.match(response.headers.get('Content-Security-Policy')||'',/frame-ancestors 'self'/,path);
  assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff',path);
 }
});
