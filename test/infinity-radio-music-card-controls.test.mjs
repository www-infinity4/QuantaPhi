import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('existing Infinity Radio remains a separate working transport',()=>{
 const radio=source('quick-infinity-radio.js');
 assert.ok(radio.includes('window.InfinityRadioQuick = Object.freeze'));
 assert.ok(radio.includes('quantaphi:infinity-radio-state'));
 assert.ok(radio.includes('toggle: toggleRadio'));
 assert.ok(radio.includes('getState: getRadioState'));
});
test('artist Quick Cards play their selected YouTube sources and never the Infinity catalog',()=>{
 const steve=source('steve-miller-book-of-dreams.js');
 const rock=source('classic-rock-official-card.mjs');
 assert.ok(steve.includes('www.youtube.com/embed/'));
 assert.ok(rock.includes('www.youtube.com/embed/'));
 assert.ok(steve.includes('width:48px;height:48px'));
 assert.ok(rock.includes('width:48px;height:48px'));
 assert.ok(!steve.includes('window.InfinityRadioQuick.toggle()'));
 assert.ok(!rock.includes('window.InfinityRadioQuick.toggle()'));
});
test('site keeps all three music scripts in the page with refreshed asset versions',()=>{
 const home=source('index.html');
 assert.ok(home.includes('quick-infinity-radio.js?v=20261106-artist-audio-stop'));
 assert.ok(home.includes('steve-miller-book-of-dreams.js?v=20261106-artist-radio3'));
 assert.ok(home.includes('classic-rock-official-card.mjs?v=20261106-artist-radio3'));
});
