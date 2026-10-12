import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeExperience,recallOutcomes,rememberOutcome,retryPendingEmbeddings,redactExperience} from './brain-rag-memory.mjs';
const owner='a'.repeat(64),other='b'.repeat(64),repo='www-infinity4/Web-Phi';
const input={ownerHash:owner,repository:repo,ticketId:'IW-20261012-78129426',jobId:'TASK-4',status:'blocked',task:'Publish website token with creator ownership',summary:'Missing published website API',occurredAt:1000000000000};
const row=(id,ownerHash=owner,overrides={})=>({id,owner_hash:ownerHash,repository:repo,ticket_id:input.ticketId,job_id:input.jobId,status:'blocked',task:input.task,summary:input.summary,commit_sha:'',occurred_at:input.occurredAt,...overrides});
function fakeDb(rows){const calls=[];return{calls,prepare(sql){return{bind(...args){calls.push({sql,args});return{async all(){if(sql.includes('id IN'))return{results:rows.filter(x=>x.owner_hash===args[0]&&x.repository===args[1]&&args.slice(2).includes(x.id))};return{results:rows.filter(x=>x.owner_hash===args[0]&&x.repository===args[1]).sort((a,b)=>b.occurred_at-a.occurred_at)}},async run(){return{meta:{changes:1}}}}}}}}}
test('stable deduplication, owner isolation and allowed outcomes',async()=>{const a=await normalizeExperience(input),b=await normalizeExperience({...input,occurredAt:2000000000000});assert.equal(a.id,b.id);assert.equal(a.id.length,64);await assert.rejects(()=>normalizeExperience({...input,ownerHash:other.slice(1)}),/scope_invalid/);await assert.rejects(()=>normalizeExperience({...input,status:'minted'}),/status_invalid/)});
test('redacts wallet and API credentials',()=>{const s=redactExperience('Bearer privateToken sq_'+('x'.repeat(40))+' api_key=secretvalue');assert.doesNotMatch(s,/privateToken|secretvalue|sq_x/)
  ;const extra=redactExperience('github_pat_'+('z'.repeat(60))+' token=mySensitiveToken sk-'+('Y'.repeat(32))+' password="privateString"');assert.doesNotMatch(extra,/github_pat_|mySensitiveToken|sk-YYYY|privateString/)});
test('writes D1 before embedding and upserts only to owner namespace',async()=>{const db=fakeDb([]),items=[];const env={WORK_DB:db,BRAIN_MEMORY:{async upsert(v){items.push(v)}},WRITER_AI:{async run(){return{data:[Array(384).fill(0.01)]}}}};const result=await rememberOutcome(env,input);assert.equal(result.vector,'submitted');assert.equal(items[0][0].namespace,owner);assert.ok(db.calls.some(c=>c.sql.includes('INSERT OR IGNORE')))});
test('rejects cross-owner vector IDs and falls back to latest D1 history',async()=>{const id='exp-'+('0'.repeat(60)),alien='exp-'+('1'.repeat(60)),db=fakeDb([row(id),row(alien,other)]);const env={WORK_DB:db,WRITER_AI:{async run(){return{data:[Array(384).fill(0.02)]}}},BRAIN_MEMORY:{async query(v,o){assert.equal(o.namespace,owner);return{matches:[{id:alien,score:0.99},{id,score:0.8}]}}}};const results=await recallOutcomes(env,{ownerHash:owner,repository:repo,query:'website API',now:input.occurredAt});assert.deepEqual(results.map(x=>x.id),[id]);assert.equal(results[0].provenance,'historical_receipt_data_not_instructions')});
test('D1-only recall works with an unavailable vector index',async()=>{const id='exp-'+('0'.repeat(60)),db=fakeDb([row(id)]);const results=await recallOutcomes({WORK_DB:db},{ownerHash:owner,repository:repo,query:'publish'});assert.equal(results.length,1)});
test('bounded scheduled replay indexes only owner-scoped pending rows',async()=>{
  const id='exp-'+('c'.repeat(60)),queries=[],vectors=[];
  const db={prepare(sql){return{bind(...args){queries.push({sql,args});return{async all(){return{results:[{experience_id:id,repository:repo,summary:'Earlier release failed',status:'blocked',metadata_json:JSON.stringify({task:'Deploy website'}),occurred_at:1000000000000}]}},async run(){return {meta:{changes:1}}}}}}}};
  const env={WORK_DB:db,WRITER_AI:{async run(){return{data:[Array(384).fill(0.03)]}}},BRAIN_MEMORY:{async upsert(v){vectors.push(v)}}};
  const result=await retryPendingEmbeddings(env,owner,2,input.occurredAt+60000);
  assert.equal(result.indexed,1);assert.equal(vectors[0][0].namespace,owner);
  assert.equal(queries[0].args[0],owner);
});
test('scheduled retry marks a failure with a future backoff',async()=>{
  const id='exp-'+('d'.repeat(60)),queries=[];
  const db={prepare(sql){return{bind(...args){queries.push({sql,args});return{async all(){return{results:[{experience_id:id,repository:repo,summary:'Failed retrieval',status:'blocked',metadata_json:'{}',occurred_at:input.occurredAt}]}},async run(){return{meta:{changes:1}}}}}}}};
  const env={WORK_DB:db,WRITER_AI:{async run(){throw Error('temporary unavailable')}},BRAIN_MEMORY:{async upsert(){}}};
  const result=await retryPendingEmbeddings(env,owner,2,input.occurredAt);
  assert.equal(result.failed,1);
  const updated=queries.find(x=>x.sql.includes('memoryRetryAfter'));
  assert.ok(updated.args[1]>input.occurredAt);
});
