import test from 'node:test';
import assert from 'node:assert/strict';
import {nextOwnerJobPage} from '../workers/infinity-brain-clock/work-queue-cursor.mjs';

const OWNER='a'.repeat(64),OTHER='b'.repeat(64);
function fixture(count=205){
 const rows=Array.from({length:count},(_,i)=>({id:'IW-'+String(i).padStart(5,'0'),created_at:i+1,
  status:i%17===0?'blocked':'ready',context_json:'{"kind":"robot-directions"}',request:'sample',owner_hash:OWNER}));
 rows.push({id:'foreign-1',created_at:2,status:'ready',context_json:'{"kind":"robot-directions"}',owner_hash:OTHER});
 const state=new Map(), calls=[];
 const storage={get:async key=>state.get(key),put:async(key,val)=>state.set(key,val)};
 const db={prepare(sql){
   assert.match(sql,/owner_hash=\?/);
   assert.match(sql,/json_extract\(context_json,'\$\.kind'\)/);
   return {bind(...params){return {async all(){
     calls.push({sql,params});
     const [owner,t1,t2,id,max]=params;
     const data=rows.filter(r=>r.owner_hash===owner&&['ready','working','blocked'].includes(r.status)&&r.context_json.includes('robot-directions'))
       .filter(r=>sql.includes('created_at>?')
         ?r.created_at>t1||(r.created_at===t2&&r.id>id)
         :r.created_at<t1||(r.created_at===t2&&r.id<=id))
       .sort((a,b)=>a.created_at-b.created_at||a.id.localeCompare(b.id))
       .slice(0,max);
     return {results:data};
   }}}};
 }};
 return {db,storage,rows,calls,state};
}
test('rotates through an older than 100-ticket backlog without a manual click',async()=>{
 const f=fixture(),seen=new Set();
 for(let i=0;i<4;i++){
   const page=await nextOwnerJobPage(f.db,f.storage,OWNER,'dispatch-retry');
   assert.ok(page.rows.length<=100);
   assert.equal(page.scanned,page.rows.length);
   assert.equal(new Set(page.rows.map(x=>x.id)).size,page.rows.length);
   assert.ok(page.rows.every(x=>x.owner_hash===OWNER));
   page.rows.forEach(r=>seen.add(r.id));
 }
 assert.equal(seen.size,205,'oldest, middle and newest tickets must all be examined');
 assert.ok(f.calls.length>=5,'when the cursor reaches the tail it wraps safely');
});
test('different scheduler stages have independent cursors',async()=>{
 const f=fixture();
 const first=await nextOwnerJobPage(f.db,f.storage,OWNER,'dispatch-retry');
 const second=await nextOwnerJobPage(f.db,f.storage,OWNER,'claim-runner');
 assert.deepEqual(first.rows.map(r=>r.id),second.rows.map(r=>r.id));
 const resumed=await nextOwnerJobPage(f.db,f.storage,OWNER,'dispatch-retry');
 assert.notDeepEqual(first.rows[0].id,resumed.rows[0].id);
});
test('empty work pages, malformed cursors and invalid partitions fail safely',async()=>{
 const f=fixture(0);
 assert.equal((await nextOwnerJobPage(f.db,f.storage,OWNER,'recover-stale')).rows.length,0);
 f.state.set('owner-ticket-cursor:recover-stale',{createdAt:'broken',id:9});
 assert.equal((await nextOwnerJobPage(f.db,f.storage,OWNER,'recover-stale')).rows.length,0);
 await assert.rejects(()=>nextOwnerJobPage(f.db,f.storage,'', 'dispatch-retry'),/invalid_owner_job_cursor_scope/);
 await assert.rejects(()=>nextOwnerJobPage(f.db,f.storage,OWNER,'../outside'),/invalid_owner_job_cursor_scope/);
});
test('cursor follows keyset ordering when rows share a timestamp',async()=>{
 const f=fixture(0);
 for(const id of ['A','B','C','D'])f.rows.push({id,created_at:123,status:'ready',context_json:'{"kind":"robot-directions"}',owner_hash:OWNER});
 const first=await nextOwnerJobPage(f.db,f.storage,OWNER,'dispatch-retry',{limit:3});
 assert.deepEqual(first.rows.map(x=>x.id),['A','B','C']);
 const second=await nextOwnerJobPage(f.db,f.storage,OWNER,'dispatch-retry',{limit:3});
 assert.deepEqual(second.rows.map(x=>x.id),['D','A','B']);
});
