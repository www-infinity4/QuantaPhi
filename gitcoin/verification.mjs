import {buildManifest} from './line-receipts.mjs';

const fail=code=>{throw new Error(code)};
// Server-only primitive: callers supply a previously authenticated principal and
// independent GitHub/Quant AI service adapters. Never trust the uploaded manifest.
export async function evaluateClaim(manifest,{principal,github,quantAI}={}){
 if(!principal?.id||!principal?.walletId)fail('unauthenticated_principal');
 if(!github?.getDiff||!github?.containsCommitOnDefault||!github?.checksPassed||!github?.resolveAttribution)fail('github_evidence_unavailable');
 if(!quantAI?.review)fail('quant_ai_unavailable');
 if(!manifest||manifest.version!==1||manifest.status!=='provisional_not_minted')fail('invalid_manifest');
 const source={repo:manifest.repo,commit:manifest.commit,intent:manifest.intent,builderClaim:manifest.builder_claim,githubLoginClaim:manifest.github_login_claim};
 const verifiedDiff=await github.getDiff({repo:manifest.repo,commit:manifest.commit});
 const canonical=buildManifest(verifiedDiff,source);
 if(JSON.stringify(canonical)!==JSON.stringify(manifest))fail('manifest_mismatch');
 if(await github.containsCommitOnDefault({repo:manifest.repo,commit:manifest.commit})!==true)fail('not_on_default_branch');
 if(await github.checksPassed({repo:manifest.repo,commit:manifest.commit})!==true)fail('ci_not_passing');
 const attribution=await github.resolveAttribution({repo:manifest.repo,commit:manifest.commit,principal,builderClaim:manifest.builder_claim});
 const acceptedSources=['verified_human_authorization','signed_agent_job','signed_provider_execution'];
 if(!attribution?.valid||!acceptedSources.includes(attribution.source)||!attribution.recipient)fail('attribution_unverified');
 if(attribution.source==='verified_human_authorization'&&attribution.recipient!==principal.walletId)fail('recipient_mismatch');
 if(attribution.source!=='verified_human_authorization'&&attribution.server_signature_verified!==true)fail('attribution_unverified');
 const candidates=canonical.lines.filter(l=>l.eligible);
 const quality=await quantAI.review({repo:canonical.repo,commit:canonical.commit,intent:canonical.intent,verifiedDiff,lines:candidates,principalId:principal.id});
 if(typeof quality?.reviewId!=='string'||quality.reviewId.length<8||!Array.isArray(quality.decisions)||quality.decisions.length!==candidates.length)fail('quant_ai_invalid_review');
 const decisions=new Map();
 for(const d of quality.decisions){
  if(!candidates.some(l=>l.id===d.id)||decisions.has(d.id)||typeof d.approved!=='boolean'||typeof d.reason!=='string'||d.reason.trim().length<8)fail('quant_ai_invalid_review');
  decisions.set(d.id,d);
 }
 const lines=canonical.lines.map(l=>{
  const decision=decisions.get(l.id);
  return {...l,status:!l.eligible?'excluded':decision?.approved?'verified':'rejected_quality',quality_reason:decision?.reason||null};
 });
 const verified=lines.filter(l=>l.status==='verified').length;
 return {
  version:1,currency:'GIT',repo:canonical.repo,commit:canonical.commit,
  review_id:quality.reviewId,attribution_source:attribution.source,recipient_wallet_id:attribution.recipient,
  status:verified===0?'rejected':verified===candidates.length?'verified':'partially_verified',
  lines
 };
}

export function createSettlementPlan(result){
 if(!result||!['verified','partially_verified'].includes(result.status)||!result.recipient_wallet_id||!result.review_id)fail('not_verified_for_settlement');
 return result.lines.filter(l=>l.status==='verified').map(l=>({
  receipt_id:l.id,wallet_id:result.recipient_wallet_id,
  repo:result.repo,commit_sha:result.commit,
  path:l.path,line_number:l.line_number,content_sha256:l.content_sha256,
  git_type:l.git_type,quant_ai_review_id:result.review_id,credits:1
 }));
}
