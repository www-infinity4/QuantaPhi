import test from 'node:test';
import assert from 'node:assert/strict';
import {routeClaudeTurn} from '../bubbles-claude-routing.mjs';

test('Bubbles stays the default and never silently switches to Claude', () => {
  assert.equal(routeClaudeTurn('bubbles', 'Fix Bubbles'), null);
  assert.equal(routeClaudeTurn('', 'Claude, fix Bubbles'), null);
});

test('selecting Claude sends a normal message to Claude chat', () => {
  assert.deepEqual(routeClaudeTurn('claude', 'Tell me what Bubbles is doing'), {
    mode: 'chat', prompt: 'Tell me what Bubbles is doing'
  });
});

test('selected Claude recognizes explicit fix Bubbles and fix yourself requests', () => {
  for (const phrase of ['fix Bubbles', 'please fix Bubbles!', 'Fix yourself.', 'Claude, fix bubbles']) {
    const result=routeClaudeTurn('claude',phrase);
    assert.equal(result.mode,'fix');
    assert.match(result.prompt,/Fix yourself\. Find what Bubbles is getting wrong/);
  }
  assert.equal(routeClaudeTurn('claude','Explain how to fix bubbles').mode,'chat');
});

test('Claude model choice refuses attachments instead of silently dropping them', () => {
  assert.deepEqual(routeClaudeTurn('claude','Fix Bubbles',true),{
    mode:'unsupported_image',prompt:null
  });
});

test('empty text cannot start a Claude repair or model call', () => {
  assert.deepEqual(routeClaudeTurn('claude','   '),{mode:'empty',prompt:null});
});


test('the Claude model is available from each first-party Bubbles entrypoint',async()=>{
 const fs=await import('node:fs');
 for(const path of ['bubbles.html','bubbles-chrome.html','bubbles/index.html','index.html']){
  const html=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.match(html,/\/claude-card\.js\?v=20261108-steward/,'Missing Claude Steward script: '+path);
  assert.match(html,/\/bubbles-ai\.js\?v=20261108-claude-model1/,'Missing selectable model: '+path);
 }
});

test('selected Claude responses remain in the main Bubbles conversation',async()=>{
 const fs=await import('node:fs');
 const ui=fs.readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const steward=fs.readFileSync(new URL('../claude-card.js',import.meta.url),'utf8');
 assert.match(ui,/inline:true/);
 assert.match(steward,/if\(!inline\)open\(\)/);
 assert.match(ui,/result\?\.tickets\?\.length/);
});


test('failed Claude delivery preserves the typed draft and cannot claim a reply',async()=>{
 const fs=await import('node:fs');
 const ui=fs.readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.match(ui,/const confirmed=await askClaudeSteward\(decision\.prompt,decision\.mode\);\s*if\(confirmed\)clearSentComposer\(\)/);
 assert.doesNotMatch(ui,/clearSentComposer\(\);\s*await askClaudeSteward/);
 assert.match(ui,/confirmed=result\?\.ok===true&&typeof result\.reply==='string'/);
 assert.match(ui,/status\.textContent=confirmed\?'Claude steward replied\.'/);
 assert.match(ui,/return confirmed;\s*\}\s*window\.addEventListener\('bubbles:ai-consult'/);
 assert.match(ui,/Your draft is preserved; check existing Brain tickets before retrying/);
});
