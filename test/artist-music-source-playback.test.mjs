import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Steve Miller button mounts Book of Dreams YouTube playlist inside the original Quick Card',()=>{
 const s=get('steve-miller-book-of-dreams.js');
 assert.ok(s.includes('www.youtube.com/embed/'));
 assert.ok(s.includes('JHa1hiFYbFQ'));
 assert.ok(s.includes("make('iframe'"));
 assert.ok(s.includes('smb-player-panel'));
 assert.ok(!s.includes('window.InfinityRadioQuick.toggle()'));
});

test('Pink Floyd and other classic-rock buttons launch selected artist video in card',()=>{
 const s=get('classic-rock-official-card.mjs');
 assert.ok(s.includes('www.youtube.com/embed/'));
 assert.ok(s.includes('track.videoId'), 'selected artist plays the current verified track video ID');
 assert.ok(s.includes('cr-player-panel'));
 assert.ok(!s.includes('window.InfinityRadioQuick.toggle()'));
});

test('both embed players keep YouTube visible and stop when another artist starts',()=>{
 for(const path of ['steve-miller-book-of-dreams.js','classic-rock-official-card.mjs']){
  const s=get(path);
  assert.ok(s.includes('min-height:210px'),path);
  assert.ok(s.includes('quantaphi:artist-radio-start'),path);
  assert.ok(s.includes('referrerPolicy'),path);
  assert.ok(s.includes("removeAttribute('src')"),path);
 }
});
