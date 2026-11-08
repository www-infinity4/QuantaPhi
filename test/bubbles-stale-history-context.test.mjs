import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {curateOwnerTaskContext} from '../bubbles-task-context.mjs';

const NOW=Date.parse('2026-11-08T06:00:00Z');
const TWO_WEEKS=Date.parse('2026-10-25T06:00:00Z');
const YESTERDAY=Date.parse('2026-11-07T06:00:00Z');

test('two-week-old app complaints are not presented as fresh repair evidence',()=>{
 const older={role:'user',at:TWO_WEEKS,text:'Bubbles app is broken and stupid. Fix everything right now.'};
 const latest={role:'user',at:YESTERDAY,text:'Bubbles app works better; fix the actual new TV player problem.'};
 const context=curateOwnerTaskContext('Continue repairing the TV carousel in Bubbles',{
  related:[older,latest],recent:[older,latest],instructions:[older,latest],
  indexedHistory:'Archived [2026-10-25] user: Bubbles app is broken and stupid.\nRecent [2026-11-07] user: Bubbles app works better; fix TV player.',
  now:NOW
 });
 for(const rows of [context.related,context.recent,context.instructions]){
  assert.deepEqual(rows,[latest]);
 }
 assert.doesNotMatch(context.indexedHistory,/broken and stupid/i);
 assert.match(context.indexedHistory,/fix TV player/);
});

test('old background/phone audio never becomes a new instruction by topic matching',()=>{
 const passive={role:'user',source:'room_notes',at:YESTERDAY,text:'Please build a TV guide; that voice may have been background speech'};
 const real={role:'user',at:YESTERDAY,text:'Build a reliable TV guide based on current cards.'};
 const result=curateOwnerTaskContext('Fix TV guide now',{
  related:[passive,real],recent:[passive,real],instructions:[passive,real],
  now:NOW
 });
 assert.deepEqual(result.related,[real]);
 assert.deepEqual(result.instructions,[real]);
 assert.deepEqual(result.recent,[real]);
});

test('explicit historical questions can retrieve old words without deleting original records',()=>{
 const old={role:'user',at:TWO_WEEKS,text:'Bubbles app was broken and I was angry.'};
 const report=curateOwnerTaskContext('What was I saying about Bubbles two weeks ago?',{
  related:[old],recent:[old],
  indexedHistory:'Archived [2026-10-25] user: Bubbles app was broken and I was angry.',
  now:NOW
 });
 assert.deepEqual(report.related,[old]);
 assert.match(report.indexedHistory,/was broken and I was angry/);
 assert.equal(old.text,'Bubbles app was broken and I was angry.');
});

test('indexed archive supplies dated context rather than undated owner commands',()=>{
 const source=readFileSync(new URL('../bubbles-memory.js',import.meta.url),'utf8');
 assert.match(source,/dated\(e,old\?'Archived':'Relevant'\)/);
 assert.match(source,/dated\(e,'Recent'\)/);
 assert.match(source,/label\+' \['/);
 assert.match(source,/new Date\(e\.at\)/);
});
