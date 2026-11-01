import test from 'node:test';
import assert from 'node:assert/strict';
import {run} from '../scripts/site-health-watch.mjs';

test('rejects untrusted network targets before attempting a crawl',async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;throw new Error('must not fetch')};
 for(const url of ['http://127.0.0.1:1/','http://169.254.169.254/latest/meta-data/','https://example.com/','https://quantaphi.org.evil.example/','https://quantaphi.org@127.0.0.1/']){
  await assert.rejects(run([url],{fetchImpl,writeReport:false}),/approved https origin/i,url);
 }
 assert.equal(calls,0);
});

test('does not follow redirects to untrusted origins',async()=>{
 let calls=0;
 const report=await run(['https://quantaphi.org/'],{writeReport:false,fetchImpl:async(url,options)=>{
  calls++;assert.equal(options.redirect,'manual');
  return new Response(null,{status:302,headers:{Location:'http://127.0.0.1:9000/secret'}});
 }});
 assert.equal(calls,1);
 assert.equal(report.pages[0].status,302);
 assert.equal(report.pages[0].finalUrl,null);
 assert.match(report.pages[0].error,/Redirect not followed/);
});

test('bounds link crawling, deduplicates and refuses external HTML links',async()=>{
 const origin='https://quantaphi.org';
 const html=Array.from({length:60},(_,i)=>'<a href="/p'+i+'">p</a>').join('')+
  '<a href="http://127.0.0.1/private">private</a><a href="/p0">repeat</a>';
 let calls=0;
 const report=await run([origin+'/'],{writeReport:false,fetchImpl:async url=>{
  calls++;return new Response(url===origin+'/'?html:'ok',{status:200,headers:{'Content-Type':'text/html'}});
 }});
 assert.equal(report.links.length,40);
 assert.equal(new Set(report.links.map(x=>x.href)).size,40);
 assert.ok(report.links.every(x=>x.href.startsWith(origin+'/')));
 assert.equal(calls,41);
});

test('rejects oversized HTML without fetching its links',async()=>{
 let calls=0;
 const report=await run(['https://quantaphi.org/'],{writeReport:false,fetchImpl:async()=>{
  calls++;return new Response('<a href="/secret">x</a>'+'x'.repeat(1_000_100),{status:200,headers:{'Content-Type':'text/html'}});
 }});
 assert.equal(calls,1);
 assert.equal(report.links.length,0);
 assert.match(report.pages[0].error,/HTML size limit exceeded/);
});

test('rejects more than four entry pages',async()=>{
 await assert.rejects(run(Array(5).fill('https://quantaphi.org/'),{writeReport:false}),/1 to 4/);
});
