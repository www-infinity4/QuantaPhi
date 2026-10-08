const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'..','workers','reads-realms');
const worker=fs.readFileSync(path.join(base,'worker.js'),'utf8');
function load(){
 const scope={Response,URL,URLSearchParams,AbortSignal,crypto:globalThis.crypto||require('node:crypto').webcrypto,console,fetch:async()=>{throw Error('network should not be used')}};
 scope.globalThis=scope;
 vm.createContext(scope);
 vm.runInContext(worker.replace('export default {','globalThis.handler = {')+
  '\nglobalThis.testUtils={draw,counts,validateNarrative,stableKey};',scope,{timeout:5000});
 return scope;
}
function fakeDb(count=123){
 const sectors=[{id:1,name:'Energy & electricity',topics:count},{id:2,name:'Technology & computing',topics:9}];
 const subjects=[
  {id:31,term:'Helium',normalized:'helium',sector_id:1,reviewed:1},
  {id:32,term:'Hydrogen',normalized:'hydrogen',sector_id:1,reviewed:1},
  {id:33,term:'Oil',normalized:'oil',sector_id:1,reviewed:1}
 ];
 const calls=[];
 return {
  calls,
  prepare(sql){
   return {
    bind(...params){
     calls.push({sql,params});
     return {
      async all(){
       if(sql.includes('GROUP BY s.id'))return {results:sectors};
       return {results:[]};
      },
      async first(){
       if(sql.includes('FROM rr_topics'))
        return subjects.find(x=>x.sector_id===params[0] &&
         (!sql.includes('normalized=?')||x.normalized===params[1]) &&
         (!sql.includes('AND id=?')||x.id===params[1]))||null;
       if(sql.includes('FROM rr_refinements'))return {id:params[0]||4,label:'History'};
       if(sql.includes('FROM rr_genres'))return {id:params[0]||1,label:'Mystery',directive:'Factual mystery'};
       return null;
      }
     };
    }
   };
  }
 };
}
test('worker loads and never mutates wallet tables',()=>{
 const scope=load();assert.equal(typeof scope.handler.fetch,'function');
 const sql=fs.readFileSync(path.join(base,'schema.sql'),'utf8');
 const seed=fs.readFileSync(path.join(base,'seed-index.sql'),'utf8');
 assert.equal((sql.match(/CREATE TABLE IF NOT EXISTS rr_/g)||[]).length,8);
 assert.ok(!/DROP TABLE|DELETE FROM|UPDATE .*wallet/i.test(sql+seed+worker));
 assert.equal((seed.match(/INSERT OR IGNORE INTO rr_sectors/g)||[]).length,30);
 assert.ok((seed.match(/VALUES \(1,'/g)||[]).length>=100);
 assert.match(seed,/Helium/);
 assert.match(seed,/Hydrogen/);
 assert.match(seed,/Crude oil/);
});
test('sector must have 100 reviewed subjects to draw; never picks unrelated sector',async()=>{
 const scope=load(),db=fakeDb(99);
 const incomplete=await scope.testUtils.draw(db,{sectorId:1});
 assert.equal(incomplete.ok,false);
 assert.equal(incomplete.error,'sector_index_incomplete');
 assert.equal(db.calls.some(c=>c.sql.includes('FROM rr_topics')),false);
});
test('100+ subject Energy bracket honors requested Helium and separate research and story stages',async()=>{
 const scope=load(),db=fakeDb(123);
 const result=await scope.testUtils.draw(db,{sectorId:1,term:'Helium',refinementId:4,genreId:1,sourceClassId:7});
 assert.equal(result.ok,true);
 assert.equal(result.bracket.sector.id,1);
 assert.equal(result.bracket.topic.term,'Helium');
 assert.equal(result.bracket.research.name,'History');
 assert.equal(result.bracket.realm.name,'Mystery');
 assert.equal(result.bracket.sourceClass,7);
 assert.equal(result.bracket.firstQuery,'Helium History');
 assert.ok(!db.calls.some(c=>c.sql.includes('sector_id=2')));
});
test('already-selected IDs do not redraw another topic for writing',async()=>{
 const scope=load(),db=fakeDb(123);
 const result=await scope.testUtils.draw(db,{sectorId:1,topicId:31,refinementId:4,genreId:1,sourceClassId:8});
 assert.equal(result.bracket.topic.id,31);
 assert.equal(result.bracket.research.id,4);
 assert.equal(result.bracket.realm.id,1);
 assert.equal(result.bracket.sourceClass,8);
});
test('rejects an invented story or one supported by only one source domain',()=>{
 const scope=load();
 const data={title:'The mysterious helium discovery and its overlooked evidence',
  summary:'A discovered historical event with an unusual observation was reported and later examined by scientists. '.repeat(2),
  full:'Researchers noticed an unexpected pattern in a historical experiment. Subsequent investigators recorded a curious observation and discussed evidence in archival publications. '.repeat(3),
  detail:'An unexpected pattern was recorded in the historical experiment',
  evidence_urls:['https://www.example.com/a','https://example.com/b']};
 const items=[{title:'A historical helium experiment',excerpt:'An unexpected pattern was recorded in the historical experiment.',domain:'example.com',url:'https://www.example.com/a'},
  {title:'Independent history evidence',excerpt:'An unexpected pattern was recorded in the historical experiment.',domain:'example.com',url:'https://example.com/b'}];
 assert.equal(scope.testUtils.validateNarrative(data,items),null,'two paths at one publisher are not independent');
 data.evidence_urls[1]='https://other.org/b';items[1].url='https://other.org/b';items[1].domain='other.org';
 assert.ok(scope.testUtils.validateNarrative(data,items));
});
test('public requests cannot trigger paid AI writing without a server secret',async()=>{
 const scope=load(),db=fakeDb(123);
 const res=await scope.handler.fetch(new Request('https://reader.example/v1/story',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),{RR_INDEX:db});
 assert.equal(res.status,403);
 assert.equal((await res.json()).error,'forbidden');
});
