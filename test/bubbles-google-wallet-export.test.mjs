import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('bubbles-memory.js','utf8');
function helper({scope='a'.repeat(64),enabled=true,cloud=true,records=[]}={}){
 const start=source.indexOf('async function exportCurrentScope(');
 const end=source.indexOf('async function recent(',start);
 assert.ok(start>0&&end>start,'wallet memory exporter should exist');
 const ctx={scope,enabled,cloud,all:async()=>records};
 vm.createContext(ctx);
 vm.runInContext(source.slice(start,end),ctx);
 return ctx;
}
test('Bubbles wallet exporter requires active verified scope and filters non-conversation notes',async()=>{
 const owner='a'.repeat(64),x=[
  {id:'a1',scope:owner,role:'user',text:'my chat message',at:1740000000000,synced:true},
  {id:'a2',scope:owner,role:'note',text:'my private note',at:1740000001000,synced:true}
 ];
 const result=await helper({records:x}).exportCurrentScope();
 assert.equal(result.length,1);
 assert.equal(result[0].scope,owner);
 assert.equal(result[0].text,'my chat message');
 assert.equal('synced' in result[0],false,'do not export wallet/internal metadata');
 await assert.rejects(helper({cloud:false,records:x}).exportCurrentScope(),/verified wallet/i);
 await assert.rejects(helper({scope:'guest',records:x}).exportCurrentScope(),/verified wallet/i);
});
test('Bubbles wallet exporter refuses overflow or mixed profile even if IndexedDB source is corrupted',async()=>{
 const owner='a'.repeat(64);
 const other={id:'another',scope:'b'.repeat(64),role:'user',text:'other user',at:1740000000000};
 await assert.rejects(helper({records:[other]}).exportCurrentScope(),/account scope/i);
 const many=Array.from({length:10001},(_,i)=>({id:'m'+i,scope:owner,role:'user',text:'x',at:1740000000000+i}));
 await assert.rejects(helper({records:many}).exportCurrentScope(),/too many/i);
});
