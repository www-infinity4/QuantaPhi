// Only the existing authenticated Brain service may call creditBubbleBit.
// Isolated append-only asset ledger; never edits Quants, Star Coins or Infinity.
const tools=new Set(['github.read_file','github.read_repository','github.search','github.commit','github.workflow_checks']);
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(x);
const fail=code=>{throw Object.assign(new Error(code),{status:503})};
export const bitCreditSchema=[
 'CREATE TABLE IF NOT EXISTS bubble_bit_credits(receipt_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,tool TEXT NOT NULL,criteria_hash TEXT NOT NULL,packet_json TEXT NOT NULL,created_at INTEGER NOT NULL)',
 'CREATE INDEX IF NOT EXISTS bubble_bit_credits_user ON bubble_bit_credits(user_id,created_at DESC)',
 "CREATE TRIGGER IF NOT EXISTS bubble_bit_credits_no_update BEFORE UPDATE ON bubble_bit_credits BEGIN SELECT RAISE(ABORT,'immutable_bit_credit'); END",
 "CREATE TRIGGER IF NOT EXISTS bubble_bit_credits_no_delete BEFORE DELETE ON bubble_bit_credits BEGIN SELECT RAISE(ABORT,'immutable_bit_credit'); END"
];
export function validateBitCredit(x){
 if(!x||x.version!==1||x.source!=='brain_direct_github_v1'||x.asset!=='BUBBLE_BIT'||
    !/^bb_[a-f0-9]{64}$/.test(x.receiptId||'')||!(typeof x.userId==='string'&&x.userId.length>0&&x.userId.length<=200)||!id(x.sessionId)||!id(x.contextId)||
    !/^[a-f0-9]{64}$/.test(x.criteriaKey||'')||!tools.has(x.tool)||
    !/^[a-f0-9-]{36}$/i.test(x.requestId||'')||x.reusePermission!=='private'||
    typeof x.goal!=='string'||x.goal.length<1||x.goal.length>380||typeof x.summary!=='string'||x.summary.length>500||
    !/^www-infinity4\/[A-Za-z0-9_.-]+$/.test(x.repository||'')||
    x.sourceSha!==null&&!/^[a-f0-9]{40}$/.test(x.sourceSha||'')||
    x.path!==null&&(typeof x.path!=='string'||x.path.length>300)||
    typeof x.resultStatus!=='string'||x.resultStatus.length>80)fail('invalid_bit_credit');
 // Canonical order and allowlist prevent private prompts/arbitrary extra fields
 // from entering a receipt or changing the meaning of an idempotent retry.
 return Object.fromEntries(['version','source','asset','receiptId','userId','sessionId','criteriaKey','contextId','tool','goal','summary','repository','requestId','sourceSha','path','resultStatus','reusePermission'].map(k=>[k,x[k]]));
}
export function bitCreditStatement(input,now){
 return {sql:'INSERT OR IGNORE INTO bubble_bit_credits(receipt_id,user_id,tool,criteria_hash,packet_json,created_at) VALUES(?1,?2,?3,?4,?5,?6)',
  params:[input.receiptId,input.userId,input.tool,input.criteriaKey,JSON.stringify(input),now]};
}
export async function creditBubbleBit(env,value){
 if(env.BUBBLE_BITS_ENABLED!=='1'||!env.DB||!env.IDENTITY_DB)fail('bubble_bits_unavailable');
 const input=validateBitCredit(value);
 if(!await env.IDENTITY_DB.prepare('SELECT id FROM accounts WHERE id=?1').bind(input.userId).first())fail('bit_recipient_unknown');
 for(const sql of bitCreditSchema)await env.DB.prepare(sql).run();
 const p=bitCreditStatement(input,Date.now());
 await env.DB.prepare(p.sql).bind(...p.params).run();
 const saved=await env.DB.prepare('SELECT user_id,packet_json FROM bubble_bit_credits WHERE receipt_id=?1').bind(input.receiptId).first();
 if(saved?.user_id!==input.userId||saved.packet_json!==JSON.stringify(input))fail('bit_receipt_conflict');
 return {ok:true,asset:'BUBBLE_BIT',receiptId:input.receiptId,creditId:input.receiptId,amount:1};
}
export async function readBubbleBits(env,userId){
 if(env.BUBBLE_BITS_ENABLED!=='1'||!env.DB)return {available:false,credited:null};
 try{
  const count=await env.DB.prepare('SELECT COUNT(*) AS credited FROM bubble_bit_credits WHERE user_id=?1').bind(userId).first();
  const n=Number(count?.credited);
  if(!Number.isSafeInteger(n)||n<0)fail('invalid_bit_balance');
  return {available:true,credited:n,transferAvailable:false,spendAvailable:false};
 }catch{return {available:false,credited:null}}
}
