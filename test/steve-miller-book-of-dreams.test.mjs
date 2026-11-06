import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=()=>readFileSync(new URL('../steve-miller-book-of-dreams.js',import.meta.url),'utf8');
const html=()=>readFileSync(new URL('../index.html',import.meta.url),'utf8');
const deck=()=>readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');

test('Steve Miller retains original Oracle Quick Card and preserves album source',()=>{
 assert.match(html(),/id="steveMillerBookOfDreamsCard"/);
 assert.match(deck(),/\['steveMillerBookOfDreamsCard','Steve Miller · Book of Dreams'\]/);
 assert.match(src(),/Book of Dreams/);
 assert.match(src(),/PL8a8cutYP7foGH0YDM8YtNqGtgL0EAJ7k/);
});
test('real 48px Infinity Radio button replaces dummy YouTube panel',()=>{
 const s=src();
 assert.match(s,/smb-radio-play/);
 assert.match(s,/width:48px;height:48px/);
 assert.match(s,/window\.InfinityRadioQuick\.toggle\(\)/);
 assert.match(s,/quantaphi:infinity-radio-state/);
 assert.match(s,/aria-pressed/);
 assert.doesNotMatch(s,/new yt\.Player|iframe_api|smb-player-frame|smbAlbumYoutubeMount/);
});
test('switching cards cannot stop the shared radio',()=>{
 assert.doesNotMatch(src(),/oracle:card-deactivated|visibilitychange|radio\.pause\(/);
});
