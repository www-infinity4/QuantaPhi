/* Bubbles Bit work packet: server-only candidate and share/transfer draft contract.
 * It never mints, debits, transfers, licenses code, or grants execution rights.
 * Production verifiers MUST be independently authenticated server adapters.
 */
import {createHash} from 'node:crypto';

const fail=code=>{throw new Error(code)};
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{3,100}$/.test(x);
const validReceipt=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(x);
const validText=(x,max=500)=>typeof x==='string'&&x.trim().length>=12&&x.length<=max;
const TAG=/^[a-z][a-z0-9-]{1,39}$/;
const sha256=v=>createHash('sha256').update(v,'utf8').digest('hex');
const secretLike=/(?:gh[pousr]_[A-Za-z0-9]{16,}|sk-[A-Za-z0-9_-]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:bearer|api[_ -]?key|password|secret)\s*[:=]\s*\S{8,})/i;
const safeDescription=(v,max)=>{
 if(!validText(v,max))fail('invalid_description');
 if(secretLike.test(v))fail('sensitive_description');
 return v.trim();
};
const TOOLS=new Set(['github.search','github.read_file','github.commit','github.update_file','github.workflow_checks','github.test_result','github.merge_pull_request','cloudflare.d1.query','cloudflare.d1.write','cloudflare.worker.stage','cloudflare.worker.deploy','cloudflare.worker.verify','web.search','web.read_page','brain.runner_receipt']);
const STAGES=new Set(['research_verified','source_committed','tests_verified','merged_verified','deployed_verified']);
const CAPABILITIES=new Set(['deployment_verification','research','source_build','test_verification','integration','repair','data_import']);
const SHARE=new Set(['private','public_blueprint']);
const freezePacket=x=>Object.freeze(x);

export async function createBitCandidate(input,{verifyOwnerContext,verifyOperationReceipt,verifyJobResult}={}){
 if(!input||typeof input!=='object'||!['function'].every(t=>typeof verifyOwnerContext===t&&typeof verifyOperationReceipt===t&&typeof verifyJobResult===t))fail('trusted_verifiers_required');
 for(const key of ['customerId','sessionId','taskId','operationId'])if(!validId(input[key]))fail('invalid_identity');
 if(!validId(input.criteriaKey)||!CAPABILITIES.has(input.capability))fail('invalid_criteria');
 const goal=safeDescription(input.goal,380),summary=safeDescription(input.summary,700);
 const steps=input.steps;
 if(!Array.isArray(steps)||!steps.length||steps.length>128)fail('invalid_step');
 const seen=new Set();
 for(const step of steps){
  if(!step||!TOOLS.has(step.tool)||step.status!=='complete'||!validReceipt(step.receiptId)||!validText(step.description,240))fail('invalid_step');
  safeDescription(step.description,240);
  if(seen.has(step.receiptId))fail('duplicate_receipt');
  seen.add(step.receiptId);
 }
 const result=input.result;
 if(!result||!STAGES.has(result.stage)||!Number.isSafeInteger(result.filesTested)||result.filesTested<0||result.filesTested>100000||!Number.isSafeInteger(result.filesChanged)||result.filesChanged<0||result.filesChanged>100000)fail('invalid_result');
 const has=(name)=>steps.some(x=>x.tool===name);
 if(result.stage==='deployed_verified'&&(!has('cloudflare.worker.verify')||!(has('github.workflow_checks')||has('github.test_result'))))fail('deployment_receipt_required');
 const reuse=input.reuse;
 if(!reuse||!SHARE.has(reuse.permission)||!Array.isArray(reuse.tags)||reuse.tags.length<1||reuse.tags.length>12||reuse.tags.some(t=>typeof t!=='string'||!TAG.test(t)))fail('invalid_reuse_terms');
 const guidance=safeDescription(reuse.guidance,600);
 if(!Array.isArray(input.linkedGits)||input.linkedGits.length>200||input.linkedGits.some(x=>typeof x!=='string'||!/^[a-f0-9]{64}$/.test(x)))fail('invalid_git_link');
 if(await verifyOwnerContext(input)!==true)fail('owner_context_unverified');
 for(const step of steps){if(await verifyOperationReceipt(step,input)!==true)fail('receipt_not_verified');}
 if(await verifyJobResult(input)!==true)fail('job_not_verified');
 const id=sha256(JSON.stringify(['bubbles-bit-packet-v1',input.customerId,input.taskId,input.operationId,...steps.map(s=>s.receiptId).sort()]));
 return freezePacket({version:1,asset:'BUBBLE_BIT',id,status:'pending_settlement',walletCredits:0,
  customerId:input.customerId,sessionId:input.sessionId,taskId:input.taskId,operationId:input.operationId,
  criteriaKey:input.criteriaKey,goal,summary,capability:input.capability,
  steps:freezePacket(steps.map(s=>freezePacket({tool:s.tool,receiptId:s.receiptId,status:s.status,description:s.description}))),
  result:freezePacket({stage:result.stage,filesTested:result.filesTested,filesChanged:result.filesChanged}),
  reuse:freezePacket({permission:reuse.permission,tags:freezePacket([...new Set(reuse.tags)]),guidance}),
  linkedGits:freezePacket([...new Set(input.linkedGits)])});
}

