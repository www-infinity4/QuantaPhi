import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleEventData} from '../src/privacy-data.mjs';
import ingest from '../src/ingest.ts';

const token='sq_'+'p'.repeat(40);
const secret='staging-synthetic-privacy-data-secret';
const owner='ev_'+createHmac('sha256',secret).update('quant-events-user-v1\n501').digest('hex');
const outsider='ev_'+'e'.repeat(64);
const url='https://quantaphi.org/api/quant-events/data';
const schema=['0001_quant_events.sql','0002_quant_event_consents.sql']
  .map(x=>readFileSync(new URL('../migrations/'+x,import.meta.url),'utf8')).join('\n');
function fixture(extra={}) {
  const sql=new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  sql.exec(schema);
  const env={
    EVENT_DATA_MANAGEMENT_ENABLED:'true',
    USER_IDENTITY_HMAC_SECRET:secret,
    BOT_WALLET:{async fetch(_url,opts){
      assert.equal(opts.headers.Authorization,'Bearer '+token);
      return Response.json({ok:true,user:{id:501}});
    }},
    EVENT_CONSENT_DB:{
      prepare(statement){return{bind(...args){return{
        statement,args,async first(){return sql.prepare(statement).get(...args)||null;},
        async all(){return {results:sql.prepare(statement).all(...args)};},
        async run(){const r=sql.prepare(statement).run(...args);return{success:true,meta:{changes:r.changes}};}
      };}};},
      async batch(statements){
        sql.exec('BEGIN');
        try{
          const out=statements.map(s=>{
            const r=sql.prepare(s.statement).run(...s.args);
            return{success:true,meta:{changes:r.changes}};
          });
          sql.exec('COMMIT');
          return out;
        }catch(err){sql.exec('ROLLBACK');throw err;}
      }
    },
    ...extra
  };
  return {sql,env,close:()=>sql.close()};
}
function request(method='GET',body,headers={},query=''){
  return new Request(url+query,{method,headers:{
    Origin:'https://quantaphi.org',Authorization:'Bearer '+token,
    ...(method==='POST'?{'Content-Type':'application/json'}:{}),...headers
  },...(method==='POST'?{body:JSON.stringify(body)}:{})});
}
function seed(sql,uid,id,at=Date.now()-5000){
  sql.prepare("INSERT INTO users (id,created_at,device_type) VALUES (?,?,'unknown') ON CONFLICT(id) DO NOTHING").run(uid,at);
  sql.prepare("INSERT INTO events (id,user_id,event_type,target_entity,numerical_value,created_at_ms) VALUES (?,?,'card_click','card:synthetic',1,?)").run(id,uid,at);
}
function consent(sql,uid=owner){
  sql.prepare("INSERT INTO quant_event_consents (user_id,purpose,policy_version,consented_at_ms) VALUES (?,'analytics','v1',?)").run(uid,Date.now()-15000);
}
const count=(db,table,uid=owner)=>db.prepare('SELECT COUNT(*) AS n FROM '+table+' WHERE '+(table==='events'?'user_id':'id')+'=?').get(uid).n;

