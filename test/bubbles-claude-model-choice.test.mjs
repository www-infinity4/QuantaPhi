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
