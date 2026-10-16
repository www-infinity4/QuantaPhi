'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=path=>fs.readFileSync(path,'utf8');
function loadWorker(path){
 const handlers={},cacheContents=new Map(),networkRequests=[];
 let online=true;
 const cache={
  async addAll(reqs){
   for(const req of reqs)cacheContents.set(req.url,new Response('preinstalled '+req.url,{headers:{'content-type':'text/html'}}));
  },
  async match(input){return cacheContents.get(typeof input==='string'?new URL(input,'https://quantaphi.org').href:input.url)},
  async put(input,response){cacheContents.set(typeof input==='string'?new URL(input,'https://quantaphi.org').href:input.url,response)}
 };
 const caches={
  async open(){return cache},async keys(){return ['other-app-cache']},
  async delete(name){throw Error('Unexpected cache eviction: '+name)}
 };
 const self={location:{origin:'https://quantaphi.org'},addEventListener:(name,fn)=>{handlers[name]=fn},
  skipWaiting:async()=>{},clients:{claim:async()=>{}}};
 const fetch=async input=>{
  const url=typeof input==='string'?input:input.url;
  networkRequests.push(url);
  if(!online)throw Error('offline');
  return new Response('network '+url,{status:200});
 };
 vm.runInNewContext(read(path),{self,URL,Request,Response,caches,fetch,Promise,Set,Error,console});
 async function install(){
  let pending;handlers.install({waitUntil:p=>{pending=p}});
  await pending;
  return cacheContents;
 }
 async function route(url,{method='GET',authorization=false}={}){
  const req=new Request(url,{method,headers:authorization?{authorization:'Bearer opaque'}:{}});
  let value=null;
  handlers.fetch({request:req,respondWith:p=>{value=p}});
  if(value===null)return {handled:false};
  try{const response=await value;return {handled:true,status:response.status,body:await response.text()}}
  catch(err){return {handled:true,error:String(err)}}
 }
 return {handlers,install,route,goOffline(){online=false},cacheContents,networkRequests};
}
test('Platinum pre-installs only public local shelf files and can boot offline after first online visit',async()=>{
 const w=loadWorker('platinum/offline-sw.js');
 assert.deepEqual(Object.keys(w.handlers).sort(),['activate','fetch','install']);
 const cache=await w.install();
 assert.ok(cache.has('https://quantaphi.org/platinum/index.html'));
 assert.ok([...cache.keys()].some(k=>k.includes('platinum/platinum.js')));
 assert.ok([...cache.keys()].some(k=>k.includes('phi-project-package.js')));
 w.goOffline();
 const offline=await w.route('https://quantaphi.org/platinum/');
 assert.equal(offline.handled,true);
 assert.equal(offline.status,200);
 assert.match(offline.body,/preinstalled \/platinum\/index.html|preinstalled https:\/\/quantaphi\.org\/platinum\/index\.html/);
 for(const u of [
  'https://quantaphi.org/api/wallet',
  'https://quantaphi.org/robot/runner/claim',
  'https://quantaphi.org/',
  'https://example.com/private',
  'https://quantaphi.org/platinum/private-account']){
  assert.equal((await w.route(u)).handled,false,u);
 }
 assert.equal((await w.route('https://quantaphi.org/platinum/',{method:'POST'})).handled,false);
 assert.equal((await w.route('https://quantaphi.org/platinum/',{authorization:true})).handled,false);
});
test('Phone caches only canonical public shell; no subscriber, carrier or secret request ever cached',async()=>{
 const w=loadWorker('phone/offline-sw.js');await w.install();w.goOffline();
 const offline=await w.route('https://quantaphi.org/phone/');
 assert.equal(offline.handled,true);
 assert.equal(offline.status,200);
 for(const u of [
  'https://quantaphi.org/phone/alice',
  'https://quantaphi.org/phone/n/14155550123',
  'https://quantaphi.org/phone/private-backup',
  'https://infinity-switchboard.marvaseater.workers.dev/health',
  'https://quantaphi.org/v1/line/alice',
  'https://quantaphi.org/phone/alice/register']){
  assert.equal((await w.route(u)).handled,false,u);
 }
 assert.equal((await w.route('https://quantaphi.org/phone/',{method:'POST'})).handled,false);
});
test('Offline panels are explicitly limited; Android dialer privileges were not claimed',()=>{
 const phone=read('phone/index.html'),plat=read('platinum/index.html'),plJs=read('platinum/platinum.js');
 const manifest=read('android/infinity-platinum/app/src/main/AndroidManifest.xml');
 assert.ok(phone.includes("register('/phone/offline-sw.js")||phone.includes("scope+'offline-sw.js'"));
 assert.ok(plat.includes("scope+'offline-sw.js'"));
 assert.match(phone,/Live ringing, audio\/video, Bubbles and Internet search still require/);
 assert.match(plat,/Bubbles AI, Robot Brain, calls and third-party sites still need Internet/);
 assert.match(plJs,/Offline local shelf/);
 assert.match(plJs,/searchLocalShelf/);
 assert.doesNotMatch(manifest,/PROCESS_OUTGOING_CALLS|MODIFY_PHONE_STATE|android.permission.ROOT/);
});
