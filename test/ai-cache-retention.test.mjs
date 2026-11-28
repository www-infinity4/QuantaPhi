import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../workers/infinity-rogers/worker.js',import.meta.url),'utf8')
 .replace('export { BrainModels } from "./brain-models.js";','')+'\nexport {pruneExpiredAiCache};';
const {default:worker,pruneExpiredAiCache}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('retention removes a bounded oldest expired response window with a one-day safety margin',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('CREATE TABLE ai_cache(cache_key TEXT PRIMARY KEY,response_json TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL);CREATE INDEX idx_ai_cache_expires ON ai_cache(expires_at);CREATE TABLE ai_usage_daily(user_id TEXT PRIMARY KEY,requests INTEGER);INSERT INTO ai_usage_daily VALUES(\'original-owner\',7)');
  const now=200000000,cutoff=now-86400000,insert=db.prepare('INSERT INTO ai_cache VALUES(?,?,?,?)');
  for(let i=0;i<20;i++)insert.run('old-'+i,'synthetic response',cutoff-100+i,1);
  insert.run('recent-expired','keep',now-1,1);insert.run('fresh','keep',now+1,1);insert.run('boundary','expired',cutoff,1);
  const adapter={prepare:sql=>({bind:(...params)=>({run:async()=>({meta:{changes:db.prepare(sql).run(...params).changes}})})})};
  const first=await pruneExpiredAiCache(adapter,{now,limit:16});assert.equal(first.removed,16);assert.equal(db.prepare('SELECT count(*) AS n FROM ai_cache').get().n,7);
  assert.equal(db.prepare('SELECT requests FROM ai_usage_daily').get().requests,7);assert.equal(db.prepare('SELECT count(*) AS n FROM ai_cache WHERE cache_key IN (?,?)').get('fresh','recent-expired').n,2);
  const second=await pruneExpiredAiCache(adapter,{now,limit:16});assert.equal(second.removed,5);assert.equal((await pruneExpiredAiCache(adapter,{now,limit:16})).removed,0);
 }finally{db.close();}
});
test('a retained cached answer is returned even when pruning fails, without another inference',async()=>{
 let cleanups=0,reads=0;
 const env={METER_DB:{prepare:sql=>({bind:(...args)=>({
  run:async()=>{assert.match(sql,/^DELETE FROM ai_cache/);assert.equal(args[2],16);cleanups++;throw Error('synthetic cleanup unavailable');},
  first:async()=>{if(sql.includes('ai_usage_daily'))return null;assert.match(sql,/SELECT response_json FROM ai_cache/);reads++;return {response_json:JSON.stringify({ok:true,output:'retained synthetic answer'})};}
 })})},AI:{run:()=>assert.fail('cache pruning failure cannot rerun a model')}};
 const response=await worker.fetch(new Request('https://rogers.test/v1/chat',{method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},body:JSON.stringify({input:'synthetic cache hit'})}),env);
 assert.equal(response.status,200);const answer=await response.json();assert.equal(answer.cached,true);assert.equal(answer.output,'retained synthetic answer');assert.equal(cleanups,1);assert.equal(reads,1);
});
test('invalid bounds never query and unverified change counts are never reported as success',async()=>{
 const never={prepare:()=>assert.fail('invalid cleanup must not touch the database')};
 for(const options of [{now:0},{now:NaN},{now:2e8,limit:0},{now:2e8,limit:251},{now:2e8,limit:1.5}])await assert.rejects(pruneExpiredAiCache(never,options));
 for(const changes of [undefined,-1,17])await assert.rejects(pruneExpiredAiCache({prepare:()=>({bind:()=>({run:async()=>({meta:{changes}})})})},{now:2e8,limit:16}));
});
