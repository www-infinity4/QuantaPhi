import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSpecialists, filterSpecialists, makeStarterPrompt, safeDraft, prepareExistingBubblesComposer } from '../bubbles-ai-specialists.mjs';

const skillCatalog=JSON.parse(readFileSync(new URL('../bubbles-skill-catalog.json',import.meta.url),'utf8'));
const providerSources=JSON.parse(readFileSync(new URL('../bubbles-ai-plugin-sources.json',import.meta.url),'utf8'));
const specialists=buildSpecialists(skillCatalog,providerSources);

test('Bubbles AI directory presents more than 100 distinct, source-grounded AI buttons',()=>{
 assert.ok(specialists.length>=100,'expected 100+ distinct specialists');
 assert.equal(specialists.length,skillCatalog.localCapabilities.length+skillCatalog.referenceSkills.length+providerSources.sources.length);
 assert.equal(new Set(specialists.map(x=>x.id)).size,specialists.length);
 assert.equal(new Set(specialists.map(x=>x.name)).size,specialists.length);
 assert.ok(specialists.every(x=>x.name.endsWith(' AI') && x.name.length<=90));
 assert.ok(specialists.every(x=>x.description && x.sourceName && x.status && x.category));
});

test('private ChatGPT plugin runtime is never represented as a working Bubbles integration',()=>{
 assert.ok(specialists.filter(x=>x.sourceType==='chatgpt_skill').every(x=>x.status==='reference_only'));
 assert.ok(specialists.filter(x=>x.sourceType==='plugin_source').every(x=>x.status==='source_only'));
 assert.ok(specialists.some(x=>x.sourceType==='bubbles' && x.status==='implemented_conditional'));
 assert.ok(providerSources.sources.every(x=>!('token' in x)&&!('ownerPluginId' in x)&&!('credentials' in x)));
});

test('search and readiness filters find relevant specialists without false matches',()=>{
 assert.ok(filterSpecialists(specialists,{search:'security'}).length>0);
 assert.ok(filterSpecialists(specialists,{search:'cloudflare'}).length>0);
 assert.ok(filterSpecialists(specialists,{sourceType:'plugin_source'}).length===providerSources.sources.length);
 assert.ok(filterSpecialists(specialists,{status:'reference_only'}).every(x=>x.sourceType==='chatgpt_skill'));
 assert.equal(filterSpecialists(specialists,{search:'invalid-not-in-catalog'}).length,0);
});

test('starter prompts require independent authorization and never silently send',()=>{
 const agent=specialists.find(x=>x.sourceType==='plugin_source');
 const prompt=makeStarterPrompt(agent);
 assert.match(prompt,/verify|check|confirm/i);
 assert.match(prompt,/permission|access|authorization/i);
 assert.ok(prompt.length<=2400);
 assert.deepEqual(safeDraft('Existing unsent message',prompt),{ok:false,reason:'draft_exists'});
 assert.equal(safeDraft('',prompt).ok,true);
 assert.ok(!safeDraft('', ' '.repeat(10)).ok);
});

test('Bubbles page mounts specialist buttons beside the existing single composer',()=>{
 const html=readFileSync(new URL('../bubbles.html',import.meta.url),'utf8');
 assert.match(html,/id="bubblesAISpecialistHub"/);
 assert.match(html,/bubbles-ai-specialists\.mjs/);
 assert.match(html,/bubbles-ai-specialists\.css/);
 assert.match(html,/id="bubblesAICard"/);
 assert.match(html,/aria-label="AI adviser quick cards"/);
});

test('AI button prepares the existing composer but never overwrites or auto-submits a draft',()=>{
 const originalDocument=globalThis.document;
 const input={value:'Already writing a request',focusCount:0,inputEvents:0,
  closest(){return {hidden:false};},
  focus(){this.focusCount++;},
  scrollIntoView(){},
  dispatchEvent(event){assert.equal(event.type,'input');this.inputEvents++;}
 };
 globalThis.document={querySelector(selector){return selector.includes('#bubblesAICard')?input:null;}};
 try{
  const agent=specialists.find(x=>x.sourceType==='plugin_source');
  assert.deepEqual(prepareExistingBubblesComposer(agent),{ok:false,reason:'draft_exists'});
  assert.equal(input.value,'Already writing a request');
  assert.equal(input.inputEvents,0);
  input.value='';
  assert.deepEqual(prepareExistingBubblesComposer(agent),{ok:true});
  assert.match(input.value,/specialist profile in Bubbles/i);
  assert.match(input.value,/verify the Bubbles adapter/i);
  assert.equal(input.inputEvents,1);
  assert.equal(input.focusCount,1);
 }finally{
  if(originalDocument===undefined)delete globalThis.document;
  else globalThis.document=originalDocument;
 }
});
