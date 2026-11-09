import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import site from '../../quantaphi-site/worker.js';
import ingress from '../src/ingest.ts';

const TOKEN='sq_'+'a'.repeat(40);
const secret='synthetic-bridge-test-secret';
const sql=readFileSync(new URL('../migrations/0002_quant_event_consents.sql',import.meta.url),'utf8');

function db() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(sql);
  return sqlite;
}
function request(token=TOKEN) {
  return new Request('https://quantaphi.org/api/quant-events',{
    method:'POST',
    headers:{
      Origin:'https://quantaphi.org',
      Authorization:'Bearer '+token,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({queries:[{
      id:'event-12345678',event_type:'card_click',target_entity:'card:physics',numerical_value:1
    }]})
  });
}
test('consent schema rejects invalid purpose and revoked-before-consented',()=>{
  const sqlite=db();
  try{
    const id='ev_'+'a'.repeat(64),ts=Date.now();
    assert.throws(()=>sqlite.prepare(
      'INSERT INTO quant_event_consents(user_id,purpose,policy_version,consented_at_ms) VALUES(?,?,?,?)'
    ).run(id,'payments','v1',ts));
    assert.throws(()=>sqlite.prepare(
      'INSERT INTO quant_event_consents(user_id,purpose,policy_version,consented_at_ms,revoked_at_ms) VALUES(?,?,?,?,?)'
    ).run(id,'analytics','v1',ts,ts-1));
    sqlite.prepare('INSERT INTO quant_event_consents(user_id,purpose,policy_version,consented_at_ms) VALUES(?,?,?,?)').run(id,'analytics','v1',ts);
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM quant_event_consents').get().n,1);
  } finally{sqlite.close();}
});
test('existing site Wallet identity -> consent -> signed ingestion -> Queue works without DB writes',async()=>{
  const sqlite=db(), messages=[];
  try {
    // Pre-population is a synthetic fixture; production consent issuance is NOT wired.
    const env={
      EVENTS_BRIDGE_ENABLED:'true',
      USER_IDENTITY_HMAC_SECRET:secret,
      INGEST_TOKEN:'server-token',
      BOT_WALLET:{async fetch(_url,options){
        assert.equal(options.headers.Authorization,'Bearer '+TOKEN);
        return Response.json({ok:true,user:{id:317}});
      }},
      EVENT_CONSENT_DB:{
        prepare(q){return{
          bind(id,purpose){return{async first(){
            const row=sqlite.prepare(q).get(id,purpose);
            return row||null;
          }}};
        }}
      },
      EVENTS_SERVICE:{async fetch(r){
        return ingress.fetch(r,{
          USER_IDENTITY_HMAC_SECRET:secret,
          INGEST_TOKEN:'server-token',
          INGEST_MODE:'queue',
          EVENT_QUEUE:{async send(item){messages.push(item);}},
          GEO_STORAGE_ENABLED:'true',
        });
      }}
    };
    assert.equal((await site.fetch(request(),env,{})).status,403);
    // Simulate a previously audited, explicit server-side consent issuance.
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const hash=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('quant-events-user-v1\n317'));
    const id='ev_'+[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
    sqlite.prepare('INSERT INTO quant_event_consents(user_id,purpose,policy_version,consented_at_ms) VALUES(?,?,?,?)')
      .run(id,'analytics','v1',Date.now()-1000);
    const response=await site.fetch(request(),env,{});
    assert.equal(response.status,202);
    assert.deepEqual(await response.json(),{received:1,accepted:1,persisted:false});
    assert.equal(messages.length,1);
    assert.equal(messages[0].user.id,id);
    assert.deepEqual(messages[0].edge,{region:null,stateCode:null,postalCode:null});
    assert.equal(messages[0].queries[0].event_type,'card_click');
    assert.equal(messages[0].queries[0].target_entity,'card:physics');
    // Revocation blocks a subsequent request; no client may re-enable it.
    sqlite.prepare('UPDATE quant_event_consents SET revoked_at_ms=? WHERE user_id=?')
      .run(Date.now(),id);
    assert.equal((await site.fetch(request(),env,{})).status,403);
    assert.equal(messages.length,1);
  } finally{sqlite.close();}
});
