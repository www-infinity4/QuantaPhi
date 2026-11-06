import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Steve Miller and Classic Rock do not mount redundant players',()=>{
 const steve=get('steve-miller-book-of-dreams.js');
 const rock=get('classic-rock-official-card.mjs');
 const radio=get('quick-infinity-radio.js');
 assert.match(steve,/InfinityRadioQuick/);
 assert.match(rock,/InfinityRadioQuick/);
 assert.match(radio,/document\.createElement\('audio'\)/);
 assert.doesNotMatch(steve,/new yt\.Player|createElement\('audio'\)/);
 assert.doesNotMatch(rock,/new yt\.Player|createElement\('audio'\)/);
});
test('radio stays active on Oracle card navigation, and artist selections remain truthful',()=>{
 for(const file of ['steve-miller-book-of-dreams.js','classic-rock-official-card.mjs']){
  assert.doesNotMatch(get(file),/oracle:card-deactivated/);
  assert.match(get(file),/Infinity Radio/);
 }
 assert.match(get('classic-rock-official-card.mjs'),/not recordings by the selected band/);
 assert.match(get('steve-miller-book-of-dreams.js'),/this Steve Miller album is not in that catalog/);
});
