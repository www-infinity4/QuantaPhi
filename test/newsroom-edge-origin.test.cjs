'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('workers/quantaphi-site/worker.js','utf8')
 .replace(/^import \{videoAPI\} from '\.\/video-api\.mjs';\s*/m,"const videoAPI=()=>{throw Error('no video route in static asset test')};\n")
 .replace('export default','globalThis.worker=');

async function route(path,{pagesStatus=200}={}){
 const calls=[];
 const sandbox={
  URL,URLSearchParams,Request,Response,Headers,AbortController,AbortSignal,
  setTimeout,clearTimeout,TextEncoder,TextDecoder,
  async fetch(input){
   const url=new URL(typeof input==='string'?input:input.url);
   calls.push(url.href);
   const pages=url.hostname==='www-infinity4.github.io';
   const raw=url.hostname==='raw.githubusercontent.com';
   assert.ok(pages||raw,'only the pinned static source origins may be contacted');
   return new Response(pages?'/* current GitHub Pages edition */':'/* stale raw GitHub edition */',{
    status:pages?pagesStatus:200,
    headers:{'content-type':'application/javascript; charset=utf-8'}
   });
  }
 };
 vm.createContext(sandbox);
 vm.runInContext(source,sandbox);
 const result=await sandbox.worker.fetch(new Request('https://quantaphi.org'+path),{});
 return {calls,status:result.status,body:await result.text(),headers:result.headers};
}

test('current newsroom reader uses the successfully published Pages copy before lagging raw GitHub',async()=>{
 const response=await route('/newsroom/fresh-reports.mjs?v=published');
 assert.equal(response.status,200);
 assert.match(response.calls[0],/^https:\/\/www-infinity4\.github\.io\/QuantaPhi\/newsroom\/fresh-reports\.mjs\?/);
 assert.match(response.body,/current GitHub Pages edition/);
 assert.doesNotMatch(response.body,/stale raw GitHub edition/);
});

test('a Pages 404 falls back to original public raw source rather than inventing a script',async()=>{
 const response=await route('/newsroom/fresh-reports.mjs',{pagesStatus:404});
 assert.equal(response.status,200);
 assert.match(response.calls[0],/^https:\/\/www-infinity4\.github\.io\/QuantaPhi\/newsroom\/fresh-reports\.mjs/);
 assert.ok(response.calls.some(x=>x.startsWith('https://raw.githubusercontent.com/www-infinity4/QuantaPhi/main/newsroom/fresh-reports.mjs')));
 assert.match(response.body,/stale raw GitHub edition/);
});

test('wallet and Bubbles JS retain the existing raw-first policy',async()=>{
 const result=await route('/bubbles-ai.js');
 assert.equal(result.status,200);
 assert.match(result.calls[0],/^https:\/\/raw\.githubusercontent\.com\/www-infinity4\/QuantaPhi\/main\/bubbles-ai\.js/);
 assert.match(result.body,/stale raw GitHub edition/);
});
