'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');

const ROOT=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'workers/quantaphi-site/worker.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');

async function share(url,init){
  const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  return worker.fetch(new Request(url,init));
}
test('QuantaPhi X preview PNG is 1200x630 and is decodable',()=>{
 const png=fs.readFileSync(path.join(ROOT,'preview.png'));
 assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.equal(png.readUInt32BE(16),1200);
 assert.equal(png.readUInt32BE(20),630);
 const parts=[];let at=8;
 while(at+12<=png.length){
   const size=png.readUInt32BE(at),type=png.toString('ascii',at+4,at+8);
   if(type==='IDAT')parts.push(png.subarray(at+8,at+8+size));
   at+=size+12;
   if(type==='IEND')break;
 }
 assert.equal(zlib.inflateSync(Buffer.concat(parts)).length,630*(1200+1));
});
test('HTML pages use PNG instead of unsupported SVG cards',()=>{
 assert.match(index,/<meta name="twitter:card" content="summary_large_image">/);
 assert.match(index,/quantaphi\.org\/preview\.png/);
 assert.doesNotMatch(index,/property="og:image" content="[^"]*\.svg/);
 for(const kind of ['overview','media','page'])assert.match(index,new RegExp("kind:'"+kind+"'"));
});
test('shared search has independent server-side title, description and branded image',async()=>{
 const u=new URL('https://quantaphi.org/q-share');
 u.searchParams.set('title','Ancient Roman technology');
 u.searchParams.set('text','Romans developed advanced engineering.');
 u.searchParams.set('q','Roman engineering');
 const r=await share(u.href);
 assert.equal(r.status,200);
 assert.match(r.headers.get('content-type'),/text\/html/);
 const html=await r.text();
 assert.match(html,/<meta property="og:title" content="Ancient Roman technology">/);
 assert.match(html,/<meta name="twitter:card" content="summary_large_image">/);
 assert.match(html,/<meta name="twitter:image" content="https:\/\/quantaphi\.org\/preview\.png/);
 assert.match(html,/Romans developed advanced engineering\./);
 assert.match(html,/Roman\+engineering/);
});
test('public raster image is offered; svg and data URLs fall back',async()=>{
 for(const image of ['data:image/svg+xml;base64,YQ==','https://static.example.org/study.svg']){
  const u=new URL('https://quantaphi.org/q-share');u.searchParams.set('image',image);
  const html=await (await share(u.href)).text();
  assert.match(html,/<meta name="twitter:image" content="https:\/\/quantaphi\.org\/preview\.png/);
 }
 const u=new URL('https://quantaphi.org/q-share');u.searchParams.set('image','https://upload.wikimedia.org/example.jpg');
 const html=await (await share(u.href)).text();
 assert.match(html,/<meta name="twitter:image" content="https:\/\/upload\.wikimedia\.org\/example\.jpg">/);
});
test('HTML-escape the share title; never redirect viewers off-site',async()=>{
 const u=new URL('https://quantaphi.org/q-share');
 u.searchParams.set('q','Historical inventions');
 u.searchParams.set('title','<img src=x onerror=alert(1)>');
 u.searchParams.set('dest','https://untrusted.example/checkout');
 const html=await (await share(u.href)).text();
 assert.doesNotMatch(html,/<img src=x/);
 assert.match(html,/&lt;img src=x/);
 assert.doesNotMatch(html,/location\.replace\("https:\/\/untrusted\.example/);
 assert.match(html,/location\.replace\("https:\/\/quantaphi\.org/);
});
test('HEAD shares return metadata headers without a body',async()=>{
 const r=await share('https://quantaphi.org/q-share?title=QuantaPhi',{method:'HEAD'});
 assert.equal(r.status,200);
 assert.equal(await r.text(),'');
});
