import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEVELOPMENT_TOPICS,validateIndexedResource} from '../developer-discovery-core.mjs';

const snapshot=JSON.parse(readFileSync(new URL('../data/developer-source-catalog.json',import.meta.url),'utf8'));
test('imported catalog contains genuine review-queue metadata, no executable code',()=>{
 assert.equal(snapshot.schema_version,1);
 assert.equal(snapshot.source,'GitHub REST API /search/repositories');
 assert.equal(snapshot.status,'review-required');
 assert.ok(snapshot.fetched_topics>=18);
 assert.ok(Array.isArray(snapshot.items));
 assert.equal(snapshot.records,snapshot.items.length);
 assert.ok(snapshot.items.length>=1000 && snapshot.items.length<=5000);
 assert.ok(snapshot.items.every(x=>typeof x==='object' && x!==null));
});
test('every imported developer resource has validated GitHub source and official icon only',()=>{
 const unique=new Set;
 const validTopics=new Set(DEVELOPMENT_TOPICS.map(x=>x.id));
 const errors=[];
 for(const [i,x] of snapshot.items.entries()){
  if(!validTopics.has(x.category)||!validateIndexedResource(x)||unique.has(x.id)){
   errors.push({i,id:x.id,repo:x.repo,category:x.category});
  }
  unique.add(x.id);
 }
 assert.deepEqual(errors.slice(0,20),[],'Invalid or duplicate sources: '+errors.length);
 assert.equal(unique.size,snapshot.items.length);
});
test('no obviously explicit, executable or credential-bearing catalog descriptions',()=>{
 const errors=[];
 const unsafe=/(?:\b(?:porn|pornography|nudes?|hentai|dick\s*pics?|explicit\s*sex|erotic|xxx|nsfw)\b|<\s*\/?\s*(?:script|iframe|object|svg)\b|javascript\s*:|\bonerror\s*=|\b\d{3}[- ]\d{2}[- ]\d{4}\b|\b(?:password|token|secret)\s*[:=]\s*\S{8,})/i;
 for(const [i,x] of snapshot.items.entries()){
  const displayed=String(x.label||'')+' '+String(x.description||'');
  if(unsafe.test(displayed))errors.push({i,id:x.id,repo:x.repo,label:x.label,description:x.description});
 }
 assert.deepEqual(errors.slice(0,15),[],'Potentially unsafe candidate records: '+errors.length);
});
