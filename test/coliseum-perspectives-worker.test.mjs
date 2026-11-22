import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import worker from '../workers/coliseum/worker.mjs';

const sql=path=>readFileSync(new URL('../workers/coliseum/migrations/'+path,import.meta.url),'utf8');
const PEPPER='QuantaPhi-private-test-secret-42chars-long';
const members=['alice','bob','cara','mallory'];
const member=name=>createHmac('sha256',PEPPER).update(name).digest('hex').slice(0,32);
const token=name=>'Bearer sq_'+name.padEnd(40,'x');
const idea=i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0');
const URL_ROOT='https://infinity-coliseum.marvaseater.workers.dev';

function fixture(t){
 const db=new DatabaseSync(':memory:');
 db.exec(sql('0001_coliseum.sql'));
 db.exec(sql('0002_perspective_consent.sql'));
 for(const name of members){
  db.prepare('INSERT INTO coliseum_members(model_id,member_id,joined_at) VALUES(?,?,?)').run('zeus',member(name),'2026-11-22T00:00:00Z');
 }
 const realFetch=globalThis.fetch;
 globalThis.fetch=async (url,options={})=>{
  assert.equal(String(url),'https://starquest-ledger.marvaseater.workers.dev/v1/state');
  const authorization=options.headers?.authorization;
  const name=members.find(x=>authorization===token(x));
  return Response.json(name?{ok:true,state:{username:name}}:{ok:false},{status:name?200:403});
 };
 t.after(()=>{globalThis.fetch=realFetch;db.close()});
 const env={COLISEUM_DB:{prepare(query){
  const p=db.prepare(query);
  return {bind(...values){
   return {first:async()=>p.get(...values)||null,all:async()=>({results:p.all(...values)}),
    run:async()=>({meta:{changes:p.run(...values).changes}})};
  }};
 }},OPEN_COLISEUM_BETA:'true',MEMBER_PEPPER:PEPPER,
  BETA_ALLOWED_MEMBERS:members.map(member).join(',')};
 async function call(name,path,method='GET',body,origin='https://quantaphi.org'){
  const req=new Request(URL_ROOT+path,{method,headers:{authorization:token(name),origin,'content-type':'application/json'},
   body:body===undefined?undefined:JSON.stringify(body)});
  const res=await worker.fetch(req,env);
  return {status:res.status,...await res.json()};
 }
 for(const [i,name] of ['alice','bob','cara'].entries())
  db.prepare('INSERT INTO coliseum_ideas(id,model_id,sector,member_id,title,description,parent_id,created_at) VALUES(?,?,?,?,?,?,NULL,?)')
   .run(idea(i+1),'zeus','Technology',member(name),'Perspective '+name,'Build independent testable software with source evidence','2026-11-22T00:00:00Z');
 return {db,call};
}
test('separate advisory permission defaults off and another member cannot opt the author in',async t=>{
 const {call}=fixture(t);
 let initial=await call('alice','/v1/perspectives?modelId=zeus&sector=Technology');
 assert.equal(initial.status,200);
 assert.equal(initial.ready,false);
 assert.deepEqual(initial.perspectives,[]);
 const forged=await call('mallory','/v1/perspectives/choice','POST',
  {ideaId:idea(1),share:true,purpose:'bubbles-advisory-v1'});
 assert.equal(forged.status,403);
 assert.equal(forged.error,'idea_owner_required');
 assert.equal((await call('alice','/v1/perspectives?modelId=zeus&sector=Technology')).ready,false);
});
test('opt-in only explicit valid author choice; three distinct members unlock an advisory-only batch',async t=>{
 const {call}=fixture(t);
 for(const [i,name] of ['alice','bob','cara'].entries()){
  const result=await call(name,'/v1/perspectives/choice','POST',
   {ideaId:idea(i+1),share:true,purpose:'bubbles-advisory-v1'});
  assert.equal(result.status,200);
  assert.equal(result.shared,true);
 }
 const data=await call('alice','/v1/perspectives?modelId=zeus&sector=Technology');
 assert.equal(data.status,200);
 assert.equal(data.ready,true);
 assert.equal(data.perspectives.length,3);
 assert.equal(data.ownerFinalDecisionRequired,true);
 assert.equal(data.permissions.runner,false);
 assert.doesNotMatch(JSON.stringify(data),/private-test-secret|member_id|memberId|alice|bob|cara/);
 const other=await call('alice','/v1/perspectives?modelId=zeus&sector=Gaming');
 assert.equal(other.ready,false);
 const malformed=await call('alice','/v1/perspectives/choice','POST',{ideaId:idea(1),share:true});
 assert.equal(malformed.status,400);
});
test('author withdrawal prevents future advisory reads without deleting the published idea',async t=>{
 const {call,db}=fixture(t);
 for(const [i,name] of ['alice','bob','cara'].entries())
  await call(name,'/v1/perspectives/choice','POST',{ideaId:idea(i+1),share:true,purpose:'bubbles-advisory-v1'});
 const withdrawn=await call('bob','/v1/perspectives/choice','POST',
  {ideaId:idea(2),share:false,purpose:'bubbles-advisory-v1'});
 assert.equal(withdrawn.status,200);
 assert.equal(withdrawn.shared,false);
 const after=await call('alice','/v1/perspectives?modelId=zeus&sector=Technology');
 assert.equal(after.ready,false);
 assert.deepEqual(after.perspectives,[]);
 assert.equal(db.prepare('SELECT count(*) n FROM coliseum_ideas').get().n,3,'original published idea remains');
 const personal=await call('bob','/v1/ideas?modelId=zeus&sector=Technology');
 const mine=personal.items.find(x=>x.id===idea(2));
 assert.equal(mine.mine,true);
 assert.equal(mine.perspectiveShared,false);
});
test('requests without an eligible invitation or from another website cannot access member perspectives',async t=>{
 const {call}=fixture(t);
 const cross=await call('alice','/v1/perspectives/choice','POST',
  {ideaId:idea(1),share:true,purpose:'bubbles-advisory-v1'},'https://evil.invalid');
 assert.equal(cross.status,403);
 const unauth=await worker.fetch(new Request(URL_ROOT+'/v1/perspectives?modelId=zeus&sector=Technology'),{
  OPEN_COLISEUM_BETA:'false'});
 assert.equal(unauth.status,503);
});
