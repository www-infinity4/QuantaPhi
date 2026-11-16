/* Power Chain research desk: source-only, deterministic verification around the
 * existing search broker. Inspired by role-separated agent desks, not an
 * imported Grok runtime. This module makes no network, checkout or model calls.
 */
import {ALL_TARGETS,safeChainResult} from './power-chain-core.mjs';

export const RESEARCH_DESK_SEATS=Object.freeze([
 Object.freeze({id:'scanner',color:'red',purpose:'Collect bounded public-index source candidates'}),
 Object.freeze({id:'analyst',color:'blue',purpose:'Validate source provenance, schema and duplicates'}),
 Object.freeze({id:'chief',color:'purple',purpose:'Choose one research question and summarize known evidence'}),
 Object.freeze({id:'veto',color:'pink',purpose:'Block unsafe, stale, incomplete or conflicting evidence'}),
 Object.freeze({id:'executor',color:'green',purpose:'Only carry out a separately authorized, lease-bound step'})
]);
const STOPPED_EXECUTION=Object.freeze({mode:'research_only',browserActionsExecuted:0,ordersPlaced:0,checkoutAuthorized:false,tradeAuthorized:false});
const validCount=x=>Number.isSafeInteger(x)&&x>=0;

/** Reviews an actual runPowerChain receipt, without promoting discovery to fact. */
export function reviewPowerChainResearch(plan,receipt){
 if(!plan||!Array.isArray(plan.targets)||!plan.targets.length||
    plan.targets.length>ALL_TARGETS.length||new Set(plan.targets).size!==plan.targets.length||
    !plan.targets.every(x=>ALL_TARGETS.includes(x)))throw new TypeError('Research plan must use approved source circuit targets');
 if(typeof plan.query!=='string'||!plan.query.trim()||!receipt||receipt.query!==plan.query)
  throw new TypeError('Receipt must match the same research query');
 if(!Array.isArray(receipt.steps)||!Array.isArray(receipt.results)||
    !validCount(receipt.checked)||!validCount(receipt.failed))throw new TypeError('Research receipt is incomplete');
 const allowed=new Set(plan.targets);
 const steps=new Set();
 for(const step of receipt.steps){
  if(!allowed.has(step?.target))throw new TypeError('Research step is outside the plan');
  if(steps.has(step.target))throw new TypeError('Duplicate target step');
  steps.add(step.target);
 }
 if(receipt.steps.length!==receipt.checked||receipt.checked>plan.targets.length)throw new TypeError('Research receipt counts are inconsistent');
 const sources=[];const seen=new Set();let rejected=0;
 for(const row of receipt.results){
  const vetted=allowed.has(row?.target)&&steps.has(row.target)?safeChainResult(row.target,row):null;
  if(!vetted||seen.has(vetted.url)){rejected++;continue;}
  seen.add(vetted.url);sources.push(vetted);
 }
 const reasons=[];
 if(receipt.stopped)reasons.push('stopped');
 if(receipt.checked<plan.targets.length)reasons.push('partial_source_checks');
 if(receipt.failed>0||receipt.steps.some(x=>x.status==='error'))reasons.push('search_errors');
 if(rejected)reasons.push('untrusted_source_rows');
 if(!sources.length)reasons.push('no_safe_source_links');
 const blocked=reasons.length>0;
 return Object.freeze({schemaVersion:1,jobType:'power_chain_research',query:plan.query,
  status:blocked?'blocked':'research_discovery',
  sources:Object.freeze(sources),distinctHosts:new Set(sources.map(x=>x.target)).size,
  sourceTargets:plan.targets.length,checkedTargets:receipt.checked,rejectedSourceRows:rejected,
  claimsVerified:false,merchantQuotesVerified:false,
  // Multiple sources may be related or repeat a claim; no factual corroboration is implied.
  evidenceLabel:'public_index_links_only',
  veto:Object.freeze({blocked,reasons:Object.freeze(reasons)}),execution:STOPPED_EXECUTION,
  sourceReceiptTime:typeof receipt.finishedAt==='string'?receipt.finishedAt:null});
}

/** A read-back comparison is not a browser command or an approval grant. */
export function compareResearchReadback(proposal,observed){
 const matches=Boolean(proposal&&observed&&proposal.kind==='open_source'&&
  typeof proposal.jobId==='string'&&proposal.jobId.length>0&&
  typeof proposal.url==='string'&&proposal.url.startsWith('https://')&&
  proposal.jobId===observed.jobId&&proposal.kind===observed.kind&&proposal.url===observed.url);
 return Object.freeze({matches,actionExecuted:false,checkoutAuthorized:false});
}
