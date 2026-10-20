import test from 'node:test';
import assert from 'node:assert/strict';
import {routeNamespace,normalizeSynapse,recallSynapses} from '../workers/bubbles-memory/synapse-memory.mjs';
import {handle} from '../workers/bubbles-memory/worker.mjs';
const at=Date.now(),repo='www-infinity4/Radio-Clubhouse';
const note=(id,text,more={})=>({id,text,repository:repo,at,...more});
test('repository hints add contextual origin but never claim verified factual truth',()=>{
 assert.deepEqual(routeNamespace(repo),{topic:'electronics_computing',basis:'repository_hint'});
 assert.deepEqual(routeNamespace(repo,'physics_science'),{topic:'physics_science',basis:'owner_selected'});
 assert.deepEqual(routeNamespace('', ''),{topic:'general',basis:'general_fallback'});
 assert.equal(normalizeSynapse(note('memory_radio_001','Resonant circuits use inductance and capacitance')).topic,'electronics_computing');
 assert.throws(()=>normalizeSynapse(note('tiny','bad')),/memory_note_invalid/);
 assert.throws(()=>normalizeSynapse(note('memory_radio_002','A note',{repository:'https://untrusted.example/'})),/memory_note_invalid/);
 assert.throws(()=>normalizeSynapse(note('memory_radio_002','A note',{relatedTo:['memory_radio_002']})),/memory_links_invalid/);
});
test('related notes only resolve within the rows belonging to that owner',()=>{
 const first=normalizeSynapse(note('memory_radio_010','Hydrogen science and radio',{relatedTo:['memory_radio_011','foreign_node_77']}));
 const second=normalizeSynapse(note('memory_radio_011','Hydrogen plasma theory'));
 const results=recallSynapses([first,second],'hydrogen',3);
 assert.equal(results[0].neighbors.some(x=>x.id==='foreign_node_77'),false);
 assert.equal(results.find(x=>x.id===first.id).neighbors[0].id,second.id);
});
function fixture(){
 const rows=[];
 const db={prepare(sql){return{bind(...args){return{
  async run(){
   if(sql.startsWith('CREATE'))return {meta:{changes:0}};
   if(sql.startsWith('INSERT OR IGNORE INTO bubbles_synapses')){
    const [owner,id,text,repository,source,sessionId,messageId,topic,basis,relatedIds,at]=args;
    if(rows.some(x=>x.owner===owner&&x.id===id))return {meta:{changes:0}};
    rows.push({owner,id,text,repository,source,sessionId,messageId,topic,basis,relatedIds,at});
    return {meta:{changes:1}};
   }
   if(sql.startsWith('DELETE FROM bubbles_synapses')){
    const [owner,id]=args,idx=rows.findIndex(x=>x.owner===owner&&x.id===id);
    if(idx>=0){rows.splice(idx,1);return{meta:{changes:1}}}
    return {meta:{changes:0}};
   }
   throw Error('Unexpected SQL: '+sql);
  },
  async all(){
   if(!sql.includes('FROM bubbles_synapses'))throw Error('Unexpected query');
   const [owner]=args;
   return {results:rows.filter(x=>x.owner===owner).map(x=>({
    id:x.id,text:x.text,repository:x.repository,source:x.source,sessionId:x.sessionId,messageId:x.messageId,
    topic:x.topic,basis:x.basis,relatedIds:x.relatedIds,at:x.at
   })).sort((a,b)=>b.at-a.at).slice(0,250)};
  }
 }}}},async batch(commands){return Promise.all(commands.map(x=>x.run()))}};
 const wallet={async fetch(_url,{headers}){
  if(!/^Bearer (alice|bob)-token-valid-1234$/.test(headers.Authorization))return Response.json({}, {status:401});
  return Response.json({ok:true,user:{id:headers.Authorization.includes('alice')?'alice':'bob'}});
 }};
 return {MEMORY_DB:db,BOT_WALLET:wallet};
}
const call=(path,method='GET',who='alice',payload)=>
 new Request('https://bubbles-memory.marvaseater.workers.dev'+path,{
 method,headers:{Origin:'https://quantaphi.org',Authorization:'Bearer '+who+'-token-valid-1234','Content-Type':'application/json'},
 ...(payload?{body:JSON.stringify(payload)}:{})
});
test('D1 notes are idempotent, wallet-isolated, retrievable by category and removable',async()=>{
 const env=fixture();
 const one=note('memory_radio_010','Hydrogen portal working theory',{relatedTo:['memory_radio_011']});
 const two=note('memory_radio_011','Radio antennas and waves');
 let r=await handle(call('/v1/synapses','POST','alice',{notes:[one,two]}),env);
 assert.equal(r.status,200);assert.equal((await r.json()).accepted,2);
 r=await handle(call('/v1/synapses','POST','alice',{notes:[one]}),env);
 assert.equal((await r.json()).accepted,0);
 r=await handle(call('/v1/synapses','GET','alice'),env);assert.equal((await r.json()).memories.length,2);
 r=await handle(call('/v1/synapses?q=hydrogen','GET','alice'),env);
 const memories=(await r.json()).memories;
 assert.equal(memories.length,1);assert.equal(memories[0].topic,'electronics_computing');
 assert.equal(memories[0].basis,'repository_hint');assert.equal(memories[0].neighbors[0].id,two.id);
 r=await handle(call('/v1/synapses?q=hydrogen','GET','bob'),env);
 assert.equal((await r.json()).memories.length,0);
 r=await handle(call('/v1/synapses','DELETE','bob',{id:one.id}),env);
 assert.equal((await r.json()).deleted,0);
 r=await handle(call('/v1/synapses','DELETE','alice',{id:one.id}),env);
 assert.equal((await r.json()).deleted,1);
});
test('invalid memory batches, other origins and unauthenticated visitors are rejected',async()=>{
 const env=fixture();
 let r=await handle(call('/v1/synapses','POST','alice',{notes:[note('bad','hello')]}),env);
 assert.equal(r.status,400);
 r=await handle(new Request('https://bubbles-memory.example/v1/synapses',{
  headers:{Origin:'https://evil.example',Authorization:'Bearer alice-token-valid-1234'}
 }),env);assert.equal(r.status,403);
 r=await handle(call('/v1/synapses','GET','outsider'),env);assert.equal(r.status,401);
});
