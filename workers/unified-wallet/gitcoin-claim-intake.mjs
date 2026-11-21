// Pending-only intake for canonical "quantaphi-gitcoin-ledger" Cloudflare D1.
// Never issues serials, transfers GIT, credits a spendable balance, or accepts
// a browser-provided wallet identifier. GIT issuer review is separate.
const fail=code=>{throw Object.assign(new Error(code),{status:400})};
const hash64=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const sha40=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const languages=new Set(['javascript','typescript','python','html','css','go','rust','java','solidity','shell','c','cpp','swift','kotlin']);
const intents=new Set(['new_logic','bugfix','test','feature','refactor','generated_code']);
const codeFile=path=>typeof path==='string'&&path.length<250&&
 !path.startsWith('/')&&!/[\\\x00-\x1f]/.test(path)&&
 !path.split('/').some(p=>!p||p==='.'||p==='..'||p==='.git')&&
 /\.(?:js|mjs|cjs|jsx|ts|tsx|py|html|css|go|rs|java|sol|sh|c|cc|cpp|h|hpp|swift|kt)$/i.test(path);
function validate(input){
 if(!input||input.version!==1||input.source!=='brain_verified_github_commit_v1'||
   !/^bb_[a-f0-9]{64}$/.test(input.sourceReceiptId||'')||
   typeof input.userId!=='string'||!input.userId||input.userId.length>200||
   !/^www-infinity4\/[a-zA-Z0-9_.-]{2,80}$/.test(input.repo||'')||
   !sha40(input.commitSha)||!codeFile(input.filePath)||
   !Number.isSafeInteger(input.lineNumber)||input.lineNumber<1||input.lineNumber>2000000||
   !hash64(input.contentSha256)||!languages.has(input.language)||!intents.has(input.intent))
  fail('gitcoin_source_line_invalid');
 return {
  version:1,source:'brain_verified_github_commit_v1',
  sourceReceiptId:input.sourceReceiptId,userId:input.userId,
  repo:input.repo,commitSha:input.commitSha,filePath:input.filePath,
  lineNumber:input.lineNumber,contentSha256:input.contentSha256,
  language:input.language,intent:input.intent
 };
}
export async function deriveGitLineReceipt(raw){
 const c=validate(raw);
 const receipt=JSON.stringify(['gitcoin_line_receipt_v1',c.repo,c.commitSha,
  c.filePath,c.lineNumber,c.contentSha256]);
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(receipt)));
 return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export async function queuePendingGitLineClaim(env,raw){
 if(env.GITCOIN_CLAIMS_ENABLED!=='1'||!env.GITCOIN_DB||!env.IDENTITY_DB)
  fail('gitcoin_claim_intake_disabled');
 const c=validate(raw);
 const account=await env.IDENTITY_DB.prepare('SELECT id FROM accounts WHERE id=?1')
  .bind(c.userId).first();
 if(!account||account.id!==c.userId)fail('gitcoin_executor_not_verified');
 // This is the canonical EXISTING Gitcoin owner binding; the body cannot select
 // a beneficiary by wallet_id, by GitHub username or by browser-local storage.
 const binding=await env.GITCOIN_DB.prepare(`SELECT wallet_id,binding_id FROM gitcoin_bubbles_executor
  WHERE singleton=1 AND owner_subject=?1 AND active=1 AND owner_verified=1`)
  .bind(c.userId).first();
 if(!binding?.wallet_id||!binding?.binding_id)fail('gitcoin_executor_not_verified');
 const receiptId=await deriveGitLineReceipt(c);
 // A verified job/commit operation does not independently verify that this
 // specific line was added, has rights, or deserves an issued GIT. Save ONLY a
 // pending candidate. Independent GitHub diff and Quant AI review must decide.
 const sql=`INSERT OR IGNORE INTO gitcoin_line_claims
 (receipt_id,repo,commit_sha,file_path,line_number,content_sha256,git_type,intent,
  builder_claim,authenticated_submitter,recipient_wallet_id,execution_channel,
  recipient_policy,executor_binding_id,customer_wallet_id,status,github_evidence_id,reason_code)
 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,'bubbles',
   'verified_bubbles_executor_v1',?12,NULL,'pending',NULL,'pending_independent_github_diff_review')`;
 await env.GITCOIN_DB.prepare(sql).bind(receiptId,c.repo,c.commitSha,c.filePath,
  c.lineNumber,c.contentSha256,c.language,c.intent,
  'Bubbles source claim awaiting independent line verification',c.userId,
  binding.wallet_id,binding.binding_id).run();
 const saved=await env.GITCOIN_DB.prepare(`SELECT receipt_id,recipient_wallet_id,status,
  repo,commit_sha,file_path,line_number,content_sha256 FROM gitcoin_line_claims
  WHERE receipt_id=?1`).bind(receiptId).first();
 if(!saved||saved.receipt_id!==receiptId||saved.recipient_wallet_id!==binding.wallet_id||
    saved.repo!==c.repo||saved.commit_sha!==c.commitSha||
    saved.file_path!==c.filePath||Number(saved.line_number)!==c.lineNumber||
    saved.content_sha256!==c.contentSha256||saved.status!=='pending')
   fail('gitcoin_claim_conflict');
 return {ok:true,receiptId,status:'pending_independent_line_and_rights_review',
  recipient:'verified_executor_wallet',mintedGitCoins:0,spendableGitCoins:0};
}
