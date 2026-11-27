import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const migration=readFileSync(new URL('./runner-queue-index.sql',import.meta.url),'utf8');
test('partial index avoids sorting and preserves eligible owner rows',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('CREATE TABLE work_tickets(id TEXT PRIMARY KEY,owner_hash TEXT,status TEXT,context_json TEXT,request TEXT,created_at INTEGER); CREATE INDEX owner_existing ON work_tickets(owner_hash)');
  const add=db.prepare('INSERT INTO work_tickets VALUES(?,?,?,?,?,?)');
  for(let i=0;i<1000;i++)add.run(String(i),i%2?'a':'b','ready',i%10===1?' {"kind":"robot-directions"}':'{','test',i);
  add.run('draft','a','draft','{"kind":"robot-directions"}','test',2000);
  add.run('other','b','ready','{"kind":"robot-directions"}','test',2000);
  const where="owner_hash=? AND status IN ('ready','working','blocked') AND (CASE WHEN json_valid(context_json) THEN json_extract(context_json,'$.kind')='robot-directions' ELSE 0 END)";
  for(const order of ['ASC','DESC']){
   const query=`SELECT id,context_json,request,created_at,status FROM work_tickets WHERE ${where} ORDER BY created_at ${order},id ${order} LIMIT ?`;
   const expected=db.prepare(query).all('a',100);
   assert.equal(expected.length,100);
   const plan=()=>db.prepare('EXPLAIN QUERY PLAN '+query).all('a',100).map(r=>r.detail).join(' ');
   if(order==='ASC')assert.match(plan(),/TEMP B-TREE/);
   db.exec(migration);
   assert.match(plan(),/work_tickets_runner_candidates_v1/);
   assert.doesNotMatch(plan(),/TEMP B-TREE/);
   assert.deepEqual(db.prepare(query).all('a',100),expected);
   assert.equal(db.prepare('SELECT COUNT(*) n FROM work_tickets').get().n,1002);
  }
 }finally{db.close()}
});
