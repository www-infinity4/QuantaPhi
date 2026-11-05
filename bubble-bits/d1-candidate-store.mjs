/* Pending Bubble Bit persistence for an authenticated Bubbles/Brain backend.
 * No public route, wallet mint, spend, transfer, price or claimed deployment.
 * Caller MUST inject real server-side signed receipt and owner-context verifiers.
 * D1 batch is atomic; a duplicate operation cannot create multiple packets.
 */
import {createBitCandidate} from './work-packet.mjs';

const fail=code=>{throw new Error(code)};
const valid=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{3,100}$/.test(id);
function customer(principal){
 if(principal?.verified!==true||!valid(principal.customerId))fail('unauthenticated_customer');
 return principal.customerId;
}
function requireDb(db){
 if(typeof db?.prepare!=='function'||typeof db?.batch!=='function')fail('database_unavailable');
}
function requireAdapters(a){
 if(typeof a?.verifyOwnerContext!=='function'||typeof a?.verifyOperationReceipt!=='function'||typeof a?.verifyJobResult!=='function')fail('signed_evidence_verifiers_required');
}
async function prior(db,input){
 return db.prepare('SELECT packet_id,state FROM bubble_bit_candidates WHERE customer_id = ? AND task_id = ? AND operation_id = ?')
   .bind(input.customerId,input.taskId,input.operationId).first();
}

export async function persistVerifiedBitCandidate({input,principal,db,adapters}={}){
 const id=customer(principal);requireDb(db);requireAdapters(adapters);
 if(!input||input.customerId!==id)fail('customer_identity_mismatch');
 // A browser-reported "tool completed" is never enough: each callback must
 // verify its signed job/tool proof from an independent server-owned source.
 const packet=await createBitCandidate(input,{
  verifyOwnerContext:async data=>(data.customerId===id)&&(await adapters.verifyOwnerContext(data,principal))===true,
  verifyOperationReceipt:async(step,data)=>(await adapters.verifyOperationReceipt(step,data,principal))===true,
  verifyJobResult:async data=>(await adapters.verifyJobResult(data,principal))===true
 });
 const existing=await prior(db,input);
 if(existing){
  if(existing.packet_id!==packet.id)fail('conflicting_operation_claim');
  return Object.freeze({packetId:packet.id,status:existing.state,created:false,creditedBits:0});
 }
 const statements=[
  db.prepare('INSERT INTO bubble_bit_candidates(packet_id,customer_id,task_id,operation_id,criteria_key,capability,summary,evidence_stage,files_tested,files_changed,share_policy,state) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(packet.id,packet.customerId,packet.taskId,packet.operationId,packet.criteriaKey,packet.capability,
      packet.summary,packet.result.stage,packet.result.filesTested,packet.result.filesChanged,
      packet.reuse.permission,'pending_review'),
  ...packet.steps.map(step=>db.prepare('INSERT INTO bubble_bit_evidence(receipt_id,packet_id,tool_name,verified_at) VALUES (?,?,?,?)')
    .bind(step.receiptId,packet.id,step.tool,new Date().toISOString()))
 ];
 try{
  await db.batch(statements);
 }catch{
  // A concurrently retried identical operation is idempotent, while a
  // conflicting claim or already-spent evidence is rejected and rolled back.
  const winner=await prior(db,input);
  if(winner?.packet_id===packet.id)return Object.freeze({packetId:packet.id,status:winner.state,created:false,creditedBits:0});
  if(winner)fail('conflicting_operation_claim');
  fail('receipt_or_database_conflict');
 }
 return Object.freeze({packetId:packet.id,status:'pending_review',created:true,creditedBits:0});
}

export async function getCustomerBitCandidates({principal,db}={}){
 const id=customer(principal);requireDb(db);
 const result=await db.prepare('SELECT packet_id,state,summary FROM bubble_bit_candidates WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50')
   .bind(id).all();
 return Object.freeze((result?.results||[]).map(row=>Object.freeze({
  packetId:row.packet_id,status:row.state,summary:row.summary,creditedBits:0
 })));
}
