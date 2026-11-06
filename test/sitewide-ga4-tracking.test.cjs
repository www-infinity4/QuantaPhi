'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source=fs.readFileSync('workers/quantaphi-site/worker.js','utf8')
 .replace(/^import \{videoAPI\} from '.\/video-api.mjs';\s*/,'')
 .replace('export default','globalThis.worker=');

function workerWith(html, headers={'Content-Type':'text/html; charset=utf-8'}, status=200){
 const originRequests=[];
 const context={URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,
  fetch:async request=>{originRequests.push(request.url||String(request));return new Response(html,{status,headers});}
 };
 vm.runInNewContext(source,context);
 return {app:context.worker, originRequests};
}
const page='<html lang="en"><head><meta charset="utf-8"><title>QuantaPhi Directory</title></head><body><a href="/story/">Story</a><button>Collect</button></body></html>';
const id='G-JXQKLVZQT1';

test('public HTML across active routes installs GA4 exactly once and tracks user-triggered clicks',async()=>{
 const routes=['/directory/','/story/','/pixie/','/bubbles.html','/platinum/','/infinity-phi/'];
 const {app}=workerWith(page);
 for(const path of routes){
  const res=await app.fetch(new Request('https://quantaphi.org'+path),{});
  assert.equal(res.status,200,path);
  const body=await res.text();
  assert.equal((body.match(/googletagmanager\.com\/gtag\/js\?id=G-JXQKLVZQT1/g)||[]).length,1,path);
  assert.match(body,/gtag\('config','G-JXQKLVZQT1'/,path);
  assert.match(body,/page_location:location\.origin\+location\.pathname/,path+' must exclude query values');
  assert.match(body,/event\.isTrusted/,path+' must only count trusted clicks');
  assert.match(body,/quanta_click/,path);
  assert.equal(res.headers.get('x-quantaphi-ga4'),'installed');
  assert.match(body,/<title>QuantaPhi Directory<\/title>/);
 }
});

test('existing homepage GA4 config is not duplicated while UI click tracking is added',async()=>{
 const home=fs.readFileSync('index.html','utf8');
 const {app}=workerWith(home);
 const res=await app.fetch(new Request('https://quantaphi.org/'),{});
 const body=await res.text();
 assert.equal(res.status,200);
 assert.equal((body.match(/googletagmanager\.com\/gtag\/js\?id=G-JXQKLVZQT1/g)||[]).length,1);
 assert.equal((body.match(/gtag\('config', 'G-JXQKLVZQT1'/g)||[]).length,1);
 assert.equal((body.match(/data-quantaphi-clicks=/g)||[]).length,1);
 assert.equal(res.headers.get('x-quantaphi-ga4'),'existing');
});

test('auth, wallet, profile and sensitive public housing pages never get analytics injected',async()=>{
 const {app}=workerWith(page);
 for(const path of ['/bubbles-accounts.html','/bubbles-auth-return.html','/infinity-phi/wallet/','/infinity-phi/profile/','/disability-housing.html','/housing-help.html']){
  const res=await app.fetch(new Request('https://quantaphi.org'+path),{});
  const body=await res.text();
  assert.ok(!body.includes('data-quantaphi-ga4'),path);
  assert.ok(!body.includes('data-quantaphi-clicks'),path);
  assert.equal(res.headers.get('x-quantaphi-ga4'),null,path);
 }
});

test('strict CSP and in-page CSP prevent instrumentation, not weaken security headers',async()=>{
 const {app}=workerWith(page,{'Content-Type':'text/html','Content-Security-Policy':"default-src 'self'; script-src 'self'"});
 const res=await app.fetch(new Request('https://quantaphi.org/directory/'),{});
 assert.equal(res.headers.get('Content-Security-Policy'),"default-src 'self'; script-src 'self'");
 assert.equal(res.headers.get('x-quantaphi-ga4'),null);
 assert.ok(!(await res.text()).includes('data-quantaphi-ga4'));
 const fixture=page.replace('<meta charset="utf-8">','<meta http-equiv="Content-Security-Policy" content="script-src \'self\'">');
 const {app:metaApp}=workerWith(fixture);
 assert.ok(!(await(await metaApp.fetch(new Request('https://quantaphi.org/story/'),{})).text()).includes('data-quantaphi-ga4'));
});

test('static assets, non-HTML responses, HEAD, and errors are not instrumented',async()=>{
 for(const [path,type,status] of [['/site-theme.css','text/css',200],['/data/records.json','application/json',200],['/directory/','text/html',404]]){
  const {app}=workerWith(page,{'Content-Type':type},status);
  const res=await app.fetch(new Request('https://quantaphi.org'+path),{});
  assert.equal(res.status,status);
  assert.ok(!(await res.text()).includes('data-quantaphi-ga4'),path);
 }
 const {app}=workerWith(page);
 const head=await app.fetch(new Request('https://quantaphi.org/directory/',{method:'HEAD'}),{});
 assert.ok(!(await head.text()).includes('data-quantaphi-ga4'));
});

test('synthetic query tokens do not appear in injected GA config or interaction payloads',async()=>{
 const {app}=workerWith(page);
 const res=await app.fetch(new Request('https://quantaphi.org/directory/?session_token=private123'),{});
 const body=await res.text();
 assert.ok(!body.includes('private123'));
 assert.match(body,/page_location:location\.origin\+location\.pathname/);
 assert.ok(!body.includes('innerText'));
 assert.ok(!body.includes('target.href'));
});
