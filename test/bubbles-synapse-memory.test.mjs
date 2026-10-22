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
 const db={prepare(sql){return{
 async run(){if(sql.startsWith('CREATE'))return {meta:{changes:0}};throw Error('Unexpected unbound SQL: '+sql)},
 bind(...args){return{
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
   const isTopic=sql.includes('AND topic=?'),offset=Number(args[isTopic?2:1]||0);
   return {results:rows.filter(x=>x.owner===owner&&(!isTopic||x.topic===args[1])).map(x=>({
    id:x.id,text:x.text,repository:x.repository,source:x.source,sessionId:x.sessionId,messageId:x.messageId,
    topic:x.topic,basis:x.basis,relatedIds:x.relatedIds,at:x.at
   })).sort((a,b)=>b.at-a.at||b.id.localeCompare(a.id)).slice(offset,offset+251)};
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


test('misspelled radio queries find categorized records with inspectable evidence',()=>{
 const electronic=normalizeSynapse(note('memory_radio_201','I built a receiver with an antenna and tuned circuits'));
 const musical=normalizeSynapse(note('memory_radio_202','Infinity Radio playlist',{repository:'www-infinity4/Infinity-Radio'}));
 const result=recallSynapses([electronic,musical],'What did I say about radyo electronics?',5);
 assert.equal(result[0].id,electronic.id);
 assert.ok(result[0].matchedTerms.includes('radyo'));
 assert.ok(result[0].matchedBy.includes('related'));
 assert.equal(result[0].basis,'repository_hint');
 assert.equal(result[1].id,musical.id);
});
test('invented terms require an actual note; the engine never fabricates definitions',()=>{
 const notes=[
  normalizeSynapse(note('memory_radio_211','Fooey is my shorthand for checking parser fallback behavior.')),
  normalizeSynapse(note('memory_radio_212','Regular AM receiver repairs'))
 ];
 assert.equal(recallSynapses(notes,'what is fooey')[0].id,'memory_radio_211');
 assert.equal(recallSynapses(notes,'what is foeey')[0].id,'memory_radio_211');
 assert.deepEqual(recallSynapses(notes,'what is zephyrunnamed'),[]);
 assert.deepEqual(recallSynapses(notes,'What do I remember?').map(x=>x.id).sort(),
  ['memory_radio_211','memory_radio_212']);
});
test('typo matches are bounded and weaker than literal matches',()=>{
 const notes=[
  normalizeSynapse(note('memory_radio_221','I tested capacitor faults')),
  normalizeSynapse(note('memory_radio_222','I tested capactor probes'))
 ];
 const ranked=recallSynapses(notes,'capactor',5);
 assert.equal(ranked[0].id,'memory_radio_222');
 assert.equal(ranked[0].matchedBy[0],'exact');
 assert.equal(ranked[1].id,'memory_radio_221');
 assert.ok(ranked[1].matchedBy.includes('typo'));
 assert.deepEqual(recallSynapses(notes,'capxyzxyz'),[]);
});
test('untrusted cross-owner references never become neighbor memory excerpts',()=>{
 const visible=normalizeSynapse(note('memory_radio_231','Antennas for the household radio',
  {relatedTo:['memory_radio_232']}));
 const fromOtherOwner=normalizeSynapse(note('memory_radio_232','Private note from another account'));
 const returned=recallSynapses([visible],'antenna',5);
 assert.equal(returned.length,1);
 assert.deepEqual(returned[0].neighbors,[]);
 assert.ok(!JSON.stringify(returned).includes('Private note'));
 assert.equal(recallSynapses([visible,fromOtherOwner],'nonexistent',5).length,0);
});

test('category filters, page boundaries and wallet isolation are enforced by the query',async()=>{
 const env=fixture();
 for(let i=0;i<251;i+=10){
  const notes=Array.from({length:Math.min(10,251-i)},(_,j)=>
   note('memory_radio_'+String(i+j).padStart(5,'0'),'Radio circuit indexed memory '+(i+j),{at:at-(i+j)*1000}));
  const r=await handle(call('/v1/synapses','POST','alice',{notes}),env);
  assert.equal(r.status,200);
 }
 let r=await handle(call('/v1/synapses?topic=electronics_computing&offset=0&limit=2'),env);
 let j=await r.json();
 assert.equal(r.status,200);assert.equal(j.memories.length,2);
 assert.equal(j.scanned,250);assert.equal(j.hasMore,true);assert.equal(j.nextOffset,250);
 r=await handle(call('/v1/synapses?topic=electronics_computing&offset=250'),env);
 j=await r.json();
 assert.equal(j.scanned,1);assert.equal(j.hasMore,false);assert.equal(j.nextOffset,null);
 r=await handle(call('/v1/synapses?topic=music_radio','GET','alice'),env);
 assert.equal((await r.json()).memories.length,0);
 r=await handle(call('/v1/synapses?topic=electronics_computing','GET','bob'),env);
 assert.equal((await r.json()).memories.length,0);
 r=await handle(call('/v1/synapses?topic=other','GET','alice'),env);
 assert.equal(r.status,400);assert.equal((await r.json()).error,'invalid_topic');
 r=await handle(call('/v1/synapses?offset=-1','GET','alice'),env);
 assert.equal(r.status,400);assert.equal((await r.json()).error,'invalid_offset');
});
