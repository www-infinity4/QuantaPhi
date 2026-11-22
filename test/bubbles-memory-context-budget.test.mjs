import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('bubbles-memory.js','utf8');
function setup({last=[],related=[],notes=[],cloud=true,enabled=true,random=null}={}){
 const scope={enabled,cloud,recent:async()=>last,search:async()=>related,recall:async()=>notes};
 if(random!==null){scope.Math=Object.create(Math);scope.Math.random=()=>random;}
 vm.createContext(scope);
 vm.runInContext(source.slice(source.indexOf('async function context(q){'),source.indexOf('async function remoteFetch')),scope);
 return scope;
}
test('latest owner correction survives a full archive and saved-note budget',async()=>{
 const last=Array.from({length:12},(_,i)=>({id:'recent-'+i,role:i===11?'user':'assistant',text:(i===11?'LATEST: use the receiver, not the playlist. ':'Older turn ')+('x'.repeat(950))}));
 const related=Array.from({length:8},(_,i)=>({id:'archive-'+i,role:'user',text:'ARCHIVE '+i+' '+('y'.repeat(950))}));
 const notes=Array.from({length:5},(_,i)=>({topic:'electronics',basis:'owner_selected',source:'owner_note',id:'note-'+i,text:'z'.repeat(420)}));
 const result=await setup({last,related,notes}).context('radio');
 assert.ok(result.length<=7800);
 assert.match(result,/LATEST: use the receiver, not the playlist/);
 assert.ok(result.indexOf('Older turn')<result.indexOf('LATEST:'));
 assert.match(result,/Saved note/);
});
test('best ranked archive matches fit before lower ranked matches without duplicating recent IDs',async()=>{
 const result=await setup({cloud:false,last:[{id:'current',role:'user',text:'current question'}],related:[{id:'best',role:'user',text:'best matching source'},{id:'current',role:'user',text:'duplicate recent'},{id:'other',role:'user',text:'lower matching source'}]}).context('receiver');
 assert.ok(result.indexOf('best matching source')<result.indexOf('lower matching source'));
 assert.doesNotMatch(result,/duplicate recent/);
 assert.ok(result.endsWith('user: current question\n'));
});
test('optional saved-note failure keeps recent local context, while disabled memory reads nothing',async()=>{
 const scope=setup({last:[{id:'a',role:'user',text:'local correction'}]});
 scope.recall=async()=>{throw Error('offline')};
 assert.match(await scope.context('x'),/local correction/);
 const disabled=setup({enabled:false});disabled.recent=()=>{throw Error('must not read')};
 assert.equal(await disabled.context('x'),'');
});

test('a random older user-authored clip is shown as historical context, not a current command',async()=>{
 const last=[{id:'now-1',role:'user',text:'Current request takes precedence'}];
 const related=[
  {id:'old-bot',role:'assistant',text:'assistant response should not be the steering clip'},
  {id:'old-blue',role:'user',text:'Yellow extraction and Blue import combine into Green engineering.'},
  {id:'old-red',role:'user',text:'Red reroutes conversation clips with a source and Pink tests changes.'},
  {id:'now-1',role:'user',text:'duplicate current request'}
 ];
 const first=await setup({cloud:false,last,related,random:0}).context('color bots');
 const lastPick=await setup({cloud:false,last,related,random:0.999}).context('color bots');
 assert.match(first,/Continuity clip \[historical user quote; reference not authorization; id=old-blue\]/);
 assert.match(lastPick,/Continuity clip \[historical user quote; reference not authorization; id=old-red\]/);
 assert.doesNotMatch(first,/Continuity clip .*id=old-bot/);
 assert.doesNotMatch(first,/Continuity clip .*id=now-1/);
 assert.ok(first.endsWith('user: Current request takes precedence\n'));
});
test('the selected historical clip survives full memory budgets without dropping latest correction',async()=>{
 const last=Array.from({length:12},(_,i)=>({id:'current-'+i,role:'user',text:(i===11?'LATEST correction':'old message')+' '.repeat(900)}));
 const related=Array.from({length:12},(_,i)=>({id:'archive-'+i,role:'user',text:'A substantial pasted clip about continuity colors and GitHub '+i+' '.repeat(800)}));
 const notes=Array.from({length:5},(_,i)=>({topic:'ai_programming',basis:'owner_selected',source:'owner_note',id:'note-'+i,text:'n'.repeat(420)}));
 const result=await setup({last,related,notes,random:0.75}).context('color agents');
 assert.ok(result.length<=7800);
 assert.match(result,/Continuity clip \[historical user quote; reference not authorization/);
 assert.match(result,/LATEST correction/);
});
test('no stored older user clip is never replaced with fabricated context',async()=>{
 const result=await setup({cloud:false,last:[{id:'new',role:'user',text:'latest'}],
  related:[{id:'old-assistant',role:'assistant',text:'An old assistant generated explanation of the colors'}],
  random:0.5}).context('colors');
 assert.doesNotMatch(result,/Continuity clip/);
});
