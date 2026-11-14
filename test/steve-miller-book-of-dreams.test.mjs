import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=()=>readFileSync(new URL('../steve-miller-book-of-dreams.js',import.meta.url),'utf8');
const html=()=>readFileSync(new URL('../index.html',import.meta.url),'utf8');
const deck=()=>readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');

test('Steve Miller retains the original Oracle Quick Card and Book of Dreams source',()=>{
 assert.ok(html().includes('id="steveMillerBookOfDreamsCard"'));
 assert.ok(deck().includes("['steveMillerBookOfDreamsCard','Steve Miller · Book of Dreams']"));
 assert.ok(src().includes('JHa1hiFYbFQ'));
});
test('play clicks mount the album playlist as a visible in-card YouTube player',()=>{
 const s=src();
 assert.ok(s.includes('smb-radio-play'));
 assert.ok(s.includes('width:48px;height:48px'));
 assert.ok(s.includes("make('iframe'"));
 assert.ok(s.includes('www.youtube.com/embed/'));
 assert.ok(s.includes('min-height:210px'));
 assert.ok(s.includes('referrerPolicy'));
 assert.ok(s.includes('quantaphi:artist-radio-start'));
 assert.ok(!s.includes('window.InfinityRadioQuick.toggle()'));
});
test('stopping removes the media source rather than pretending to pause the shared radio',()=>{
 assert.ok(src().includes("frame.removeAttribute('src')"));
 assert.ok(!src().includes('oracle:card-deactivated'));
});
