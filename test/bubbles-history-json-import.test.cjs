'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const site = fs.readFileSync('bubbles-ai.js','utf8');

test('ChatGPT and Google Takeout Gemini history share the same explicit import action', () => {
  assert.match(site, /Import ChatGPT or Gemini history/);
  assert.match(site, /Gemini Apps MyActivity\\.json/);
  assert.match(site, /thread\\?\\.mapping/);
  assert.match(site, /Array\\.isArray\\(parsed\\?\\.activities\\)/);
  assert.match(site, /Array\\.isArray\\(entry\\.messages\\)/);
  assert.match(site, /source==='gpt'\\?'ChatGPT':'Gemini'/);
  assert.match(site, /if\\(truncated\\)throw Error/);
  assert.match(site, /longMemory\\.appendAll/);
  assert.match(site, /if\\(!confirm\\(/);
});

test('robot ticket references stay internal, not read as long alphanumeric chat', () => {
  assert.doesNotMatch(site, /Job reference: '\\+ticket\\.id/);
  assert.doesNotMatch(site, /result\\.ticketId\\+'\\/'\\+result\\.jobId/);
  assert.match(site, /queued does not mean code was edited or deployed/);
});
