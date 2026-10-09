const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('a normal refresh labels the home story Reads & Realms, never Asteroid', () => {
  const code = load('infinite-book.js');
  const layout = code.split('function cardLayout()')[1].split('function note(message)')[0];
  assert.match(layout, /INFINITY READS & REALMS/);
  assert.match(layout, /Writing a fresh Reads & Realms story/);
  assert.doesNotMatch(layout, /Researching the next Asteroid story/);
  const home = code.split('function placeHomeStory()')[1].split('const E =')[0];
  assert.match(home, /root\.dataset\.context='home'/);
  assert.match(home, /Writing a fresh Reads & Realms story/);
  const show = code.split('function showHomeStory()')[1].split("window.addEventListener('quantaphi:new-search'")[0];
  assert.match(show, /placeHomeStory\(\)/);
  assert.match(show, /nextStory\('',\{requireFresh:true\}\)/);
});

test('Asteroid generation requires a genuine active search query', () => {
  const code = load('infinite-book.js');
  const next = code.split("async function nextStory(query = '', options = {})")[1]
    .split("window.addEventListener('quantaphi:search-start'")[0];
  assert.match(next, /searchMode=root\.dataset\.context==='search'/);
  assert.match(next, /if\(searchMode && !String\(query\|\|''\)\.trim\(\)\)/);
  assert.match(next, /storyKind=searchMode\?'asteroid':'reads-realms'/);
  assert.match(next, /discoverInBackground\(roll, acceptNew, storyKind\)/);
  const clicks = code.split("if (action === 'next')")[1].split("if(action==='research'")[0];
  assert.match(clicks, /root\.dataset\.context==='home'/);
  assert.match(clicks, /nextStory\(lastSearchQuery,\{rewardSpin:true/);
  assert.match(code, /quantaphi:search-start/);
});

test('only fresh GPT narratives become displayed, never old ready catalog fallbacks', () => {
  const code = load('infinite-book.js');
  const next = code.split("async function nextStory(query = '', options = {})")[1]
    .split("window.addEventListener('quantaphi:search-start'")[0];
  assert.match(next, /requireFresh=options\.requireFresh!==false/);
  assert.match(next, /const ready = requireFresh\?null:pickUnique/);
  assert.match(next, /eligibleNarrative/);
  assert.match(code, /strictGPT:true, storyKind/);
  assert.match(code, /PhiInfiniteBookResearchStatus/);
  assert.doesNotMatch(code, /The daily AI story-writing allowance has been reached/);
});

test('GPT writer differentiates a home opener from a search-triggered Asteroid', () => {
  const source = load('infinite-book-discovery.js');
  assert.match(source, /storyKind==='asteroid'\?'Asteroid':'Infinity Reads & Realms'/);
  assert.match(source, /This Asteroid is ONLY for the actual current QuantaPhi search/);
  assert.match(source, /home-page opening story, written fresh for a page visit/);
  assert.match(source, /storyKind==='reads-realms'\|\|storyKind==='asteroid'\?Promise\.resolve\(\[\]\):scoutQueries/);
  assert.match(source, /verified_context:\{storyKind,/);
  assert.doesNotMatch(source, /daily_quota_exceeded/);
  assert.match(source, /PhiInfiniteBookResearchStatus='ai-unavailable'/);
});
