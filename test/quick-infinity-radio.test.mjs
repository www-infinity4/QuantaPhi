import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const player=readFileSync(new URL('../quick-infinity-radio.js',import.meta.url),'utf8');

test('home loads a single lightweight radio mini-player and retains full station route',()=>{
  assert.equal((home.match(/<script src="\/quick-infinity-radio\.js/g)||[]).length,1);
  assert.match(player,/open\.href = '\/infinity-radio\/'/);
  assert.match(player,/anchor\.insertAdjacentElement\('afterend',bar\)/);
});

test('audio begins only on explicit Play; no autoplay and no speculative wallet credit',()=>{
  assert.match(player,/play\.addEventListener\('click'/);
  assert.match(player,/const request = audio\.play\(\)/);
  assert.doesNotMatch(player,/audio\.autoplay|autoplay\s*=\s*true/);
  assert.doesNotMatch(player,/(?:mint|credit|award)\s*\(/);
  assert.match(player,/audio\.preload = 'none'/);
});

test('player handles errors and continues playlist without background media preloading',()=>{
  assert.match(player,/audio\.addEventListener\('ended',advance\)/);
  assert.match(player,/audio\.addEventListener\('error'/);
  assert.match(player,/if \(\+\+failures > tracks\.length\)/);
  assert.match(player,/Playback unavailable/);
});
