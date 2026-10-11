'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {DatabaseSync}=require('node:sqlite'),{createHash,webcrypto}=require('node:crypto');
globalThis.crypto=webcrypto;
const worker=import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('workers/phi-card-catalog/worker.js','utf8')).toString('base64'));
function d1(db){
 return {prepare(sql){return{bind(...args){const stmt=db.prepare(sql);
  return {first:async()=>stmt.get(...args)||null,all:async()=>({results:stmt.all(...args)}),run:async()=>({meta:{changes:stmt.run(...args).changes}})}
 }}}};
}
async function fixture(){
 const db=new DatabaseSync(':memory:'),idb=new DatabaseSync(':memory:');
 db.exec(fs.readFileSync('workers/phi-card-catalog/schema.sql','utf8'));
 idb.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY); CREATE TABLE account_devices(token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL);');
 const tokens=['sq_'+'a'.repeat(38),'sq_'+'b'.repeat(38)];
 tokens.forEach((t,i)=>{const id='u'+i;idb.prepare('INSERT INTO accounts(id) VALUES(?)').run(id);idb.prepare('INSERT INTO account_devices(token_hash,account_id) VALUES(?,?)').run(createHash('sha256').update(t).digest('hex'),id)});
 const handle=(await worker).handle;const env={DB:d1(db),IDENTITY_DB:d1(idb)};
 const req=(path,token=null,value=null,method)=>handle(new Request('https://quantaphi.org'+path,{
  method:method||(value?'POST':'GET'),
  headers:{...(token?{authorization:'Bearer '+token}:{}),...(value?{'content-type':'application/json'}:{})},
  ...(value?{body:JSON.stringify(value)}:{})
 }),env);
 return{db,idb,tokens,req};
}
test('anonymous writes are denied and empty public sites reveal nothing',async()=>{
 const {req}=await fixture();
 const x=await req('/v1/sites',null,{name:'An intruder',requestKey:'dummmy123'});assert.equal(x.status,401);
 const p=await req('/v1/public/anything/stories');assert.equal(p.status,404);
});
test('user-owned sites and card instances cannot cross tenant boundaries',async()=>{
 const {req,tokens}=await fixture();
 const a=await req('/v1/sites',tokens[0],{name:'First Reader',origin:'https://first.example',requestKey:'stable-first'});assert.equal(a.status,201);
 const A=(await a.json()).site;
 const repeat=await req('/v1/sites',tokens[0],{name:'First Reader',origin:'https://first.example',requestKey:'stable-first'});assert.equal((await repeat.json()).site.id,A.id);
 const b=await req('/v1/sites',tokens[1],{name:'Second Reader',origin:'https://second.example',requestKey:'stable-second'});const B=(await b.json()).site;
 assert.notEqual(A.id,B.id);
 assert.equal((await req('/v1/sites/'+A.id+'/cards',tokens[1])).status,404);
 assert.equal((await req('/v1/sites/'+B.id+'/cards',tokens[0])).status,404);
 const instanceId='reader-card-01';
 const added=await req('/v1/sites/'+A.id+'/cards',tokens[0],{cardId:'reads-realms',instanceId,options:{name:'Only my stories',access:'free'}});
 assert.equal(added.status,200);
 const steal=await req('/v1/sites/'+B.id+'/cards',tokens[1],{cardId:'reads-realms',instanceId,options:{name:'hijack'}});
 assert.equal(steal.status,409);
 const cards=await (await req('/v1/sites/'+A.id+'/cards',tokens[0])).json();
 assert.equal(cards.cards[0].options.name,'Only my stories');
});
test('reader stories remain private drafts until reviewed and published, never migrate platform library',async()=>{
 const {req,tokens}=await fixture();
 const newSite=await req('/v1/sites',tokens[0],{name:'Forest Archive',requestKey:'forest-reader'});
 const A=(await newSite.json()).site;
 const draftResponse=await req('/v1/sites/'+A.id+'/stories',tokens[0],{title:'My pine forest research',body:'A carefully documented original story about a forest investigation.',sources:['https://museum.example/forest-study']});
 assert.equal(draftResponse.status,201);
 const story=(await draftResponse.json()).story;
 const publicPath='/v1/public/'+A.slug+'/stories';
 assert.equal((await(await req(publicPath)).json()).stories.length,0);
 assert.equal((await req('/v1/sites/'+A.id+'/stories/'+story.id+'/publish',tokens[1],{reviewedBy:'Other editor',editorialReviewed:true})).status,404);
 assert.equal((await req('/v1/sites/'+A.id+'/stories/'+story.id+'/publish',tokens[0],{reviewedBy:'',editorialReviewed:false})).status,403);
 const approve=await req('/v1/sites/'+A.id+'/stories/'+story.id+'/publish',tokens[0],{reviewedBy:'Verified site owner',editorialReviewed:true,documentedStory:true});
 assert.equal(approve.status,200);
 const published=(await(await req(publicPath)).json()).stories;
 assert.equal(published.length,1);assert.equal(published[0].sources[0],'https://museum.example/forest-study');
 const paid=await req('/v1/sites/'+A.id+'/cards',tokens[0],{cardId:'reads-realms',instanceId:'paid-reader-1',options:{name:'Premium',access:'paid'}});
 assert.equal(paid.status,409,'unwired payment must not silently publish');
});
test('research signals require owner auth and a genuine card in that site',async()=>{
 const {req,tokens,db}=await fixture();
 const a=(await(await req('/v1/sites',tokens[0],{name:'Research Lab',requestKey:'lab-001234'})).json()).site;
 const path='/v1/sites/'+a.id+'/events';
 const event={instanceId:'no-card-yet',eventId:'click-101',kind:'click',query:'lithium',url:'https://nasa.gov/study'};
 assert.equal((await req(path,tokens[0],event)).status,404);
 assert.equal((await req(path,tokens[1],event)).status,404);
 await req('/v1/sites/'+a.id+'/cards',tokens[0],{cardId:'search-viewer',instanceId:'no-card-yet',options:{name:'Viewer'}});
 assert.equal((await req(path,tokens[0],event)).status,200);
 assert.equal((await req(path,tokens[0],event)).status,200);
 const count=db.prepare('SELECT COUNT(*) AS n FROM card_research_events').get().n;assert.equal(count,1);
});
