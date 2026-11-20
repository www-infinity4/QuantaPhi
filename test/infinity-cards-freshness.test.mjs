import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
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
test("McDonald's hero uses its approved menu-item photo and real official app links",()=>{
 const card=find('mcdonalds-big-mac-deals');
 assert.ok(card);
 assert.ok(card.visual.startsWith('https://corporate.mcdonalds.com/content/dam/'));
 assert.ok(card.actions.some(x=>x.url==='https://www.mcdonalds.com/us/en-us/deals.html'));
 assert.ok(card.actions.some(x=>x.url==='https://www.mcdonalds.com/us/en-us/full-menu.html'));
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

test('Story Writer continuation aborts a stalled response body and preserves the original manuscript',async()=>{
 const script=local('phi-story-writer.js');
 const begin=script.indexOf('async function continueStory(){');
 const end=script.indexOf('\nasync function illustrate(',begin);
 assert.ok(begin>=0&&end>begin);
 const original={id:'original-story',title:'A saved story',body:'The original chapter.',genre:'Mystery'};
 const button={disabled:false},timers=new Map(),notes=[];
 let bodyStarted=false,saved=false,timerId=0;
 const context={
  active:original,busy:false,artBusy:false,AI:'https://example.org/ai',AbortController,JSON,
  $:id=>id==='#sw-next-chapter-note'?{value:'Continue the mystery'}:button,
  note:value=>notes.push(value),
  setTimeout:callback=>{const id=++timerId;timers.set(id,callback);return id},
  clearTimeout:id=>timers.delete(id),
  fetch:async(_url,{signal})=>({ok:true,json:()=>new Promise((_resolve,reject)=>{
   bodyStarted=true;
   signal.addEventListener('abort',()=>reject(Error('response body aborted')),{once:true});
  })}),
  saveStory:async()=>{saved=true},renderStory:()=>{},
  parseStory:()=>({body:''}),takeText:()=>''
 };
 const run=vm.runInNewContext(script.slice(begin,end)+';continueStory',context);
 const pending=run();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(bodyStarted,true);
 assert.equal(context.busy,true);
 assert.equal(button.disabled,true);
 assert.equal(timers.size,1,'the request deadline must remain active while reading the response body');
 [...timers.values()][0]();
 await pending;
 assert.equal(context.busy,false);
 assert.equal(button.disabled,false);
 assert.equal(context.active,original);
 assert.equal(original.body,'The original chapter.');
 assert.equal(saved,false);
 assert.equal(timers.size,0);
 assert.match(notes.at(-1),/Could not continue the story.*aborted/);
});
