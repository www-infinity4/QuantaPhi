import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=(await fs.readFile(new URL('../workers/quantaphi-site/worker.js',import.meta.url),'utf8')).replace(/^import .*video-api[.]mjs';/m,'const videoAPI=async()=>null;');
const gateway=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
test('rewritten Next scripts request complete, unconditional text using runtime-managed compression',async()=>{
 const original=globalThis.fetch;const seen=[];globalThis.fetch=async request=>{seen.push(request);return new Response('globalThis.__assetOkay=true;',{headers:{'Content-Type':'application/javascript'}})};
 try{const response=await gateway.fetch(new Request('https://quantaphi.org/infinity-phi/_next/static/chunks/example.js',{headers:{'Accept-Encoding':'gzip, deflate, br, zstd','Range':'bytes=0-50','If-Range':'old','If-None-Match':'old','If-Modified-Since':'yesterday'}}),{});
 assert.equal(response.status,200);assert.equal(await response.text(),'globalThis.__assetOkay=true;');assert.ok(seen.length);for(const key of ['Accept-Encoding','Range','If-Range','If-None-Match','If-Modified-Since'])assert.equal(seen[0].headers.get(key),null,key);
 }finally{globalThis.fetch=original;}
});
test('media byte ranges remain available on unmodified binary responses',async()=>{
 const original=globalThis.fetch;let forwarded;globalThis.fetch=async request=>{forwarded=request;return new Response('picture',{headers:{'Content-Type':'image/webp'}})};
 try{await gateway.fetch(new Request('https://quantaphi.org/infinity-phi/photo.webp',{headers:{Range:'bytes=0-50'}}),{});assert.equal(forwarded.headers.get('Range'),'bytes=0-50');}finally{globalThis.fetch=original;}
});
