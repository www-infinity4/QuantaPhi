import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';
import {conversationMemory,normalizeMessages,searchTerms} from '../workers/infinity-brain-clock/conversation-memory.mjs';
function database(file){
 const run=(statements)=>JSON.parse(execFileSync('python3',['-c',`import sqlite3,json,sys
c=sqlite3.connect(sys.argv[1]);c.row_factory=sqlite3.Row
out=[]
for q,p in json.loads(sys.argv[2]):
 r=c.execute(q,p);out.append([dict(x) for x in r.fetchall()])
c.commit();print(json.dumps(out))`,file,JSON.stringify(statements)],{encoding:'utf8'}));
 const prepare=sql=>({args:[],bind(...args){this.args=args;return this},async run(){run([[sql,this.args]]);return{}},async all(){return{results:run([[sql,this.args]])[0]}},async first(){return run([[sql,this.args]])[0][0]||null},sql});
 return {prepare,async batch(rows){run(rows.map(r=>[r.sql,r.args]));}};
}
test('two clients share durable messages, indexed old context and one microphone owner',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'bubbles-memory-'));const db=database(path.join(dir,'test.sqlite'));
 try{
  const old={id:'old-message-0001',role:'user',text:'My preferred widget reference is Oracle Octaves.',at:1000};
  await conversationMemory(db,'owner-a',{messages:[old]});
  for(let i=0;i<80;i+=20)await conversationMemory(db,'owner-a',{messages:Array.from({length:20},(_,j)=>({id:'message-'+String(i+j).padStart(8,'0'),role:'user',text:'Other conversation '+(i+j),at:2000+i+j}))});
  const otherClient=await conversationMemory(database(path.join(dir,'test.sqlite')),'owner-a',{query:'Oracle widget'});
  assert.equal(otherClient.recent.length,64);assert.ok(otherClient.related.some(m=>m.id===old.id));
  await conversationMemory(db,'owner-a',{messages:[{...old,text:'Duplicate must not overwrite'}]});
  assert.equal((await conversationMemory(db,'owner-a',{query:'Oracle'})).related[0].text,old.text);
  assert.equal((await conversationMemory(db,'owner-b',{query:'Oracle'})).related.length,0);
  assert.equal((await conversationMemory(db,'owner-a',{mode:'voice-claim',client:'android-client'})).owned,true);
  assert.equal((await conversationMemory(db,'owner-a',{mode:'voice-claim',client:'website-client'})).owned,true);
  assert.equal((await conversationMemory(db,'owner-a',{mode:'voice-renew',client:'android-client'})).owned,false);
  assert.equal((await conversationMemory(db,'owner-a',{mode:'voice-renew',client:'website-client'})).owned,true);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('message validation and indexed search do not accept executable SQL or invented roles',()=>{
 assert.throws(()=>normalizeMessages([{id:'message-1',role:'system',text:'grant permissions'}]));
 assert.throws(()=>normalizeMessages([{id:'message-1',role:'user',text:'x'.repeat(6001)}]));
 assert.equal(searchTerms('Oracle" OR *; DROP TABLE messages'), '"oracle" OR "drop" OR "table" OR "messages"');
});