test('data route fails closed when disabled or requested for another account',async()=>{
  const f=fixture();try{
    assert.equal((await handleEventData(request(),{...f.env,EVENT_DATA_MANAGEMENT_ENABLED:undefined})).status,503);
    for(const r of [
      request('GET',undefined,{Origin:'https://attacker.example'}),
      request('GET',undefined,{Authorization:'Bearer bc_'+'a'.repeat(40)}),
      request('POST',{action:'erase',confirm:'DELETE_MY_ANALYTICS',userId:outsider})
    ]){
      assert.ok((await handleEventData(r,f.env)).status>=400);
    }
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM quant_event_consents').get().n,0);
  }finally{f.close();}
});
test('export returns only verified account events in bounded descending pages',async()=>{
  const f=fixture();try{
    for(let i=0;i<105;i++)seed(f.sql,owner,'owner-event-'+String(i).padStart(5,'0'),Date.now()-10000+i);
    seed(f.sql,outsider,'other-event-00001');
    const first=await handleEventData(request(),f.env);
    assert.equal(first.status,200);
    assert.equal(first.headers.get('cache-control'),'no-store');
    const a=await first.json();
    assert.equal(a.events.length,100);
    assert.match(a.nextCursor,/^\d+\.[A-Za-z0-9._:-]{8,128}$/);
    assert.equal(JSON.stringify(a).includes(owner),false);
    assert.ok(a.events.every(e=>e.id.startsWith('owner-event-')));
    const second=await handleEventData(request('GET',undefined,{},'?cursor='+encodeURIComponent(a.nextCursor)),f.env);
    assert.equal(second.status,200);
    const b=await second.json();
    assert.equal(b.events.length,5);
    assert.equal(b.nextCursor,null);
    assert.equal(new Set([...a.events,...b.events].map(x=>x.id)).size,105);
  }finally{f.close();}
});
test('export rejects invalid cursor rather than querying arbitrary SQL',async()=>{
  const f=fixture();try{
    for(const query of ['?cursor=%3BDELETE%20FROM%20events','?cursor=1.a','?cursor='+encodeURIComponent('1.'.padEnd(501,'x'))]){
      assert.equal((await handleEventData(request('GET',undefined,{},query),f.env)).status,422);
    }
  }finally{f.close();}
});
test('erase requires deliberate confirmation and atomic D1 batch',async()=>{
  const f=fixture();try{
    consent(f.sql);seed(f.sql,owner,'owner-event-00001');seed(f.sql,outsider,'other-event-00001');
    assert.equal((await handleEventData(request('POST',{action:'erase'}),f.env)).status,422);
    assert.equal(count(f.sql,'events'),1);
    const result=await handleEventData(request('POST',{action:'erase',confirm:'DELETE_MY_ANALYTICS'}),f.env);
    assert.equal(result.status,200);
    assert.deepEqual(await result.json(),{erased:true,remainingEvents:0,analyticsConsent:false});
    assert.equal(count(f.sql,'events'),0);
    assert.equal(count(f.sql,'users'),0);
    assert.equal(count(f.sql,'events',outsider),1);
    const record=f.sql.prepare('SELECT revoked_at_ms FROM quant_event_consents WHERE user_id=?').get(owner);
    assert.ok(record.revoked_at_ms>0,'minimal revocation marker prevents old queued event replay');
    const repeat=await handleEventData(request('POST',{action:'erase',confirm:'DELETE_MY_ANALYTICS'}),f.env);
    assert.equal(repeat.status,200);
    assert.equal(count(f.sql,'events',outsider),1);
  }finally{f.close();}
});
test('previously accepted queue messages cannot resurrect events after erase',async()=>{
  const f=fixture();try{
    consent(f.sql);seed(f.sql,owner,'owner-event-00002');
    const accepted=Date.now()-1000;
    assert.equal((await handleEventData(request('POST',{action:'erase',confirm:'DELETE_MY_ANALYTICS'}),f.env)).status,200);
    await ingest.queue({messages:[{body:{
      schema_version:1,user:{id:owner,device_type:'unknown'},
      queries:[{id:'owner-event-00003',event_type:'card_click',target_entity:'card:synthetic',numerical_value:1}],
      edge:{region:null,stateCode:null,postalCode:null},accepted_at_ms:accepted
    }}]},{DB:f.env.EVENT_CONSENT_DB});
    assert.equal(count(f.sql,'events'),0);
    assert.equal(count(f.sql,'users'),0);
  }finally{f.close();}
});
test('failed or missing atomic batch must never claim erasure succeeded',async()=>{
  const f=fixture();try{
    consent(f.sql);seed(f.sql,owner,'owner-event-00004');
    for(const db of [
      {...f.env.EVENT_CONSENT_DB,batch:undefined},
      {...f.env.EVENT_CONSENT_DB,async batch(){throw Error('D1 transaction unavailable');}}
    ]){
      const result=await handleEventData(request('POST',{action:'erase',confirm:'DELETE_MY_ANALYTICS'}),{...f.env,EVENT_CONSENT_DB:db});
      assert.equal(result.status,503);
      assert.equal(count(f.sql,'events'),1);
    }
  }finally{f.close();}
});
