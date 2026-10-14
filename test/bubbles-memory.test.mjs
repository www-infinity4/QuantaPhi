import test from 'node:test';
import assert from 'node:assert/strict';
import {handle,validEvent} from '../workers/bubbles-memory/worker.mjs';

function fixture(){
 const rows=[],next={seq:1};
 const db={prepare(sql){
  return {bind(...args){return {
   async all(){
    if(sql.includes('text LIKE')){const [owner,pattern]=args;
     const needle=pattern.slice(1,-1).replace(/\\([%_\\])/g,'$1').toLowerCase();
     return {results:rows.filter(x=>x.owner===owner&&x.text.toLowerCase().includes(needle)).sort((a,b)=>b.seq-a.seq).slice(0,24)};
    }
    const [owner,after,limit]=args;
    return {results:rows.filter(x=>x.owner===owner&&x.seq>after).sort((a,b)=>a.seq-b.seq).slice(0,limit)};
   },
   async run(){
    if(sql.startsWith('DELETE')){const [owner]=args;let count=0;
     for(let i=rows.length-1;i>=0;i--)if(rows[i].owner===owner){rows.splice(i,1);count++}
     return {meta:{changes:count}};
    }
    if(sql.startsWith('INSERT')){const [owner,id,role,text,at]=args;
     if(rows.some(x=>x.owner===owner&&x.id===id))return {meta:{changes:0}};
     rows.push({seq:next.seq++,owner,id,role,text,at});return {meta:{changes:1}};
    }
    throw Error('Unexpected SQL '+sql);
   }
  }}};
 },async batch(statements){return Promise.all(statements.map(stmt=>stmt.run()))}};
 const wallet={async fetch(url,{headers}){
  const token=headers.Authorization;
  if(!['Bearer owner-token-valid-1234','Bearer guest-token-valid-1234'].includes(token))
   return new Response('{}',{status:401});
  return Response.json({ok:true,user:{id:token.includes('owner-token')?'owner':'guest'}});
 }};
 return {MEMORY_DB:db,BOT_WALLET:wallet};
}
const origin='https://quantaphi.org';
function req(path,method='GET',bearer='owner-token-valid-1234',body,overrideOrigin=origin){
 return new Request('https://bubbles-memory.marvaseater.workers.dev'+path,
  {method,headers:{Origin:overrideOrigin,Authorization:'Bearer '+bearer,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
}
test('unauthorized origins and identities cannot read or write memory',async()=>{
 const env=fixture();
 assert.equal((await handle(req('/v1/history','GET','owner-token-valid-1234',null,'https://example.com'),env)).status,403);
 assert.equal((await handle(req('/v1/history','GET','invalid-token-123456789'),env)).status,401);
 assert.equal((await handle(req('/v1/events','POST','invalid-token-123456789',{events:[]}),env)).status,401);
});
test('idempotent append, scoped retrieval, keyword search and deletion',async()=>{
 const env=fixture(),at=Date.now(),events=[{id:'turn_user_12345',role:'user',text:'Bubbles remembers a resonator skill',at},
  {id:'turn_ai_1234567',role:'assistant',text:'Resonator calculates the circuit.',at:at+1}];
 assert.equal(validEvent(events[0]),true);
 assert.equal((await handle(req('/v1/events','POST','owner-token-valid-1234',{events}),env)).status,200);
 let r=await handle(req('/v1/events','POST','owner-token-valid-1234',{events}),env);
 assert.equal((await r.json()).accepted,0);
 assert.equal((await (await handle(req('/v1/history'),env)).json()).events.length,2);
 assert.equal((await (await handle(req('/v1/history','GET','guest-token-valid-1234'),env)).json()).events.length,0);
 assert.equal((await (await handle(req('/v1/search?q=resonator'),env)).json()).events.length,2);
 const a=await (await handle(req('/v1/profile'),env)).json();
 const b=await (await handle(req('/v1/profile','GET','guest-token-valid-1234'),env)).json();
 assert.match(a.profile,/^[a-f0-9]{64}$/);assert.notEqual(a.profile,b.profile);
 assert.equal((await (await handle(req('/v1/history','DELETE'),env)).json()).deleted,2);
 assert.equal((await (await handle(req('/v1/history'),env)).json()).events.length,0);
});
test('reject malformed or oversized events without recording any row',async()=>{
 const env=fixture();
 assert.equal((await handle(req('/v1/events','POST','owner-token-valid-1234',{events:[{id:'bad',role:'user',text:'x',at:Date.now()}]}),env)).status,400);
 assert.equal((await handle(req('/v1/events','POST','owner-token-valid-1234',{events:[{id:'event_1234567',role:'user',text:'x'.repeat(6001),at:Date.now()}]}),env)).status,400);
 assert.equal((await (await handle(req('/v1/history'),env)).json()).events.length,0);
});
