import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('bubbles-memory.js','utf8');
function setup({last=[],related=[],notes=[],cloud=true,enabled=true}={}){
 const scope={enabled,cloud,recent:async()=>last,search:async()=>related,recall:async()=>notes};
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
