import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../workers/quantaphi-site/worker.js',import.meta.url),'utf8').replace(/^import .*video-api[.]mjs';/m,'const videoAPI=async()=>null;');
const gateway=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
test('only the public housing HTML gets same-origin embedding and a network-disabled intake policy',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response('<!doctype html><html><body>Housing intake</body></html>',{headers:{'Content-Type':'text/html','X-Frame-Options':'DENY'}});
 try{
  const r=await gateway.fetch(new Request('https://quantaphi.org/disability-housing.html?preview=1'),{});
  assert.equal(r.status,200);assert.equal(r.headers.get('X-Frame-Options'),'SAMEORIGIN');
  assert.match(r.headers.get('Content-Security-Policy'),/connect-src 'none'/);
  assert.match(r.headers.get('Content-Security-Policy'),/form-action 'none'/);
  assert.match(r.headers.get('Content-Security-Policy'),/frame-ancestors 'self'/);
  assert.equal(r.headers.get('Referrer-Policy'),'no-referrer');
  const help=await gateway.fetch(new Request('https://quantaphi.org/housing-help.html?resource=sieda'),{});
  assert.equal(help.headers.get('X-Frame-Options'),'SAMEORIGIN');
  assert.match(help.headers.get('Content-Security-Policy'),/connect-src 'none'/);
  for(const path of ['/bubbles-accounts.html','/wallet-link.html','/disability-housing.html/other']){
   const other=await gateway.fetch(new Request('https://quantaphi.org'+path),{});
   assert.equal(other.headers.get('X-Frame-Options'),'DENY',path);
  }
 }finally{globalThis.fetch=original;}
});
