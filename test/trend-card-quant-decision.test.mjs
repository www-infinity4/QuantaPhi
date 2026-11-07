import test from 'node:test';
import assert from 'node:assert/strict';
import {rankQuantCandidates,fetchQuantDecision,permittedPacketTags} from '../workers/trend-card-engine/quant-decision.mjs';

const candidates=[
 {id:'pink-floyd-animals-50',title:'Pink Floyd Animals 50 Sheep',artist:'Pink Floyd',category:'music',tags:['pink floyd','sheep','vinyl']},
 {id:'banking-card',title:'Compare bank accounts',artist:'',category:'finance',tags:['bank','account']},
 {id:'restricted-card',title:'Adults only',category:'21+',tags:['pink floyd']},
];
test('Orange uses existing Quant searches and genuine card interactions when a user asks',()=>{
 const result=rankQuantCandidates(candidates,{
  searches:[{query_text:'Pink Floyd sheep animals anniversary'}],
  interactions:[{title:'Pink Floyd radio',index_terms:'pink floyd, animals',kind:'music',action:'open'}],
  collects:[{title:'Animals vinyl',type:'music'}],
  tags:[],
 },{title:'Pink Floyd radio'},[]);
 assert.deepEqual(result.map(x=>x.id),['pink-floyd-animals-50','banking-card']);
 assert.ok(result[0].score>result[1].score);
 assert.equal(result[0].reason,'Matched to your QuantaPhi activity');
 assert.equal('query_text' in result[0],false);
});
test('no private signals required for deterministic contextual selection; seen cards yield',()=>{
 const result=rankQuantCandidates(candidates,{searches:[],interactions:[],collects:[],tags:[]},{title:'Pink Floyd radio'},['pink-floyd-animals-50']);
 assert.deepEqual(result.map(x=>x.id),['banking-card']);
});
test('Quant packet tags are purpose-scoped and expired ones never make targeting evidence',()=>{
 const rows=[
 {tag_key:'pink floyd',confidence:0.99,permissions_json:JSON.stringify({purposes:['personalized_discovery']})},
 {tag_key:'health',confidence:1,permissions_json:JSON.stringify({purposes:['inventory_planning']})},
 {tag_key:'sheep',confidence:0.8,permissions_json:JSON.stringify({purposes:['personalized_discovery'],expires_at:'2020-01-01T00:00:00Z'})}
 ];
 assert.deepEqual(permittedPacketTags(rows,Date.parse('2026-11-07T00:00:00Z')).map(x=>x.tag_key),['pink floyd']);
});
test('all personalized requests require verified device authorization and explicit consent',async()=>{
 let called=0;
 const env={IDENTITY_DB:{prepare(){called++;throw new Error('should not query')}}};
 const unauthorized=await fetchQuantDecision(new Request('https://example.com/decision',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({consent:true,candidates})}),env);
 assert.equal(unauthorized.status,401);assert.equal(called,0);
 const optedOut=await fetchQuantDecision(new Request('https://example.com/decision',{method:'POST',headers:{authorization:'Bearer sq_'+'a'.repeat(40),'content-type':'application/json'},body:JSON.stringify({consent:false,candidates})}),env);
 assert.equal(optedOut.status,403);assert.equal(called,0);
});
test('one user cannot receive another user’s signals and no raw record leaves server',async()=>{
 const token='sq_'+'a'.repeat(40),queries=[];
 const identity={prepare(sql){queries.push({sql});return{bind(...args){queries.at(-1).args=args;return this},async first(){return {user_id:'user-A'}}}}};
 const ledger={prepare(sql){queries.push({sql});return{bind(...args){queries.at(-1).args=args;return this},async first(){return {wallet_id:'wallet-A',status:'active'}},async all(){
  if(sql.includes('quanta_search_journal'))return{results:[{query_text:'pink floyd sheep'}]};
  return{results:[]};
 }}}};
 const packet={prepare(sql){queries.push({sql});return{bind(...args){queries.at(-1).args=args;return this},async all(){return {results:[]}}}}};
 const req=new Request('https://example.com/decision',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({consent:true,candidates,context:{title:'music'}})});
 const resp=await fetchQuantDecision(req,{IDENTITY_DB:identity,QUANTA_DB:ledger,QUANT_AI_DB:packet});
 assert.equal(resp.status,200);
 const body=await resp.json();
 assert.equal(body.ok,true);assert.equal(body.mode,'authenticated_own_quant_data');
 assert.equal(body.placement_authorized,false);
 assert.equal(body.ranked[0].id,'pink-floyd-animals-50');
 assert.equal(JSON.stringify(body).includes('pink floyd sheep'),false);
 assert.ok(queries.some(x=>x.sql.includes('quanta_search_journal')&&x.args.includes('user-A')&&x.args.includes('wallet-A')));
 assert.ok(queries.some(x=>x.sql.includes('quant_collects')&&x.args.includes('wallet-A')));
 assert.ok(queries.some(x=>x.sql.includes('quanta_card_interactions')&&x.args.includes('user-A')));
 assert.ok(queries.some(x=>x.sql.includes('quant_tags')&&x.args.includes('wallet-A')));
 assert.ok(queries.every(x=>!x.sql.includes('SELECT *')));
});
