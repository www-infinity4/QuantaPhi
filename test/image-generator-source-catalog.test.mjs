import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeGeneratorSources,generateImageSvg,nextGeneratorIndex,parseGitHubSource} from '../image-generator-source-core.mjs';

const catalog=JSON.parse(await readFile(new URL('../data/image-generator-sources.json',import.meta.url),'utf8'));

test('six reviewed original in-card image generators have deduplicated source provenance',()=>{
 const cards=normalizeGeneratorSources(catalog);
 assert.equal(cards.length,6);
 assert.deepEqual(cards.map(c=>c.mode),['gradient','pattern','sketch','poster','avatar','mandala']);
 assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);
 for(const card of cards){
  assert.match(card.sourceUrl,/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/);
  assert.match(card.websiteUrl,/^https:\/\//);
  assert.equal(card.implementation,'original-local-svg');
  assert.equal(card.sourceUsage,'reference-only');
  assert.match(card.sourceLicense,/^(MIT|LGPL-2\.1)$/);
  assert.ok(card.examplePrompt.length>5);
 }
});

test('unreviewed remote endpoints cannot become public generator cards',()=>{
 const modified=[{...catalog[0],id:'image-evil-external',sourceUrl:'https://github.com.evil.net/fake/repo'}];
 assert.throws(()=>normalizeGeneratorSources(modified),/source|github/i);
 assert.throws(()=>normalizeGeneratorSources([{...catalog[0],id:'image-remote-server',implementation:'external-api'}]),/implementation/);
 assert.throws(()=>normalizeGeneratorSources([{...catalog[0],id:'image-dupe'} , {...catalog[0],id:'image-dupe'}]),/duplicate/i);
 assert.equal(parseGitHubSource('https://github.com/rough-stuff/rough'),'rough-stuff/rough');
 assert.throws(()=>parseGitHubSource('http://github.com/rough-stuff/rough'),/source|github/i);
});

test('every card prints a real deterministic original SVG without markup injection',()=>{
 for(const card of normalizeGeneratorSources(catalog)){
  const a=generateImageSvg({mode:card.mode,prompt:'Mars & the Moon <script>alert("x")</script>',variation:0});
  const b=generateImageSvg({mode:card.mode,prompt:'Mars & the Moon <script>alert("x")</script>',variation:0});
  const changed=generateImageSvg({mode:card.mode,prompt:'Winter lighthouse',variation:1});
  assert.equal(a,b);
  assert.notEqual(a,changed);
  assert.match(a,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(a,/<\/svg>$/);
  assert.match(a,/viewBox="0 0 960 640"/);
  assert.doesNotMatch(a,/<script/i);
  assert.doesNotMatch(a,/onerror\s*=/i);
  assert.ok(a.length>800,card.mode+' generated nonempty artwork');
 }
});

test('large and empty user text is bounded; unsupported modes fail closed',()=>{
 const a=generateImageSvg({mode:'poster',prompt:'<svg onload=bad()>'.repeat(10000),variation:0});
 assert.ok(a.length<30000);
 assert.doesNotMatch(a,/<svg onload/i);
 assert.throws(()=>generateImageSvg({mode:'ai-remote',prompt:'bird'}),/unsupported/i);
});

test('carousel wraps one distinct reviewed Quick Card at a time',()=>{
 assert.equal(nextGeneratorIndex(0,-1,6),5);
 assert.equal(nextGeneratorIndex(5,1,6),0);
 assert.equal(nextGeneratorIndex(2,1,6),3);
 assert.equal(nextGeneratorIndex(0,1,0),0);
});
