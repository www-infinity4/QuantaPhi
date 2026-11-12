import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeOriginalDraft,loadDrafts,storeDrafts} from '../my-originals-core.mjs';
import {buildCreatorBrief} from '../creator-gpt-handoff-core.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const original={id:'bbbcdef0-1122-4b52-aabb-765432100008',title:'My painted art',
 kind:'image',description:'Original landscape',website:'https://art.example.org/picture',
 image:'https://art.example.org/picture.webp'};
test('My Originals saves safe device-local metadata, preserving real source URLs',()=>{
 const saved=normalizeOriginalDraft(original);
 assert.equal(saved.title,original.title);
 assert.equal(saved.image,original.image);
 let value=null;const fake={setItem:(k,x)=>{assert.equal(k,'quanta:my-originals-local:v1');value=x},
  getItem:k=>{assert.equal(k,'quanta:my-originals-local:v1');return value}};
 assert.equal(storeDrafts(fake,[saved]).length,1);
 assert.deepEqual(loadDrafts(fake),[saved]);
});
test('My Originals rejects non-public local URLs and credentials and duplicate local IDs',()=>{
 for(const website of ['http://example.com','https://localhost/','https://user:pass@example.com','javascript:alert(1)']){
  assert.throws(()=>normalizeOriginalDraft({...original,website}),undefined,website);
 }
 assert.throws(()=>storeDrafts({setItem(){}},[original,original]),/unique local ID/);
});
test('My Originals local display never writes wallet or executes external HTML',()=>{
 const ui=source('my-originals.mjs'),page=source('my-originals.html');
 assert.match(page,/My Originals/);
 assert.match(page,/device-local|device drafts|device-only/i);
 assert.match(ui,/loadDrafts\(/);
 assert.match(ui,/storeDrafts\(/);
 assert.match(ui,/textContent/);
 assert.doesNotMatch(ui,/(?:innerHTML|eval\(|new Function\(|wallet\.(?:spend|credit|debit))/);
 assert.match(source('index.html'),/href="\/my-originals\.html"/);
});
test('GPT handoff includes on-demand QuantaPhi public context, not wallet session data',()=>{
 const context=JSON.parse(source('creator-public-context.json'));
 const prompt=buildCreatorBrief({idea:'Make a jewelry card',publicContext:context});
 assert.match(prompt,/https:\/\/quantaphi\.org\/creator-public-context\.json/);
 assert.match(prompt,/creator_workflow/);
 assert.match(prompt,/source-level snapshot/i);
 const ui=source('creator-gpt-handoff.mjs');
 assert.match(ui,/fetch\('\/creator-public-context\.json'/);
 assert.doesNotMatch(ui,/Authorization.*Bearer|credentials:\s*'include'/);
});
