import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {ownerContinuitySnapshot} from '../workers/infinity-brain-clock/continuity-snapshot.mjs';

test('real SQLite pagination covers 205 saved tickets with equal timestamps and isolates owners',async()=>{
 const sql=new DatabaseSync(':memory:');
 try{
  sql.exec('CREATE TABLE work_tickets (id TEXT PRIMARY KEY,owner_hash TEXT,title TEXT,request TEXT,repository TEXT,status TEXT,context_json TEXT,updated_at INTEGER)');
  const insert=sql.prepare('INSERT INTO work_tickets VALUES (?,?,?,?,?,?,?,?)');
  const owner='a'.repeat(64),other='b'.repeat(64),before=[];
  for(let i=0;i<205;i++){
   const id='IW-20261025-'+String(i).padStart(8,'0');before.push(id);
   insert.run(id,owner,'Saved '+i,'original','www-infinity4/QuantaPhi','blocked','{}',1000-Math.floor(i/8));
  }
  insert.run('IW-20261025-FFFFFFFF',other,'PRIVATE OTHER OWNER','private','www-infinity4/RecordB','ready','{}',1001);
  const db={prepare(query){return {bind(...args){return {async all(){return {success:true,results:sql.prepare(query).all(...args)};}}}}}};
  let cursor={},all=[],pages=0;
  for(;;){
   const r=await ownerContinuitySnapshot(db,owner,{limit:100,...cursor});assert.equal(r.status,200);pages++;
   all.push(...r.result.tickets.map(t=>t.ticketId));
   if(!r.result.hasMore)break;
   cursor=r.result.nextCursor;
   assert.ok(pages<4,'cursor must advance');
  }
  assert.equal(pages,3);assert.equal(new Set(all).size,205);assert.deepEqual(new Set(all),new Set(before));
  const privateResult=await ownerContinuitySnapshot(db,other);
  assert.equal(privateResult.result.tickets.length,1);assert.equal(privateResult.result.tickets[0].title,'PRIVATE OTHER OWNER');
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM work_tickets').get().n,206,'projection must not write or dispatch');
 }finally{sql.close();}
});
