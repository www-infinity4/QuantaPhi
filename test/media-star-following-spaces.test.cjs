'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite'),{webcrypto,createHash}=require('node:crypto');
const fs=require('node:fs');
globalThis.crypto=webcrypto;
const src=fs.readFileSync('workers/media-star-following-spaces/worker.js','utf8');
const worker=import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
function d1(db){
 return {
  prepare(sql){return{bind(...params){return{
   first:async()=>db.prepare(sql).get(...params)||null,
   all:async()=>({results:db.prepare(sql).all(...params)}),
   run:async()=>({meta:db.prepare(sql).run(...params)})
  }}}},
  async batch(statements){db.exec('BEGIN');
   try{const output=[];for(const s of statements)output.push(await s.run());db.exec('COMMIT');return output}
   catch(err){db.exec('ROLLBACK');throw err}}
 };
}
async function fixture(){
 const db=new DatabaseSync(':memory:'),identity=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON;'+fs.readFileSync('workers/media-star-following-spaces/schema.sql','utf8'));
 identity.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY);CREATE TABLE account_devices(account_id TEXT,token_hash TEXT PRIMARY KEY);');
 const tokens=['sq_'+'a'.repeat(40),'sq_'+'b'.repeat(40)];
 for(let i=0;i<2;i++){
  identity.prepare('INSERT INTO accounts(id) VALUES(?)').run('owner'+i);
  identity.prepare('INSERT INTO account_devices(account_id,token_hash) VALUES(?,?)').run('owner'+i,createHash('sha256').update(tokens[i]).digest('hex'));
 }
 const now=Date.now();
 db.prepare('INSERT INTO space_hosts(x_user_id,handle,display_name,profile_url,featured,updated_at) VALUES(?,?,?,?,?,?)').run('dotkrueger','dotkrueger','Fred Krueger','https://x.com/dotkrueger',1,now);
 for(const [i,title] of [['1OYKAjYPeXqGb','Fred Coffee'],['1BRJjmLbpepGw','Fred Evening']]){
  db.prepare("INSERT INTO space_episodes(space_id,host_user_id,title,space_url,source_type,availability,imported_at) VALUES(?,?,?,?,'curated_archive','indexed',?)").run(i,'dotkrueger',title,'https://x.com/i/spaces/'+i,now);
 }
 const handle=(await worker).handle;
 async function request(path,token,body){
  const response=await handle(new Request('https://quantaphi.org'+path,{
   method:body?'POST':'GET',
   headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{})
  }),{DB:d1(db),IDENTITY_DB:d1(identity)});
  return{status:response.status,data:await response.json()};
 }
 return{db,request,tokens};
}
test('requires authenticated wallet owner and never invents X follow accounts',async()=>{
 const {request,tokens}=await fixture();
 const no=await request('/v1/following');assert.equal(no.status,401);
 const empty=await request('/v1/following',tokens[0]);assert.deepEqual(empty.data.accounts,[]);
 const health=await request('/health');assert.equal(health.data.xFollowingSynced,false);
});
test('owner following snapshot resolves Fred catalog ID, isolating accounts',async()=>{
 const {request,tokens,db}=await fixture();
 const a=await request('/v1/following/import',tokens[0],{snapshotId:'october-11-a',accounts:['@dotkrueger','@HodlMagoo']});
 assert.equal(a.status,201);assert.equal(a.data.imported,2);
 assert.equal(a.data.followEvidence,'owner_import_unverified_by_x');
 const again=await request('/v1/following/import',tokens[0],{snapshotId:'october-11-a',accounts:['@dotkrueger','@HodlMagoo']});
 assert.equal(again.data.unchanged,true);
 const own=await request('/v1/following',tokens[0]);assert.equal(own.data.accounts.length,2);
 assert.equal(own.data.accounts.find(x=>x.handle==='dotkrueger').episodes,2);
 assert.equal(own.data.accounts.find(x=>x.handle==='HodlMagoo').episodes,0);
 const other=await request('/v1/following',tokens[1]);assert.equal(other.data.accounts.length,0);
 const rows=db.prepare("SELECT x_user_id FROM followed_hosts WHERE owner_id='owner0' AND lower(handle)='dotkrueger'").all();
 assert.equal(rows[0].x_user_id,'dotkrueger');
});
test('two rolls preserve host and episode ranges; no Fred paid-link bypass',async()=>{
 const {request,tokens}=await fixture();
 await request('/v1/following/import',tokens[0],{accounts:['dotkrueger'],snapshotId:'test-first'});
 const ids=[];
 for(let i=0;i<2;i++){
  const r=await request('/v1/roll',tokens[0],{rollId:'test-roll-'+i});
  assert.equal(r.status,200);
  assert.deepEqual(r.data.hostRoll,{value:1,range:1});
  assert.equal(r.data.episodeRoll.range,i===0?2:1);
  assert.equal(r.data.episode.url,null);
  assert.equal(r.data.episode.fredCurated,true);
  assert.equal(r.data.episode.playbackVerified,false);
  assert.match(r.data.warning,/not confirmed/);
  ids.push(r.data.episode.id);
 }
 assert.notEqual(ids[0],ids[1]);
 const repeated=await request('/v1/roll',tokens[0],{rollId:'test-roll-0'});
 assert.equal(repeated.data.episode.id,ids[0]);
 const hist=await request('/v1/history',tokens[0]);assert.equal(hist.data.rolls.length,2);
});
test('validated owner-submitted replay URLs do not become falsely verified recordings',async()=>{
 const {request,tokens}=await fixture();
 await request('/v1/following/import',tokens[0],{accounts:['@HodlMagoo'],snapshotId:'magoo-owner'});
 const missing=await request('/v1/spaces/import',tokens[1],{hostId:'handle:hodlmagoo',episodes:['https://x.com/i/spaces/1YqKDQXAbcDE']});
 assert.equal(missing.status,404);
 const wrong=await request('/v1/spaces/import',tokens[0],{hostId:'handle:hodlmagoo',episodes:['https://evil.example/i/spaces/1YqKDQXAbcDE']});
 assert.equal(wrong.status,400);
 const saved=await request('/v1/spaces/import',tokens[0],{hostId:'handle:hodlmagoo',importId:'magoo-new-1',episodes:[{title:'Original X Space submitted',url:'https://twitter.com/i/spaces/1YqKDQXAbcDE'}]});
 assert.equal(saved.status,201);assert.equal(saved.data.availability,'indexed');
 const list=await request('/v1/following',tokens[0]);assert.equal(list.data.accounts[0].episodes,1);
 const roll=await request('/v1/roll',tokens[0],{rollId:'roll-magoo'});
 assert.equal(roll.data.episode.url,'https://x.com/i/spaces/1YqKDQXAbcDE');
 assert.equal(roll.data.episode.playbackVerified,false);
 const other=await request('/v1/following',tokens[1]);assert.deepEqual(other.data.accounts,[]);
});
