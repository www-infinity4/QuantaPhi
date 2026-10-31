import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../workers/coliseum/worker.mjs';
import {hasZeusHistoryBindings} from '../workers/coliseum/zeus-history.mjs';

const ORIGIN='https://quantaphi.org';
const HOST='https://infinity-coliseum.marvaseater.workers.dev';
const THREAD='chat_'+'a'.repeat(32);
const TURN='11111111-1111-4111-8111-111111111111';
const head={origin:ORIGIN,authorization:'Bearer sq_'+'s'.repeat(36),'content-type':'application/json'};
class FakeD1 {
 constructor(){this.threads=new Map();this.turns=new Map();this.serial=0}
 prepare(query){
  const db=this;
  return {
   bind(...values){this.values=values;return this},
   async run(){
    const a=this.values;
    if(query.startsWith('INSERT OR IGNORE INTO zeus_threads')){
     const k=a[0]+'|'+a[1];if(!db.threads.has(k))db.threads.set(k,{id:a[1],title:a[2],created_at:a[3],updated_at:a[4],member_id:a[0]});
    }else if(query.startsWith('INSERT OR IGNORE INTO zeus_turns')){
     const k=a[0]+'|'+a[1]+'|'+a[2];
     if(!db.turns.has(k))db.turns.set(k,{id:a[2],role:a[3],text:a[4],created_at:a[5],member_id:a[0],thread_id:a[1],rowid:++db.serial});
    }else if(query.startsWith('UPDATE zeus_threads')){
     const row=db.threads.get(a[1]+'|'+a[2]);if(row)row.updated_at=a[0];
    }else throw Error('Unexpected SQL '+query);
    return {meta:{changes:1}};
   },
   async first(){
    const a=this.values;
    if(query.includes('FROM zeus_threads'))return db.threads.get(a[0]+'|'+a[1])||null;
    if(query.includes('FROM zeus_turns'))return db.turns.get(a[0]+'|'+a[1]+'|'+a[2])||null;
    throw Error('Unexpected SQL '+query);
   },
   async all(){
    const a=this.values;
    if(query.includes('FROM zeus_threads'))return {results:[...db.threads.values()].filter(x=>x.member_id===a[0]).sort((x,y)=>y.created_at.localeCompare(x.created_at)||y.id.localeCompare(x.id)).slice(a[1],a[1]+101)};
    if(query.includes('FROM zeus_turns'))return {results:[...db.turns.values()].filter(x=>x.member_id===a[0]&&x.thread_id===a[1]).sort((x,y)=>x.rowid-y.rowid).slice(a[2],a[2]+101)};
    throw Error('Unexpected SQL '+query);
   }
  };
 }
}
const send=(path,env,method='GET',data,headers=head)=>worker.fetch(new Request(HOST+path,{
 method,headers,body:data===undefined?undefined:JSON.stringify(data)
}),env);
test('Zeus history stays private, idempotent, exportable, and backed up in separate R2 objects',async()=>{
 const originalFetch=globalThis.fetch;
 let username='alpha';
 globalThis.fetch=async()=>Response.json({ok:true,state:{username}});
 try{
  const db=new FakeD1(),objects=new Map();
  const env={COLISEUM_DB:db,MEMBER_PEPPER:'a'.repeat(64),ZEUS_HISTORY_R2:{async put(key,body){objects.set(key,body)}}};
  assert.equal(hasZeusHistoryBindings(env),true);
  assert.equal((await send('/v1/private/zeus/threads',{},'GET')).status,503);
  assert.equal((await send('/v1/private/zeus/threads',env,'POST',{id:THREAD,title:'Secret build'},{})).status,403);
  const made=await send('/v1/private/zeus/threads',env,'POST',{id:THREAD,title:'Secret build'});
  assert.equal(made.status,201);
  assert.equal((await made.json()).backedUp,true);
  const add=()=>send('/v1/private/zeus/threads/'+THREAD+'/messages',env,'POST',{id:TURN,role:'user',text:'My idea remains private'});
  const first=await add();assert.equal(first.status,201);assert.equal((await first.json()).backedUp,true);
  assert.equal((await add()).status,201);
  assert.equal(db.turns.size,1,'retry must never duplicate messages');
  const messages=await send('/v1/private/zeus/threads/'+THREAD+'/messages',env);
  const payload=await messages.json();
  assert.equal(payload.items.length,1);assert.equal(payload.items[0].text,'My idea remains private');
  assert.equal(payload.next,null);
  assert.equal(objects.size,2,'R2 has distinct thread and turn objects');
  const index=await (await send('/v1/private/zeus/threads',env)).json();
  assert.equal(index.items.length,1);
  assert.match(index.profile,/^[0-9a-f]{32}$/);
  username='beta';
  const other=await (await send('/v1/private/zeus/threads',env)).json();
  assert.equal(other.items.length,0);
  assert.notEqual(index.profile,other.profile);
  assert.equal((await send('/v1/private/zeus/threads/'+THREAD+'/messages',env)).status,404);
 }finally{globalThis.fetch=originalFetch}
});
test('schema is additive and never attaches Zeus history to room-public records',()=>{
 const sql=readFileSync(new URL('../workers/coliseum/migrations/0002_zeus_private_history.sql',import.meta.url),'utf8');
 assert.match(sql,/PRIMARY KEY\(member_id,id\)/);
 assert.match(sql,/FOREIGN KEY\(member_id,thread_id\)/);
 assert.doesNotMatch(sql,/DROP TABLE|DELETE FROM|coliseum_messages/i);
 const client=readFileSync(new URL('../coliseum/zeus-history-client.mjs',import.meta.url),'utf8');
 assert.match(client,/Enable automatic cloud backup/);
 assert.match(client,/Download complete Zeus history/);
 assert.match(client,/This is not end-to-end encrypted/);
});
