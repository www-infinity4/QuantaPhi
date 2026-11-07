import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Steve Miller and Classic Rock mount real, provider-owned artist players on click',()=>{
 for(const path of ['steve-miller-book-of-dreams.js','classic-rock-official-card.mjs']){
  const source=get(path);
  assert.ok(source.includes("iframe"),path);
  assert.ok(source.includes('www.youtube.com/embed/'),path);
  assert.ok(source.includes('quantaphi:artist-radio-start'),path);
  assert.ok(!source.includes('window.InfinityRadioQuick.toggle()'),path);
 }
});
test('the existing Infinity Radio is a distinct source and stops when an artist starts',()=>{
 const radio=get('quick-infinity-radio.js');
 assert.ok(radio.includes("window.InfinityRadioQuick = Object.freeze"));
 assert.ok(radio.includes("window.addEventListener('quantaphi:artist-radio-start'"));
 assert.ok(radio.includes("audio.pause()"));
});