// Server authorization verifies that the customer deliberately shared only a
// public blueprint. No private task IDs, source, receipt IDs or wallet identifiers.
export async function exportBitBlueprint(packet,{verifyShareGrant}={}){
 if(packet?.asset!=='BUBBLE_BIT'||packet.reuse?.permission!=='public_blueprint'||typeof verifyShareGrant!=='function'||await verifyShareGrant(packet)!==true)fail('share_not_authorized');
 return freezePacket({type:'BUBBLE_BIT_BLUEPRINT',version:1,capability:packet.capability,
  goal:packet.goal,summary:packet.summary,stage:packet.result.stage,
  filesTested:packet.result.filesTested,filesChanged:packet.result.filesChanged,
  tools:freezePacket([...new Set(packet.steps.map(s=>s.tool))]),
  tags:freezePacket([...packet.reuse.tags]),guidance:packet.reuse.guidance,
  sourceStatus:'verified_by_server_adapter_at_packet_creation',
  executable:false,assetOwnershipTransferred:false,licenseIncluded:false});
}

// Discovery suggestions are NOT Quant AI verified valuations, quotes, or grants.
export function matchReusableBit(packet,{tags=[],goal=''}={}){
 if(packet?.asset!=='BUBBLE_BIT'||packet.reuse?.permission!=='public_blueprint')return {match:false,transferStatus:'not_requested',executable:false};
 const needed=Array.isArray(tags)?tags.filter(x=>typeof x==='string'&&TAG.test(x)):[];
 const matched=needed.some(t=>packet.reuse.tags.includes(t));
 return {match:matched,matchingTags:matched?needed.filter(t=>packet.reuse.tags.includes(t)):[],transferStatus:'not_requested',executable:false};
}

// Creates a request only. A separate signed, transactional D1 wallet service
// must check source ownership and balance before any credit or debit.
export async function draftPeerTransfer(packet,{fromWalletId,toWalletId,grantId,verifyTransferAuthorization}={}){
 if(packet?.asset!=='BUBBLE_BIT'||!validId(fromWalletId)||!validId(toWalletId)||fromWalletId===toWalletId||!validReceipt(grantId)||typeof verifyTransferAuthorization!=='function')fail('invalid_transfer');
 if(await verifyTransferAuthorization({packet,fromWalletId,toWalletId,grantId})!==true)fail('transfer_not_authorized');
 return freezePacket({version:1,asset:'BUBBLE_BIT',packetId:packet.id,amount:1,fromWalletId,toWalletId,
  authorizationReceiptId:grantId,status:'pending_server_settlement',creditsMoved:0});
}
