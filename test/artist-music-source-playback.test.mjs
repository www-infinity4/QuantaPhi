import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Steve Miller button mounts Book of Dreams YouTube playlist inside the original Quick Card',()=>{
 const s=get('steve-miller-book-of-dreams.js');
 assert.match(s,/www\\.youtube\\.com\\/embed\\/videoseries/);
 assert.match(s,/PL8a8cutYP7foGH0YDM8YtNqGtgL0EAJ7k/);
 assert.match(s,/createElement|make\\('iframe'/);
 assert.match(s,/smb-player-panel/);
 assert.doesNotMatch(s,/window\\.InfinityRadioQuick\\.toggle\\(\\)/);
});

test('Pink Floyd and other classic-rock buttons launch selected artist video in card',()=>{
 const s=get('classic-rock-official-card.mjs');
 assert.match(s,/www\\.youtube\\.com\\/embed\\//);
 assert.match(s,/band\\.videoId/);
 assert.match(s,/cr-player-panel/);
 assert.doesNotMatch(s,/window\\.InfinityRadioQuick\\.toggle\\(\\)/);
});

test('both embed players keep YouTube visible and stop when another artist starts',()=>{
 for(const path of ['steve-miller-book-of-dreams.js','classic-rock-official-card.mjs']){
  const s=get(path);
  assert.match(s,/min-height:210px/);
  assert.match(s,/quantaphi:artist-radio-start/);
  assert.match(s,/referrerPolicy/);
  assert.match(s,/removeAttribute\\('src'\\)/);
 }
});
