import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REQUESTED_PUBLIC_CARDS} from '../verified-brand-sports-catalog.mjs';
import {isPastDatedGame} from '../verified-brand-sports-cards.mjs';

const find=id=>REQUESTED_PUBLIC_CARDS.find(card=>card.id===id);
const local=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('dated game cards switch to archive after the fixture, not before',()=>{
 const game=find('packers-lions-2026');
 assert.ok(game);
 assert.equal(isPastDatedGame(game,Date.parse('2026-10-25T15:00:00Z')),false);
 assert.equal(isPastDatedGame(game,Date.parse('2026-10-30T12:00:00Z')),true);
 assert.equal(isPastDatedGame(find('fox-nfl-watch'),Date.parse('2026-10-30T12:00:00Z')),false);
 assert.equal(isPastDatedGame(null),false);
});
test('fresh schedule links avoid asserting old fixture is still next',()=>{
 assert.match(find('packers-next-schedule').description,/official schedule/i);
 assert.doesNotMatch(find('packers-next-schedule').description,/Thursday, Oct 29/);
 assert.match(find('lions-next-schedule').description,/official schedule/i);
});
test('GMC and Burger King hero show documented original-source product imagery',()=>{
 assert.match(find('gmc-denali-2026').visual,/^https:\/\/www\.gmc\.com\/content\/dam\/gmc\//);
 assert.match(find('burger-king-chicken-2026').visual,/^https:\/\/cdn\.prod\.website-files\.com\//);
 assert.ok(find('gmc-denali-2026').actions.some(action=>action.url.startsWith('https://www.gmc.com')));
});
test('Radio Clubhouse sorts latest activity first and returns newest card to front on fetch',()=>{
 const script=local('radio-clubhouse.js');
 assert.match(script,/sort\(\(a,b\)=>/);
 assert.match(script,/time\(b\)-time\(a\)/);
 assert.match(script,/render\(topics,true,undefined,true\)/);
 assert.match(script,/visibilitychange/);
 assert.match(script,/cache:'no-store'/);
});
test('Story Writer keeps a local composer and appends chapter without rewriting manuscript',()=>{
 const script=local('phi-story-writer.js');
 assert.match(script,/quantaPhi:storyWriter:composer:v1/);
 assert.match(script,/async function continueStory\(\)/);
 assert.match(script,/body:previous\.body\.trim\(\)\+'\\n\\n'\+chapter/);
 assert.match(script,/sw-next-chapter-note/);
 assert.match(script,/saveStory\(combined\)/);
});
