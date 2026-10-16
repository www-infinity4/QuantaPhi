import test from 'node:test';
import assert from 'node:assert/strict';
import {researchArticle,readWebsite,websiteUrl,rankStories} from '../workers/bubbles-tools/research.mjs';
import {isArticleResearchRequest,runArticleResearch} from '../bubbles-research.mjs';
test('article requests are actions while source repairs stay engineering orders',()=>{
 assert.equal(isArticleResearchRequest('research the story I am looking at and use Infinity Phi to create a website token'),true);
 assert.equal(isArticleResearchRequest('find related stories about this idea'),true);
 assert.equal(isArticleResearchRequest('fix the article research adapter'),false);
});
test('website reader restricts origins and validates every redirect',async()=>{
 for(const url of ['',undefined,'https://127.0.0.1/','https://quantaphi.org.evil.test/','http://quantaphi.org/','https://quantaphi.org/owner/key','https://quantaphi.org/story/?token=private'])assert.equal(websiteUrl(url),null);
 await assert.rejects(()=>readWebsite('https://quantaphi.org/story/',async()=>new Response('',{status:302,headers:{location:'https://internal.test/'}})),/redirect_not_allowed/);
});
test('ranking removes irrelevant and duplicate stories and records relevance',()=>{
 const rows=rankStories('RadioShack history',[{title:'RadioShack history',url:'https://example.org/a',excerpt:'stores'},{title:'RadioShack history',url:'https://example.org/a',excerpt:'duplicate'},{title:'football',url:'https://example.org/b',excerpt:'sports'}]);
 assert.equal(rows.length,1);assert.match(rows[0].selectionReason,/radioshack/);
});
test('research reads actual pages and related listings, never fabricates token/build receipts',async()=>{
 const calls=[];const request=async url=>{calls.push(url);if(url.startsWith('https://news.google.com/'))return new Response('<rss><item><title>RadioShack history archive</title><link>https://news.google.com/articles/abc</link><pubDate>Thu, 15 Oct 2026 00:00:00 GMT</pubDate><description>RadioShack stores and history</description><source>Archive</source></item></rss>');return new Response('<title>RadioShack history</title><main><p>RadioShack store history</p><a href="/learn/radioshack/">RadioShack history archive</a></main>',{headers:{'content-type':'text/html'}});};
 const r=await researchArticle({request:'research the RadioShack history article',article:{title:'An unrelated page title',url:'https://quantaphi.org/story/',text:'RadioShack store history'}},{},{request});
 assert.equal(r.query,'RadioShack history');
 assert.equal(r.ok,true);assert.ok(calls.some(x=>x.includes('/learn/radioshack/')));assert.ok(r.sources.length>=2);assert.equal(r.receipt.tokenCreated,false);assert.equal(r.receipt.websiteBuilt,false);assert.equal(r.receipt.walletCreditVerified,false);
});
test('Infinity handoff requires the exact iframe, origin and packet ID',async()=>{
 const values=new Map(),listeners=new Map(),sent=[],frameWindow={};let frame;
 const view={location:{origin:'https://quantaphi.org'},addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
 const packet={ok:true,id:'1ed9d126-f0eb-4fc6-ab00-a4d4585ac65f',query:'RadioShack history',sources:[{title:'Archive',url:'https://example.org/',excerpt:'RadioShack'}]};
 const doc={createElement:tag=>tag==='iframe'?(frame={style:{},contentWindow:frameWindow}):{append(){}},getElementById:()=>null,querySelector:()=>({append(){queueMicrotask(()=>{
  const receive=listeners.get('message'),data={type:'infinity:bubbles-research-result',id:packet.id,tokenId:'phi-real',websiteStatus:'requested'};
  receive({origin:'https://evil.test',source:frameWindow,data:{...data,tokenId:'fake'}});
  receive({origin:view.location.origin,source:{},data:{...data,tokenId:'fake'}});
  receive({origin:view.location.origin,source:frameWindow,data});
 });}})};
 const result=await runArticleResearch({request:'research this story',article:{text:'private observation'},view,document:doc,storage:{setItem:(k,v)=>values.set(k,v)},fetcher:async(url,init)=>{sent.push({url,body:JSON.parse(init.body)});return Response.json(packet);}});
 assert.equal(result.receipt.tokenId,'phi-real');assert.equal(values.size,1);assert.equal(new URL(frame.src).searchParams.size,1);assert.ok(!frame.src.includes('observation'));assert.equal(listeners.size,0);assert.equal(sent.length,1);
});
