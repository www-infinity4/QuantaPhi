'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {DatabaseSync}=require('node:sqlite'),{createHash}=require('node:crypto');
const source=fs.readFileSync('workers/media-star-following/worker.js','utf8');
const mod=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function d1(db){
 const stmt=(sql,args=[])=>({bind(...values){return stmt(sql,values)},
 async first(){return db.prepare(sql).get(...args)||null},
 async all(){return{results:db.prepare(sql).all(...args)}},
 async run(){return{meta:{changes:db.prepare(sql).run(...args).changes}}}});
 return{prepare:sql=>stmt(sql),async batch(ops){db.exec('BEGIN');try{const results=[];for(const s of ops)results.push(await s.run());db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}}};
}
const tok='sq_'+'x'.repeat(38),other='sq_'+'y'.repeat(38);
async function fixture(){
 const db=new DatabaseSync(':memory:'),identity=new DatabaseSync(':memory:');
 db.exec(fs.readFileSync('workers/media-star-following/schema.sql','utf8'));
 identity.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY);CREATE TABLE account_devices(token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL)');
 for(const [t,id]of [[tok,'owner-one'],[other,'owner-two']]){
  identity.prepare('INSERT INTO accounts(id) VALUES(?)').run(id);
  identity.prepare('INSERT INTO account_devices(token_hash,account_id) VALUES(?,?)').run(createHash('sha256').update(t).digest('hex'),id)
 }
 const {handle,randBelow,directSpace}=await mod;
 const env={DB:d1(db),IDENTITY_DB:d1(identity)};
 const call=(path,token=null,data=null,method)=>handle(new Request('https://media-star-following-spaces.example'+path,{method:method||((data!==null)?'POST':'GET'),
  headers:{...(token?{Authorization:'Bearer '+token}:{})},...(data!==null?{body:JSON.stringify(data)}:{})}),env);
 return{db,env,call,randBelow,directSpace};
}
test('verified URL normalizer refuses profile links, wrong hosts and spoofed IDs',async()=>{
 const {directSpace}=await fixture();
 assert.equal(directSpace('https://twitter.com/i/spaces/1OyKAjYPeXqGb?utm=a').url,'https://x.com/i/spaces/1OyKAjYPeXqGb');
 for(const u of ['https://x.com/dotkrueger','https://evil.example/i/spaces/1OyKAjYPeXqGb','https://x.com/i/spaces/short','https://x.com/i/spaces/1OyKAjYPeXqGb/extra','javascript:alert(1)'])assert.equal(directSpace(u),null,u);
});
test('following snapshot preserves owner separation, anti-duplicates and 41 eligible host tickets',async()=>{
 const {call,db}=await fixture();
 const people=Array.from({length:41},(_,i)=>'follow'+String(i+1).padStart(2,'0'));
 let r=await call('/v1/following/import',tok,{following:people});assert.equal(r.status,200);assert.equal((await r.json()).imported,41);
 assert.equal((await (await call('/v1/following',other)).json()).count,0);
 for(let i=0;i<41;i++){
  const handle=people[i],hid='handle:'+handle;
  for(let j=1;j<=33;j++){
   const id=String(i+1).padStart(2,'0')+String(j).padStart(2,'0')+'ABCDEFGHIJKLM';
   db.prepare("INSERT INTO space_episodes(space_id,host_user_id,title,space_url,source_type,availability,imported_at) VALUES(?,?,?,?,'owner_submitted','indexed',?)").run(id,hid,'Space '+j,'https://x.com/i/spaces/'+id,Date.now());
  }
 }
 const hosts=(await(await call('/v1/hosts',tok)).json()).hosts;assert.equal(hosts.length,41);
 let r1=await call('/v1/roll',tok,{rollId:'random-first-001'});
 assert.equal(r1.status,200);let data=await r1.json();
 assert.equal(data.roll.hostRange,41);assert.equal(data.roll.episodeRange,33);
 assert.ok(data.roll.hostRoll>=1&&data.roll.hostRoll<=41);
 assert.ok(data.roll.episodeRoll>=1&&data.roll.episodeRoll<=33);
 const again=await(await call('/v1/roll',tok,{rollId:'random-first-001'})).json();
 assert.equal(again.reused,true);assert.equal(again.roll.spaceId,data.roll.spaceId);
 const chosen=await(await call('/v1/episodes?handle='+data.roll.handle,tok)).json();
 assert.equal(chosen.count,33);
 let second=await(await call('/v1/roll',tok,{rollId:'random-second-002'})).json();
 if(second.roll.handle===data.roll.handle)assert.equal(second.roll.episodeRange,32);
});
test('Fred remains discoverable but the platform curator retains unlock control',async()=>{
 const {call,db}=await fixture();
 db.prepare("INSERT INTO space_hosts(x_user_id,handle,display_name,profile_url,featured,updated_at) VALUES('dotkrueger','dotkrueger','Fred Krueger','https://x.com/dotkrueger',1,1)").run();
 db.prepare("INSERT INTO space_episodes(space_id,host_user_id,title,space_url,source_type,availability,imported_at) VALUES('1OyKAjYPeXqGb','dotkrueger','Bitcoin and Coffee','https://x.com/i/spaces/1OyKAjYPeXqGb','curated_archive','indexed',1)").run();
 await call('/v1/following/import',tok,{following:['dotkrueger']});
 const list=await(await call('/v1/episodes?handle=dotkrueger',tok)).json();
 assert.equal(list.count,1);assert.equal(list.episodes[0].url,null);
 let chosen=await(await call('/v1/roll',tok,{rollId:'fred-episode-01'})).json();
 assert.equal(chosen.roll.requiresOriginalUnlock,true);assert.equal(chosen.roll.url,null);
 const same=await(await call('/v1/roll',tok,{rollId:'fred-episode-01'})).json();
 assert.equal(same.roll.url,null);
});
test('manual following is labeled unverified, direct imported URLs require a followed host',async()=>{
 const {call}=await fixture();
 await call('/v1/following/import',tok,{following:['HodlMagoo']});
 const first=await(await call('/v1/following',tok)).json();
 assert.equal(first.following[0].source,'owner_import');
 const bad=await(await call('/v1/space/import',tok,{episodes:[{handle:'notFollowed',url:'https://x.com/i/spaces/1OyKAjYPeXqGb',title:'A space'}]})).json();
 assert.equal(bad.added,0);
 const inserted=await(await call('/v1/space/import',tok,{episodes:[{handle:'HodlMagoo',url:'https://x.com/i/spaces/1OyKAjYPeXqGb',title:'Test source is indexed, not verified'}]})).json();
 assert.equal(inserted.added,1);assert.equal(inserted.recordingStatus,'indexed_links_unverified');
 const browse=await(await call('/v1/episodes?handle=HodlMagoo',tok)).json();assert.equal(browse.episodes.length,1);
 const sync=await call('/v1/following/sync',tok,{});assert.equal(sync.status,503);
});

test('original X Space import has durable receipt and retry cannot double import',async()=>{
 const {call,db}=await fixture();
 await call('/v1/following/import',tok,{following:['HodlMagoo']});
 const input={importId:'repeat-import-0001',episodes:[{handle:'HodlMagoo',url:'https://x.com/i/spaces/1OyKAjYPeXqGb',title:'Verified format, unverified playback'}]};
 let response=await call('/v1/space/import',tok,input);
 assert.equal(response.status,200);
 const first=await response.json();assert.equal(first.added,1);
 response=await call('/v1/space/import',tok,input);
 assert.equal(response.status,200);
 const same=await response.json();assert.equal(same.unchanged,true);
 assert.equal(same.added,1);
 const episodes=db.prepare('SELECT COUNT(*) AS n FROM space_episodes').get().n;
 const receipts=db.prepare('SELECT COUNT(*) AS n FROM space_import_runs').get().n;
 assert.equal(episodes,1);assert.equal(receipts,1);
 const otherResponse=await call('/v1/history',other);
 assert.equal(otherResponse.status,200);assert.equal((await otherResponse.json()).count,0);
});
