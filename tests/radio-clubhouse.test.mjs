import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test, after } from 'node:test';

// Load the same deployed Worker source without requiring a package type flip.
const source=await readFile(new URL('../workers/quantaphi-site/worker.js',import.meta.url),'utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const orig=globalThis.fetch;
const INDEX='<a class="forumtitle" href="./viewforum.php?f=7">Antique Radio Discussions</a>'+
 '<a class="forumtitle" href="./viewforum.php?f=20">Radio Clubhouse</a>';
const FEED='<?xml version="1.0"?><feed>'+
 '<entry><title>Earlier radio restoration question</title>'+
 '<link href="https://antiqueradios.com/forums/viewtopic.php?t=5001"/><updated>2026-10-11T01:00:00Z</updated>'+
 '<author><name>Collector</name></author><summary>Learning about tubes</summary></entry>'+
 '<entry><title>Fresh Clubhouse conversation</title>'+
 '<link href="https://antiqueradios.com/forums/viewtopic.php?t=5002"/><updated>2026-10-12T19:00:00Z</updated>'+
 '<author><name>Radio member</name></author><summary>Keeping antique receivers alive.</summary></entry>'+
 '<entry><title>Unsafe outside source</title>'+
 '<link href="https://some-other-forum.example/forums/viewtopic.php?t=5003"/>'+
 '<updated>2026-10-12T20:00:00Z</updated></entry>'+
 '</feed>';
function mockFetch(handler){globalThis.fetch=handler}
async function run(){return worker.fetch(new Request('https://quantaphi.org/api/radio-clubhouse'),{})}
after(()=>{globalThis.fetch=orig});
test('Only source-verified Radio Clubhouse topics become cards; newest first',async()=>{
 const called=[];
 mockFetch(async target=>{
  const u=String(target);called.push(u);
  if(u.endsWith('index.php'))return new Response(INDEX,{status:200});
  if(u.includes('feed.php?f=20'))return new Response(FEED,{status:200});
  throw new Error('unexpected fetch '+u);
 });
 const response=await run(),body=await response.json();
 assert.equal(response.status,200);
 assert.equal(body.ok,true);
 assert.equal(body.feedType,'atom');
 assert.deepEqual(body.topics.map(t=>t.id),['5002','5001']);
 assert.match(body.topics[0].url,/antiqueradios\.com\/forums\/viewtopic\.php\?t=5002/);
 assert.equal(body.topics[0].snippet,'Keeping antique receivers alive.');
 assert.ok(called.some(x=>x.endsWith('feed.php?f=20')));
 assert.ok(called.every(x=>!x.includes('feed.php?f=7')));
});
test('HTML forum fallback keeps discussion titles distinct and in forum order',async()=>{
 mockFetch(async target=>{
  const u=String(target);
  if(u.endsWith('index.php'))return new Response(INDEX);
  if(u.includes('feed.php?f=20'))return new Response('No feed',{status:404});
  if(u.includes('viewforum.php?f=20'))return new Response(
   '<h1>Radio Clubhouse</h1><li class="row">'+
   '<a class="topictitle" href="./viewtopic.php?t=5003">Just posted!</a></li>'+
   '<li class="row"><a class="topictitle" href="./viewtopic.php?t=5003">Just posted!</a></li>'+
   '<li><a class="topictitle" href="./viewtopic.php?t=5004">Another discussion</a></li>'+
   '<a href="https://evil.example/viewtopic.php?t=5005" class="topictitle">Off site</a>');
  throw Error('unexpected path');
 });
 const response=await run(),body=await response.json();
 assert.equal(body.feedType,'forum');
 assert.deepEqual(body.topics.map(t=>t.id),['5003','5004']);
 assert.equal(body.topics[0].updated,null);
});
test('Refuse stale fabricated data when upstream blocks access',async()=>{
 mockFetch(async target=>String(target).endsWith('index.php')
  ?new Response('Forbidden',{status:403}):new Response('should not fetch',{status:500}));
 const response=await run(),body=await response.json();
 assert.equal(response.status,503);
 assert.equal(body.ok,false);
 assert.equal(body.error,'radio_clubhouse_temporarily_unavailable');
 assert.ok(!('topics' in body));
 assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('Wrong forum or missing clubhouse never becomes a live card feed',async()=>{
 mockFetch(async target=>{
  if(String(target).endsWith('index.php'))
   return new Response('<a href="./viewforum.php?f=5">Other radio board</a>');
  throw Error('must not fetch unrelated forum');
 });
 const response=await run();
 assert.equal(response.status,503);
});
test('No writes on the public read endpoint',async()=>{
 mockFetch(async()=>{throw Error('should not fetch')});
 const response=await worker.fetch(new Request('https://quantaphi.org/api/radio-clubhouse',{method:'POST'}),{});
 assert.equal(response.status,405);
});
