import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{chooseTool,parseHeadlines} from '../workers/bubbles-tools/worker.mjs';
test('spoken commands select actual tools, ordinary conversation remains chat',()=>{
 assert.equal(chooseTool('Check Google News and tell me the headlines'),'news.headlines');
 assert.equal(chooseTool('Create a GitHub repo called Rain'),'github.create_repository');
 assert.equal(chooseTool('Explain this design'),'oracle.chat');
});
test('headlines require dated current Google News links, deduplicate and reject invented destinations',()=>{
 const now=Date.parse('2026-10-12T02:00:00Z');
 const item=(title,date,url='https://news.google.com/rss/articles/abc')=>`<item><title>${title}</title><link>${url}</link><pubDate>${date}</pubDate><source>Source</source></item>`;
 const xml=item('Real &amp; current','Mon, 12 Oct 2026 01:00:00 GMT')+item('Real &amp; current','Mon, 12 Oct 2026 01:00:00 GMT')+item('Future','Mon, 12 Oct 2026 03:00:00 GMT')+item('Undated','')+item('Old','Mon, 01 Oct 2026 01:00:00 GMT')+item('Other','Mon, 12 Oct 2026 01:00:00 GMT','https://evil.example');
 assert.deepEqual(parseHeadlines(xml,now).map(s=>s.title),['Real & current']);
});
test('unconnected GitHub action is blocked and makes no network or queued-work claim',async()=>{
 const request=new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},body:JSON.stringify({request:'Create a repo named Rain'})});
 const result=await (await worker.fetch(request,{})).json();
 assert.equal(result.receipt.status,'blocked');assert.equal(result.receipt.minted,false);
 assert.match(result.output,/No repository was created or queued/);
});
test('foreign website origins cannot invoke assistant tools',async()=>{
 const r=await worker.fetch(new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}),{});
 assert.equal(r.status,403);
});
test('ordinary chat calls the existing service and carries a result receipt',async()=>{
 let used=false;
 const r=await worker.fetch(new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org'},body:JSON.stringify({request:'hello'})}),{ORACLE:{fetch:async request=>{used=true;assert.equal(request.headers.get('Origin'),'https://quantaphi.org');return Response.json({ok:true,output:'Hello'});}}});
 const body=await r.json();assert.equal(used,true);assert.equal(body.output,'Hello');assert.equal(body.receipt.tool,'oracle.chat');
});
test('Google failure uses explicitly labelled current source fallback, excluding undated news',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>String(url).includes('news.google.com')?new Response('',{status:503}):Response.json({articles:[
  {title:'Current verified headline',url:'https://publisher.example/story',publishedAt:new Date().toISOString(),domain:'publisher.example'},
  {title:'Missing date',url:'https://publisher.example/old'},
  {title:'Future',url:'https://publisher.example/future',publishedAt:new Date(Date.now()+3600000).toISOString()}
 ]});
 try {
  const r=await worker.fetch(new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org'},body:JSON.stringify({request:'Check Google News headlines'})}),{});
  const body=await r.json();assert.equal(body.receipt.status,'complete');assert.equal(body.sources.length,1);
  assert.match(body.output,/Google News is unavailable/);assert.match(body.output,/News Phi/);
  assert.equal(body.receipt.provider,'News Phi');
 } finally {globalThis.fetch=original;}
});
