import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {scanGeneratorSources,discoverGeneratorCandidates} from '../scripts/refresh-image-generator-sources.mjs';
const catalog=JSON.parse(await readFile(new URL('../data/image-generator-sources.json',import.meta.url),'utf8'));

test('only public GitHub metadata endpoints are read; approved records remain review-only',async()=>{
 const seen=[];
 const results=await scanGeneratorSources(catalog,async(url)=>{
  seen.push(url);
  const row=catalog.find(row=>url.endsWith('/'+row.sourceRepo));
  return {ok:true,json:async()=>({full_name:row.sourceRepo,license:{spdx_id:row.sourceLicense},archived:false,updated_at:'2026-11-07T12:00:00Z'})};
 });
 assert.equal(results.matches,6);
 assert.equal(results.reviewRequired,0);
 assert.equal(results.rows.length,6);
 assert.ok(seen.every(url=>/^https:\/\/api\.github\.com\/repos\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(url)));
 assert.ok(results.rows.every(x=>x.reviewStatus==='matches-approved-record'));
 assert.equal(results.kind,'image-generator-source-review');
});
test('license changes or outages require a human review and cannot publish fake cards',async()=>{
 const results=await scanGeneratorSources(catalog,async(url)=>{
  if(url.includes('/rough-stuff/'))throw Error('offline');
  return {ok:true,json:async()=>({full_name:url.split('/').slice(-2).join('/'),license:{spdx_id:'UNKNOWN'},archived:false})};
 });
 assert.equal(results.matches,0);
 assert.equal(results.reviewRequired,6);
 assert.ok(results.rows.some(x=>x.reviewStatus==='unverified'));
 assert.ok(results.rows.some(x=>x.reviewStatus==='review-required'));
});

test('automatic GitHub discovery queues licensed candidate projects without publishing',async()=>{
 const urls=[];
 const fake=async url=>{
  urls.push(url);
  return {ok:true,json:async()=>({items:[
   {full_name:'newmaker/artwork',html_url:'https://github.com/newmaker/artwork',license:{spdx_id:'MIT'},homepage:'https://creative.example.org',archived:false,fork:false,description:'Build original vector graphics'},
   {full_name:'dicebear/dicebear',html_url:'https://github.com/dicebear/dicebear',license:{spdx_id:'MIT'},homepage:'https://www.dicebear.com',archived:false,fork:false},
   {full_name:'scam/remote',html_url:'https://remote.fake.test/payload',license:{spdx_id:'MIT'},homepage:'https://remote.fake.test',archived:false,fork:false},
   {full_name:'newmaker/artwork',html_url:'https://github.com/newmaker/artwork',license:{spdx_id:'MIT'},homepage:'https://creative.example.org',archived:false,fork:false},
   {full_name:'future/hidden',html_url:'https://github.com/future/hidden',license:{spdx_id:'UNLICENSED'},homepage:'',archived:false,fork:false}
  ]})};
 };
 const result=await discoverGeneratorCandidates(catalog,fake);
 assert.equal(result.candidates.length,1);
 assert.equal(result.candidates[0].repository,'newmaker/artwork');
 assert.equal(result.candidates[0].status,'candidate-review-only');
 assert.ok(urls.length>=2);
 assert.ok(urls.every(u=>u.startsWith('https://api.github.com/search/repositories?')));
 assert.equal(result.published,0);
});
test('search outages fail closed instead of creating source records',async()=>{
 const result=await discoverGeneratorCandidates(catalog,async()=>{throw Error('rate limited')});
 assert.equal(result.candidates.length,0);
 assert.ok(result.errors.length>0);
});
