import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../src/ingest.ts';

const id='ev_'+'e'.repeat(64);
const schema=[
  '../migrations/0001_quant_events.sql',
  '../migrations/0002_quant_event_consents.sql',
].map(f=>readFileSync(new URL(f,import.meta.url),'utf8')).join('\n');
function fixture(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  sqlite.exec(schema);
  const DB={
    prepare(sql){return{bind(...args){return{sql,args};}};},
    async batch(statements){
      sqlite.exec('BEGIN');
      try{
        const result=statements.map(s=>({
          success:true,
          meta:{changes:sqlite.prepare(s.sql).run(...s.args).changes}
        }));
        sqlite.exec('COMMIT');
        return result;
      }catch(error){sqlite.exec('ROLLBACK');throw error;}
    }
  };
  return {sqlite,DB,close:()=>sqlite.close()};
}
function consent(sqlite,{when=Date.now()-3000,revoked=null}={}){
  sqlite.prepare('INSERT INTO quant_event_consents(user_id,purpose,policy_version,consented_at_ms,revoked_at_ms) VALUES(?,?,?,?,?) ON CONFLICT(user_id,purpose) DO UPDATE SET consented_at_ms=excluded.consented_at_ms,revoked_at_ms=excluded.revoked_at_ms')
    .run(id,'analytics','v1',when,revoked);
}
function packet({accepted=Date.now()-1000,eventId='event-00000001',userId=id}={}){
  return {body:{
    schema_version:1,
    user:{id:userId,device_type:'unknown'},
    queries:[{id:eventId,event_type:'card_click',target_entity:'card:physics',numerical_value:1}],
    edge:{region:null,stateCode:null,postalCode:null},
    accepted_at_ms:accepted
  }};
}
const count=sqlite=>sqlite.prepare('SELECT count(*) AS n FROM events').get().n;
test('Queue cannot create a user or event without active consent',async()=>{
  const f=fixture();try{
    await worker.queue({messages:[packet()]},{DB:f.DB});
    assert.equal(count(f.sqlite),0);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM users').get().n,0);
  }finally{f.close();}
});
test('Queue persists only records accepted during valid consent',async()=>{
  const f=fixture();try{
    consent(f.sqlite);
    await worker.queue({messages:[packet()]},{DB:f.DB});
    assert.equal(count(f.sqlite),1);
  }finally{f.close();}
});
test('Queued events are blocked after consent is revoked before consumer write',async()=>{
  const f=fixture();try{
    const timestamp=Date.now()-1000;
    consent(f.sqlite,{when:timestamp-500});
    f.sqlite.prepare('UPDATE quant_event_consents SET revoked_at_ms=? WHERE user_id=?').run(Date.now(),id);
    await worker.queue({messages:[packet({accepted:timestamp})]},{DB:f.DB});
    assert.equal(count(f.sqlite),0);
  }finally{f.close();}
});
test('Old queued events are not restored by later opt-in',async()=>{
  const f=fixture();try{
    const old=Date.now()-5000, newer=Date.now()-1000;
    consent(f.sqlite,{when:old-1000});
    consent(f.sqlite,{when:newer});
    await worker.queue({messages:[packet({accepted:old,eventId:'event-00000002'})]},{DB:f.DB});
    assert.equal(count(f.sqlite),0);
    await worker.queue({messages:[packet({accepted:Date.now(),eventId:'event-00000003'})]},{DB:f.DB});
    assert.equal(count(f.sqlite),1);
  }finally{f.close();}
});
test('Mixed consumer batch cannot insert unconsented subject',async()=>{
  const f=fixture();try{
    consent(f.sqlite);
    await worker.queue({messages:[
      packet({eventId:'event-00000004'}),
      packet({eventId:'event-00000005',userId:'ev_'+'d'.repeat(64)})
    ]},{DB:f.DB});
    assert.equal(count(f.sqlite),1);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM users').get().n,1);
  }finally{f.close();}
});

test('direct D1 staging must be explicitly unlocked and consent checked',async()=>{
  const f=fixture();
  try{
    const secret='synthetic-direct-only-secret',ts=String(Date.now());
    const signature=createHmac('sha256',secret)
      .update(['v1',id,ts,'0'].join('\n')).digest('hex');
    const send=()=>new Request('https://quantaphi.org/v1/events',{
      method:'POST',
      headers:{
        Authorization:'Bearer internal-staging-token',
        'Content-Type':'application/json',
        'x-quant-identity-time':ts,
        'x-quant-identity-geo':'0',
        'x-quant-identity-signature':signature
      },
      body:JSON.stringify({
        user:{id,device_type:'unknown'},
        queries:[{id:'event-00000101',event_type:'card_click',target_entity:'card:physics',numerical_value:1}]
      })
    });
    const env={DB:f.DB,INGEST_TOKEN:'internal-staging-token',USER_IDENTITY_HMAC_SECRET:secret,INGEST_MODE:'direct'};
    assert.equal((await worker.fetch(send(),env)).status,503);
    assert.equal(count(f.sqlite),0);
    env.DIRECT_STAGING_ALLOWED='true';
    await worker.fetch(send(),env);
    assert.equal(count(f.sqlite),0);
    consent(f.sqlite);
    await worker.fetch(send(),env);
    assert.equal(count(f.sqlite),1);
  }finally{f.close();}
});
