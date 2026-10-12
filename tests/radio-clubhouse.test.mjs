import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test, after } from 'node:test';

const source=await readFile(new URL('../workers/radio-clubhouse-feed/worker.js',import.meta.url),'utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const originalFetch=globalThis.fetch;
const ENDPOINT='https://quantaphi.org/api/radio-clubhouse';
const BOARD='https://antiqueradios.com/forums/viewforum.php?f=2';
const indexFragment='<h1>Radio Clubhouse</h1>';
const html=indexFragment+'<ul class="topiclist topics">'+
 '<li class="row topic_announce"><a class="topictitle" href="./viewtopic.php?t=100">Official instructions</a></li>'+
 '<li class="row topic_sticky"><a class="topictitle" href="./viewtopic.php?t=101">Pinned warnings</a></li>'+
 '<li class="row"><a class="topictitle" href="./viewtopic.php?t=392271">Everything USPS/UPS/FedEx/Other Shipping Topic</a></li>'+
 '<li class="row"><a class="topictitle" href="./viewtopic.php?t=5003">First regular discussion</a></li>'+
 '<li class="row"><a class="topictitle" href="./viewtopic.php?t=5003">First regular discussion duplicate</a></li>'+
 '<li class="row"><a class="topictitle" href="./viewtopic.php?t=5002">Second regular discussion</a></li>'+
 '<li class="row"><a class="topictitle" href="https://other.example/forums/viewtopic.php?t=5004">Other board</a></li></ul>';
const atom='<?xml version="1.0"?><feed>'+
 '<entry><title>Older radio conversation</title><link href="https://antiqueradios.com/forums/viewtopic.php?t=5001"/>'+
 '<updated>2026-10-11T01:00:00Z</updated><summary>Older update</summary></entry>'+
 '<entry><title>New Radio Clubhouse conversation</title><link href="https://antiqueradios.com/forums/viewtopic.php?t=5002"/>'+
 '<updated>2026-10-12T19:00:00Z</updated><summary>Newer update</summary></entry>'+
 '<entry><title>Official announcement</title><category term="sticky"/>'+
 '<link href="https://antiqueradios.com/forums/viewtopic.php?t=101"/>'+
 '<updated>2026-10-12T20:00:00Z</updated></entry>'+
 '<entry><title>Off-domain</title><link href="https://evil.example/forums/viewtopic.php?t=5009"/>'+
 '<updated>2026-10-12T20:01:00Z</updated></entry>'+
 '</feed>';
const blocked=async ()=>new Response('Access denied',{status:403});
const mock=fn=>{globalThis.fetch=fn;};
const run=async()=>worker.fetch(new Request(ENDPOINT),{});
after(()=>{globalThis.fetch=originalFetch});
test('exact Radio Clubhouse page 1 is the first and only needed HTML address',async()=>{
 const calls=[];
 mock(async target=>{
  const u=String(target);calls.push(u);
  if(u===BOARD)return new Response(html);
  throw Error('Unexpected fetch '+u);
 });
 const response=await run(),data=await response.json();
 assert.equal(response.status,200);
 assert.equal(data.ok,true);
 assert.equal(data.archived,false);
 assert.equal(data.feedType,'forum');
 assert.equal(data.sourceUrl,BOARD);
 assert.deepEqual(calls,[BOARD]);
 assert.deepEqual(data.topics.map(x=>x.id),['5003','5002']);
 assert.ok(data.topics.every(x=>x.url.startsWith('https://antiqueradios.com/forums/viewtopic.php?t=')));
});
test('a blocked board can still use the public Radio Clubhouse Atom feed',async()=>{
 const calls=[];
 mock(async target=>{
  const u=String(target);calls.push(u);
  if(u===BOARD)return blocked();
  if(u.endsWith('feed.php?f=2'))return new Response(atom);
  throw Error('Unexpected request '+u);
 });
 const data=await (await run()).json();
 assert.equal(data.archived,false);
 assert.equal(data.feedType,'atom');
 assert.deepEqual(data.topics.map(x=>x.id),['5002','5001']);
 assert.ok(calls.every(x=>!x.includes('index.php')&&!x.includes('f=20')));
});
test('fails over to the second publicly exposed feed URL',async()=>{
 mock(async target=>{
  const u=String(target);
  if(u.endsWith('feed.php?mode=topics&f=2'))return new Response(atom);
  return blocked();
 });
 const data=await (await run()).json();
 assert.equal(data.feedType,'atom');
 assert.equal(data.topics.length,2);
});
test('a blocked board and blocked feeds return real source-linked archived discussions',async()=>{
 const urls=[];
 mock(async target=>{urls.push(String(target));return blocked()});
 const response=await run(),data=await response.json();
 assert.equal(response.status,200);
 assert.equal(data.archived,true);
 assert.equal(data.feedType,'archive');
 assert.equal(data.topics.length,8);
 assert.equal(data.topics[0].id,'448450');
 assert.equal(data.topics[0].publishedAt,'2025-06-05');
 assert.ok(data.topics.every(x=>x.archived===true&&x.updated===null));
 assert.deepEqual(urls,[BOARD,
  'https://antiqueradios.com/forums/feed.php?f=2',
  'https://antiqueradios.com/forums/feed.php?mode=topics&f=2']);
});
test('unexpected board body does not get misrepresented as live Radio Clubhouse',async()=>{
 mock(async target=>String(target)===BOARD?new Response(
  '<h1>Radio Classified</h1><a class="topictitle" href="./viewtopic.php?t=5002">Wrong board</a>'
 ):blocked());
 const data=await (await run()).json();
 assert.equal(data.archived,true);
 assert.ok(data.topics.every(x=>x.id!=='5002'));
});
test('no POST writes, wallet changes or archive backfills through public feed',async()=>{
 mock(async()=>{throw Error('Should not make upstream request')});
 const response=await worker.fetch(new Request(ENDPOINT,{method:'POST'}),{});
 assert.equal(response.status,405);
 assert.equal((await response.json()).error,'method_not_allowed');
});
