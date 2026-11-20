import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Steve Miller and Classic Rock use the original Infinity Radio control treatment without sharing its audio',()=>{
 const steve=source('steve-miller-book-of-dreams.js');
 const rock=source('classic-rock-official-card.mjs');
 for(const [label,code,selector] of [
  ['Steve Miller',steve,'smb-radio'],
  ['Classic Rock',rock,'cr-radio']
 ]){
  assert.ok(code.includes(selector+'{display:flex'),label+' radio bar present');
  assert.ok(code.includes('background:linear-gradient(115deg,#e8faf7,#fff)'),label+' uses Infinity Radio bar background');
  assert.ok(code.includes('width:48px;height:48px'),label+' has the 48px circular play control');
  assert.ok(!code.includes('window.InfinityRadioQuick.toggle()'),label+' cannot start Infinity catalog');
 }
});
test('Pink Floyd has its own clearly labeled radio button and a multi-recording official playlist',()=>{
 const rock=source('classic-rock-official-card.mjs');
 const catalog=source('classic-rock-official-catalog.mjs');
 assert.ok(rock.includes("band.name+' Radio'"),'artist station is named for the selected band');
 assert.ok(rock.includes('cr-radio-next'),'Next track control exists in artist card');
 assert.ok(rock.includes('&playlist='),'official YouTube playlist follows the selected recording');
 for(const id of ['K6qj09OHvjw','HrxX9TBj2zY','sZCkb0F51qw'])
  assert.ok(catalog.includes(id),'verified Pink Floyd official video '+id);
 assert.ok(rock.includes('quantaphi:artist-radio-start'),'artist focus pauses Infinity radio');
});

test('homepage and imported catalog change cache versions with the radio fixes',()=>{
 const page=source('index.html');
 const classic=source('classic-rock-official-card.mjs');
 assert.ok(page.includes('/steve-miller-book-of-dreams.js?v=20261106-artist-radio3'));
 assert.ok(page.includes('/classic-rock-official-card.mjs?v=20261106-artist-radio3'));
 assert.ok(classic.includes("./classic-rock-official-catalog.mjs?v=20261106-artist-radio3"));
});
