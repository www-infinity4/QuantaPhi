import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import api from '../workers/coliseum/worker.mjs';
import {BETA_CAPACITY,validIdea,validMessage,canJoin,editionPolicy,allowsOrigin,publicMemberLabel} from '../coliseum/room-api-core.mjs';
const sql=readFileSync(new URL('../workers/coliseum/migrations/0001_coliseum.sql',import.meta.url),'utf8');
const worker=readFileSync(new URL('../workers/coliseum/worker.mjs',import.meta.url),'utf8');

test('free editions and no fake subscription access',()=>{
 assert.equal(BETA_CAPACITY,1000);
 assert.equal(editionPolicy('zeus').allowed,true);
 assert.equal(editionPolicy('hermes').allowed,true);
 assert.equal(editionPolicy('athena').allowed,false);
 assert.equal(editionPolicy('hephaestus').allowed,false);
 assert.equal(canJoin(999),true);assert.equal(canJoin(1000),false);
 assert.equal(canJoin(1000,true),true);
});
test('validates room payloads without trusting client labels',()=>{
 const idea={modelId:'zeus',sector:'Science',title:'Repairable phones',description:'Design a repairable module with open schematic'};
 assert.equal(validIdea(idea),true);
 assert.equal(validIdea({...idea,sector:'secret'}),false);
 assert.equal(validIdea({...idea,title:'x'}),false);
 assert.equal(validMessage({modelId:'zeus',sector:'Science',text:'What is the first prototype?'}),true);
 assert.equal(validMessage({modelId:'athena',sector:'Science',text:'pay me'}),false);
 assert.equal(allowsOrigin('https://quantaphi.org'),true);
 assert.equal(allowsOrigin('https://evil.example'),false);
 assert.equal(publicMemberLabel('abcd1234ef'), 'Builder-abcd1234');
});
test('a missing D1 + membership secret defaults to disabled health and no writes',async()=>{
 const base='https://infinity-coliseum.marvaseater.workers.dev';
 const health=await api.fetch(new Request(base+'/v1/health',{headers:{origin:'https://quantaphi.org'}}),{});
 assert.equal(health.status,200);
 const data=await health.json();assert.equal(data.betaEnabled,false);
 assert.equal(health.headers.get('access-control-allow-origin'),'https://quantaphi.org');
 const models=await api.fetch(new Request(base+'/v1/models'),{});
 assert.equal(models.status,200);assert.equal((await models.json()).models[2].enabled,false);
 const request=new Request(base+'/v1/join',{method:'POST',headers:{origin:'https://quantaphi.org','content-type':'application/json'},body:JSON.stringify({modelId:'zeus'})});
 assert.equal((await api.fetch(request,{})).status,503);
});
test('cross-origin write requests cannot join, even with a valid-looking credential',async()=>{
 const base='https://infinity-coliseum.marvaseater.workers.dev';
 const request=new Request(base+'/v1/join',{method:'POST',headers:{origin:'https://evil.example',authorization:'Bearer sq_'+'x'.repeat(40)},body:'{}'});
 const response=await api.fetch(request,{});
 assert.equal(response.status,403);assert.equal(response.headers.get('access-control-allow-origin'),null);
});
test('schema has server-owned one-vote and unique-membership constraints',()=>{
 assert.match(sql,/PRIMARY KEY\(model_id, member_id\)/);
 assert.match(sql,/PRIMARY KEY\(idea_id,member_id\)/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS coliseum_messages/);
 assert.match(worker,/COUNT\(\*\) FROM coliseum_members WHERE model_id=\?/);
 assert.match(worker,/ON CONFLICT DO NOTHING/);
 assert.match(worker,/ACCOUNT_STATE='https:\/\/starquest-ledger\./);
 assert.match(worker,/crypto\.subtle\.sign\('HMAC'/);
 assert.doesNotMatch(worker,/api\.openai\.com|paypal\.com|mintToken|passwordHash/);
});
