import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleTinyFishCardRequest,normalizeTinyFishSearch} from '../workers/continuity-session-coordinator/tinyfish-card-route.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('shared TinyFish source reader is attached to universal Quick Card actions',()=>{
 const actions=read('quanta-card-actions.mjs'),experience=read('quanta-card-experience.mjs'),reader=read('tinyfish-card-reader.mjs');
 assert.match(actions,/mountTinyFishCardReader\(bar,card\)/);
 assert.doesNotMatch(actions,/providerSearchUrl\(provider,value\)/);
 assert.doesNotMatch(experience,/window\.open\('https:\/\/www\.google\.com\/search\?q='\+encodeURIComponent\(card\.name/);
 assert.match(reader,/No provider account or conversation was accessed/);
 assert.match(reader,/continuity-session-coordinator/);
});
test('untrusted search results remain restricted to the exact original provider hostname',()=>{
 const r=normalizeTinyFishSearch({results:[
  {url:'https://www.starmakerstudios.com/en/song/real',title:'Real'},
  {url:'https://evil.example.com/steal',title:'Fake'},
  {url:'https://starmakerstudios.com.attacker.test/',title:'Impersonator'},
  {url:'javascript:alert(1)',title:'JS'},
  {url:'https://www.starmakerstudios.com/en/song/real',title:'Duplicate'}
 ]},'starmakerstudios.com');
 assert.equal(r.length,1);
 assert.equal(r[0].title,'Real');
});
const request=(body,origin='https://quantaphi.org')=>new Request('https://coordinator.example/v1/cards/discover',{method:'POST',headers:{'Origin':origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify(body)});
test('relay rejects foreign callers without reaching TinyFish',async()=>{
 let calls=0;
 const r=await handleTinyFishCardRequest(request({hostname:'chatgpt.com',query:'hello'},'https://attacker.example'),{TINYFISH_API_KEY:'secret'}, {fetcher:async()=>{calls++;throw Error('never')}});
 assert.equal(r.status,403);assert.equal(calls,0);
});
test('relay rejects private/invalid hosts without sending the key',async()=>{
 for(const host of ['localhost','127.0.0.1','internal','example.internal','a.com:443']){
  const r=await handleTinyFishCardRequest(request({hostname:host,query:'hello'}),{TINYFISH_API_KEY:'secret'});
  assert.equal(r.status,400,host);
 }
});
test('quota failure is closed and does not reach the external API',async()=>{
 let calls=0;const r=await handleTinyFishCardRequest(request({hostname:'starmakerstudios.com',query:'songs'}),{TINYFISH_API_KEY:'secret'}, {fetcher:()=>{calls++;throw Error('never')}});
 assert.equal(r.status,503);assert.equal(calls,0);
});
test('only exact provider matches leave the bounded relay',async()=>{
 const db={prepare(sql){return{bind(){return{run:async()=>({success:true,meta:{changes:1}})}},run:async()=>({success:true,meta:{changes:1}})}}}};
 let url='',headers;
 const r=await handleTinyFishCardRequest(request({hostname:'starmakerstudios.com',query:'duets'}),{WORK_DB:db,TINYFISH_API_KEY:'secret',TINYFISH_BRIDGE_TOKEN:'salt'}, {fetcher:async(u,opts)=>{
  url=u;headers=opts.headers;
  return Response.json({results:[{url:'https://www.starmakerstudios.com/en/songs',title:'Songs'},
   {url:'https://fake.example.com',title:'Fake'}]});
 }});
 assert.equal(r.status,200);
 const result=await r.json();assert.equal(result.results.length,1);
 assert.equal(result.results[0].title,'Songs');
 assert.ok(url.includes('site%3Astarmakerstudios.com'));
 assert.equal(headers['X-API-Key'],'secret');
 assert.ok(!JSON.stringify(result).includes('secret'));
});
