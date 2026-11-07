import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {scanGeneratorSources} from '../scripts/refresh-image-generator-sources.mjs';
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
