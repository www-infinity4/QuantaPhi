import test from 'node:test';
import assert from 'node:assert/strict';
import {collectDeveloperSources} from '../scripts/build-developer-source-catalog.mjs';

const make=(id)=>({
 id,full_name:'org/repo-'+id,name:'repo-'+id,
 html_url:'https://github.com/org/repo-'+id,
 description:'Accessible open-source interface example',
 fork:false,archived:false,disabled:false,
 owner:{avatar_url:'https://avatars.githubusercontent.com/u/42?v=4'},
 license:{spdx_id:'MIT'},stargazers_count:77
});
const topics=[
 {id:'profiles',label:'Profiles & identity',query:'profile in:name,description'},
 {id:'carousels',label:'Carousels & sliders',query:'carousel in:name,description'}
];
test('candidate ingestion only accepts actual API metadata and deduplicates across topics',async()=>{
 let calls=0,pauses=0;
 const snapshot=await collectDeveloperSources({
  topics,at:new Date('2026-11-07T12:00:00Z'),
  pause:async()=>{pauses++},
  fetchImpl:async(url)=>{
   calls++;const u=new URL(url);
   assert.equal(u.origin,'https://api.github.com');
   assert.equal(u.searchParams.get('per_page'),'100');
   return {ok:true,status:200,json:async()=>({
    total_count:6500,incomplete_results:false,
    items:[make(123),make(calls===1?124:125),make(123),
     {...make(900),html_url:'https://untrusted.example/malware'}]
   })};
  }
 });
 assert.equal(calls,2);
 assert.equal(pauses,2);
 assert.equal(snapshot.records,3);
 assert.equal(snapshot.items.length,3);
 assert.equal(snapshot.source,'GitHub REST API /search/repositories');
 assert.equal(snapshot.status,'review-required');
 assert.deepEqual(snapshot.errors,[]);
 assert.equal(snapshot.generated_at,'2026-11-07T12:00:00.000Z');
});
test('rate limit stops source import and never manufactures a success count',async()=>{
 let calls=0;
 const snapshot=await collectDeveloperSources({
  topics,fetchImpl:async()=>{calls++;return {ok:false,status:429};}
 });
 assert.equal(calls,1);
 assert.equal(snapshot.records,0);
 assert.equal(snapshot.fetched_topics,0);
 assert.equal(snapshot.errors[0].status,429);
});
