import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=()=>readFileSync(new URL('../steve-miller-book-of-dreams.js',import.meta.url),'utf8');
const html=()=>readFileSync(new URL('../index.html',import.meta.url),'utf8');
const deck=()=>readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');

test('Book of Dreams has its own adjacent original Oracle Quick Card',()=>{
 assert.match(html(),/id="infinityAdultContentCard"[\s\S]*?id="steveMillerBookOfDreamsCard"[\s\S]*?id="bruceBannerWeedmapsCard"/);
 assert.match(html(),/steve-miller-book-of-dreams\.js/);
 assert.match(deck(),/\['steveMillerBookOfDreamsCard','Steve Miller · Book of Dreams'\]/);
 assert.match(deck(),/steveMillerBookOfDreamsCard:\['steve-miller-book-of-dreams','Music'/);
});

test('the user-facing player uses a full YouTube album playlist, with direct fallback',()=>{
 const script=source();
 assert.match(script,/PL8a8cutYP7foGH0YDM8YtNqGtgL0EAJ7k/);
 assert.match(script,/D6KCZXzLdVM/);
 assert.match(script,/https:\/\/www\.youtube\.com\/playlist\?list=/);
 assert.match(script,/www\.youtube\.com\/iframe_api/);
 assert.match(script,/new yt\.Player/);
 assert.doesNotMatch(script,/\.mp3|audio\.src|youtube-dl/);
});

test('round button has Infinity Radio play and pause appearance and truthful state',()=>{
 const script=source();
 assert.match(script,/width:48px;height:48px/);
 assert.match(script,/button\.textContent = playing \? 'Ⅱ' : '▶'/);
 assert.match(script,/aria-pressed/);
 assert.match(script,/player\.pauseVideo\(\)/);
 assert.match(script,/player\.playVideo\(\)/);
});

test('autoplay attempts occur only when active; switching away stops playback',()=>{
 const script=source();
 assert.match(script,/oracle:activate/);
 assert.match(script,/oracle:card-deactivated/);
 assert.match(script,/function isActive\(\)/);
 assert.match(script,/document\.hidden/);
 assert.match(script,/Autoplay blocked/);
 assert.doesNotMatch(script,/MusicQuant|StarCoin|wallet\.debit/);
});
